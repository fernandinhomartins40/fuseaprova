/**
 * D29: central de desempenho e treino inteligente. Guarda: exigirAcesso.
 *
 * Os temas são os assuntos da trilha do concurso ativo (com a área do cargo). O domínio de cada
 * um vem das últimas 30 tentativas (PRD 6.6). O treino inteligente e o reforço de um tema criam
 * uma sessão `reforco`: vale XP por acerto como a revisão, não mexe em vidas, os erros entram na
 * fila de revisão e as questões contam para a ofensiva como as da revisão.
 */
import { asc, inArray, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  classificarTema,
  dominioDaDisciplina,
  dominioDoAssunto,
  embaralhar,
  planejarTreino,
  proximoPasso,
  sortearNovas,
  TAMANHO_TREINO,
  type DominioAssunto,
  type SlugDisciplina,
} from '@fuse/shared';
import type { DesempenhoResposta, DicaLicao, IniciarSessaoResposta } from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { falha } from '../http/erros.js';
import { agrupar, consultar, contar, iso, type Db } from '../util.js';
import { candidatasDoAssunto, respostaInicio, revisoesVencidas } from './estudo.js';
import { calcularTrilha } from './trilha.js';

const { assuntos, disciplinas, sessoesEstudo } = schema;

interface TemasDaTrilha {
  /** assuntoId → área da unidade (filtro das questões do cargo). */
  temas: Map<string, string | null>;
  trilhaConcluida: boolean;
}

export async function temasDaTrilha(db: Db, u: Usuario): Promise<TemasDaTrilha> {
  const t = await calcularTrilha(db, u);
  if (!t) return { temas: new Map(), trilhaConcluida: false };
  const temas = new Map<string, string | null>();
  for (const n of t.nos.values()) {
    if (!temas.has(n.secao.assuntoId)) temas.set(n.secao.assuntoId, n.unidade.area ?? null);
  }
  const nos = [...t.nos.values()];
  return { temas, trilhaConcluida: nos.length > 0 && nos.every((n) => n.estado === 'concluida') };
}

interface EstatisticaTema {
  dominio: DominioAssunto;
  ultimaEm: Date | null;
}

/** Domínio (últimas 30 tentativas) e a última resposta de cada assunto respondido. */
async function estatisticasPorTema(db: Db, usuarioId: string): Promise<Map<string, EstatisticaTema>> {
  const linhas = await consultar<{ assunto_id: string; acertou: boolean; respondida_em: string | Date }>(
    db,
    sql`select assunto_id, acertou, respondida_em from (
          select q.assunto_id, t.acertou, t.respondida_em,
                 row_number() over (partition by q.assunto_id order by t.respondida_em desc) as rn
          from tentativas t join questoes q on q.id = t.questao_id
          where t.usuario_id = ${usuarioId}
        ) x where rn <= 30 order by respondida_em asc`,
  );
  const mapa = new Map<string, EstatisticaTema>();
  for (const [assuntoId, ts] of agrupar(linhas, (l) => l.assunto_id)) {
    mapa.set(assuntoId, {
      dominio: dominioDoAssunto(ts.map((t) => Boolean(t.acertou))),
      ultimaEm: new Date(ts[ts.length - 1]!.respondida_em),
    });
  }
  return mapa;
}

export async function montarDesempenho(deps: Deps, u: Usuario, agora: Date): Promise<DesempenhoResposta> {
  const { db } = deps;
  const [{ temas, trilhaConcluida }, stats, vencidas, [totais]] = await Promise.all([
    temasDaTrilha(db, u),
    estatisticasPorTema(db, u.id),
    revisoesVencidas(db, u.id, agora),
    consultar<{ n: unknown; acertos: unknown }>(
      db,
      sql`select count(*) as n, count(*) filter (where acertou) as acertos from tentativas where usuario_id = ${u.id}`,
    ),
  ]);
  const ids = [...temas.keys()];
  const nomes = ids.length
    ? await db
        .select({ id: assuntos.id, nome: assuntos.nome, slug: disciplinas.slug })
        .from(assuntos)
        .innerJoin(disciplinas, sql`${disciplinas.id} = ${assuntos.disciplinaId}`)
        .where(inArray(assuntos.id, ids))
    : [];
  const ds = await db.select().from(disciplinas).orderBy(asc(disciplinas.ordem));

  const listaTemas = nomes.map((a) => {
    const st = stats.get(a.id);
    const dominio = st?.dominio ?? { valor: null, tentativas: 0, acertos: 0 };
    return {
      assuntoId: a.id,
      nome: a.nome,
      disciplina: a.slug as SlugDisciplina,
      classe: classificarTema(dominio),
      dominio: dominio.valor,
      tentativas: dominio.tentativas,
      ultimaEm: st?.ultimaEm ? iso(st.ultimaEm) : null,
      _d: dominio,
    };
  });
  const porDisc = agrupar(listaTemas, (t) => t.disciplina);
  const n = contar(totais?.n);
  const acertos = contar(totais?.acertos);
  return {
    resumo: {
      questoes: n,
      acertos,
      precisao: n ? Math.round((acertos / n) * 100) : null,
      temasNaTrilha: listaTemas.length,
      revisoesPendentes: vencidas.length,
      trilhaConcluida,
    },
    proximoPasso: proximoPasso({ revisoesPendentes: vencidas.length, trilhaConcluida }),
    disciplinas: ds
      .filter((d) => porDisc.has(d.slug))
      .map((d) => {
        const ts = porDisc.get(d.slug)!;
        return {
          slug: d.slug,
          nome: d.nome,
          dominio: dominioDaDisciplina(ts.map((t) => t._d)),
          tentativas: ts.reduce((s, t) => s + t.tentativas, 0),
        };
      }),
    temas: listaTemas.map(({ _d, ...t }) => t),
  };
}

/** Sessão `reforco`: sem assunto, o treino inteligente; com assunto, 10 questões do tema. */
export async function iniciarReforco(
  deps: Deps,
  u: Usuario,
  corpo: { assuntoId?: string | undefined },
  agora: Date,
): Promise<IniciarSessaoResposta> {
  const { db, rng } = deps;
  const { temas } = await temasDaTrilha(db, u);
  let ids: string[] = [];
  let revisao = new Set<string>();
  let dica: DicaLicao | null = null;

  if (corpo.assuntoId) {
    if (!temas.has(corpo.assuntoId)) throw falha('nao_encontrado', 'Esse tema não está na sua trilha.');
    const cands = await candidatasDoAssunto(db, u.id, corpo.assuntoId, temas.get(corpo.assuntoId) ?? null);
    ids = sortearNovas(cands, TAMANHO_TREINO, rng);
    const [a] = await db.select().from(assuntos).where(sql`${assuntos.id} = ${corpo.assuntoId}`);
    if (a?.dicaTexto?.trim()) {
      dica = { titulo: a.dicaTitulo?.trim() || a.nome, texto: a.dicaTexto.trim(), exemplo: a.dicaExemplo?.trim() || null };
    }
  } else {
    const [stats, vencidas] = await Promise.all([estatisticasPorTema(db, u.id), revisoesVencidas(db, u.id, agora)]);
    const plano = planejarTreino({
      vencidas: vencidas.map((v) => v.questaoId),
      temas: [...temas.keys()].map((assuntoId) => {
        const st = stats.get(assuntoId);
        const d = st?.dominio ?? { valor: null, tentativas: 0, acertos: 0 };
        return { assuntoId, classe: classificarTema(d), valor: d.valor, ultimaEm: st?.ultimaEm ?? null };
      }),
      agora,
      rng,
    });
    revisao = new Set(plano.revisao);
    const escolhidas = new Set(plano.revisao);
    for (const item of plano.temas) {
      const cands = (await candidatasDoAssunto(db, u.id, item.assuntoId, temas.get(item.assuntoId) ?? null)).filter(
        (c) => !escolhidas.has(c.id),
      );
      for (const id of sortearNovas(cands, item.quantidade, rng)) escolhidas.add(id);
    }
    ids = embaralhar([...escolhidas], rng);
  }
  if (ids.length === 0) throw falha('questoes_insuficientes', 'Ainda não há questões para esse treino.');

  const [sessao] = await db
    .insert(sessoesEstudo)
    .values({ usuarioId: u.id, tipo: 'reforco', questoes: ids, total: ids.length, iniciadaEm: agora })
    .returning();
  return respostaInicio(db, u, sessao!, revisao, { licao: null, dica }, agora);
}
