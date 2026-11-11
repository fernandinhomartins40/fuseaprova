/**
 * Pagamento único por Pix via Asaas (PRD 8.3).
 */
import { and, desc, eq, isNotNull, isNull, ne } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { centavosParaReais, diaSP, MS_HORA, ocultarCpf, somarDias } from '@fuse/shared';
import {
  CONSULTA_ASAAS_APOS_MS,
  descricaoCobranca,
  STATUS_ASAAS_PAGO,
  referenciaEhDoFuseAprova,
  referenciaExterna,
  type CartaoResposta,
  type CupomConsultaResposta,
  type PixResposta,
  type StatusPagamentoResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { ErroHttp, falha } from '../http/erros.js';
import { emailApostilasLiberadas, emailBoasVindas, emailReembolso } from '../integracoes/email.js';
import { lerDataAsaas, removerCobrancaAsaas } from '../integracoes/asaas.js';
import { concursoAbertoPorId, liberarConcurso, precoDoConcurso, revogarConcurso } from './concursos.js';
import { cupomValido, descricaoCupom, garantirReservaCupom, precoComCupom } from './precos.js';
import { encerrarSessoesDoUsuario } from './sessoes.js';
import { concursoDoUsuario } from './usuario.js';
import { iso, isoOuNull, type Db } from '../util.js';

const { pedidos, usuarios, usuariosConcursos } = schema;
export type Pedido = typeof schema.pedidos.$inferSelect;

function respostaPix(p: Pedido, concurso: { id: string; nome: string }, cupom: string | null): PixResposta {
  return {
    pedidoId: p.id,
    concursoId: concurso.id,
    concursoNome: concurso.nome,
    valorCentavos: p.valorCentavos,
    valorOriginalCentavos: p.valorOriginalCentavos,
    cupom,
    imagem: p.pixImagem ?? '',
    payload: p.pixPayload ?? '',
    expiraEm: iso(p.pixExpiraEm ?? p.criadoEm),
    status: p.status,
  };
}

/**
 * Fila por aluno: um pedido de Pix por vez para o mesmo aluno, sem segurar conexão do banco
 * durante as chamadas ao Asaas (validação PIE V1-08: a trava de linha esgotava o pool).
 * Vale para uma instância da API, que é o deploy atual (ver R3-11 em docs/pie).
 */
const filaPix = new Map<string, Promise<unknown>>();
export function umPorAluno<T>(usuarioId: string, fn: () => Promise<T>): Promise<T> {
  const anterior = filaPix.get(usuarioId) ?? Promise.resolve();
  const atual = anterior.catch(() => undefined).then(fn);
  filaPix.set(usuarioId, atual);
  void atual.catch(() => undefined).finally(() => {
    if (filaPix.get(usuarioId) === atual) filaPix.delete(usuarioId);
  });
  return atual;
}

/**
 * POST /pagamento/pix: Pix de UM concurso (D21; sem `concursoId`, o ativo do aluno). Reaproveita o
 * pendente não expirado daquele concurso; senão cria no Asaas. O primeiro concurso custa o preço
 * cheio e os adicionais o preço com desconto. Dois cliques simultâneos do mesmo aluno não geram 2
 * cobranças (o 2º espera e reaproveita o 1º).
 */
export async function gerarPix(
  deps: Deps,
  usuario: Usuario,
  agora: Date,
  concursoIdPedido?: string,
  cupomCodigo?: string,
): Promise<PixResposta> {
  const { asaas } = deps;
  const { db } = deps;
  const resultado = await umPorAluno(usuario.id, async () => {
    const { u, concurso, cupom, preco } = await dadosDaCompra(deps, usuario.id, agora, concursoIdPedido, cupomCodigo);
    const [pendente] = await db
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, u.id),
          eq(pedidos.produto, 'concurso'),
          eq(pedidos.concursoId, concurso.id),
          eq(pedidos.status, 'pendente'),
          // D43: o cartão pendente segue à parte (o aluno pode estar digitando o cartão no Asaas).
          isNull(pedidos.parcelas),
        ),
      )
      .orderBy(desc(pedidos.criadoEm))
      .limit(1);
    // O Pix pendente só vale se ainda é o preço de hoje (o aluno pode ter pago outro concurso
    // desde então e ganhado o desconto, o superadmin pode ter mudado o preço) e o mesmo cupom.
    if (
      pendente &&
      pendente.valorCentavos === preco.centavos &&
      (pendente.cupomId ?? null) === (cupom?.id ?? null) &&
      pendente.pixExpiraEm &&
      pendente.pixExpiraEm > agora &&
      pendente.pixPayload
    ) {
      return respostaPix(pendente, concurso, cupom?.codigo ?? null);
    }
    if (pendente) {
      // S-23: só um pedido AINDA pendente vira vencido. Se o webhook pagou no meio, o pedido
      // continua pago (nunca é rebaixado) e não nasce uma 2ª cobrança.
      const substituido = await db
        .update(pedidos)
        .set({ status: 'vencido' })
        .where(and(eq(pedidos.id, pendente.id), eq(pedidos.status, 'pendente')))
        .returning({ id: pedidos.id });
      if (substituido.length !== 1) throw falha('conflito', 'Este Pix acabou de ser pago. Atualize a tela.');
      // O Pix antigo sai do Asaas para não ser pago pelo valor velho (se já tiver sido pago lá, o
      // webhook encontra o pedido vencido e confirma o pagamento).
      if (pendente.asaasPaymentId) {
        await asaas.removerCobranca(pendente.asaasPaymentId).catch((e: Error) => {
          deps.log.warn({ pedidoId: pendente.id, erro: e.message }, 'pix substituído não foi removido no asaas');
        });
        // Pago enquanto saía do Asaas (o webhook chegou no meio): não gera outra cobrança.
        const [agoraPedido] = await db.select({ status: pedidos.status }).from(pedidos).where(eq(pedidos.id, pendente.id));
        if (agoraPedido?.status === 'pago') throw falha('conflito', 'Seu acesso a este concurso já está liberado.');
      }
    }
    if (!u.cpf || !u.celular) throw falha('pix_indisponivel');

    const ref = referenciaExterna(u.id);
    try {
      const customerId = await clienteAsaasDo(deps, u);
      const cobranca = await asaas.criarCobranca({
        customer: customerId,
        billingType: 'PIX',
        value: centavosParaReais(preco.centavos),
        dueDate: somarDias(diaSP(agora), 1),
        description: descricaoCobranca(concurso.nome),
        externalReference: ref,
      });
      const qr = await asaas.qrCodePix(cobranca.id);
      const expira = lerDataAsaas(qr.expirationDate) ?? new Date(agora.getTime() + 24 * MS_HORA);
      const [p] = await db
        .insert(pedidos)
        .values({
          usuarioId: u.id,
          concursoId: concurso.id,
          asaasCustomerId: customerId,
          asaasPaymentId: cobranca.id,
          valorCentavos: preco.centavos,
          valorOriginalCentavos: preco.originalCentavos,
          cupomId: cupom?.id ?? null,
          status: 'pendente',
          pixPayload: qr.payload,
          pixImagem: qr.encodedImage,
          pixExpiraEm: expira,
          criadoEm: agora,
        })
        .returning();
      deps.log.info({ pedidoId: p!.id, usuarioId: u.id, cpf: ocultarCpf(u.cpf) }, 'pix gerado');
      // S-12 (C8): o Pix com cupom é uma reserva; além do limite (corrida), sai e o aluno é avisado.
      if (cupom?.limiteUsos != null) await garantirReservaCupom(deps, p!, agora);
      return respostaPix(p!, concurso, cupom?.codigo ?? null);
    } catch (e) {
      if (e instanceof ErroHttp) throw e;
      // Sem payload Pix nem dados pessoais no log. O cliente já criado no Asaas fica gravado.
      deps.log.error({ usuarioId: u.id, erro: (e as Error).message }, 'falha ao gerar pix');
      return null;
    }
  });
  if (!resultado) throw falha('pix_indisponivel');
  return resultado;
}

type UsuarioCompleto = typeof schema.usuarios.$inferSelect;

/**
 * O que toda compra de concurso confere antes de ir ao Asaas (Pix e cartão): o aluno, o concurso
 * à venda e ainda não liberado para ele, o cupom e o preço (que sai só do servidor).
 */
async function dadosDaCompra(deps: Deps, usuarioId: string, agora: Date, concursoIdPedido?: string, cupomCodigo?: string) {
  const { db } = deps;
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
  if (!u) throw falha('nao_autenticado');
  const concurso = concursoIdPedido ? await concursoAbertoPorId(db, concursoIdPedido) : await concursoDoUsuario(db, u);
  if (!concurso) throw falha('nao_encontrado', 'Concurso não encontrado.');
  // D33: concurso homologado ou fora de venda não recebe Pix, nem de quem já estudava nele.
  if (!concurso.ativo) throw falha('nao_encontrado', 'Este concurso não está mais disponível para compra.');
  const [linha] = await db
    .select()
    .from(usuariosConcursos)
    .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concurso.id)));
  // Sem linha (equipe, legado) vale o acesso global quando o pedido é do concurso ativo.
  if (linha?.acesso || (!linha && !concursoIdPedido && u.acesso)) {
    throw falha('conflito', 'Seu acesso a este concurso já está liberado.');
  }
  // D23: cupom conferido aqui (inválido = 400 com campos.cupom); o valor sai só do servidor.
  const cupom = cupomCodigo ? await cupomValido(db, cupomCodigo, concurso.id, agora, u.id) : null;
  const preco = precoComCupom(await precoDoConcurso(deps, db, u.id, concurso.id), cupom);
  return { u, concurso, cupom, preco };
}

/** Cliente do aluno no Asaas, criado na 1ª cobrança (o id fica gravado). */
async function clienteAsaasDo(deps: Deps, u: UsuarioCompleto): Promise<string> {
  if (u.asaasCustomerId) return u.asaasCustomerId;
  const c = await deps.asaas.criarCliente({
    name: u.nome,
    cpfCnpj: u.cpf!,
    email: u.email,
    mobilePhone: u.celular!,
    externalReference: referenciaExterna(u.id),
  });
  await deps.db.update(usuarios).set({ asaasCustomerId: c.id }).where(eq(usuarios.id, u.id));
  return c.id;
}

/** D43: o cartão em até 6x está à venda hoje (até o dia CARTAO_ATE, em São Paulo)? */
export function cartaoDisponivel(config: Deps['config'], agora: Date): boolean {
  return !!config.cartaoAte && diaSP(agora) <= config.cartaoAte;
}

const TEXTO_CARTAO_ERRO = 'Não foi possível abrir o pagamento no cartão agora. Tente de novo em alguns minutos ou pague com Pix.';

/**
 * POST /pagamento/cartao (D43): cartão em 1 a 6 parcelas, sem juros para o aluno (a taxa do Asaas
 * fica com o dono). O aluno digita o cartão na página do Asaas; o webhook libera como no Pix.
 * Reaproveita o cartão pendente com o mesmo valor, cupom e parcelas; senão cria outro e remove o antigo.
 */
export async function gerarCartao(
  deps: Deps,
  usuario: Usuario,
  agora: Date,
  parcelas: number,
  concursoIdPedido?: string,
  cupomCodigo?: string,
): Promise<CartaoResposta> {
  if (!cartaoDisponivel(deps.config, agora)) {
    throw falha('conflito', 'O pagamento no cartão não está disponível. Pague com Pix.');
  }
  const { db, asaas } = deps;
  const resultado = await umPorAluno(usuario.id, async () => {
    const { u, concurso, cupom, preco } = await dadosDaCompra(deps, usuario.id, agora, concursoIdPedido, cupomCodigo);
    const [pendente] = await db
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, u.id),
          eq(pedidos.produto, 'concurso'),
          eq(pedidos.concursoId, concurso.id),
          eq(pedidos.status, 'pendente'),
          isNotNull(pedidos.parcelas),
        ),
      )
      .orderBy(desc(pedidos.criadoEm))
      .limit(1);
    if (
      pendente &&
      pendente.parcelas === parcelas &&
      pendente.valorCentavos === preco.centavos &&
      (pendente.cupomId ?? null) === (cupom?.id ?? null) &&
      pendente.cartaoUrl &&
      (!pendente.pixExpiraEm || pendente.pixExpiraEm > agora)
    ) {
      return { pedidoId: pendente.id, valorCentavos: pendente.valorCentavos, parcelas, url: pendente.cartaoUrl };
    }
    if (pendente) {
      const substituido = await db
        .update(pedidos)
        .set({ status: 'vencido' })
        .where(and(eq(pedidos.id, pendente.id), eq(pedidos.status, 'pendente')))
        .returning({ id: pedidos.id });
      if (substituido.length !== 1) throw falha('conflito', 'Este pagamento acabou de ser confirmado. Atualize a tela.');
      if (pendente.asaasPaymentId) {
        await removerCobrancaAsaas(deps.asaas, pendente.asaasPaymentId, pendente.parcelas).catch((e: Error) => {
          deps.log.warn({ pedidoId: pendente.id, erro: e.message }, 'cartão substituído não foi removido no asaas');
        });
      }
    }
    if (!u.cpf || !u.celular) throw falha('pix_indisponivel', TEXTO_CARTAO_ERRO);
    try {
      const customerId = await clienteAsaasDo(deps, u);
      const dueDate = somarDias(diaSP(agora), 1);
      const total = centavosParaReais(preco.centavos);
      const cobranca = await asaas.criarCobranca({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        ...(parcelas > 1 ? { installmentCount: parcelas, totalValue: total } : { value: total }),
        dueDate,
        description: descricaoCobranca(concurso.nome),
        externalReference: referenciaExterna(u.id),
      });
      if (!cobranca.invoiceUrl) throw new Error('Asaas não devolveu o invoiceUrl.');
      const [p] = await db
        .insert(pedidos)
        .values({
          usuarioId: u.id,
          concursoId: concurso.id,
          asaasCustomerId: customerId,
          asaasPaymentId: cobranca.id,
          valorCentavos: preco.centavos,
          valorOriginalCentavos: preco.originalCentavos,
          cupomId: cupom?.id ?? null,
          status: 'pendente',
          parcelas,
          cartaoUrl: cobranca.invoiceUrl,
          // Vale até o fim do vencimento: o job de 10 min o encerra como faz com o Pix.
          pixExpiraEm: lerDataAsaas(dueDate),
          criadoEm: agora,
        })
        .returning();
      deps.log.info({ pedidoId: p!.id, usuarioId: u.id, parcelas }, 'cartão gerado');
      if (cupom?.limiteUsos != null) await garantirReservaCupom(deps, p!, agora);
      return { pedidoId: p!.id, valorCentavos: p!.valorCentavos, parcelas, url: cobranca.invoiceUrl };
    } catch (e) {
      if (e instanceof ErroHttp) throw e;
      deps.log.error({ usuarioId: u.id, erro: (e as Error).message }, 'falha ao gerar cartão');
      return null;
    }
  });
  if (!resultado) throw falha('pix_indisponivel', TEXTO_CARTAO_ERRO);
  return resultado;
}

/** POST /pagamento/cupom (D23): o valor do Pix com o cupom, sem gerar cobrança. */
export async function consultarCupom(
  deps: Deps,
  usuario: Usuario,
  agora: Date,
  codigo: string,
  concursoIdPedido?: string,
): Promise<CupomConsultaResposta> {
  const { db } = deps;
  const concurso = concursoIdPedido ? await concursoAbertoPorId(db, concursoIdPedido) : await concursoDoUsuario(db, usuario);
  if (!concurso) throw falha('nao_encontrado', 'Concurso não encontrado.');
  const cupom = await cupomValido(db, codigo, concurso.id, agora, usuario.id);
  const preco = precoComCupom(await precoDoConcurso(deps, db, usuario.id, concurso.id), cupom);
  const original = preco.originalCentavos ?? preco.centavos;
  return {
    codigo: cupom.codigo,
    descricao: descricaoCupom(cupom),
    valorCentavos: preco.centavos,
    valorOriginalCentavos: original,
    descontoCentavos: original - preco.centavos,
  };
}

const ultimaConsulta = new Map<string, number>();
const INTERVALO_CONSULTA_MS = 15_000;

/** GET /pagamento/status, com consulta direta ao Asaas depois de 60 s pendente. */
export async function statusPagamento(
  deps: Deps,
  u: Usuario,
  agora: Date,
  concursoIdPedido?: string,
): Promise<StatusPagamentoResposta> {
  const { db } = deps;
  const concurso = concursoIdPedido ? { id: concursoIdPedido } : await concursoDoUsuario(db, u);
  const concursoId = concurso?.id ?? null;
  const [linha] = concursoId
    ? await db
        .select()
        .from(usuariosConcursos)
        .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concursoId)))
    : [];
  // Sem linha (equipe, legado) vale o acesso global para o concurso ativo.
  const acessoAoConcurso = () => (linha ? linha.acesso : !concursoIdPedido && u.acesso);
  let acesso = acessoAoConcurso();
  let [p] = await db
    .select()
    .from(pedidos)
    // D34: o pedido das apostilas não entra no status do concurso.
    .where(and(eq(pedidos.usuarioId, u.id), eq(pedidos.produto, 'concurso'), concursoId ? eq(pedidos.concursoId, concursoId) : undefined))
    .orderBy(desc(pedidos.criadoEm))
    .limit(1);
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
          if (p?.status === 'pago') acesso = true;
        }
      } catch (e) {
        deps.log.warn({ pedidoId, erro: (e as Error).message }, 'consulta ao Asaas falhou');
      }
    }
  }
  if (!p) {
    return { status: 'nenhum', acesso, concursoId, pedidoId: null, expiraEm: null, pagoEm: null, expirado: false };
  }
  const expirado =
    p.status === 'vencido' || (p.status === 'pendente' && p.pixExpiraEm !== null && p.pixExpiraEm <= agora);
  return {
    status: p.status,
    acesso,
    concursoId,
    pedidoId: p.id,
    expiraEm: isoOuNull(p.pixExpiraEm),
    pagoEm: isoOuNull(p.pagoEm),
    expirado,
  };
}

/** Identificador do recibo: a cobrança do Asaas ou, no pagamento manual, "manual-<pedido>". */
export function idRecibo(p: Pick<Pedido, 'id' | 'asaasPaymentId' | 'metodo'>): string {
  return p.metodo === 'manual' || !p.asaasPaymentId ? `manual-${p.id.slice(0, 8)}` : p.asaasPaymentId;
}

/** E-mail de confirmação com o recibo (boas-vindas). Usado no webhook, no manual e no reenvio. */
export function enviarEmailConfirmacao(deps: Deps, pedido: Pedido, usuario: Usuario): void {
  if (pedido.produto === 'apostilas') {
    deps.enviarEmail(
      emailApostilasLiberadas({
        nome: usuario.nome,
        email: usuario.email,
        valorCentavos: pedido.valorCentavos,
        pagoEm: pedido.pagoEm ?? pedido.criadoEm,
        cobrancaId: idRecibo(pedido),
        appUrl: deps.config.appUrl,
      }),
    );
    return;
  }
  deps.enviarEmail(
    emailBoasVindas({
      nome: usuario.nome,
      email: usuario.email,
      valorCentavos: pedido.valorCentavos,
      pagoEm: pedido.pagoEm ?? pedido.criadoEm,
      cobrancaId: idRecibo(pedido),
      appUrl: deps.config.appUrl,
      parcelas: pedido.parcelas,
    }),
  );
}

/**
 * Pedido pago: libera o acesso e manda o e-mail de boas-vindas com recibo. Idempotente
 * (pedido já pago ou estornado não muda: um webhook atrasado não duplica nem reverte nada).
 */
export async function confirmarPagamento(
  deps: Deps,
  paymentId: string,
  agora: Date,
  opcoes: { valorLiquidoCentavos?: number | null; valorPagoCentavos?: number | null } = {},
): Promise<boolean> {
  const resultado = await deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.asaasPaymentId, paymentId)).for('update');
    if (!p || p.status === 'pago' || p.status === 'estornado') return null;
    // Cobrança com valor menor que o do pedido (alterada no painel do Asaas) não libera, venha
    // a confirmação do webhook, do status ou da conciliação (validação PIE V1-07).
    if (valorMenorQueOPedido(opcoes.valorPagoCentavos, p.valorCentavos, p.parcelas)) {
      deps.log.warn({ pedidoId: p.id, valorCentavos: opcoes.valorPagoCentavos }, 'pagamento com valor menor que o pedido');
      return null;
    }
    const [pago] = await tx
      .update(pedidos)
      .set({
        status: 'pago',
        pagoEm: agora,
        ...(opcoes.valorLiquidoCentavos != null ? { valorLiquidoCentavos: opcoes.valorLiquidoCentavos } : {}),
      })
      .where(eq(pedidos.id, p.id))
      .returning();
    // D34: as apostilas só abrem o download; não liberam concurso nem gastam o teste grátis.
    if (p.produto === 'apostilas') return { pedido: pago!, usuario: await usuarioDe(tx, p.usuarioId) };
    // D21: o pagamento libera o CONCURSO do pedido (pedidos antigos sem concurso: o do aluno).
    const concursoId = p.concursoId ?? (await concursoDoUsuario(tx, await usuarioDe(tx, p.usuarioId)))?.id;
    if (concursoId) await liberarConcurso(tx, p.usuarioId, concursoId, agora);
    else await tx.update(usuarios).set({ acesso: true, testeAte: null, testePendente: false }).where(eq(usuarios.id, p.usuarioId));
    return { pedido: pago!, usuario: await usuarioDe(tx, p.usuarioId) };
  });
  if (!resultado) return false;
  enviarEmailConfirmacao(deps, resultado.pedido, resultado.usuario);
  await cancelarOutrasCobrancas(deps, resultado.pedido);
  return true;
}

/**
 * D43: pagou por um caminho (Pix ou cartão), a outra cobrança aberta do mesmo concurso sai do
 * Asaas, para o aluno não pagar duas vezes. Falha aqui só vai para o log.
 */
async function cancelarOutrasCobrancas(deps: Deps, pago: Pedido): Promise<void> {
  const abertos = await deps.db
    .update(pedidos)
    .set({ status: 'vencido' })
    .where(
      and(
        eq(pedidos.usuarioId, pago.usuarioId),
        eq(pedidos.produto, pago.produto),
        pago.concursoId ? eq(pedidos.concursoId, pago.concursoId) : isNull(pedidos.concursoId),
        eq(pedidos.status, 'pendente'),
        ne(pedidos.id, pago.id),
      ),
    )
    .returning();
  for (const p of abertos) {
    if (!p.asaasPaymentId) continue;
    await removerCobrancaAsaas(deps.asaas, p.asaasPaymentId, p.parcelas).catch((e: Error) => {
      deps.log.warn({ pedidoId: p.id, erro: e.message }, 'cobrança aberta não foi removida no asaas após o pagamento');
    });
  }
}

async function usuarioDe(db: Db, id: string): Promise<Usuario> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  return u!;
}

/**
 * O Asaas informou um valor pago menor que o do pedido? (sem valor informado: não). D43: no cartão
 * parcelado o Asaas informa o valor de UMA parcela, e o arredondamento cabe em 1 centavo por parcela.
 */
export function valorMenorQueOPedido(
  valorPagoCentavos: number | null | undefined,
  valorPedido: number,
  parcelas: number | null = null,
): boolean {
  if (typeof valorPagoCentavos !== 'number') return false;
  const n = parcelas && parcelas > 1 ? parcelas : 1;
  return valorPagoCentavos * n + (n - 1) < valorPedido;
}

/**
 * Estorno ou chargeback: pedido estornado e o acesso AO CONCURSO do pedido revogado (D21). O aluno
 * só perde o acesso geral, com as sessões derrubadas, se não sobrar nenhum concurso liberado. Se
 * houver outro pedido pago do mesmo concurso (Pix em dobro, aprovação manual), nada é revogado.
 */
export async function estornarPagamento(deps: Deps, paymentId: string, agora: Date): Promise<boolean> {
  const resultado = await deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.asaasPaymentId, paymentId)).for('update');
    if (!p || p.status === 'estornado') return null;
    await tx.update(pedidos).set({ status: 'estornado', estornadoEm: agora }).where(eq(pedidos.id, p.id));
    // D34: estornar as apostilas só fecha o download; o concurso e as sessões não mudam.
    if (p.produto === 'apostilas') return { pedido: p, usuario: await usuarioDe(tx, p.usuarioId) };
    const concursoId = p.concursoId ?? (await concursoDoUsuario(tx, await usuarioDe(tx, p.usuarioId)))?.id ?? null;
    const [outroPago] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, p.usuarioId),
          eq(pedidos.status, 'pago'),
          eq(pedidos.produto, 'concurso'),
          ne(pedidos.id, p.id),
          concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        ),
      )
      .limit(1);
    let temAcesso = true;
    if (!outroPago) {
      temAcesso = concursoId
        ? await revogarConcurso(tx, p.usuarioId, concursoId)
        : (await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, p.usuarioId)), false);
    }
    if (!temAcesso) await encerrarSessoesDoUsuario(tx, p.usuarioId);
    return { pedido: p, usuario: await usuarioDe(tx, p.usuarioId) };
  });
  if (!resultado) return false;
  if (!resultado.usuario.excluidoEm) {
    deps.enviarEmail(
      emailReembolso({
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        valorCentavos: resultado.pedido.valorCentavos,
        cobrancaId: paymentId,
        produto: resultado.pedido.produto,
        appUrl: deps.config.appUrl,
      }),
    );
  }
  return true;
}

/**
 * O evento do webhook é de uma cobrança do Fuse Aprova? Sim quando o `payment.id` é de um
 * pedido nosso (cobre as referências antigas "usuario:<id>") ou quando o `externalReference`
 * tem o prefixo "fuseaprova:". A conta Asaas é compartilhada (DECISOES D14).
 */
export async function eventoEhNosso(
  db: Db,
  paymentId: string | undefined,
  externalReference: string | null | undefined,
): Promise<boolean> {
  if (!paymentId) return false;
  if (referenciaEhDoFuseAprova(externalReference)) return true;
  const [p] = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(eq(pedidos.asaasPaymentId, paymentId))
    .limit(1);
  return p !== undefined;
}

export async function vencerPagamento(db: Db, paymentId: string): Promise<boolean> {
  const r = await db
    .update(pedidos)
    .set({ status: 'vencido' })
    .where(and(eq(pedidos.asaasPaymentId, paymentId), eq(pedidos.status, 'pendente')))
    .returning({ id: pedidos.id });
  return r.length > 0;
}
