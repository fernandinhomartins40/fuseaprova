/**
 * Processamento dos eventos do webhook do Asaas, usado pelo POST /webhooks/asaas e pelo
 * "reprocessar evento" do superadmin (D13). Idempotente: confirmar, estornar e vencer só
 * mudam o pedido quando faz sentido, então processar o mesmo evento de novo não duplica nada.
 *
 * D13: um evento que falha fica gravado com o erro (antes era apagado) e `processado_em`
 * nulo. Se o Asaas reenviar, ele é processado de novo; o superadmin também pode reprocessar.
 */
import { eq, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { acaoDoEventoAsaas, type AsaasWebhookCorpo } from '@fuse/shared/api';
import type { Deps } from '../contexto.js';
import { confirmarPagamento, estornarPagamento, vencerPagamento } from './pagamento.js';

const { webhookEventos, pedidos } = schema;

export type ResultadoEvento = 'pago' | 'estornado' | 'vencido' | 'sem_mudanca' | 'ignorado' | 'sem_pedido';

/** Executa a ação do evento. Lança em caso de erro. */
export async function executarEvento(deps: Deps, corpo: AsaasWebhookCorpo, agora: Date): Promise<ResultadoEvento> {
  const paymentId = corpo.payment?.id;
  const acao = acaoDoEventoAsaas(corpo.event);
  if (acao === 'ignorar' || !paymentId) return 'ignorado';
  const [p] = await deps.db.select({ id: pedidos.id }).from(pedidos).where(eq(pedidos.asaasPaymentId, paymentId));
  if (!p) return 'sem_pedido';
  if (acao === 'pagar') {
    const liquido = typeof corpo.payment?.netValue === 'number' ? Math.round(corpo.payment.netValue * 100) : null;
    return (await confirmarPagamento(deps, paymentId, agora, { valorLiquidoCentavos: liquido })) ? 'pago' : 'sem_mudanca';
  }
  if (acao === 'estornar') return (await estornarPagamento(deps, paymentId, agora)) ? 'estornado' : 'sem_mudanca';
  return (await vencerPagamento(deps.db, paymentId)) ? 'vencido' : 'sem_mudanca';
}

export interface Processamento {
  ok: boolean;
  /** O evento já tinha sido processado com sucesso (repetição). */
  repetido: boolean;
  resultado: string;
  erro: string | null;
}

/**
 * Recebe um evento: grava (idempotente pelo id) e processa. Um evento já processado com
 * sucesso não é processado de novo; um que falhou antes é processado de novo.
 */
export async function receberEvento(deps: Deps, corpo: AsaasWebhookCorpo, agora: Date): Promise<Processamento> {
  const inserido = await deps.db
    .insert(webhookEventos)
    .values({ id: corpo.id, evento: corpo.event, corpo, recebidoEm: agora, ultimaTentativaEm: agora })
    .onConflictDoNothing()
    .returning({ id: webhookEventos.id });
  if (inserido.length === 0) {
    const [existente] = await deps.db.select().from(webhookEventos).where(eq(webhookEventos.id, corpo.id));
    if (existente?.processadoEm) {
      return { ok: true, repetido: true, resultado: existente.resultado ?? 'sem_mudanca', erro: null };
    }
    await deps.db
      .update(webhookEventos)
      .set({ tentativas: sql`${webhookEventos.tentativas} + 1`, ultimaTentativaEm: agora })
      .where(eq(webhookEventos.id, corpo.id));
  }
  return processar(deps, corpo, agora);
}

/** Reprocessa um evento gravado (superadmin). Idempotente. */
export async function reprocessarEvento(deps: Deps, id: string, agora: Date): Promise<Processamento | null> {
  const [e] = await deps.db.select().from(webhookEventos).where(eq(webhookEventos.id, id));
  if (!e) return null;
  await deps.db
    .update(webhookEventos)
    .set({ tentativas: sql`${webhookEventos.tentativas} + 1`, ultimaTentativaEm: agora })
    .where(eq(webhookEventos.id, id));
  return processar(deps, e.corpo as AsaasWebhookCorpo, agora);
}

async function processar(deps: Deps, corpo: AsaasWebhookCorpo, agora: Date): Promise<Processamento> {
  try {
    const resultado = await executarEvento(deps, corpo, agora);
    await deps.db
      .update(webhookEventos)
      .set({ processadoEm: agora, erro: null, resultado })
      .where(eq(webhookEventos.id, corpo.id));
    return { ok: true, repetido: false, resultado, erro: null };
  } catch (e) {
    const erro = (e as Error).message.slice(0, 1000);
    await deps.db
      .update(webhookEventos)
      .set({ processadoEm: null, erro, resultado: 'erro' })
      .where(eq(webhookEventos.id, corpo.id));
    return { ok: false, repetido: false, resultado: 'erro', erro };
  }
}
