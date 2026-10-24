/**
 * Lembretes por Web Push (PRD 8.5), a cada 5 min: quem marcou o lembrete naquele horário,
 * com a meta do dia ainda não cumprida, no máximo 1 push por dia.
 */
import { and, count, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import webpush from 'web-push';
import { schema } from '@fuse/db';
import { diaSP, horaMinutoSP, inicioDoDiaSP, textoLembrete, verificarOfensiva } from '@fuse/shared';
import type { Db, Log } from '../util.js';

const { usuarios, pushInscricoes, sessoesEstudo } = schema;

export interface InscricaoPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envia um push. `expirada` = o navegador cancelou a inscrição (404/410). */
export interface EnviadorPush {
  enviar(insc: InscricaoPush, payload: string): Promise<{ ok: boolean; expirada?: boolean }>;
}

export function criarEnviadorWebPush(vapid: { publica: string; privada: string; assunto: string }): EnviadorPush {
  webpush.setVapidDetails(vapid.assunto, vapid.publica, vapid.privada);
  return {
    async enviar(insc, payload) {
      try {
        await webpush.sendNotification({ endpoint: insc.endpoint, keys: { p256dh: insc.p256dh, auth: insc.auth } }, payload, {
          TTL: 6 * 3600,
        });
        return { ok: true };
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        return { ok: false, expirada: status === 404 || status === 410 };
      }
    },
  };
}

/** Os horários 'HH:MM' cobertos por esta rodada: os 5 minutos que terminam em `agora`. */
export function horariosDaRodada(agora: Date, janelaMin = 5): string[] {
  return Array.from({ length: janelaMin }, (_, i) => horaMinutoSP(new Date(agora.getTime() - i * 60_000)));
}

export interface ResultadoLembretes {
  candidatos: number;
  enviados: number;
  inscricoesRemovidas: number;
}

export async function enviarLembretes(db: Db, enviador: EnviadorPush, agora: Date, log?: Log): Promise<ResultadoLembretes> {
  const inicioHoje = inicioDoDiaSP(diaSP(agora));
  const candidatos = await db
    .select()
    .from(usuarios)
    .where(
      and(
        inArray(usuarios.lembreteHora, horariosDaRodada(agora)),
        eq(usuarios.notificacoes, true),
        eq(usuarios.acesso, true),
        isNull(usuarios.excluidoEm),
        or(isNull(usuarios.ultimoPushEm), lt(usuarios.ultimoPushEm, inicioHoje)),
      ),
    );
  const r: ResultadoLembretes = { candidatos: candidatos.length, enviados: 0, inscricoesRemovidas: 0 };
  for (const u of candidatos) {
    const [feitas] = await db
      .select({ n: count() })
      .from(sessoesEstudo)
      .where(
        and(
          eq(sessoesEstudo.usuarioId, u.id),
          inArray(sessoesEstudo.tipo, ['licao', 'desafio']),
          gte(sessoesEstudo.concluidaEm, inicioHoje),
        ),
      );
    if (Number(feitas?.n ?? 0) >= u.metaDiaria) continue;
    const inscricoes = await db.select().from(pushInscricoes).where(eq(pushInscricoes.usuarioId, u.id));
    if (!inscricoes.length) continue;
    const ofensiva = verificarOfensiva(
      { ofensiva: u.ofensiva, recorde: u.ofensivaRecorde, ultimoDia: u.ultimoDiaEstudo, protetores: u.protetores },
      diaSP(agora),
    ).estado.ofensiva;
    const payload = JSON.stringify({ titulo: 'Fuse Aprova', corpo: textoLembrete(ofensiva), url: '/aprender', tag: 'lembrete-diario' });
    let algum = false;
    for (const i of inscricoes) {
      const res = await enviador.enviar(i, payload);
      if (res.ok) algum = true;
      else if (res.expirada) {
        await db.delete(pushInscricoes).where(eq(pushInscricoes.id, i.id));
        r.inscricoesRemovidas++;
      } else log?.warn({ usuarioId: u.id }, 'falha ao enviar push');
    }
    if (algum) {
      await db.update(usuarios).set({ ultimoPushEm: agora }).where(eq(usuarios.id, u.id));
      r.enviados++;
    }
  }
  return r;
}
