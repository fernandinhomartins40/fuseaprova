/**
 * /pagamento/* e /webhooks/asaas (PRD 5.3 e 8.3).
 */
import { z } from 'zod';
import { DataHora, Uuid, ZStatusPedido } from './comum.js';

/** POST /pagamento/pix — gera ou reaproveita o Pix pendente não expirado. Sem corpo. */
export const PixResposta = z.object({
  pedidoId: Uuid,
  valorCentavos: z.number().int(),
  /** PNG em base64 (sem o prefixo data:), vindo do Asaas (`encodedImage`). */
  imagem: z.string(),
  /** Pix copia e cola. */
  payload: z.string(),
  expiraEm: DataHora,
  status: ZStatusPedido,
});
export type PixResposta = z.infer<typeof PixResposta>;

/** GET /pagamento/status — consultado a cada 4 s pela PWA. */
export const StatusPagamentoResposta = z.object({
  status: z.union([ZStatusPedido, z.literal('nenhum')]),
  acesso: z.boolean(),
  pedidoId: Uuid.nullable(),
  expiraEm: DataHora.nullable(),
  pagoEm: DataHora.nullable(),
  /** O Pix pendente passou da validade: mostrar "Esse Pix expirou." e GERAR NOVO PIX. */
  expirado: z.boolean(),
});
export type StatusPagamentoResposta = z.infer<typeof StatusPagamentoResposta>;

export const INTERVALO_STATUS_MS = 4000;
/** Depois disso a API consulta o Asaas diretamente (atraso de webhook). */
export const CONSULTA_ASAAS_APOS_MS = 60_000;

/* ----------------------------------------------------------------- Asaas */

export const EVENTOS_ASAAS_PAGO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'] as const;
export const EVENTOS_ASAAS_ESTORNO = ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'] as const;
export const EVENTOS_ASAAS_VENCIDO = ['PAYMENT_OVERDUE'] as const;
/** Status de cobrança que liberam o acesso na consulta direta. */
export const STATUS_ASAAS_PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'] as const;

export const NOME_HEADER_WEBHOOK_ASAAS = 'asaas-access-token';

/** Corpo do webhook do Asaas (campos que usamos; o resto passa). */
export const AsaasWebhookCorpo = z
  .object({
    id: z.string().min(1),
    event: z.string().min(1),
    dateCreated: z.string().optional(),
    payment: z
      .object({
        id: z.string(),
        customer: z.string().optional(),
        value: z.number().optional(),
        status: z.string().optional(),
        billingType: z.string().optional(),
        externalReference: z.string().nullable().optional(),
        paymentDate: z.string().nullable().optional(),
        confirmedDate: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type AsaasWebhookCorpo = z.infer<typeof AsaasWebhookCorpo>;

export type AcaoWebhook = 'pagar' | 'estornar' | 'vencer' | 'ignorar';

/** Qual ação o webhook dispara para cada evento. */
export function acaoDoEventoAsaas(evento: string): AcaoWebhook {
  if ((EVENTOS_ASAAS_PAGO as readonly string[]).includes(evento)) return 'pagar';
  if ((EVENTOS_ASAAS_ESTORNO as readonly string[]).includes(evento)) return 'estornar';
  if ((EVENTOS_ASAAS_VENCIDO as readonly string[]).includes(evento)) return 'vencer';
  return 'ignorar';
}

/** "usuario:<id>" ↔ id. */
export function referenciaExterna(usuarioId: string): string {
  return `usuario:${usuarioId}`;
}

export function usuarioDaReferencia(ref: string | null | undefined): string | null {
  const m = /^usuario:([0-9a-f-]{36})$/i.exec(ref ?? '');
  return m ? m[1]!.toLowerCase() : null;
}

export const DESCRICAO_COBRANCA = 'Fuse Aprova – acesso completo';
