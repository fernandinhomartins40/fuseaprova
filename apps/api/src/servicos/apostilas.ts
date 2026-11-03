/**
 * D34: as 4 apostilas em PDF por R$ 47, no Pix via Asaas. O pedido é de `produto = 'apostilas'`, sem
 * concurso: pago, abre o download; estornado, fecha. Não libera o app nem mexe no teste grátis.
 */
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { centavosParaReais, diaSP, MS_DIA, MS_HORA, ocultarCpf, somarDias } from '@fuse/shared';
import {
  CONSULTA_ASAAS_APOS_MS,
  descricaoCobrancaApostilas,
  PRECO_APOSTILAS_CENTAVOS,
  referenciaExterna,
  STATUS_ASAAS_PAGO,
  type ApostilasPixResposta,
  type ApostilasStatusResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { ErroHttp, falha } from '../http/erros.js';
import { lerDataAsaas } from '../integracoes/asaas.js';
import { confirmarPagamento, umPorAluno, type Pedido } from './pagamento.js';
import { iso, isoOuNull, type Db } from '../util.js';

const { pedidos, usuarios, apostilasDownloads } = schema;

/** Downloads por aluno em 24 h (4 volumes, com folga para baixar de novo em outro aparelho). */
export const LIMITE_DOWNLOADS_DIA = 30;

function respostaPix(p: Pedido): ApostilasPixResposta {
  return {
    pedidoId: p.id,
    valorCentavos: p.valorCentavos,
    imagem: p.pixImagem ?? '',
    payload: p.pixPayload ?? '',
    expiraEm: iso(p.pixExpiraEm ?? p.criadoEm),
    status: p.status,
  };
}

/** O aluno tem pedido de apostilas pago (e não estornado)? */
export async function comprouApostilas(db: Db, usuarioId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.usuarioId, usuarioId), eq(pedidos.produto, 'apostilas'), eq(pedidos.status, 'pago')))
    .limit(1);
  return p !== undefined;
}

/**
 * POST /apostilas/pix: reaproveita o Pix pendente não expirado das apostilas; senão cria no Asaas.
 * Mesma fila por aluno do Pix do concurso (dois cliques não geram duas cobranças).
 */
export async function gerarPixApostilas(deps: Deps, usuario: Usuario, agora: Date): Promise<ApostilasPixResposta> {
  const { db, asaas } = deps;
  const resultado = await umPorAluno(usuario.id, async () => {
    const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuario.id));
    if (!u) throw falha('nao_autenticado');
    if (await comprouApostilas(db, u.id)) throw falha('conflito', 'Suas apostilas já estão liberadas.');
    const [pendente] = await db
      .select()
      .from(pedidos)
      .where(and(eq(pedidos.usuarioId, u.id), eq(pedidos.produto, 'apostilas'), eq(pedidos.status, 'pendente')))
      .orderBy(desc(pedidos.criadoEm))
      .limit(1);
    if (
      pendente &&
      pendente.valorCentavos === PRECO_APOSTILAS_CENTAVOS &&
      pendente.pixExpiraEm &&
      pendente.pixExpiraEm > agora &&
      pendente.pixPayload
    ) {
      return respostaPix(pendente);
    }
    if (pendente) {
      // Só um pedido AINDA pendente vira vencido: se o webhook pagou no meio, ele continua pago.
      const substituido = await db
        .update(pedidos)
        .set({ status: 'vencido' })
        .where(and(eq(pedidos.id, pendente.id), eq(pedidos.status, 'pendente')))
        .returning({ id: pedidos.id });
      if (substituido.length !== 1) throw falha('conflito', 'Este Pix acabou de ser pago. Atualize a página.');
      if (pendente.asaasPaymentId) {
        await asaas.removerCobranca(pendente.asaasPaymentId).catch((e: Error) => {
          deps.log.warn({ pedidoId: pendente.id, erro: e.message }, 'pix das apostilas substituído não foi removido no asaas');
        });
        const [agoraPedido] = await db.select({ status: pedidos.status }).from(pedidos).where(eq(pedidos.id, pendente.id));
        if (agoraPedido?.status === 'pago') throw falha('conflito', 'Suas apostilas já estão liberadas.');
      }
    }
    if (!u.cpf || !u.celular) throw falha('pix_indisponivel');

    const ref = referenciaExterna(u.id);
    try {
      let customerId = u.asaasCustomerId;
      if (!customerId) {
        const c = await asaas.criarCliente({
          name: u.nome,
          cpfCnpj: u.cpf,
          email: u.email,
          mobilePhone: u.celular,
          externalReference: ref,
        });
        customerId = c.id;
        await db.update(usuarios).set({ asaasCustomerId: customerId }).where(eq(usuarios.id, u.id));
      }
      const cobranca = await asaas.criarCobranca({
        customer: customerId,
        billingType: 'PIX',
        value: centavosParaReais(PRECO_APOSTILAS_CENTAVOS),
        dueDate: somarDias(diaSP(agora), 1),
        description: descricaoCobrancaApostilas(),
        externalReference: ref,
      });
      const qr = await asaas.qrCodePix(cobranca.id);
      const expira = lerDataAsaas(qr.expirationDate) ?? new Date(agora.getTime() + 24 * MS_HORA);
      const [p] = await db
        .insert(pedidos)
        .values({
          usuarioId: u.id,
          concursoId: null,
          produto: 'apostilas',
          asaasCustomerId: customerId,
          asaasPaymentId: cobranca.id,
          valorCentavos: PRECO_APOSTILAS_CENTAVOS,
          status: 'pendente',
          pixPayload: qr.payload,
          pixImagem: qr.encodedImage,
          pixExpiraEm: expira,
          criadoEm: agora,
        })
        .returning();
      deps.log.info({ pedidoId: p!.id, usuarioId: u.id, cpf: ocultarCpf(u.cpf) }, 'pix das apostilas gerado');
      return respostaPix(p!);
    } catch (e) {
      if (e instanceof ErroHttp) throw e;
      deps.log.error({ usuarioId: u.id, erro: (e as Error).message }, 'falha ao gerar pix das apostilas');
      return null;
    }
  });
  if (!resultado) throw falha('pix_indisponivel');
  return resultado;
}

const ultimaConsulta = new Map<string, number>();
const INTERVALO_CONSULTA_MS = 15_000;

/** GET /apostilas/status, com consulta direta ao Asaas depois de 60 s pendente (atraso de webhook). */
export async function statusApostilas(deps: Deps, u: Usuario, agora: Date): Promise<ApostilasStatusResposta> {
  const { db } = deps;
  const doAluno = and(eq(pedidos.usuarioId, u.id), eq(pedidos.produto, 'apostilas'));
  let [p] = await db.select().from(pedidos).where(doAluno).orderBy(desc(pedidos.criadoEm)).limit(1);
  if (p && p.status === 'pendente' && p.asaasPaymentId && agora.getTime() - p.criadoEm.getTime() > CONSULTA_ASAAS_APOS_MS) {
    const ultima = ultimaConsulta.get(p.id) ?? 0;
    if (agora.getTime() - ultima >= INTERVALO_CONSULTA_MS) {
      const pedidoId = p.id;
      ultimaConsulta.set(pedidoId, agora.getTime());
      try {
        const c = await deps.asaas.obterCobranca(p.asaasPaymentId);
        if ((STATUS_ASAAS_PAGO as readonly string[]).includes(c.status)) {
          await confirmarPagamento(deps, p.asaasPaymentId, agora, {
            valorPagoCentavos: typeof c.value === 'number' ? Math.round(c.value * 100) : null,
          });
          [p] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
        }
      } catch (e) {
        deps.log.warn({ pedidoId, erro: (e as Error).message }, 'consulta ao Asaas falhou (apostilas)');
      }
    }
  }
  const comprado = await comprouApostilas(db, u.id);
  if (!p) {
    return { comprado, status: 'nenhum', pedidoId: null, expiraEm: null, pagoEm: null, expirado: false, valorCentavos: PRECO_APOSTILAS_CENTAVOS };
  }
  const expirado = p.status === 'vencido' || (p.status === 'pendente' && p.pixExpiraEm !== null && p.pixExpiraEm <= agora);
  return {
    comprado,
    status: p.status,
    pedidoId: p.id,
    expiraEm: isoOuNull(p.pixExpiraEm),
    pagoEm: isoOuNull(p.pagoEm),
    expirado,
    valorCentavos: p.status === 'pago' ? p.valorCentavos : PRECO_APOSTILAS_CENTAVOS,
  };
}

/**
 * Antes de servir um volume: o aluno comprou e está dentro do limite diário? Grava o download (o
 * controle do dono sobre quem baixa, D34). Lança o erro pronto para o usuário.
 */
export async function registrarDownload(db: Db, u: Usuario, volume: number, ip: string | null, agora: Date): Promise<void> {
  if (!(await comprouApostilas(db, u.id))) {
    throw falha('proibido', 'As apostilas ainda não foram compradas nesta conta. Faça o Pix de R$ 47 na página das apostilas.');
  }
  const [r] = await db
    .select({ n: count() })
    .from(apostilasDownloads)
    .where(and(eq(apostilasDownloads.usuarioId, u.id), gte(apostilasDownloads.criadoEm, new Date(agora.getTime() - MS_DIA))));
  if (Number(r?.n ?? 0) >= LIMITE_DOWNLOADS_DIA) {
    throw falha('limite_requisicoes', 'Você atingiu o limite de downloads de hoje. Tente de novo amanhã.');
  }
  await db.insert(apostilasDownloads).values({ usuarioId: u.id, volume, ip, criadoEm: agora });
}
