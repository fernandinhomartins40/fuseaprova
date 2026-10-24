/**
 * /pagamento/* e /webhooks/asaas (PRD 8.3).
 */
import { eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { acaoDoEventoAsaas } from '@fuse/shared/api';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { confirmarPagamento, estornarPagamento, gerarPix, statusPagamento, vencerPagamento } from '../servicos/pagamento.js';

const { webhookEventos } = schema;

export function rotasPagamento(r: Registrador): void {
  r.rota('pagamentoPix', async ({ usuario, deps, agora }) => gerarPix(deps, usuario, agora));

  r.rota('pagamentoStatus', async ({ usuario, deps, agora }) => statusPagamento(deps, usuario, agora));

  r.rota('webhookAsaas', async ({ corpo, deps, agora, req }) => {
    // Idempotente pelo id do evento: repetir o mesmo webhook não faz nada.
    const inserido = await deps.db
      .insert(webhookEventos)
      .values({ id: corpo.id, evento: corpo.event, corpo, recebidoEm: agora })
      .onConflictDoNothing()
      .returning({ id: webhookEventos.id });
    if (inserido.length === 0) return { ok: true as const };

    const paymentId = corpo.payment?.id;
    let erro: string | null = null;
    try {
      const acao = acaoDoEventoAsaas(corpo.event);
      if (paymentId) {
        if (acao === 'pagar') await confirmarPagamento(deps, paymentId, agora);
        else if (acao === 'estornar') await estornarPagamento(deps, paymentId, agora);
        else if (acao === 'vencer') await vencerPagamento(deps.db, paymentId);
      }
    } catch (e) {
      erro = (e as Error).message;
      req.log.error({ evento: corpo.event, eventoId: corpo.id, erro }, 'falha ao processar webhook');
      // Libera o id para o Asaas reenviar o evento (a fila do Asaas tenta de novo em erro).
      await deps.db.delete(webhookEventos).where(eq(webhookEventos.id, corpo.id));
      throw falha('interno');
    }
    await deps.db
      .update(webhookEventos)
      .set({ processadoEm: agora, erro })
      .where(eq(webhookEventos.id, corpo.id));
    return { ok: true as const };
  });
}
