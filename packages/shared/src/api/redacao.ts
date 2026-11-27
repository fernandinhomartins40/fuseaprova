/**
 * D49: preparatório de redação — mini-curso, banco de temas (os já cobrados pela FAU e os nossos,
 * no mesmo formato), folha de 20 a 30 linhas e correção por IA com a Tabela 10.1 do edital.
 */
import { z } from 'zod';
import { CARACTERES_MAX_REDACAO } from '../redacao.js';
import { DataHora, Uuid } from './comum.js';

export const NotasRedacao = z.object({
  conteudo: z.number(),
  estrutura: z.number(),
  expressao: z.number(),
});
export type NotasRedacao = z.infer<typeof NotasRedacao>;

export const CorrecaoRedacao = z.object({
  /** 0 a 100 (Tabela 10.1). */
  nota: z.number(),
  notas: NotasRedacao,
  /** Item 10.39: casos de nota zero (fuga ao tema, desestruturação, identificação...). */
  zerada: z.boolean(),
  motivoZero: z.string().nullable(),
  resumo: z.string(),
  comentarios: z.object({ conteudo: z.string(), estrutura: z.string(), expressao: z.string() }),
  pontosFortes: z.array(z.string()),
  melhorar: z.array(z.string()),
  /** Trechos do próprio texto com o problema e uma sugestão de reescrita. */
  trechos: z.array(z.object({ trecho: z.string(), problema: z.string(), sugestao: z.string() })),
});
export type CorrecaoRedacao = z.infer<typeof CorrecaoRedacao>;

export const AulaRedacao = z.object({
  id: z.string(),
  titulo: z.string(),
  resumo: z.string(),
  minutos: z.number().int(),
  /** Cada seção tem um título e um texto em markdown simples (parágrafos, listas, negrito). */
  secoes: z.array(z.object({ titulo: z.string(), texto: z.string() })),
  fontes: z.array(z.object({ titulo: z.string(), url: z.string() })),
});
export type AulaRedacao = z.infer<typeof AulaRedacao>;

export const TemaRedacao = z.object({
  id: z.string(),
  titulo: z.string(),
  /** Assunto do Anexo II ou "interesse geral". */
  eixo: z.string(),
  /** Texto de apoio (um parágrafo por item), como no caderno. */
  apoio: z.array(z.string()),
  fonteApoio: z.string().nullable(),
  /** Comando da proposta ("redija um texto dissertativo-argumentativo sobre..."). */
  comando: z.string(),
  /** fau: tema real de prova da FAU (com a prova); fuse: tema nosso, no mesmo formato. */
  origem: z.enum(['fau', 'fuse']),
  prova: z.string().nullable(),
});
export type TemaRedacao = z.infer<typeof TemaRedacao>;

export const StatusRedacao = z.enum(['rascunho', 'corrigindo', 'corrigida']);
export type StatusRedacao = z.infer<typeof StatusRedacao>;

export const RedacaoResumo = z.object({
  id: Uuid,
  temaId: z.string(),
  temaTitulo: z.string(),
  status: StatusRedacao,
  linhas: z.number().int(),
  nota: z.number().nullable(),
  atualizadoEm: DataHora,
  corrigidoEm: DataHora.nullable(),
});
export type RedacaoResumo = z.infer<typeof RedacaoResumo>;

export const Redacao = RedacaoResumo.extend({
  texto: z.string(),
  correcao: CorrecaoRedacao.nullable(),
});
export type Redacao = z.infer<typeof Redacao>;

export const CotaRedacao = z.object({
  usadas: z.number().int(),
  limite: z.number().int(),
  restantes: z.number().int(),
  renovaEm: DataHora,
});
export type CotaRedacao = z.infer<typeof CotaRedacao>;

export const RedacaoPainel = z.object({
  aulas: z.array(AulaRedacao),
  temas: z.array(TemaRedacao),
  redacoes: z.array(RedacaoResumo),
  cota: CotaRedacao,
});
export type RedacaoPainel = z.infer<typeof RedacaoPainel>;

const TextoRedacao = z
  .string()
  .max(CARACTERES_MAX_REDACAO, `Use no máximo ${CARACTERES_MAX_REDACAO} caracteres.`);

export const RedacaoCriarEntrada = z.object({
  temaId: z.string().min(1).max(60),
  texto: TextoRedacao.default(''),
});
export type RedacaoCriarEntrada = z.infer<typeof RedacaoCriarEntrada>;

export const RedacaoSalvarEntrada = z.object({ texto: TextoRedacao });
export type RedacaoSalvarEntrada = z.infer<typeof RedacaoSalvarEntrada>;

export const RedacaoCorrigirResposta = z.object({ redacao: Redacao, cota: CotaRedacao });
export type RedacaoCorrigirResposta = z.infer<typeof RedacaoCorrigirResposta>;
