/**
 * Liga, estatísticas do perfil e Web Push. Guarda: exigirAcesso.
 */
import { z } from 'zod';
import { CODIGOS_CONQUISTA } from '../conquistas.js';
import {
  DataHora,
  Dia,
  Uuid,
  ZAreaCargo,
  ZDivisao,
  ZSlugDisciplina,
  ZStatusConcurso,
} from './comum.js';

export const ZResultadoLiga = z.enum(['subiu', 'ficou', 'desceu']);

/** GET /liga — grupo da semana e posição. */
export const LigaResposta = z.object({
  semana: Dia,
  divisao: ZDivisao,
  nomeDivisao: z.string(),
  terminaEm: DataHora,
  diasRestantes: z.number().int(),
  /** "Os 3 primeiros sobem de liga · termina em X dias" */
  regra: z.string(),
  /** false = estado inicial "Complete 1 lição para entrar na liga desta semana". */
  participando: z.boolean(),
  grupo: z
    .object({
      id: Uuid,
      tamanho: z.number().int(),
      /** "ZONA DE PROMOÇÃO" depois desta posição (0 = não mostra). */
      promocaoAte: z.number().int(),
      /** "ZONA DE REBAIXAMENTO" antes desta posição (null = não mostra). */
      rebaixamentoDesde: z.number().int().nullable(),
    })
    .nullable(),
  ranking: z.array(
    z.object({
      posicao: z.number().int(),
      /** "Marina S." ou apelido. Sem id: não há perfil público. */
      nome: z.string(),
      iniciais: z.string(),
      cor: z.string(),
      xpSemana: z.number().int(),
      eu: z.boolean(),
    }),
  ),
  minhaPosicao: z.number().int().nullable(),
  /** Resultado da semana anterior ainda não visto (modal). */
  resultadoAnterior: z
    .object({
      semana: Dia,
      resultado: ZResultadoLiga,
      posicao: z.number().int(),
      divisaoAnterior: ZDivisao,
      divisaoNova: ZDivisao,
      /** "Você subiu para a Liga Prata!" / "Você ficou na Bronze" */
      mensagem: z.string(),
      gemasGanhas: z.number().int(),
    })
    .nullable(),
});
export type LigaResposta = z.infer<typeof LigaResposta>;

/** POST /liga/resultado/visto — marca o modal semanal como visto. */
export const LigaResultadoVistoEntrada = z.object({ semana: Dia });

export function mensagemResultadoLiga(
  resultado: z.infer<typeof ZResultadoLiga>,
  nomeDivisaoNova: string,
): string {
  if (resultado === 'subiu') return `Você subiu para a Liga ${nomeDivisaoNova}!`;
  if (resultado === 'desceu') return `Você desceu para a Liga ${nomeDivisaoNova}`;
  return `Você ficou na ${nomeDivisaoNova}`;
}

/** GET /perfil/estatisticas */
export const EstatisticasResposta = z.object({
  ofensiva: z.number().int(),
  ofensivaRecorde: z.number().int(),
  xpTotal: z.number().int(),
  questoesFeitas: z.number().int(),
  /** 0–100, null sem tentativas. */
  precisao: z.number().int().nullable(),
  dominio: z.array(
    z.object({
      slug: ZSlugDisciplina,
      nome: z.string(),
      cor: z.string(),
      valor: z.number().min(0).max(1).nullable(),
      /** "73%" ou "—" */
      texto: z.string(),
    }),
  ),
  conquistas: z.array(
    z.object({
      codigo: z.enum(CODIGOS_CONQUISTA),
      titulo: z.string(),
      descricao: z.string(),
      obtida: z.boolean(),
      obtidaEm: DataHora.nullable(),
    }),
  ),
  cargo: z.object({ nome: z.string(), area: ZAreaCargo }).nullable(),
  orgao: z.string().nullable(),
  /** "Acesso completo · pago via Pix" */
  seloAcesso: z.string(),
  edital: z.object({
    status: ZStatusConcurso,
    /** "em elaboração pela FAU" | "publicado: veja seus cargos" | "prova em dd/mm" */
    texto: z.string(),
    dataProva: Dia.nullable(),
    diasParaProva: z.number().int().nullable(),
  }),
  avisoEdital: z.string(),
});
export type EstatisticasResposta = z.infer<typeof EstatisticasResposta>;

/** GET /push/chave — chave pública VAPID para `pushManager.subscribe`. */
export const PushChaveResposta = z.object({ chavePublica: z.string() });
export type PushChaveResposta = z.infer<typeof PushChaveResposta>;

/**
 * Serviços de push dos navegadores (Chrome/Edge/Opera/Samsung, Firefox, Safari, Windows). O
 * worker faz POST no endpoint: aceitar qualquer URL deixaria o aluno apontá-lo para a rede
 * interna da VPS (auditoria PIE R1-06).
 */
export const HOSTS_PUSH = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
] as const;

export function endpointPushValido(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && HOSTS_PUSH.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** POST /push/inscrever — o JSON de `PushSubscription.toJSON()`. */
export const PushInscreverEntrada = z.object({
  endpoint: z.string().url().refine(endpointPushValido, 'Serviço de notificação não reconhecido.'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
export type PushInscreverEntrada = z.infer<typeof PushInscreverEntrada>;

/** DELETE /push — sem `endpoint` remove todas as inscrições do usuário. */
export const PushRemoverEntrada = z.object({ endpoint: z.string().url().optional() }).default({});
export type PushRemoverEntrada = z.input<typeof PushRemoverEntrada>;
