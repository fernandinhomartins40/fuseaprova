/**
 * Pagamento único por Pix via Asaas (PRD 8.3).
 */
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { centavosParaReais, diaSP, MS_HORA, ocultarCpf, somarDias } from '@fuse/shared';
import {
  CONSULTA_ASAAS_APOS_MS,
  DESCRICAO_COBRANCA,
  STATUS_ASAAS_PAGO,
  referenciaExterna,
  type PixResposta,
  type StatusPagamentoResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { falha } from '../http/erros.js';
import { emailBoasVindas, emailReembolso } from '../integracoes/email.js';
import { lerDataAsaas } from '../integracoes/asaas.js';
import { encerrarSessoesDoUsuario } from './sessoes.js';
import { iso, isoOuNull, type Db } from '../util.js';

const { pedidos, usuarios } = schema;
export type Pedido = typeof schema.pedidos.$inferSelect;

function respostaPix(p: Pedido): PixResposta {
  return {
    pedidoId: p.id,
    valorCentavos: p.valorCentavos,
    imagem: p.pixImagem ?? '',
    payload: p.pixPayload ?? '',
    expiraEm: iso(p.pixExpiraEm ?? p.criadoEm),
    status: p.status,
  };
}

/** POST /pagamento/pix: reaproveita o pendente não expirado; senão cria no Asaas. */
export async function gerarPix(deps: Deps, u: Usuario, agora: Date): Promise<PixResposta> {
  const { db, asaas, config } = deps;
  if (u.acesso) throw falha('conflito', 'Seu acesso já está liberado.');
  const [pendente] = await db
    .select()
    .from(pedidos)
    .where(and(eq(pedidos.usuarioId, u.id), eq(pedidos.status, 'pendente')))
    .orderBy(desc(pedidos.criadoEm))
    .limit(1);
  if (pendente && pendente.pixExpiraEm && pendente.pixExpiraEm > agora && pendente.pixPayload) {
    return respostaPix(pendente);
  }
  if (pendente) {
    await db.update(pedidos).set({ status: 'vencido' }).where(eq(pedidos.id, pendente.id));
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
      value: centavosParaReais(config.precoCentavos),
      dueDate: somarDias(diaSP(agora), 1),
      description: DESCRICAO_COBRANCA,
      externalReference: ref,
    });
    const qr = await asaas.qrCodePix(cobranca.id);
    const expira = lerDataAsaas(qr.expirationDate) ?? new Date(agora.getTime() + 24 * MS_HORA);
    const [p] = await db
      .insert(pedidos)
      .values({
        usuarioId: u.id,
        asaasCustomerId: customerId,
        asaasPaymentId: cobranca.id,
        valorCentavos: config.precoCentavos,
        status: 'pendente',
        pixPayload: qr.payload,
        pixImagem: qr.encodedImage,
        pixExpiraEm: expira,
        criadoEm: agora,
      })
      .returning();
    deps.log.info({ pedidoId: p!.id, usuarioId: u.id, cpf: ocultarCpf(u.cpf) }, 'pix gerado');
    return respostaPix(p!);
  } catch (e) {
    // Sem payload Pix nem dados pessoais no log.
    deps.log.error({ usuarioId: u.id, erro: (e as Error).message }, 'falha ao gerar pix');
    throw falha('pix_indisponivel');
  }
}

const ultimaConsulta = new Map<string, number>();
const INTERVALO_CONSULTA_MS = 15_000;

/** GET /pagamento/status, com consulta direta ao Asaas depois de 60 s pendente. */
export async function statusPagamento(deps: Deps, u: Usuario, agora: Date): Promise<StatusPagamentoResposta> {
  const { db } = deps;
  let [p] = await db
    .select()
    .from(pedidos)
    .where(eq(pedidos.usuarioId, u.id))
    .orderBy(desc(pedidos.criadoEm))
    .limit(1);
  let acesso = u.acesso;
  if (p && p.status === 'pendente' && p.asaasPaymentId && agora.getTime() - p.criadoEm.getTime() > CONSULTA_ASAAS_APOS_MS) {
    const ultima = ultimaConsulta.get(p.id) ?? 0;
    if (agora.getTime() - ultima >= INTERVALO_CONSULTA_MS) {
      const pedidoId = p.id;
      ultimaConsulta.set(pedidoId, agora.getTime());
      try {
        const c = await deps.asaas.obterCobranca(p.asaasPaymentId);
        if ((STATUS_ASAAS_PAGO as readonly string[]).includes(c.status)) {
          await confirmarPagamento(deps, p.asaasPaymentId, agora);
          [p] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
          acesso = true;
        }
      } catch (e) {
        deps.log.warn({ pedidoId, erro: (e as Error).message }, 'consulta ao Asaas falhou');
      }
    }
  }
  if (!p) {
    return { status: 'nenhum', acesso, pedidoId: null, expiraEm: null, pagoEm: null, expirado: false };
  }
  const expirado =
    p.status === 'vencido' || (p.status === 'pendente' && p.pixExpiraEm !== null && p.pixExpiraEm <= agora);
  return {
    status: p.status,
    acesso,
    pedidoId: p.id,
    expiraEm: isoOuNull(p.pixExpiraEm),
    pagoEm: isoOuNull(p.pagoEm),
    expirado,
  };
}

/** Pedido pago: libera o acesso e manda o e-mail de boas-vindas com recibo. Idempotente. */
export async function confirmarPagamento(deps: Deps, paymentId: string, agora: Date): Promise<boolean> {
  const resultado = await deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.asaasPaymentId, paymentId)).for('update');
    if (!p || p.status === 'pago' || p.status === 'estornado') return null;
    const [pago] = await tx
      .update(pedidos)
      .set({ status: 'pago', pagoEm: agora })
      .where(eq(pedidos.id, p.id))
      .returning();
    const [u] = await tx.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, p.usuarioId)).returning();
    return { pedido: pago!, usuario: u! };
  });
  if (!resultado) return false;
  deps.enviarEmail(
    emailBoasVindas({
      nome: resultado.usuario.nome,
      email: resultado.usuario.email,
      valorCentavos: resultado.pedido.valorCentavos,
      pagoEm: agora,
      cobrancaId: paymentId,
      appUrl: deps.config.appUrl,
    }),
  );
  return true;
}

/** Estorno ou chargeback: pedido estornado, acesso revogado e sessões derrubadas. */
export async function estornarPagamento(deps: Deps, paymentId: string, agora: Date): Promise<boolean> {
  const resultado = await deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.asaasPaymentId, paymentId)).for('update');
    if (!p || p.status === 'estornado') return null;
    await tx.update(pedidos).set({ status: 'estornado', estornadoEm: agora }).where(eq(pedidos.id, p.id));
    const [u] = await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, p.usuarioId)).returning();
    await encerrarSessoesDoUsuario(tx, p.usuarioId);
    return { pedido: p, usuario: u! };
  });
  if (!resultado) return false;
  if (!resultado.usuario.excluidoEm) {
    deps.enviarEmail(
      emailReembolso({
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        valorCentavos: resultado.pedido.valorCentavos,
        cobrancaId: paymentId,
      }),
    );
  }
  return true;
}

export async function vencerPagamento(db: Db, paymentId: string): Promise<void> {
  await db
    .update(pedidos)
    .set({ status: 'vencido' })
    .where(and(eq(pedidos.asaasPaymentId, paymentId), eq(pedidos.status, 'pendente')));
}
