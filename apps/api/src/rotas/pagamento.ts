/**
 * /pagamento/* e /webhooks/asaas (PRD 8.3).
 */
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { eventoEhNosso, gerarPix, statusPagamento } from '../servicos/pagamento.js';
import { receberEvento } from '../servicos/webhook.js';

export function rotasPagamento(r: Registrador): void {
  r.rota('pagamentoPix', async ({ usuario, deps, agora }) => gerarPix(deps, usuario, agora));

  r.rota('pagamentoStatus', async ({ usuario, deps, agora }) => statusPagamento(deps, usuario, agora));

  r.rota('webhookAsaas', async ({ corpo, deps, agora, req }) => {
    // A conta Asaas é compartilhada com outras aplicações (DECISOES D14): o webhook recebe
    // os eventos de todas as cobranças da conta. Evento que não é nosso responde 200 sem
    // gravar nada (o corpo traz dados pessoais de clientes de outras aplicações).
    if (!(await eventoEhNosso(deps.db, corpo.payment?.id, corpo.payment?.externalReference))) {
      req.log.debug({ eventoId: corpo.id, evento: corpo.event }, 'webhook de outra aplicação ignorado');
      return { ok: true as const };
    }

    // Idempotente pelo id do evento: repetir o mesmo webhook não faz nada. D13: o evento que
    // falha fica gravado com o erro (o superadmin vê e reprocessa) e é processado de novo
    // quando o Asaas reenviar; respondemos 500 para a fila do Asaas tentar de novo.
    const r = await receberEvento(deps, corpo, agora);
    if (!r.ok) {
      req.log.error({ evento: corpo.event, eventoId: corpo.id, erro: r.erro }, 'falha ao processar webhook');
      throw falha('interno');
    }
    return { ok: true as const };
  });
}
