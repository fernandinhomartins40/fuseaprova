/**
 * D49: redações do aluno. Toda leitura e escrita filtra por `usuario_id`. A cota de 3 correções
 * por semana é conferida e reservada numa transação com trava por aluno (dois cliques ou duas
 * abas não passam da cota). Se a IA falhar, a redação volta a rascunho e a cota não é gasta.
 */
import { and, count, desc, eq, gte, lt, ne, or, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  LINHAS_MIN_PARA_CORRIGIR,
  XP,
  contarLinhas,
  cotaRedacao,
} from '@fuse/shared';
import type {
  CorrecaoRedacao,
  CotaRedacao,
  Redacao,
  RedacaoAulaConcluirResposta,
  RedacaoPainel,
  RedacaoResumo,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../../contexto.js';
import { falha, ErroHttp } from '../../http/erros.js';
import { contar, iso, type Db } from '../../util.js';
import { creditarXp } from '../progresso.js';
import { AULAS_REDACAO } from './curso.js';
import { corrigirComIa } from './ia.js';
import { TEMAS_REDACAO, temaRedacao } from './temas.js';

const { redacoes, redacaoAulas } = schema;

/** Teto de redações guardadas por aluno, contra abuso. */
export const LIMITE_REDACOES = 300;
/** Correção "presa" (servidor caiu no meio): depois disso pode tentar de novo. */
const CORRIGINDO_EXPIRA_MS = 3 * 60_000;

type Linha = typeof redacoes.$inferSelect;

function resumo(r: Linha): RedacaoResumo {
  return {
    id: r.id,
    temaId: r.temaId,
    temaTitulo: temaRedacao(r.temaId)?.titulo ?? 'Tema removido',
    status: r.status,
    linhas: r.linhas,
    nota: r.nota,
    atualizadoEm: iso(r.atualizadoEm),
    corrigidoEm: r.corrigidoEm ? iso(r.corrigidoEm) : null,
  };
}

function completa(r: Linha): Redacao {
  return { ...resumo(r), texto: r.texto, correcao: (r.correcao as CorrecaoRedacao | null) ?? null };
}

async function minha(db: Db, u: Usuario, id: string): Promise<Linha> {
  const [r] = await db.select().from(redacoes).where(and(eq(redacoes.id, id), eq(redacoes.usuarioId, u.id)));
  if (!r) throw falha('nao_encontrado', 'Redação não encontrada.');
  return r;
}

/** Correções que contam na semana: as feitas desde segunda e as em andamento (não presas). */
function naCota(u: Usuario, agora: Date, excetoId?: string) {
  const { desde } = cotaRedacao(0, agora);
  return and(
    eq(redacoes.usuarioId, u.id),
    or(
      gte(redacoes.corrigidoEm, desde),
      and(
        eq(redacoes.status, 'corrigindo'),
        gte(redacoes.atualizadoEm, new Date(agora.getTime() - CORRIGINDO_EXPIRA_MS)),
        excetoId ? ne(redacoes.id, excetoId) : undefined,
      ),
    ),
  );
}

async function cota(db: Db, u: Usuario, agora: Date): Promise<CotaRedacao> {
  const [linha] = await db.select({ n: count() }).from(redacoes).where(naCota(u, agora));
  const c = cotaRedacao(contar(linha?.n), agora);
  return { usadas: c.usadas, limite: c.limite, restantes: c.restantes, renovaEm: iso(c.renovaEm) };
}

export async function painelRedacao(db: Db, u: Usuario, agora: Date): Promise<RedacaoPainel> {
  const lista = await db
    .select()
    .from(redacoes)
    .where(eq(redacoes.usuarioId, u.id))
    .orderBy(desc(redacoes.atualizadoEm))
    .limit(100);
  const feitas = await db
    .select({ aulaId: redacaoAulas.aulaId })
    .from(redacaoAulas)
    .where(eq(redacaoAulas.usuarioId, u.id));
  return {
    aulas: AULAS_REDACAO,
    temas: TEMAS_REDACAO,
    redacoes: lista.map(resumo),
    cota: await cota(db, u, agora),
    aulasConcluidas: feitas.map((f) => f.aulaId),
  };
}

/**
 * Conclui uma aula interativa. XP (conclusão e, sem erro, perfeição) só na primeira vez; refazer
 * é treino livre. A correção dos passos é local, então o ganho fica limitado a uma vez por aula.
 */
export async function concluirAulaRedacao(
  db: Db,
  u: Usuario,
  aulaId: string,
  perfeita: boolean,
  agora: Date,
): Promise<RedacaoAulaConcluirResposta> {
  if (!AULAS_REDACAO.some((a) => a.id === aulaId)) throw falha('nao_encontrado', 'Aula não encontrada.');
  return db.transaction(async (tx) => {
    const novas = await tx
      .insert(redacaoAulas)
      .values({ usuarioId: u.id, aulaId, perfeita, concluidaEm: agora })
      .onConflictDoNothing()
      .returning({ aulaId: redacaoAulas.aulaId });
    if (novas.length === 0) return { xpGanho: 0, primeiraVez: false };
    const xpGanho = await creditarXp(
      tx,
      u,
      [
        { tipo: 'licao_concluida', valor: XP.CONCLUIR_LICAO },
        { tipo: 'licao_perfeita', valor: perfeita ? XP.LICAO_PERFEITA : 0 },
      ],
      agora,
    );
    return { xpGanho, primeiraVez: true };
  });
}

export async function criarRedacao(db: Db, u: Usuario, temaId: string, texto: string): Promise<Redacao> {
  if (!temaRedacao(temaId)) throw falha('nao_encontrado', 'Tema não encontrado.');
  const [linha] = await db.select({ n: count() }).from(redacoes).where(eq(redacoes.usuarioId, u.id));
  if (contar(linha?.n) >= LIMITE_REDACOES)
    throw falha('conflito', `Você já tem ${LIMITE_REDACOES} redações. Apague rascunhos antigos para começar outra.`);
  const [r] = await db
    .insert(redacoes)
    .values({ usuarioId: u.id, temaId, texto, linhas: contarLinhas(texto) })
    .returning();
  return completa(r!);
}

export async function obterRedacao(db: Db, u: Usuario, id: string): Promise<Redacao> {
  return completa(await minha(db, u, id));
}

export async function salvarRedacao(db: Db, u: Usuario, id: string, texto: string, agora: Date): Promise<Redacao> {
  const [r] = await db
    .update(redacoes)
    .set({ texto, linhas: contarLinhas(texto), atualizadoEm: agora })
    .where(and(eq(redacoes.id, id), eq(redacoes.usuarioId, u.id), eq(redacoes.status, 'rascunho')))
    .returning();
  if (r) return completa(r);
  const atual = await minha(db, u, id);
  throw falha(
    'conflito',
    atual.status === 'corrigida'
      ? 'Esta redação já foi corrigida. Use "Reescrever" para fazer uma nova versão.'
      : 'A correção desta redação está em andamento.',
  );
}

export async function excluirRedacao(db: Db, u: Usuario, id: string): Promise<void> {
  const atual = await minha(db, u, id);
  // Corrigidas ficam no histórico: apagar não pode devolver cota.
  if (atual.status !== 'rascunho')
    throw falha('conflito', 'Só dá para apagar rascunhos. As redações corrigidas ficam no seu histórico.');
  await db.delete(redacoes).where(and(eq(redacoes.id, id), eq(redacoes.usuarioId, u.id), eq(redacoes.status, 'rascunho')));
}

export async function corrigirRedacao(
  deps: Deps,
  u: Usuario,
  id: string,
  agora: Date,
  fetchFn?: typeof fetch,
): Promise<{ redacao: Redacao; cota: CotaRedacao }> {
  const { db } = deps;
  const atual = await minha(db, u, id);
  if (atual.status === 'corrigida')
    throw falha('conflito', 'Esta redação já foi corrigida. Use "Reescrever" para fazer uma nova versão.');
  if (atual.linhas < LINHAS_MIN_PARA_CORRIGIR)
    throw falha('validacao', `Escreva pelo menos ${LINHAS_MIN_PARA_CORRIGIR} linhas antes de pedir a correção.`);
  const tema = temaRedacao(atual.temaId);
  if (!tema) throw falha('nao_encontrado', 'Tema não encontrado.');

  // Reserva: confere a cota e marca "corrigindo" na mesma transação, com trava por aluno.
  const reservada = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`redacao:${u.id}`}))`);
    const [linha] = await tx.select({ n: count() }).from(redacoes).where(naCota(u, agora, id));
    if (cotaRedacao(contar(linha?.n), agora).restantes <= 0) throw falha('cota_redacao');
    const [r] = await tx
      .update(redacoes)
      .set({ status: 'corrigindo', atualizadoEm: agora })
      .where(
        and(
          eq(redacoes.id, id),
          eq(redacoes.usuarioId, u.id),
          or(
            eq(redacoes.status, 'rascunho'),
            and(eq(redacoes.status, 'corrigindo'), lt(redacoes.atualizadoEm, new Date(agora.getTime() - CORRIGINDO_EXPIRA_MS))),
          ),
        ),
      )
      .returning();
    return r;
  });
  if (!reservada) throw falha('conflito', 'A correção desta redação já está em andamento.');

  let correcao: CorrecaoRedacao;
  try {
    correcao = await corrigirComIa(deps.config.fusai, tema, reservada.texto, reservada.linhas, fetchFn);
  } catch (e) {
    await db.update(redacoes).set({ status: 'rascunho' }).where(eq(redacoes.id, id));
    if (e instanceof ErroHttp && e.codigo === 'ia_indisponivel')
      throw falha('ia_indisponivel', 'A correção não respondeu agora. Tente de novo em alguns minutos; a sua cota não foi usada.');
    throw e;
  }
  const fim = deps.relogio.agora();
  const [r] = await db
    .update(redacoes)
    .set({ status: 'corrigida', correcao, nota: correcao.nota, corrigidoEm: fim, atualizadoEm: fim })
    .where(eq(redacoes.id, id))
    .returning();
  return { redacao: completa(r!), cota: await cota(db, u, fim) };
}
