/**
 * Fila da comunicação do superadmin (D13), a cada minuto: envia até o limite por minuto
 * (e-mail 30, push 120), só para quem ainda tem opt-in, e no máximo uma comunicação por
 * aluno a cada 24 h. Ao zerar os pendentes, a comunicação fica "concluída".
 */
import { and, asc, eq, gte, inArray, ne, sql } from 'drizzle-orm';
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
  const t = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.porta === 465,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.senha } : undefined,
  });
  return {
    async enviar(m) {
      await t.sendMail({ from: smtp.remetente, to: m.para, subject: m.assunto, html: m.html, text: m.texto });
    },
  };
}

export interface ResultadoComunicacoes {
  enviados: number;
  falhas: number;
  ignorados: number;
  concluidas: number;
}

export async function enviarComunicacoes(
  db: Db,
  d: { email: EnviadorEmail | null; push: EnviadorPush | null; appUrl: string; log?: Log },
  agora: Date,
): Promise<ResultadoComunicacoes> {
  const r: ResultadoComunicacoes = { enviados: 0, falhas: 0, ignorados: 0, concluidas: 0 };
  const ativas = await db
    .select()
    .from(comunicacoes)
    .where(inArray(comunicacoes.status, ['na_fila', 'enviando']))
    .orderBy(asc(comunicacoes.criadoEm));
  const orcamento = { email: LIMITE_COMUNICACAO.emailPorMinuto, push: LIMITE_COMUNICACAO.pushPorMinuto };
  const desde = new Date(agora.getTime() - LIMITE_COMUNICACAO.intervaloPorAlunoMs);

  for (const c of ativas) {
    const canal = c.canal;
    if (orcamento[canal] <= 0) continue;
    if (c.status === 'na_fila') {
      await db.update(comunicacoes).set({ status: 'enviando', iniciadoEm: agora }).where(eq(comunicacoes.id, c.id));
    }
    const lote = await db
      .select({ envio: comunicacoesEnvios, u: usuarios })
      .from(comunicacoesEnvios)
      .innerJoin(usuarios, eq(usuarios.id, comunicacoesEnvios.usuarioId))
      .where(and(eq(comunicacoesEnvios.comunicacaoId, c.id), eq(comunicacoesEnvios.status, 'pendente')))
      .orderBy(asc(comunicacoesEnvios.id))
      .limit(orcamento[canal]);
    for (const { envio, u } of lote) {
      orcamento[canal]--;
      const marcar = (status: 'enviado' | 'falhou' | 'ignorado', erro: string | null = null) =>
        db.update(comunicacoesEnvios).set({ status, erro, enviadoEm: status === 'enviado' ? agora : null }).where(eq(comunicacoesEnvios.id, envio.id));
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
      try {
        if (canal === 'email') {
          if (!d.email) throw new Error('SMTP não configurado');
          const m = emailComunicacao({ nome: u.nome, assunto: c.assunto, mensagem: c.mensagem, link: c.link, appUrl: d.appUrl });
          await d.email.enviar({ para: u.email, ...m });
          await marcar('enviado');
          r.enviados++;
        } else {
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
        }
      } catch (e) {
        await marcar('falhou', (e as Error).message.slice(0, 300));
        r.falhas++;
        d.log?.warn({ comunicacaoId: c.id }, 'falha ao enviar comunicação');
      }
    }
    const [resta] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(comunicacoesEnvios)
      .where(and(eq(comunicacoesEnvios.comunicacaoId, c.id), eq(comunicacoesEnvios.status, 'pendente')));
    if (Number(resta?.n ?? 0) === 0) {
      await db.update(comunicacoes).set({ status: 'concluida', concluidoEm: agora }).where(and(eq(comunicacoes.id, c.id), ne(comunicacoes.status, 'cancelada')));
      r.concluidas++;
    }
  }
  return r;
}
