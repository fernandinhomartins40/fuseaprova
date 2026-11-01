/**
 * Lembretes por Web Push (PRD 8.5), a cada 5 min: quem marcou o lembrete naquele horário,
 * com a meta do dia ainda não cumprida, no máximo 1 push por dia.
 *
 * D30: o texto e a tela vêm da mesma regra do app nativo (`escolherLembrete`, em @fuse/shared):
 * erros vencidos → /revisar/praticar, tema fraco → /reforco/praticar?assunto=…, prova perto →
 * treino inteligente etc. Todo push leva `url` com uma rota da lista fechada.
 */
import { and, count, desc, eq, gte, inArray, isNull, lt, lte, or } from 'drizzle-orm';
import webpush from 'web-push';
import { schema } from '@fuse/db';
import {
  classificarTema,
  diaDaSemana,
  diaSP,
  diferencaDias,
  dominioDoAssunto,
  escolherLembrete,
  horaMinutoSP,
  inicioDoDiaSP,
  JANELA_DOMINIO,
  normalizarRotaNotificacao,
  verificarOfensiva,
  type TemaFracoLembrete,
} from '@fuse/shared';
import { endpointPushValido } from '@fuse/shared/api';
import type { Db, Log } from '../util.js';

const { usuarios, pushInscricoes, sessoesEstudo, revisoes, questoes, tentativas, assuntos, concursos } = schema;

/** Revisões vencidas de questões publicadas. */
async function contarRevisoesVencidas(db: Db, usuarioId: string, agora: Date): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(revisoes)
    .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
    .where(
      and(
        eq(revisoes.usuarioId, usuarioId),
        eq(revisoes.status, 'ativa'),
        lte(revisoes.venceEm, agora),
        eq(questoes.status, 'publicada'),
      ),
    );
  return Number(r?.n ?? 0);
}

/** O tema mais fraco (domínio das últimas 30 tentativas abaixo de 60%), se houver. */
export async function temaMaisFraco(db: Db, usuarioId: string): Promise<TemaFracoLembrete | null> {
  const linhas = await db
    .select({ assuntoId: questoes.assuntoId, nome: assuntos.nome, acertou: tentativas.acertou })
    .from(tentativas)
    .innerJoin(questoes, eq(questoes.id, tentativas.questaoId))
    .innerJoin(assuntos, eq(assuntos.id, questoes.assuntoId))
    .where(eq(tentativas.usuarioId, usuarioId))
    .orderBy(desc(tentativas.respondidaEm))
    .limit(1000);
  const porTema = new Map<string, { nome: string; acertos: boolean[] }>();
  for (const l of linhas) {
    const t = porTema.get(l.assuntoId) ?? { nome: l.nome, acertos: [] };
    if (t.acertos.length < JANELA_DOMINIO) t.acertos.unshift(Boolean(l.acertou));
    porTema.set(l.assuntoId, t);
  }
  let pior: (TemaFracoLembrete & { valor: number }) | null = null;
  for (const [assuntoId, t] of porTema) {
    const d = dominioDoAssunto(t.acertos);
    if (classificarTema(d) !== 'fraco' || d.valor === null) continue;
    if (!pior || d.valor < pior.valor) pior = { assuntoId, nome: t.nome, valor: d.valor };
  }
  return pior ? { assuntoId: pior.assuntoId, nome: pior.nome } : null;
}

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
      // Inscrição gravada antes da validação do endpoint: nada de POST para a rede interna;
      // tratada como expirada, ela é apagada (validação PIE V1-10).
      if (!endpointPushValido(insc.endpoint)) return { ok: false, expirada: true };
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
    const hoje = diaSP(agora);
    const ofensiva = verificarOfensiva(
      { ofensiva: u.ofensiva, recorde: u.ofensivaRecorde, ultimoDia: u.ultimoDiaEstudo, protetores: u.protetores },
      hoje,
    ).estado.ofensiva;
    const [vencidas, tema, concurso] = await Promise.all([
      contarRevisoesVencidas(db, u.id, agora),
      temaMaisFraco(db, u.id),
      u.concursoId
        ? db.select({ dataProva: concursos.dataProva }).from(concursos).where(eq(concursos.id, u.concursoId))
        : Promise.resolve([]),
    ]);
    const dataProva = concurso[0]?.dataProva ?? null;
    const diasParaProva = dataProva ? diferencaDias(dataProva, hoje) : null;
    if (diasParaProva === 0) continue; // dia da prova: sem lembrete (D30)
    const texto = escolherLembrete({
      revisoes: vencidas,
      ofensiva,
      diasParaProva: diasParaProva !== null && diasParaProva > 0 ? diasParaProva : null,
      tema,
      temaMaisFraco: tema !== null,
      trilhaConcluida: false,
      diaSemana: diaDaSemana(hoje),
      indice: 0,
    });
    const payload = JSON.stringify({
      titulo: texto.titulo,
      corpo: texto.corpo,
      url: normalizarRotaNotificacao(texto.rota),
      tag: 'lembrete-diario',
      tipo: texto.tipo,
    });
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
