/**
 * /super/comunicacoes (D13): e-mail e push para segmentos, com prévia, fila (o worker envia
 * respeitando o limite por minuto) e histórico. Só alunos com opt-in (`usuarios.marketing`)
 * recebem; os e-mails transacionais (pagamento, senha) seguem como antes.
 */
import { and, count, desc, eq, gte, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { emailComunicacao, inicioDoDiaSP, diaSP, MS_DIA } from '@fuse/shared';
import { LIMITE_COMUNICACAO, type ComunicacaoSuper } from '@fuse/shared/api';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { existe, falha } from '../../http/erros.js';
import { consultar, contar, iso, isoOuNull, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { auditarSuper } from './comum.js';

const { comunicacoes, comunicacoesEnvios, usuarios } = schema;

type Canal = 'email' | 'push';
type Segmento = 'todos' | 'pagos' | 'inativos' | 'sem_pagamento';

/** Condição SQL dos destinatários (alias `u`). `comOptIn = false` conta quem ficou de fora. */
export function condicaoSegmento(canal: Canal, segmento: Segmento, diasInativo: number | null | undefined, agora: Date, comOptIn = true): SQL {
  const partes: SQL[] = [sql`u.papel = 'aluno'`, sql`u.excluido_em is null`, sql`u.bloqueado_em is null`];
  if (comOptIn) partes.push(sql`u.marketing = true`);
  if (segmento === 'pagos') partes.push(sql`u.acesso = true`);
  if (segmento === 'sem_pagamento') partes.push(sql`u.acesso = false`);
  if (segmento === 'inativos') {
    const desde = new Date(agora.getTime() - (diasInativo ?? 7) * MS_DIA);
    partes.push(sql`u.acesso = true`);
    partes.push(sql`not exists (select 1 from tentativas t where t.usuario_id = u.id and t.respondida_em >= ${desde})`);
  }
  if (canal === 'push') partes.push(sql`exists (select 1 from push_inscricoes pi where pi.usuario_id = u.id)`);
  return sql.join(partes, sql` and `);
}

async function contarSegmento(db: Db, cond: SQL): Promise<number> {
  const [r] = await consultar<{ n: number }>(db, sql`select count(*)::int n from usuarios u where ${cond}`);
  return contar(r?.n);
}

function porMinuto(canal: Canal): number {
  return canal === 'email' ? LIMITE_COMUNICACAO.emailPorMinuto : LIMITE_COMUNICACAO.pushPorMinuto;
}

function exigirCanalConfigurado(deps: Deps, canal: Canal): void {
  if (canal === 'email' && !deps.config.smtp.host) throw falha('conflito', 'O SMTP não está configurado no .env: nenhum e-mail sairia.');
  if (canal === 'push' && !(deps.config.vapid.publica && deps.config.vapid.privada)) throw falha('conflito', 'As chaves VAPID não estão configuradas: nenhum push sairia.');
}

async function mapComunicacao(db: Db, c: typeof comunicacoes.$inferSelect): Promise<ComunicacaoSuper> {
  const contagem = await db
    .select({ s: comunicacoesEnvios.status, n: count() })
    .from(comunicacoesEnvios)
    .where(eq(comunicacoesEnvios.comunicacaoId, c.id))
    .groupBy(comunicacoesEnvios.status);
  const n = (s: string) => contar(contagem.find((x) => x.s === s)?.n);
  const [autor] = c.criadoPor ? await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, c.criadoPor)) : [];
  return {
    id: c.id,
    canal: c.canal,
    segmento: c.segmento,
    diasInativo: c.diasInativo,
    assunto: c.assunto,
    mensagem: c.mensagem,
    link: c.link,
    status: c.status,
    total: c.total,
    enviados: n('enviado'),
    falhas: n('falhou'),
    ignorados: n('ignorado'),
    pendentes: n('pendente'),
    criadoPor: autor ?? null,
    criadoEm: iso(c.criadoEm),
    iniciadoEm: isoOuNull(c.iniciadoEm),
    concluidoEm: isoOuNull(c.concluidoEm),
  };
}

export function rotasSuperComunicacao(r: Registrador): void {
  r.rota('superComunicacaoPrevia', async ({ corpo, deps, agora }) => {
    const cond = condicaoSegmento(corpo.canal, corpo.segmento, corpo.diasInativo, agora);
    const destinatarios = await contarSegmento(deps.db, cond);
    const todos = await contarSegmento(deps.db, condicaoSegmento(corpo.canal, corpo.segmento, corpo.diasInativo, agora, false));
    const amostra = await consultar<{ nome: string }>(deps.db, sql`select u.nome from usuarios u where ${cond} order by u.criado_em desc limit 5`);
    const nomeExemplo = amostra[0]?.nome ?? 'Marina Souza';
    const email = emailComunicacao({ nome: nomeExemplo, assunto: corpo.assunto, mensagem: corpo.mensagem, link: corpo.link, appUrl: deps.config.appUrl });
    const limite = porMinuto(corpo.canal);
    return {
      destinatarios,
      semOptIn: Math.max(0, todos - destinatarios),
      amostra: amostra.map((a) => a.nome),
      assunto: corpo.assunto,
      html: corpo.canal === 'email' ? email.html : null,
      texto: corpo.canal === 'email' ? email.texto : `${corpo.assunto}\n${corpo.mensagem}`,
      limitePorMinuto: limite,
      minutosEstimados: Math.ceil(destinatarios / limite),
    };
  });

  r.rota('superComunicacaoCriar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    exigirCanalConfigurado(deps, corpo.canal);
    const [hoje] = await deps.db
      .select({ n: count() })
      .from(comunicacoes)
      .where(gte(comunicacoes.criadoEm, inicioDoDiaSP(diaSP(agora))));
    if (contar(hoje?.n) >= LIMITE_COMUNICACAO.porDia) {
      throw falha('limite_requisicoes', `O limite é de ${LIMITE_COMUNICACAO.porDia} comunicações por dia. Tente amanhã.`);
    }
    const cond = condicaoSegmento(corpo.canal, corpo.segmento, corpo.diasInativo, agora);
    const c = await deps.db.transaction(async (tx) => {
      const [nova] = await tx
        .insert(comunicacoes)
        .values({
          canal: corpo.canal,
          segmento: corpo.segmento,
          diasInativo: corpo.segmento === 'inativos' ? (corpo.diasInativo ?? null) : null,
          assunto: corpo.assunto,
          mensagem: corpo.mensagem,
          link: corpo.link ?? null,
          status: 'na_fila',
          criadoPor: usuario.id,
          criadoEm: agora,
        })
        .returning();
      // Os destinatários ficam congelados na criação (quem der opt-in depois não entra).
      await tx.execute(
        sql`insert into comunicacoes_envios (comunicacao_id, usuario_id) select ${nova!.id}::uuid, u.id from usuarios u where ${cond}`,
      );
      const [t] = await tx.select({ n: count() }).from(comunicacoesEnvios).where(eq(comunicacoesEnvios.comunicacaoId, nova!.id));
      const [final] = await tx
        .update(comunicacoes)
        .set({ total: contar(t?.n), ...(contar(t?.n) === 0 ? { status: 'concluida' as const, concluidoEm: agora } : {}) })
        .where(eq(comunicacoes.id, nova!.id))
        .returning();
      return final!;
    });
    await auditarSuper(ctx, 'comunicacao.criar', `comunicacao:${c.id}`, {
      motivo: corpo.motivo ?? null,
      depois: { canal: c.canal, segmento: c.segmento, diasInativo: c.diasInativo, assunto: c.assunto, total: c.total },
    });
    return mapComunicacao(deps.db, c);
  });

  r.rota('superComunicacoesListar', async ({ query, deps }) => {
    const [t] = await deps.db.select({ n: count() }).from(comunicacoes);
    const lista = await deps.db
      .select()
      .from(comunicacoes)
      .orderBy(desc(comunicacoes.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    const itens = [];
    for (const c of lista) itens.push(await mapComunicacao(deps.db, c));
    return { itens, total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });

  r.rota('superComunicacaoCancelar', async (ctx) => {
    const { deps, params, agora } = ctx;
    const [c] = await deps.db.select().from(comunicacoes).where(eq(comunicacoes.id, params.id));
    const com = existe(c, 'Comunicação não encontrada.');
    if (com.status === 'concluida' || com.status === 'cancelada') throw falha('conflito', 'Esta comunicação já terminou.');
    const [depois] = await deps.db.update(comunicacoes).set({ status: 'cancelada', concluidoEm: agora }).where(eq(comunicacoes.id, com.id)).returning();
    await deps.db
      .update(comunicacoesEnvios)
      .set({ status: 'ignorado', erro: 'cancelada' })
      .where(and(eq(comunicacoesEnvios.comunicacaoId, com.id), eq(comunicacoesEnvios.status, 'pendente')));
    await auditarSuper(ctx, 'comunicacao.cancelar', `comunicacao:${com.id}`, { antes: { status: com.status }, depois: { status: 'cancelada' } });
    return mapComunicacao(deps.db, depois!);
  });
}
