/**
 * D23: preços editáveis pelo superadmin (/super/precos) e cupons de desconto (/super/cupons e
 * POST /pagamento/cupom). O valor do Pix sai sempre do servidor; o preço nunca vem do cliente.
 */
import { z } from 'zod';
import { TIPOS_CUPOM } from '../dominio.js';
import { formatarReais } from '../formatacao.js';
import { DESCONTO_MAXIMO_PERCENTUAL, normalizarCodigoCupom, PRECO_MAXIMO_CENTAVOS, PRECO_MINIMO_CENTAVOS } from '../precos.js';
import { DataHora, Uuid } from './comum.js';
import { MotivoObrigatorio, Reconfirmacao } from './superadmin.js';

export const ZTipoCupom = z.enum(TIPOS_CUPOM);

const Centavos = z
  .number({ invalid_type_error: 'Informe o valor.' })
  .int('Use um valor em centavos.')
  .min(PRECO_MINIMO_CENTAVOS, `O mínimo é ${formatarReais(PRECO_MINIMO_CENTAVOS)}.`)
  .max(PRECO_MAXIMO_CENTAVOS, `O máximo é ${formatarReais(PRECO_MAXIMO_CENTAVOS)}.`);

/* ------------------------------------------------------------------ preços */

const PrecosBase = z.object({
  /** 1º concurso do aluno. */
  precoCentavos: Centavos,
  /** Cada concurso adicional de quem já pagou um. */
  precoAdicionalCentavos: Centavos,
  /** Preço "de" (riscado) na landing e no pagamento. null = sem preço riscado. */
  precoDeCentavos: Centavos.nullable(),
});

function regraPrecoDe(v: { precoCentavos: number; precoDeCentavos: number | null }, ctx: z.RefinementCtx): void {
  if (v.precoDeCentavos !== null && v.precoDeCentavos <= v.precoCentavos) {
    ctx.addIssue({ code: 'custom', path: ['precoDeCentavos'], message: 'O preço "de" precisa ser maior que o preço do 1º concurso.' });
  }
}

export const PrecosProduto = PrecosBase.superRefine(regraPrecoDe);
export type PrecosProduto = z.output<typeof PrecosProduto>;

/** GET /super/precos */
export const PrecosResposta = z.object({
  valores: PrecosProduto,
  /** PRICE_CENTS e PRICE_ADICIONAL_CENTS do .env: valem enquanto ninguém salvar pelo painel. */
  padrao: z.object({ precoCentavos: z.number().int(), precoAdicionalCentavos: z.number().int() }),
  atualizadoEm: DataHora.nullable(),
  atualizadoPor: z.object({ id: Uuid, nome: z.string() }).nullable(),
  /** Pix gerados e ainda não pagos (os que serão refeitos se o preço deles mudar). */
  pixPendentes: z.number().int(),
});
export type PrecosResposta = z.infer<typeof PrecosResposta>;

/** PUT /super/precos (reconfirmação). */
export const PrecosSalvarEntrada = PrecosBase.extend({
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
}).superRefine(regraPrecoDe);
export type PrecosSalvarEntrada = z.input<typeof PrecosSalvarEntrada>;

export const PrecosSalvarResposta = PrecosResposta.extend({
  /** Pix pendentes cancelados no Asaas porque o valor deles mudou. */
  cobrancasCanceladas: z.number().int(),
});
export type PrecosSalvarResposta = z.infer<typeof PrecosSalvarResposta>;

/* ------------------------------------------------------------------ cupons */

/** Código como o aluno digita (sem espaços, maiúsculo). */
export const CodigoCupom = z
  .string({ required_error: 'Informe o cupom.' })
  .max(40, 'Cupom inválido.')
  .transform(normalizarCodigoCupom)
  .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, 'Use de 3 a 30 letras, números, - ou _.'));

const CupomBase = z.object({
  codigo: CodigoCupom,
  descricao: z.string().trim().max(200).default(''),
  tipo: ZTipoCupom,
  /** Percentual (1 a 90) ou centavos. */
  valor: z.number({ invalid_type_error: 'Informe o desconto.' }).int('Use um número inteiro.').min(1, 'Informe o desconto.'),
  /** Depois disso o cupom não vale mais. null = sem prazo. */
  validoAte: DataHora.nullable(),
  /** Quantos pagamentos podem usar o cupom. null = sem limite. */
  limiteUsos: z.number().int().min(1, 'Use pelo menos 1.').max(100_000).nullable(),
  /** Só para um concurso. null = qualquer concurso. */
  concursoId: Uuid.nullable(),
  ativo: z.boolean(),
});

function regraValorCupom(v: { tipo: string; valor: number }, ctx: z.RefinementCtx): void {
  if (v.tipo === 'percentual' && v.valor > DESCONTO_MAXIMO_PERCENTUAL) {
    ctx.addIssue({ code: 'custom', path: ['valor'], message: `O desconto máximo é ${DESCONTO_MAXIMO_PERCENTUAL}%. Acesso gratuito não existe.` });
  }
  if (v.tipo === 'fixo' && v.valor > PRECO_MAXIMO_CENTAVOS) {
    ctx.addIssue({ code: 'custom', path: ['valor'], message: `O máximo é ${formatarReais(PRECO_MAXIMO_CENTAVOS)}.` });
  }
}

/**
 * POST /super/cupons e PUT /super/cupons/:id. S-12: um cupom muda o preço na prática, então pede
 * a mesma reconfirmação do preço (D23).
 */
export const CupomSalvarEntrada = CupomBase.extend({ motivo: MotivoObrigatorio, confirmacao: Reconfirmacao }).superRefine(
  regraValorCupom,
);
export type CupomSalvarEntrada = z.input<typeof CupomSalvarEntrada>;

export const CupomItem = CupomBase.extend({
  id: Uuid,
  concursoNome: z.string().nullable(),
  /** Pagamentos confirmados com o cupom. */
  usos: z.number().int(),
  /** Pix gerados com o cupom e ainda não pagos. */
  pendentes: z.number().int(),
  /**
   * S-12 (C8): o que conta para o limite = pagos + Pix pendentes ainda não expirados (reserva).
   * Quando chega ao limite, ninguém mais gera Pix com o cupom; o Pix já pago é sempre honrado.
   */
  reservados: z.number().int(),
  criadoEm: DataHora,
  atualizadoEm: DataHora,
});
export type CupomItem = z.infer<typeof CupomItem>;

export const CuponsResposta = z.object({ itens: z.array(CupomItem) });
export type CuponsResposta = z.infer<typeof CuponsResposta>;

export const CupomSalvarResposta = z.object({
  cupom: CupomItem,
  /** Pix pendentes cancelados no Asaas porque o valor deles mudou. */
  cobrancasCanceladas: z.number().int(),
});
export type CupomSalvarResposta = z.infer<typeof CupomSalvarResposta>;

/** POST /pagamento/cupom — o aluno confere o cupom antes de gerar o Pix. */
export const CupomConsultaEntrada = z.object({ codigo: CodigoCupom, concursoId: Uuid.optional() });
export type CupomConsultaEntrada = z.input<typeof CupomConsultaEntrada>;

export const CupomConsultaResposta = z.object({
  codigo: z.string(),
  /** "20% de desconto" ou "R$ 50,00 de desconto". */
  descricao: z.string(),
  valorCentavos: z.number().int(),
  valorOriginalCentavos: z.number().int(),
  descontoCentavos: z.number().int(),
});
export type CupomConsultaResposta = z.infer<typeof CupomConsultaResposta>;
