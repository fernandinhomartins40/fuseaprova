/**
 * /pagamento/* e /webhooks/asaas (PRD 5.3 e 8.3).
 */
import { z } from 'zod';
import { DataHora, Uuid, ZStatusPedido } from './comum.js';

/**
 * POST /pagamento/pix — gera ou reaproveita o Pix pendente não expirado de UM concurso (D21).
 * Sem `concursoId`, é o concurso ativo do aluno (a 1ª compra).
 */
export const PixEntrada = z.object({ concursoId: Uuid.optional() }).default({});
export type PixEntrada = z.input<typeof PixEntrada>;

export const PixResposta = z.object({
  pedidoId: Uuid,
  /** Concurso que este pagamento libera. */
  concursoId: Uuid,
  concursoNome: z.string(),
  valorCentavos: z.number().int(),
  /** PNG em base64 (sem o prefixo data:), vindo do Asaas (`encodedImage`). */
  imagem: z.string(),
  /** Pix copia e cola. */
  payload: z.string(),
  expiraEm: DataHora,
  status: ZStatusPedido,
});
export type PixResposta = z.infer<typeof PixResposta>;

/** GET /pagamento/status?concursoId= — consultado a cada 4 s pela PWA. */
export const StatusPagamentoQuery = z.object({ concursoId: Uuid.optional() });
export type StatusPagamentoQuery = z.input<typeof StatusPagamentoQuery>;

export const StatusPagamentoResposta = z.object({
  status: z.union([ZStatusPedido, z.literal('nenhum')]),
  /** O concurso consultado está liberado para o aluno. */
  acesso: z.boolean(),
  concursoId: Uuid.nullable(),
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

/*
 * Eventos de cobrança conferidos em https://docs.asaas.com/docs/webhook-para-cobrancas (24/10/2026).
 * PAYMENT_CONFIRMED = pago, saldo ainda não disponível; PAYMENT_RECEIVED = saldo disponível.
 * Estorno parcial (PAYMENT_PARTIALLY_REFUNDED) e estorno em andamento (PAYMENT_REFUND_IN_PROGRESS)
 * não revogam o acesso: só o estorno total (PAYMENT_REFUNDED) ou o chargeback.
 * PAYMENT_DELETED (cobrança removida) encerra o Pix pendente, como o vencimento (DECISOES D14).
 */
export const EVENTOS_ASAAS_PAGO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'] as const;
export const EVENTOS_ASAAS_ESTORNO = ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'] as const;
export const EVENTOS_ASAAS_VENCIDO = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED'] as const;
/** Os únicos eventos cadastrados no webhook (deploy/asaas-webhook.sh usa esta mesma lista). */
export const EVENTOS_ASAAS_WEBHOOK = [...EVENTOS_ASAAS_PAGO, ...EVENTOS_ASAAS_ESTORNO, ...EVENTOS_ASAAS_VENCIDO] as const;
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

/**
 * Prefixo do `externalReference` das cobranças e clientes do Fuse Aprova. A conta Asaas é
 * compartilhada com outras aplicações, e o prefixo separa o que é nosso (DECISOES D14).
 */
export const PREFIXO_REFERENCIA_ASAAS = 'fuseaprova:';

/** "fuseaprova:usuario:<id>" ↔ id. Também lê o formato antigo "usuario:<id>". */
export function referenciaExterna(usuarioId: string): string {
  return `${PREFIXO_REFERENCIA_ASAAS}usuario:${usuarioId}`;
}

export function usuarioDaReferencia(ref: string | null | undefined): string | null {
  const m = /^(?:fuseaprova:)?usuario:([0-9a-f-]{36})$/i.exec(ref ?? '');
  return m ? m[1]!.toLowerCase() : null;
}

/** A referência foi gerada por este app (só o formato novo; o antigo é reconhecido pelo pedido). */
export function referenciaEhDoFuseAprova(ref: string | null | undefined): boolean {
  return (ref ?? '').startsWith(PREFIXO_REFERENCIA_ASAAS);
}

/** Aparece para o pagador e no painel da conta compartilhada: identifica o produto. */
export function descricaoCobranca(concursoNome: string): string {
  return `Fuse Aprova: acesso ao preparatório do ${concursoNome}`.slice(0, 200);
}
