/**
 * Estorno de um pedido (D13, D24/RQ4, S-10): uma implementação só, usada por
 * `/super/pagamentos/:id/estornar`, `/reembolso` e `/desfazer-manual`.
 *
 * - Pedido do Asaas pago: o reembolso é pedido ao Asaas UMA vez. A trava vem antes da chamada
 *   (`update … set reembolso_solicitado_em where status='pago' and reembolso_solicitado_em is null`);
 *   se o Asaas falhar, a trava é desfeita. O acesso ao concurso do pedido cai quando o webhook
 *   PAYMENT_REFUNDED chegar (`estornarPagamento`).
 * - Pedido manual: desfaz a aprovação (`desfazerAprovacaoManual`) e revoga já o concurso do pedido.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { dentroDoArrependimento } from '@fuse/shared';
import type { Deps, Usuario } from '../contexto.js';
import { existe, falha } from '../http/erros.js';
import { ErroAsaas } from '../integracoes/asaas.js';
import { alunoAlvo, desfazerAprovacaoManual, resumoPedido, type AuditarNaTransacao } from './pagamentoManual.js';
import type { Pedido } from './pagamento.js';

const { pedidos } = schema;

const dataBr = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export interface ResultadoEstorno {
  modo: 'asaas' | 'manual';
  antes: Pedido;
  depois: Pedido;
  usuario?: Usuario;
}

/** Reembolso pelo Asaas, idempotente: a 2ª chamada responde 409 e não chama o Asaas de novo. */
export async function estornarPeloAsaas(
  deps: Deps,
  quemFazId: string,
  pedidoId: string,
  opcoes: { foraDoPrazo: boolean },
  agora: Date,
  auditar: AuditarNaTransacao,
): Promise<ResultadoEstorno> {
  const [p] = await deps.db.select().from(pedidos).where(eq(pedidos.id, pedidoId));
  const pedido = existe(p, 'Pagamento não encontrado.');
  // Conta excluída (LGPD) ainda pode ser reembolsada: o pedido continua existindo.
  await alunoAlvo(deps.db, pedido.usuarioId, quemFazId, { permitirExcluido: true });
  if (pedido.metodo === 'manual') throw falha('conflito', 'Este pagamento foi aprovado manualmente: o estorno desfaz a aprovação (use "Estornar" ou "Desfazer aprovação manual").');
  if (pedido.reembolsoSolicitadoEm) {
    throw falha('conflito', `O reembolso deste pagamento já foi pedido ao Asaas em ${dataBr(pedido.reembolsoSolicitadoEm)}. Aguarde a confirmação do Asaas.`);
  }
  if (pedido.status !== 'pago' || !pedido.asaasPaymentId) throw falha('conflito', 'Só é possível estornar um pedido pago.');
  if (!opcoes.foraDoPrazo && !(pedido.pagoEm && dentroDoArrependimento(pedido.pagoEm, agora))) {
    throw falha('fora_do_prazo', 'Passaram mais de 7 dias do pagamento. Marque "fora do prazo" para reembolsar mesmo assim.');
  }
  // A trava: só um pedido de reembolso passa, mesmo com dois cliques ao mesmo tempo.
  const [travado] = await deps.db
    .update(pedidos)
    .set({ reembolsoSolicitadoEm: agora })
    .where(and(eq(pedidos.id, pedido.id), eq(pedidos.status, 'pago'), isNull(pedidos.reembolsoSolicitadoEm)))
    .returning();
  if (!travado) throw falha('conflito', 'O reembolso deste pagamento já foi pedido ao Asaas. Aguarde a confirmação do Asaas.');
  try {
    await deps.asaas.estornar(pedido.asaasPaymentId, { description: 'Reembolso Fuse Aprova' });
  } catch (e) {
    await deps.db
      .update(pedidos)
      .set({ reembolsoSolicitadoEm: null })
      .where(and(eq(pedidos.id, pedido.id), eq(pedidos.reembolsoSolicitadoEm, agora)));
    deps.log.error({ pedidoId: pedido.id, erro: (e as Error).message }, 'falha no estorno do Asaas');
    const detalhe = e instanceof ErroAsaas && e.status === 404 ? 'A cobrança não existe mais no Asaas.' : 'Tente de novo em alguns minutos.';
    throw falha('asaas_indisponivel', `O Asaas não aceitou o estorno agora. ${detalhe}`);
  }
  await auditar(deps.db, {
    alvo: `pedido:${pedido.id}`,
    antes: resumoPedido(pedido),
    depois: resumoPedido(travado),
    detalhes: { foraDoPrazo: opcoes.foraDoPrazo, modo: 'asaas' },
  });
  return { modo: 'asaas', antes: pedido, depois: travado };
}

/** Estorno de um pedido manual: desfaz a aprovação e revoga o concurso do pedido. */
export async function estornarManual(
  deps: Deps,
  quemFazId: string,
  pedidoId: string,
  agora: Date,
  auditar: AuditarNaTransacao,
): Promise<ResultadoEstorno> {
  const [p] = await deps.db.select({ usuarioId: pedidos.usuarioId }).from(pedidos).where(eq(pedidos.id, pedidoId));
  await alunoAlvo(deps.db, existe(p, 'Pagamento não encontrado.').usuarioId, quemFazId, { permitirExcluido: true });
  const r = await desfazerAprovacaoManual(deps, pedidoId, agora, auditar);
  return { modo: 'manual', antes: r.antes, depois: r.depois, usuario: r.usuario };
}

/** Um botão só: escolhe o caminho pelo método do pedido. */
export async function estornarPedido(
  deps: Deps,
  quemFazId: string,
  pedidoId: string,
  opcoes: { foraDoPrazo: boolean },
  agora: Date,
  auditar: { asaas: AuditarNaTransacao; manual: AuditarNaTransacao },
): Promise<ResultadoEstorno> {
  const [p] = await deps.db.select({ metodo: pedidos.metodo }).from(pedidos).where(eq(pedidos.id, pedidoId));
  return existe(p, 'Pagamento não encontrado.').metodo === 'manual'
    ? estornarManual(deps, quemFazId, pedidoId, agora, auditar.manual)
    : estornarPeloAsaas(deps, quemFazId, pedidoId, opcoes, agora, auditar.asaas);
}
