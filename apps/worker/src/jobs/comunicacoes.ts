/**
 * Fila da comunicação do superadmin (D13), a cada minuto: envia até o limite por minuto
 * (e-mail 30, push 120), só para quem ainda tem opt-in, e no máximo uma comunicação por
 * aluno a cada 24 h. Ao zerar os pendentes, a comunicação fica "concluída".
 *
 * S-17 (R5-07, R3-14):
 * - falha temporária do SMTP (conexão, autenticação, 4xx) não queima o envio: ele volta para a
 *   fila com espera crescente (1, 2, 4 min…) até `LIMITE_COMUNICACAO.tentativasEnvio`;
 * - disjuntor: `falhasParaPausar` falhas temporárias seguidas (ou SMTP não configurado) pausam a
 *   comunicação ("pausada", com o motivo) e os envios continuam pendentes — nada vira "concluída"
 *   sem ter saído; o superadmin retoma pelo painel;
 * - rejeição de um destinatário (5xx do servidor para aquele endereço) marca só aquele envio;
 * - o job devolve `ok: false` quando houve falha do SMTP ou quando tudo o que tentou falhou;
 * - cancelar no meio interrompe o lote: o status é conferido antes de cada envio e o envio só é
 *   marcado se ainda estiver pendente.
 */
import { and, asc, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { schema } from '@fuse/db';
import { emailComunicacao } from '@fuse/shared';
import { LIMITE_COMUNICACAO } from '@fuse/shared/api';
import type { Db, Log } from '../util.js';
import type { EnviadorPush } from './lembretes.js';

const { comunicacoes, comunicacoesEnvios, usuarios, pushInscricoes } = schema;

export interface EnviadorEmail {
  enviar(m: { para: string; assunto: string; html: string; texto: string }): Promise<void>;
}

export function criarEnviadorSmtp(smtp: { host: string; porta: number; usuario: string; senha: string; remetente: string }): EnviadorEmail {
  // S-17: uma conexão reaproveitada (pool) em vez de uma conexão SMTP + TLS por mensagem.
  const t = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.porta === 465,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.senha } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return {
    async enviar(m) {
      await t.sendMail({ from: smtp.remetente, to: m.para, subject: m.assunto, html: m.html, text: m.texto });
    },
  };
}

/**
 * Falha do servidor de e-mail (conexão, autenticação, timeout ou resposta 4xx, que é temporária)
 * × rejeição daquele destinatário (5xx do servidor para o endereço, ex.: 550 caixa inexistente).
 */
export function falhaDoSmtp(e: unknown): boolean {
  const o = e as { code?: string; responseCode?: number };
  if (typeof o.responseCode === 'number') return o.responseCode < 500;
  return o.code !== 'EENVELOPE';
}

export interface ResultadoComunicacoes {
  enviados: number;
  falhas: number;
  ignorados: number;
  concluidas: number;
  /** Envios que voltaram para a fila por falha temporária do SMTP. */
  adiados: number;
  /** Comunicações pausadas pelo disjuntor nesta rodada. */
  pausadas: number;
  ok?: false;
  erro?: string;
}

/** Há comunicação na fila? (o agendador só registra a execução quando há trabalho, S-26). */
export async function temComunicacaoNaFila(db: Db): Promise<boolean> {
  const [c] = await db
    .select({ id: comunicacoes.id })
    .from(comunicacoes)
    .where(inArray(comunicacoes.status, ['na_fila', 'enviando']))
    .limit(1);
  return !!c;
}

export async function enviarComunicacoes(
  db: Db,
  d: { email: EnviadorEmail | null; push: EnviadorPush | null; appUrl: string; log?: Log },
  agora: Date,
): Promise<ResultadoComunicacoes> {
  const r: ResultadoComunicacoes = { enviados: 0, falhas: 0, ignorados: 0, concluidas: 0, adiados: 0, pausadas: 0 };
  let erroSmtp: string | null = null;
  const ativas = await db
    .select()
    .from(comunicacoes)
    .where(inArray(comunicacoes.status, ['na_fila', 'enviando']))
    .orderBy(asc(comunicacoes.criadoEm));
  const orcamento = { email: LIMITE_COMUNICACAO.emailPorMinuto, push: LIMITE_COMUNICACAO.pushPorMinuto };
  const desde = new Date(agora.getTime() - LIMITE_COMUNICACAO.intervaloPorAlunoMs);

  const pausar = async (id: string, motivo: string) => {
    await db
      .update(comunicacoes)
      .set({ status: 'pausada', pausadaMotivo: motivo.slice(0, 300), pausadaEm: agora })
      .where(and(eq(comunicacoes.id, id), inArray(comunicacoes.status, ['na_fila', 'enviando'])));
    r.pausadas++;
    d.log?.error({ comunicacaoId: id, motivo }, 'comunicação pausada pelo disjuntor do SMTP');
  };

  for (const c of ativas) {
    const canal = c.canal;
    if (orcamento[canal] <= 0) continue;
    if (canal === 'email' && (erroSmtp || !d.email)) {
      // SMTP fora (nesta rodada) ou não configurado: pausa em vez de queimar os envios.
      erroSmtp ??= 'SMTP não configurado no .env do worker.';
      await pausar(c.id, `Falha do SMTP: ${erroSmtp}`);
      continue;
    }
    if (c.status === 'na_fila') {
      await db.update(comunicacoes).set({ status: 'enviando', iniciadoEm: agora }).where(and(eq(comunicacoes.id, c.id), eq(comunicacoes.status, 'na_fila')));
    }
    const lote = await db
      .select({ envio: comunicacoesEnvios, u: usuarios })
      .from(comunicacoesEnvios)
      .innerJoin(usuarios, eq(usuarios.id, comunicacoesEnvios.usuarioId))
      .where(
        and(
          eq(comunicacoesEnvios.comunicacaoId, c.id),
          eq(comunicacoesEnvios.status, 'pendente'),
          or(isNull(comunicacoesEnvios.proximaTentativaEm), lte(comunicacoesEnvios.proximaTentativaEm, agora)),
        ),
      )
      .orderBy(asc(comunicacoesEnvios.id))
      .limit(orcamento[canal]);
    let falhasSeguidas = 0;
    for (const { envio, u } of lote) {
      // Cancelada (ou pausada) no meio do lote: para aqui.
      const [atual] = await db.select({ status: comunicacoes.status }).from(comunicacoes).where(eq(comunicacoes.id, c.id));
      if (atual?.status !== 'enviando') break;
      orcamento[canal]--;
      // Só marca o envio que ainda está pendente (o cancelamento já o marcou como ignorado).
      const marcar = (status: 'enviado' | 'falhou' | 'ignorado', erro: string | null = null) =>
        db
          .update(comunicacoesEnvios)
          .set({ status, erro, enviadoEm: status === 'enviado' ? agora : null, proximaTentativaEm: null })
          .where(and(eq(comunicacoesEnvios.id, envio.id), eq(comunicacoesEnvios.status, 'pendente')));
      // O aluno pode ter tirado o opt-in, sido bloqueado ou excluído depois da criação.
      if (!u.marketing || u.excluidoEm || u.bloqueadoEm) {
        await marcar('ignorado', 'sem opt-in');
        r.ignorados++;
        continue;
      }
      const [recente] = await db
        .select({ id: comunicacoesEnvios.id })
        .from(comunicacoesEnvios)
        .where(and(eq(comunicacoesEnvios.usuarioId, u.id), eq(comunicacoesEnvios.status, 'enviado'), gte(comunicacoesEnvios.enviadoEm, desde), ne(comunicacoesEnvios.id, envio.id)))
        .limit(1);
      if (recente) {
        await marcar('ignorado', 'já recebeu uma comunicação nas últimas 24 h');
        r.ignorados++;
        continue;
      }
      if (canal === 'email') {
        const m = emailComunicacao({ nome: u.nome, assunto: c.assunto, mensagem: c.mensagem, link: c.link, appUrl: d.appUrl });
        try {
          await d.email!.enviar({ para: u.email, ...m });
          await marcar('enviado');
          r.enviados++;
          falhasSeguidas = 0;
        } catch (e) {
          const msg = (e as Error).message.slice(0, 300);
          if (!falhaDoSmtp(e)) {
            await marcar('falhou', msg);
            r.falhas++;
            continue;
          }
          falhasSeguidas++;
          const tentativas = envio.tentativas + 1;
          if (tentativas >= LIMITE_COMUNICACAO.tentativasEnvio) {
            await marcar('falhou', `SMTP: ${msg}`);
            r.falhas++;
          } else {
            await db
              .update(comunicacoesEnvios)
              .set({ tentativas, erro: msg, proximaTentativaEm: new Date(agora.getTime() + 2 ** (tentativas - 1) * 60_000) })
              .where(and(eq(comunicacoesEnvios.id, envio.id), eq(comunicacoesEnvios.status, 'pendente')));
            r.adiados++;
          }
          d.log?.warn({ comunicacaoId: c.id, tentativas }, 'falha temporária do SMTP');
          if (falhasSeguidas >= LIMITE_COMUNICACAO.falhasParaPausar) {
            erroSmtp = msg;
            await pausar(c.id, `Falha do SMTP: ${msg}`);
            break;
          }
        }
      } else {
        try {
          if (!d.push) throw new Error('VAPID não configurado');
          const inscricoes = await db.select().from(pushInscricoes).where(eq(pushInscricoes.usuarioId, u.id));
          const payload = JSON.stringify({ titulo: c.assunto, corpo: c.mensagem.slice(0, 180), url: c.link ?? '/aprender', tag: `comunicacao-${c.id}` });
          let algum = false;
          for (const i of inscricoes) {
            const res = await d.push.enviar(i, payload);
            if (res.ok) algum = true;
            else if (res.expirada) await db.delete(pushInscricoes).where(eq(pushInscricoes.id, i.id));
          }
          if (algum) {
            await marcar('enviado');
            r.enviados++;
          } else {
            await marcar('falhou', inscricoes.length ? 'push recusado' : 'sem inscrição de push');
            r.falhas++;
          }
        } catch (e) {
          await marcar('falhou', (e as Error).message.slice(0, 300));
          r.falhas++;
          d.log?.warn({ comunicacaoId: c.id }, 'falha ao enviar comunicação');
        }
      }
    }
    const [resta] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(comunicacoesEnvios)
      .where(and(eq(comunicacoesEnvios.comunicacaoId, c.id), eq(comunicacoesEnvios.status, 'pendente')));
    if (Number(resta?.n ?? 0) === 0) {
      const fim = await db
        .update(comunicacoes)
        .set({ status: 'concluida', concluidoEm: agora })
        .where(and(eq(comunicacoes.id, c.id), eq(comunicacoes.status, 'enviando')))
        .returning({ id: comunicacoes.id });
      if (fim.length) r.concluidas++;
    }
  }
  if (erroSmtp) return { ...r, ok: false, erro: `Falha do SMTP: ${erroSmtp}. ${r.pausadas} comunicação(ões) pausada(s).` };
  if (r.falhas > 0 && r.enviados === 0) return { ...r, ok: false, erro: `Todos os ${r.falhas} envios tentados falharam.` };
  return r;
}
