/**
 * Ações do superadmin sobre o pagamento de um aluno (D13, D24/RQ4). Nenhuma delas é acesso
 * gratuito: liberar exige um pedido pago, aprovar manualmente grava a receita com o valor do pedido
 * (ou o preço do concurso para aquele aluno) e estornar revoga.
 *
 * - `aprovarPedidoManual`: o Pix pendente ou vencido DESTE pedido foi pago por fora. Antes, o Asaas
 *   é consultado: se a cobrança está paga lá, o pedido é confirmado pelo caminho normal (é
 *   conciliação, não manual). Senão, este pedido vira pago (`metodo='manual'`) com o valor, o cupom
 *   e o concurso dele, e a cobrança no Asaas é recebida em dinheiro (com o mesmo valor) ou cancelada.
 * - `aprovarPagamentoManual`: pagamento por fora sem pedido na tela (ficha do usuário). O concurso é
 *   explícito; se houver Pix pendente ou vencido desse concurso, é ele que vira pago (sem cobrança
 *   dupla); senão nasce um pedido manual com `precoDoConcurso` (desconto D21, se couber).
 * - `liberarPedido`: pedido pago cujo concurso não ficou liberado; libera só o concurso do pedido.
 * - `desfazerAprovacaoManual`: estorno de um pedido manual (revoga só o concurso do pedido).
 *
 * Todas valem só para conta de aluno e nunca para a própria conta. São idempotentes: repetir não
 * cria pedido nem libera nada a mais. A auditoria é gravada na mesma transação da mudança.
 */
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { centavosParaReais, diaSP, diferencaDias } from '@fuse/shared';
import type { FormaPagamentoManual } from '@fuse/shared';
import { STATUS_ASAAS_PAGO, type AprovarManualResposta } from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { existe, falha } from '../http/erros.js';
import { ErroAsaas } from '../integracoes/asaas.js';
import type { Db } from '../util.js';
import { liberarConcurso, precoDoConcurso, revogarConcurso } from './concursos.js';
import { confirmarPagamento, enviarEmailConfirmacao, valorMenorQueOPedido, type Pedido } from './pagamento.js';
import { encerrarSessoesDoUsuario } from './sessoes.js';
import { concursoDoUsuario } from './usuario.js';

/** V-02: reembolso já pedido ao Asaas — o concurso do pagamento não é religado. */
const MSG_REEMBOLSO_PEDIDO =
  'Há um reembolso pedido ao Asaas para o pagamento deste concurso: o acesso não pode ser religado. Aguarde a confirmação do estorno.';

const { pedidos, usuarios, usuariosConcursos, concursos } = schema;

export interface DadosAprovacao {
  recebidoEm: string;
  forma: FormaPagamentoManual;
  observacao: string;
  referencia?: string | undefined;
  comprovante?: string | undefined;
  acaoAsaas: 'receber_em_dinheiro' | 'cancelar';
}

/** Grava a auditoria dentro da transação da mudança. */
export type AuditarNaTransacao = (
  tx: Db,
  dados: { alvo: string; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null; detalhes?: Record<string, unknown> },
) => Promise<void>;

export interface ResultadoAprovacao {
  resposta: AprovarManualResposta;
  antes: Pedido | null;
  depois: Pedido;
}

/** Resumo do pedido para o antes/depois da auditoria (sem payload Pix). */
export function resumoPedido(p: Pedido): Record<string, unknown> {
  return {
    status: p.status,
    metodo: p.metodo,
    valorCentavos: p.valorCentavos,
    valorOriginalCentavos: p.valorOriginalCentavos,
    cupomId: p.cupomId,
    concursoId: p.concursoId,
    asaasPaymentId: p.asaasPaymentId,
    pagoEm: p.pagoEm?.toISOString() ?? null,
    estornadoEm: p.estornadoEm?.toISOString() ?? null,
    canceladoEm: p.canceladoEm?.toISOString() ?? null,
    reembolsoSolicitadoEm: p.reembolsoSolicitadoEm?.toISOString() ?? null,
  };
}

function validarData(d: Pick<DadosAprovacao, 'recebidoEm'>, agora: Date): void {
  const hoje = diaSP(agora);
  if (diferencaDias(hoje, d.recebidoEm) < 0) {
    throw falha('validacao', 'A data do recebimento não pode ser no futuro.', { recebidoEm: 'A data do recebimento não pode ser no futuro.' });
  }
  if (diferencaDias(hoje, d.recebidoEm) > 365) {
    throw falha('validacao', 'A data do recebimento é de mais de um ano atrás.', { recebidoEm: 'Confira a data do recebimento.' });
  }
}

/**
 * D24: as ações de pagamento valem só para conta de aluno e nunca para a própria conta. Com `tx`
 * dentro de uma transação, a linha do aluno fica travada (serializa duas ações ao mesmo tempo).
 */
export async function alunoAlvo(
  db: Db,
  usuarioId: string,
  quemFazId: string,
  opcoes: { travar?: boolean; permitirExcluido?: boolean } = {},
): Promise<Usuario> {
  if (usuarioId === quemFazId) throw falha('conflito', 'Você não pode fazer esta ação na própria conta.');
  const q = db.select().from(usuarios).where(eq(usuarios.id, usuarioId));
  const [u] = opcoes.travar ? await q.for('update') : await q;
  const aluno = existe(u, 'Usuário não encontrado.');
  if (aluno.papel !== 'aluno') throw falha('proibido', 'Esta ação vale só para contas de aluno. Contas da equipe não estudam nem pagam.');
  if (aluno.excluidoEm && !opcoes.permitirExcluido) throw falha('conflito', 'Esta conta foi excluída.');
  return aluno;
}

/** O concurso que o pedido libera (pedidos antigos sem concurso: o ativo do aluno). */
async function concursoDoPedido(tx: Db, p: Pick<Pedido, 'concursoId'>, aluno: Usuario): Promise<string | null> {
  return p.concursoId ?? (await concursoDoUsuario(tx, aluno))?.id ?? null;
}

async function liberar(tx: Db, aluno: Usuario, concursoId: string | null, agora: Date): Promise<void> {
  if (concursoId) await liberarConcurso(tx, aluno.id, concursoId, agora);
  else await tx.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, aluno.id));
}

/** O concurso já está liberado para o aluno? (sem concurso: o acesso geral) */
export async function concursoEstaLiberado(tx: Db, aluno: Pick<Usuario, 'id' | 'acesso'>, concursoId: string | null): Promise<boolean> {
  if (!concursoId) return aluno.acesso;
  const [l] = await tx
    .select({ acesso: usuariosConcursos.acesso })
    .from(usuariosConcursos)
    .where(and(eq(usuariosConcursos.usuarioId, aluno.id), eq(usuariosConcursos.concursoId, concursoId)));
  return l?.acesso === true;
}

async function pagoDoConcurso(tx: Db, usuarioId: string, concursoId: string | null, exceto?: string): Promise<Pedido | undefined> {
  const [p] = await tx
    .select()
    .from(pedidos)
    .where(
      and(
        eq(pedidos.usuarioId, usuarioId),
        eq(pedidos.status, 'pago'),
        concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        exceto ? ne(pedidos.id, exceto) : undefined,
      ),
    )
    .orderBy(desc(pedidos.pagoEm))
    .limit(1);
  return p;
}

const dadosManuais = (d: DadosAprovacao, aprovadorId: string, agora: Date) => ({
  status: 'pago' as const,
  metodo: 'manual' as const,
  pagoEm: agora,
  manualForma: d.forma,
  manualRecebidoEm: d.recebidoEm,
  manualObservacao: d.observacao,
  manualReferencia: d.referencia ?? null,
  manualComprovante: d.comprovante ?? null,
  aprovadoPor: aprovadorId,
});

/* ------------------------------------------------------------------ por pedido */

/**
 * POST /super/pagamentos/:id/aprovar-manual (RQ4). Ver o topo do arquivo.
 */
export async function aprovarPedidoManual(
  deps: Deps,
  aprovadorId: string,
  pedidoId: string,
  d: DadosAprovacao,
  agora: Date,
  auditar: AuditarNaTransacao,
): Promise<ResultadoAprovacao> {
  validarData(d, agora);
  const [p0] = await deps.db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
  const pedido0 = existe(p0, 'Pagamento não encontrado.');
  await alunoAlvo(deps.db, pedido0.usuarioId, aprovadorId);
  if (pedido0.status === 'estornado') throw falha('conflito', 'Este pagamento foi estornado. Para cobrar de novo, gere um novo pedido.');

  // 1) O Asaas diz que a cobrança deste pedido está paga? Então é conciliação, não manual.
  if (pedido0.status !== 'pago' && pedido0.metodo === 'asaas' && pedido0.asaasPaymentId) {
    let pagoNoAsaas: { liquido: number | null; valor: number | null } | null = null;
    try {
      const c = await deps.asaas.obterCobranca(pedido0.asaasPaymentId);
      if (!c.deleted && (STATUS_ASAAS_PAGO as readonly string[]).includes(c.status)) {
        pagoNoAsaas = {
          liquido: typeof c.netValue === 'number' ? Math.round(c.netValue * 100) : null,
          valor: typeof c.value === 'number' ? Math.round(c.value * 100) : null,
        };
      }
    } catch (e) {
      // Cobrança removida no Asaas: não há como ter sido paga lá, segue a aprovação manual.
      if (!(e instanceof ErroAsaas && e.status === 404)) {
        deps.log.error({ pedidoId, erro: (e as Error).message }, 'aprovação manual: falha ao consultar o Asaas');
        throw falha('asaas_indisponivel', 'Não foi possível consultar o Asaas para ver se este Pix já foi pago lá. Tente de novo em alguns minutos.');
      }
    }
    if (pagoNoAsaas) {
      if (valorMenorQueOPedido(pagoNoAsaas.valor, pedido0.valorCentavos)) {
        throw falha('conflito', 'O Asaas diz que esta cobrança foi paga, mas com valor menor que o do pedido. Confira no Asaas antes de liberar o acesso.');
      }
      await confirmarPagamento(deps, pedido0.asaasPaymentId, agora, { valorLiquidoCentavos: pagoNoAsaas.liquido, valorPagoCentavos: pagoNoAsaas.valor });
      const [depois] = await deps.db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
      await auditar(deps.db, { alvo: `pedido:${pedidoId}`, antes: resumoPedido(pedido0), depois: resumoPedido(depois!), detalhes: { pagoNoAsaas: true } });
      return {
        resposta: {
          pedidoId,
          jaAprovado: false,
          pagoNoAsaas: true,
          asaas: { acao: 'nenhuma', ok: true, mensagem: 'A cobrança já estava paga no Asaas.' },
          mensagem: 'Este Pix já estava pago no Asaas: o pedido foi confirmado pelo Asaas (não como manual) e o concurso liberado.',
        },
        antes: pedido0,
        depois: depois!,
      };
    }
  }

  // 2) Marca ESTE pedido como pago (manual), com o valor, o cupom e o concurso dele.
  const r = await deps.db.transaction(async (tx) => {
    const aluno = await alunoAlvo(tx, pedido0.usuarioId, aprovadorId, { travar: true });
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for('update');
    const pedido = p!;
    const concursoId = await concursoDoPedido(tx, pedido, aluno);
    if (pedido.status === 'estornado') throw falha('conflito', 'Este pagamento foi estornado. Para cobrar de novo, gere um novo pedido.');
    const jaPago = pedido.status === 'pago' ? pedido : await pagoDoConcurso(tx, aluno.id, concursoId, pedido.id);
    if (jaPago) {
      // V-02: com reembolso pedido, o concurso não volta (como em "Liberar acesso").
      if (jaPago.reembolsoSolicitadoEm) throw falha('conflito', MSG_REEMBOLSO_PEDIDO);
      // Idempotente: nada é duplicado; só garante que o concurso do pagamento está liberado.
      const liberadoAntes = await concursoEstaLiberado(tx, aluno, concursoId);
      if (!liberadoAntes) await liberar(tx, aluno, concursoId, agora);
      await auditar(tx, {
        alvo: `pedido:${pedido.id}`,
        antes: resumoPedido(pedido),
        depois: resumoPedido(pedido),
        detalhes: { jaAprovado: true, pedidoPagoId: jaPago.id, concursoLiberadoAgora: !liberadoAntes },
      });
      return { jaAprovado: true as const, aluno, antes: pedido, depois: pedido, pedidoPago: jaPago };
    }
    const [depois] = (await tx
      .update(pedidos)
      .set({ ...dadosManuais(d, aprovadorId, agora), concursoId, valorLiquidoCentavos: pedido.valorCentavos })
      .where(and(eq(pedidos.id, pedido.id), inArray(pedidos.status, ['pendente', 'vencido'])))
      .returning()) as [Pedido];
    await liberar(tx, aluno, concursoId, agora);
    await auditar(tx, {
      alvo: `pedido:${pedido.id}`,
      antes: resumoPedido(pedido),
      depois: resumoPedido(depois),
      detalhes: { usuarioId: aluno.id, forma: d.forma, recebidoEm: d.recebidoEm, referencia: d.referencia ?? null, comprovante: d.comprovante ?? null, acaoAsaas: d.acaoAsaas },
    });
    const [atualizado] = await tx.select().from(usuarios).where(eq(usuarios.id, aluno.id));
    return { jaAprovado: false as const, aluno: atualizado!, antes: pedido, depois, pedidoPago: depois };
  });

  if (r.jaAprovado) {
    const mesmo = r.pedidoPago.id === r.depois.id;
    return {
      resposta: {
        pedidoId: r.pedidoPago.id,
        jaAprovado: true,
        pagoNoAsaas: false,
        asaas: { acao: 'nenhuma', ok: true, mensagem: 'Nada foi feito no Asaas.' },
        mensagem: mesmo
          ? 'Este pedido já estava pago: nada foi duplicado. O concurso do pedido está liberado.'
          : 'Este concurso já tem outro pagamento aprovado: nada foi duplicado. Se este Pix ainda estiver aberto, cancele-o.',
      },
      antes: r.antes,
      depois: r.depois,
    };
  }
  enviarEmailConfirmacao(deps, r.depois, r.aluno);
  const cobranca = r.antes.asaasPaymentId && !r.antes.canceladoEm ? r.antes.asaasPaymentId : null;
  const asaas = await tratarCobrancaAberta(deps, cobranca, d, agora, r.depois.valorCentavos, r.antes.canceladoEm !== null);
  return {
    resposta: {
      pedidoId: r.depois.id,
      jaAprovado: false,
      pagoNoAsaas: false,
      asaas,
      mensagem: 'Pagamento aprovado manualmente com o valor do pedido, e o concurso do pedido foi liberado.',
    },
    antes: r.antes,
    depois: r.depois,
  };
}

/* ------------------------------------------------------- pela ficha do usuário */

/**
 * POST /super/usuarios/:id/aprovar-pagamento: concurso explícito. Usa o Pix pendente ou vencido
 * desse concurso, se houver; senão cria um pedido manual com o preço do concurso para o aluno.
 */
export async function aprovarPagamentoManual(
  deps: Deps,
  aprovadorId: string,
  usuarioId: string,
  d: DadosAprovacao & { concursoId: string },
  agora: Date,
  auditar: AuditarNaTransacao,
): Promise<ResultadoAprovacao> {
  validarData(d, agora);
  await alunoAlvo(deps.db, usuarioId, aprovadorId);
  const [c] = await deps.db.select({ id: concursos.id }).from(concursos).where(eq(concursos.id, d.concursoId));
  existe(c, 'Concurso não encontrado.');

  // Um Pix pendente ou vencido desse concurso? É ele que vira pago (sem cobrança dupla).
  const [aberto] = await deps.db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.usuarioId, usuarioId), eq(pedidos.concursoId, d.concursoId), inArray(pedidos.status, ['pendente', 'vencido'])))
    .orderBy(desc(pedidos.criadoEm))
    .limit(1);
  const [pago] = await deps.db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(and(eq(pedidos.usuarioId, usuarioId), eq(pedidos.concursoId, d.concursoId), eq(pedidos.status, 'pago')))
    .limit(1);
  if (aberto && !pago) return aprovarPedidoManual(deps, aprovadorId, aberto.id, d, agora, auditar);

  const r = await deps.db.transaction(async (tx) => {
    const aluno = await alunoAlvo(tx, usuarioId, aprovadorId, { travar: true });
    const jaPago = await pagoDoConcurso(tx, aluno.id, d.concursoId);
    if (jaPago) {
      if (jaPago.reembolsoSolicitadoEm) throw falha('conflito', MSG_REEMBOLSO_PEDIDO);
      const liberadoAntes = await concursoEstaLiberado(tx, aluno, d.concursoId);
      if (!liberadoAntes) await liberarConcurso(tx, aluno.id, d.concursoId, agora);
      await auditar(tx, {
        alvo: `pedido:${jaPago.id}`,
        antes: resumoPedido(jaPago),
        depois: resumoPedido(jaPago),
        detalhes: { usuarioId: aluno.id, jaAprovado: true, concursoLiberadoAgora: !liberadoAntes },
      });
      return { jaAprovado: true as const, aluno, depois: jaPago };
    }
    // D21: o preço daquele concurso para este aluno (cheio ou adicional), o vigente (D23).
    const preco = await precoDoConcurso(deps, tx, aluno.id, d.concursoId);
    const [depois] = (await tx
      .insert(pedidos)
      .values({
        usuarioId: aluno.id,
        concursoId: d.concursoId,
        asaasCustomerId: aluno.asaasCustomerId,
        criadoEm: agora,
        valorCentavos: preco.centavos,
        valorLiquidoCentavos: preco.centavos,
        ...dadosManuais(d, aprovadorId, agora),
      })
      .returning()) as [Pedido];
    await liberarConcurso(tx, aluno.id, d.concursoId, agora);
    await auditar(tx, {
      alvo: `pedido:${depois.id}`,
      antes: null,
      depois: resumoPedido(depois),
      detalhes: { usuarioId: aluno.id, forma: d.forma, recebidoEm: d.recebidoEm, referencia: d.referencia ?? null, comprovante: d.comprovante ?? null, comDesconto: preco.comDesconto },
    });
    const [atualizado] = await tx.select().from(usuarios).where(eq(usuarios.id, aluno.id));
    return { jaAprovado: false as const, aluno: atualizado!, depois };
  });
  if (r.jaAprovado) {
    return {
      resposta: {
        pedidoId: r.depois.id,
        jaAprovado: true,
        pagoNoAsaas: false,
        asaas: { acao: 'nenhuma', ok: true, mensagem: 'Nada foi feito no Asaas.' },
        mensagem: 'O aluno já tinha pagamento aprovado deste concurso: nada foi duplicado. O concurso está liberado.',
      },
      antes: r.depois,
      depois: r.depois,
    };
  }
  enviarEmailConfirmacao(deps, r.depois, r.aluno);
  return {
    resposta: {
      pedidoId: r.depois.id,
      jaAprovado: false,
      pagoNoAsaas: false,
      asaas: { acao: 'nenhuma', ok: true, mensagem: 'Não havia cobrança Pix aberta deste concurso no Asaas.' },
      mensagem: 'Pagamento aprovado manualmente com o preço do concurso, e o concurso foi liberado.',
    },
    antes: null,
    depois: r.depois,
  };
}

/**
 * A cobrança Pix ainda aberta no Asaas não pode continuar pagável (o aluno pagaria duas vezes):
 * recebe em dinheiro, com o valor DO PEDIDO, ou cancela. Falha aqui não desfaz a aprovação.
 */
async function tratarCobrancaAberta(
  deps: Deps,
  paymentId: string | null,
  d: DadosAprovacao,
  agora: Date,
  valorCentavos: number,
  jaCancelada: boolean,
): Promise<AprovarManualResposta['asaas']> {
  if (!paymentId) {
    return { acao: 'nenhuma', ok: true, mensagem: jaCancelada ? 'A cobrança Pix já estava cancelada no Asaas.' : 'Não havia cobrança Pix no Asaas.' };
  }
  try {
    if (d.acaoAsaas === 'receber_em_dinheiro') {
      await deps.asaas.receberEmDinheiro(paymentId, {
        paymentDate: d.recebidoEm,
        value: centavosParaReais(valorCentavos),
        notifyCustomer: false,
      });
      return { acao: 'receber_em_dinheiro', ok: true, mensagem: `Recebimento confirmado no Asaas (cobrança ${paymentId}).` };
    }
    await deps.asaas.removerCobranca(paymentId);
    await deps.db.update(pedidos).set({ canceladoEm: agora }).where(eq(pedidos.asaasPaymentId, paymentId));
    return { acao: 'cancelar', ok: true, mensagem: `Cobrança ${paymentId} cancelada no Asaas.` };
  } catch (e) {
    const msg = e instanceof ErroAsaas ? e.message : 'falha de rede';
    deps.log.warn({ paymentId, erro: msg }, 'aprovação manual: Asaas não aceitou a ação');
    return {
      acao: d.acaoAsaas,
      ok: false,
      mensagem: `O pagamento foi aprovado, mas o Asaas não aceitou a ação na cobrança ${paymentId}. Cancele-a no detalhe do pagamento.`,
    };
  }
}

/* --------------------------------------------------------------------- liberar */

/**
 * POST /super/pagamentos/:id/liberar (RQ4): o pedido está pago e o concurso dele não ficou
 * liberado. Libera só o concurso do pedido. Idempotente (`alterado: false` na 2ª vez).
 */
export async function liberarPedido(
  deps: Deps,
  quemFazId: string,
  pedidoId: string,
  agora: Date,
  auditar: AuditarNaTransacao,
): Promise<{ alterado: boolean; pedido: Pedido }> {
  const [p0] = await deps.db.select({ usuarioId: pedidos.usuarioId }).from(pedidos).where(eq(pedidos.id, pedidoId));
  const { usuarioId } = existe(p0, 'Pagamento não encontrado.');
  return deps.db.transaction(async (tx) => {
    const aluno = await alunoAlvo(tx, usuarioId, quemFazId, { travar: true });
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for('update');
    const pedido = p!;
    if (pedido.status !== 'pago') {
      throw falha('conflito', 'Este pedido não está pago. Use "Conciliar" (pago no Asaas) ou "Aprovar pagamento manual" (pago por fora).');
    }
    if (pedido.reembolsoSolicitadoEm) throw falha('conflito', 'Há um reembolso pedido para este pagamento: o acesso não pode ser liberado.');
    const concursoId = await concursoDoPedido(tx, pedido, aluno);
    const antes = await concursoEstaLiberado(tx, aluno, concursoId);
    if (!antes) await liberar(tx, aluno, concursoId, agora);
    await auditar(tx, {
      alvo: `pedido:${pedido.id}`,
      antes: { concursoId, concursoLiberado: antes },
      depois: { concursoId, concursoLiberado: true },
      detalhes: { usuarioId: aluno.id, alterado: !antes },
    });
    return { alterado: !antes, pedido };
  });
}

/* ------------------------------------------------------------- desfazer manual */

/**
 * Desfaz a aprovação manual (estorno manual): pedido estornado e o concurso DO PEDIDO revogado; as
 * sessões caem só se não sobrar nenhum concurso liberado. Se a cobrança do Asaas foi recebida "em
 * dinheiro", nada é estornado lá: não houve dinheiro pelo Asaas (a devolução é por fora).
 */
export async function desfazerAprovacaoManual(
  deps: Deps,
  pedidoId: string,
  agora: Date,
  auditar?: AuditarNaTransacao,
): Promise<{ antes: Pedido; depois: Pedido; usuario: Usuario }> {
  return deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for('update');
    const pedido = existe(p, 'Pagamento não encontrado.');
    if (pedido.metodo !== 'manual' || pedido.status !== 'pago') {
      throw falha('conflito', 'Só é possível desfazer uma aprovação manual que está paga.');
    }
    const [depois] = await tx.update(pedidos).set({ status: 'estornado', estornadoEm: agora }).where(eq(pedidos.id, pedido.id)).returning();
    const concursoId = pedido.concursoId;
    const [outroPago] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, pedido.usuarioId),
          eq(pedidos.status, 'pago'),
          ne(pedidos.id, pedido.id),
          concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        ),
      )
      .limit(1);
    let temAcesso = true;
    if (!outroPago) {
      temAcesso = concursoId
        ? await revogarConcurso(tx, pedido.usuarioId, concursoId)
        : (await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, pedido.usuarioId)), false);
    }
    if (!temAcesso) await encerrarSessoesDoUsuario(tx, pedido.usuarioId);
    const [u] = await tx.select().from(usuarios).where(eq(usuarios.id, pedido.usuarioId));
    if (auditar) {
      await auditar(tx, { alvo: `pedido:${pedido.id}`, antes: resumoPedido(pedido), depois: { ...resumoPedido(depois!), acessoDoAluno: u!.acesso } });
    }
    return { antes: pedido, depois: depois!, usuario: u! };
  });
}
