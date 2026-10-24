/**
 * Sessões de estudo: lição, desafio, revisão (PRD 5.8–5.13, 6). Guarda: exigirAcesso.
 *
 * Fluxo: POST /licoes/:id/iniciar (ou /revisao/iniciar) → N × POST /sessoes/:id/responder
 *        (opcional POST /sessoes/:id/dica) → POST /sessoes/:id/concluir.
 */
import { z } from 'zod';
import {
  CorrecaoQuestao,
  DataHora,
  Dia,
  DicaLicao,
  QuestaoParaAluno,
  Uuid,
  ZLetra,
  ZSlugDisciplina,
  ZTipoLicao,
  ZTipoSessaoEstudo,
} from './comum.js';
import { CODIGOS_CONQUISTA } from '../conquistas.js';
import { TIPOS_XP_EVENTO } from '../dominio.js';

/** POST /licoes/:id/iniciar — sem corpo. Sorteia as questões e cria a sessão. */
export const IniciarSessaoResposta = z.object({
  sessaoId: Uuid,
  tipo: ZTipoSessaoEstudo,
  licao: z
    .object({ id: Uuid, titulo: z.string(), tipo: ZTipoLicao, tamanho: z.number().int() })
    .nullable(),
  /** Cartão "Dica da lição" (null no desafio e na revisão). */
  dica: DicaLicao.nullable(),
  questoes: z.array(QuestaoParaAluno).min(1),
  /** Errar nesta sessão gasta vida (só lição de trilha). */
  gastaVidas: z.boolean(),
  vidas: z.number().int(),
  proximaVidaEm: DataHora.nullable(),
  gemas: z.number().int(),
  iniciadaEm: DataHora,
});
export type IniciarSessaoResposta = z.infer<typeof IniciarSessaoResposta>;

/** POST /licoes/:id/abrir-bau — abre o baú (lição tipo `bau`) e dá +20 gemas. */
export const AbrirBauResposta = z.object({
  gemasGanhas: z.number().int(),
  gemas: z.number().int(),
});
export type AbrirBauResposta = z.infer<typeof AbrirBauResposta>;

/** POST /revisao/iniciar — até 10 questões vencidas. */
export const IniciarRevisaoEntrada = z
  .object({
    /** Revisão filtrada por disciplina (tocar na barra da tela Revisar). */
    disciplina: ZSlugDisciplina.optional(),
    /** "REVISAR ERROS (n)": mini-lição só com os erros desta sessão (vencidos ou não). */
    sessaoOrigemId: Uuid.optional(),
  })
  .default({});
export type IniciarRevisaoEntrada = z.input<typeof IniciarRevisaoEntrada>;

export const SessaoParams = z.object({ id: Uuid });

/** POST /sessoes/:id/responder */
export const ResponderEntrada = z.object({
  questaoId: Uuid,
  resposta: ZLetra,
  tempoMs: z.number().int().min(0).max(3_600_000),
  /** Id gerado no cliente; repetir o mesmo id não duplica a tentativa. */
  idCliente: Uuid.optional(),
});
export type ResponderEntrada = z.infer<typeof ResponderEntrada>;

export const ResponderResposta = CorrecaoQuestao.extend({
  acertou: z.boolean(),
  /** "Mandou bem!" etc. no acerto; "Resposta correta: X" no erro. */
  titulo: z.string(),
  xpGanho: z.number().int(),
  xpSessao: z.number().int(),
  combo: z.number().int(),
  comboVisivel: z.boolean(),
  vidas: z.number().int(),
  proximaVidaEm: DataHora.nullable(),
  /** Vidas zeraram numa lição de trilha: mostrar a folha "Suas vidas acabaram". */
  semVidas: z.boolean(),
  /** Mostra "Essa questão volta na sua revisão amanhã". */
  voltaNaRevisao: z.boolean(),
  respondidas: z.number().int(),
  total: z.number().int(),
});
export type ResponderResposta = z.infer<typeof ResponderResposta>;

/** POST /sessoes/:id/dica — gasta 5 gemas e devolve a dica (sem eliminar alternativas). */
export const DicaEntrada = z.object({ questaoId: Uuid });
export type DicaEntrada = z.infer<typeof DicaEntrada>;

export const DicaResposta = z.object({ dica: z.string(), gemas: z.number().int() });
export type DicaResposta = z.infer<typeof DicaResposta>;

export const ItemXp = z.object({ tipo: z.enum(TIPOS_XP_EVENTO), valor: z.number().int() });

export const ConquistaNova = z.object({
  codigo: z.enum(CODIGOS_CONQUISTA),
  titulo: z.string(),
  descricao: z.string(),
});

export const DiaSemanaOfensiva = z.object({ dia: Dia, cumprido: z.boolean(), hoje: z.boolean() });

export const OfensivaResumo = z.object({
  valor: z.number().int(),
  recorde: z.number().int(),
  /** A tela de Ofensiva aparece: primeira sessão do dia que contou. */
  mostrarTela: z.boolean(),
  marco: z.union([z.literal(7), z.literal(30), z.literal(100)]).nullable(),
  /** O protetor salvou a ofensiva de dias perdidos. */
  protetorUsado: z.boolean(),
  /** A ofensiva tinha zerado (tela "Sua ofensiva zerou"). */
  zerou: z.boolean(),
  frase: z.string(),
  semana: z.array(DiaSemanaOfensiva).length(7),
  metaHoje: z.object({ feitas: z.number().int(), meta: z.number().int(), cumprida: z.boolean() }),
});
export type OfensivaResumo = z.infer<typeof OfensivaResumo>;

/** POST /sessoes/:id/concluir — sem corpo. */
export const ConcluirSessaoResposta = z.object({
  tipo: ZTipoSessaoEstudo,
  tituloLicao: z.string().nullable(),
  xpGanho: z.number().int(),
  itensXp: z.array(ItemXp),
  acertos: z.number().int(),
  total: z.number().int(),
  /** 0–100 */
  precisao: z.number().int(),
  tempoMs: z.number().int(),
  /** Questões erradas nesta sessão (botão REVISAR ERROS (n)). */
  erros: z.array(Uuid),
  gemasGanhas: z.number().int(),
  gemas: z.number().int(),
  xpTotal: z.number().int(),
  vidas: z.number().int(),
  ofensiva: OfensivaResumo,
  conquistasNovas: z.array(ConquistaNova),
  /** Desafio aprovado com 70%+: a unidade ganhou a coroa. */
  coroa: z.boolean(),
  liga: z.object({ entrou: z.boolean(), xpSemana: z.number().int() }),
});
export type ConcluirSessaoResposta = z.infer<typeof ConcluirSessaoResposta>;

/** GET /revisao — pendentes por disciplina. */
export const RevisaoResposta = z.object({
  pendentes: z.number().int(),
  porDisciplina: z.array(
    z.object({
      slug: ZSlugDisciplina,
      nome: z.string(),
      cor: z.string(),
      pendentes: z.number().int(),
      /** Domínio 0–1 ou null ("—"). */
      dominio: z.number().min(0).max(1).nullable(),
    }),
  ),
  regra: z.string(),
});
export type RevisaoResposta = z.infer<typeof RevisaoResposta>;

/** POST /questoes/:id/report */
export const ReportEntrada = z.object({
  tipo: z.enum(['gabarito_errado', 'enunciado_com_erro', 'explicacao_confusa', 'outro']),
  texto: z.string().trim().max(1000, 'Escreva no máximo 1000 caracteres.').optional(),
});
export type ReportEntrada = z.input<typeof ReportEntrada>;

export const ReportResposta = z.object({ ok: z.literal(true), id: Uuid });
export type ReportResposta = z.infer<typeof ReportResposta>;
