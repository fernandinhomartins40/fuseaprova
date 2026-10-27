/**
 * Offline: GET /offline/pacote e POST /sync/tentativas (PRD 8.4). Guarda: exigirAcesso.
 *
 * O pacote traz as próximas 3 lições e toda a revisão vencida. O gabarito vai cifrado
 * (AES-GCM, chave por pacote; veja `cifra.ts`): `cifrado` decifra para um JSON que
 * valida com `GabaritoOfflineClaro`. No sync o servidor recalcula XP, vidas, ofensiva
 * e revisão a partir das tentativas; o cliente nunca é a fonte da verdade.
 */
import { z } from 'zod';
import {
  CorrecaoQuestao,
  DataHora,
  DicaLicao,
  QuestaoParaAluno,
  Uuid,
  ZLetra,
  ZTipoLicao,
} from './comum.js';

/** Conteúdo decifrado de `QuestaoOffline.cifrado`. */
export const GabaritoOfflineClaro = CorrecaoQuestao.extend({ dica: z.string().nullable() });
export type GabaritoOfflineClaro = z.infer<typeof GabaritoOfflineClaro>;

export const QuestaoOffline = QuestaoParaAluno.extend({
  /** JSON de GabaritoOfflineClaro cifrado com `chave` e AAD = id da questão. */
  cifrado: z.string(),
});
export type QuestaoOffline = z.infer<typeof QuestaoOffline>;

export const LicaoOffline = z.object({
  licao: z.object({ id: Uuid, titulo: z.string(), tipo: ZTipoLicao, tamanho: z.number().int() }),
  dica: DicaLicao.nullable(),
  questoes: z.array(QuestaoOffline),
});
export type LicaoOffline = z.infer<typeof LicaoOffline>;

/** GET /offline/pacote */
export const PacoteOfflineResposta = z.object({
  pacoteId: Uuid,
  geradoEm: DataHora,
  expiraEm: DataHora,
  versaoConteudo: z.number().int(),
  /** Chave AES-GCM (base64url) deste pacote. */
  chave: z.string(),
  licoes: z.array(LicaoOffline).max(3),
  revisao: z.array(QuestaoOffline),
});
export type PacoteOfflineResposta = z.infer<typeof PacoteOfflineResposta>;

export const SessaoOffline = z.object({
  /** Id gerado no cliente para a sessão offline. */
  idCliente: Uuid,
  /** Pacote de onde vieram as questões (o aparelho pode baixar outro antes do sync). */
  pacoteId: Uuid.nullable().optional(),
  tipo: z.enum(['licao', 'revisao']),
  licaoId: Uuid.nullable(),
  iniciadaEm: DataHora,
  /** null se o aluno abandonou a sessão. */
  concluidaEm: DataHora.nullable(),
});
export type SessaoOffline = z.infer<typeof SessaoOffline>;

export const TentativaOffline = z.object({
  /** Único por usuário: reenviar não duplica. */
  idCliente: Uuid,
  sessaoIdCliente: Uuid,
  questaoId: Uuid,
  resposta: ZLetra,
  tempoMs: z.number().int().min(0).max(3_600_000),
  respondidaEm: DataHora,
});
export type TentativaOffline = z.infer<typeof TentativaOffline>;

/** POST /sync/tentativas — lote idempotente. */
export const SyncEntrada = z.object({
  pacoteId: Uuid.nullable(),
  sessoes: z.array(SessaoOffline).max(50).default([]),
  tentativas: z.array(TentativaOffline).max(500),
});
export type SyncEntrada = z.input<typeof SyncEntrada>;

export const SyncResposta = z.object({
  aceitas: z.array(Uuid),
  duplicadas: z.array(Uuid),
  rejeitadas: z.array(z.object({ idCliente: Uuid, motivo: z.string() })),
  xpGanho: z.number().int(),
  me: z.object({
    xpTotal: z.number().int(),
    gemas: z.number().int(),
    vidas: z.number().int(),
    ofensiva: z.number().int(),
    revisoesPendentes: z.number().int(),
  }),
});
export type SyncResposta = z.infer<typeof SyncResposta>;
