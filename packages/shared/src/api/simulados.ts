/**
 * Simulados (PRD 5.14). Guarda: exigirAcesso. O tempo é contado no servidor.
 */
import { z } from 'zod';
import {
  CorrecaoQuestao,
  DataHora,
  Distribuicao,
  QuestaoParaAluno,
  Uuid,
  ZLetra,
  ZSlugDisciplina,
} from './comum.js';

/** POST /simulados */
export const CriarSimuladoEntrada = z.object({ cargoId: Uuid });
export type CriarSimuladoEntrada = z.infer<typeof CriarSimuladoEntrada>;

export const RespostaSimulado = z.object({
  letra: ZLetra.nullable(),
  /** Marcada "para revisar depois" na grade 1–40. */
  revisarDepois: z.boolean(),
});
export type RespostaSimulado = z.infer<typeof RespostaSimulado>;

export const QuestaoDoSimulado = z.object({
  numero: z.number().int().min(1),
  bloco: ZSlugDisciplina,
  questao: QuestaoParaAluno,
});

const CargoDoSimulado = z.object({ id: Uuid, nome: z.string() });

/** Simulado em andamento (resposta de POST /simulados e de GET /simulados/:id antes da entrega). */
export const SimuladoAndamento = z.object({
  estado: z.literal('andamento'),
  id: Uuid,
  cargo: CargoDoSimulado,
  iniciadoEm: DataHora,
  terminaEm: DataHora,
  /** Relógio do servidor, para o cronômetro corrigir a diferença do aparelho. */
  agora: DataHora,
  msRestantes: z.number().int(),
  distribuicao: Distribuicao,
  questoes: z.array(QuestaoDoSimulado),
  /** Respostas salvas, por id da questão. */
  respostas: z.record(Uuid, RespostaSimulado),
});
export type SimuladoAndamento = z.infer<typeof SimuladoAndamento>;

export const DesempenhoBloco = z.object({
  bloco: ZSlugDisciplina,
  nome: z.string(),
  questoes: z.number().int(),
  acertos: z.number().int(),
  pontos: z.number(),
  pontosMaximos: z.number(),
});

export const QuestaoCorrigida = QuestaoDoSimulado.extend({
  resposta: ZLetra.nullable(),
  acertou: z.boolean(),
  /** Anulada depois do início (conta como acerto). */
  anulada: z.boolean(),
}).merge(CorrecaoQuestao);

/** Resultado (resposta de POST /simulados/:id/entregar e de GET /simulados/:id depois da entrega). */
export const SimuladoResultado = z.object({
  estado: z.literal('entregue'),
  id: Uuid,
  cargo: CargoDoSimulado,
  iniciadoEm: DataHora,
  entregueEm: DataHora,
  /** Entregue sozinho quando o tempo acabou. */
  entregaAutomatica: z.boolean(),
  tempoGastoMs: z.number().int(),
  pontos: z.number(),
  pontosMaximos: z.number(),
  percentual: z.number(),
  aprovado: z.boolean(),
  /** "APROVADO" ou "ABAIXO DO MÍNIMO" */
  selo: z.string(),
  acertos: z.number().int(),
  totalQuestoes: z.number().int(),
  porBloco: z.array(DesempenhoBloco),
  xpGanho: z.number().int(),
  questoes: z.array(QuestaoCorrigida),
});
export type SimuladoResultado = z.infer<typeof SimuladoResultado>;

/** GET /simulados/:id */
export const SimuladoDetalheResposta = z.discriminatedUnion('estado', [
  SimuladoAndamento,
  SimuladoResultado,
]);
export type SimuladoDetalheResposta = z.infer<typeof SimuladoDetalheResposta>;

/** GET /simulados — histórico ("Seus simulados"). */
export const SimuladosHistoricoResposta = z.object({
  emAndamento: z.object({ id: Uuid, terminaEm: DataHora, cargo: CargoDoSimulado }).nullable(),
  itens: z.array(
    z.object({
      id: Uuid,
      cargo: CargoDoSimulado,
      iniciadoEm: DataHora,
      entregueEm: DataHora,
      pontos: z.number(),
      percentual: z.number(),
      aprovado: z.boolean(),
      acertos: z.number().int(),
      totalQuestoes: z.number().int(),
      tempoGastoMs: z.number().int(),
    }),
  ),
});
export type SimuladosHistoricoResposta = z.infer<typeof SimuladosHistoricoResposta>;

/** PUT /simulados/:id/resposta — salva sem feedback. */
export const SalvarRespostaSimuladoEntrada = z.object({
  questaoId: Uuid,
  letra: ZLetra.nullable(),
  revisarDepois: z.boolean().optional(),
});
export type SalvarRespostaSimuladoEntrada = z.infer<typeof SalvarRespostaSimuladoEntrada>;

export const SalvarRespostaSimuladoResposta = z.object({
  ok: z.literal(true),
  msRestantes: z.number().int(),
  emBranco: z.number().int(),
});
export type SalvarRespostaSimuladoResposta = z.infer<typeof SalvarRespostaSimuladoResposta>;

/** POST /simulados/:id/entregar — sem corpo; responde SimuladoResultado. */
export const EntregarSimuladoResposta = SimuladoResultado;
export type EntregarSimuladoResposta = SimuladoResultado;

export const TEXTO_HERO_SIMULADO = 'Prova completa no padrão FAU · 40 questões · 4h · mínimo 50%';
export const NOTA_SIMULADO_LEGISLACAO =
  'Conhecimentos Gerais inclui a Lei Orgânica de Palmital e o Estatuto dos Servidores.';
export function seloSimulado(aprovado: boolean): string {
  return aprovado ? 'APROVADO' : 'ABAIXO DO MÍNIMO';
}
