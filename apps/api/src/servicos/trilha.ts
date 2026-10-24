/**
 * Trilha do aluno (PRD 5.7 e 7.1): unidades comuns + específicas da área, intercaladas na
 * proporção da prova, com o estado de cada lição.
 */
import { and, asc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  diaSP,
  estadoDaTrilha,
  inicioDoDiaSP,
  intercalarSecoes,
  licoesAteOBau,
  somarDias,
  textoFaltamParaBau,
  type NoDaTrilha,
} from '@fuse/shared';
import type { TrilhaResposta, UnidadeTrilha } from '@fuse/shared/api';
import type { Usuario } from '../contexto.js';
import { agrupar, type Db } from '../util.js';
import { concursoDoUsuario, modoEdital, type Concurso } from './usuario.js';

const { unidades, secoes, licoes, disciplinas, progressoLicoes, assuntos, tentativas, questoes, revisoes } = schema;

export type Unidade = typeof schema.unidades.$inferSelect;
export type Secao = typeof schema.secoes.$inferSelect;
export type Licao = typeof schema.licoes.$inferSelect;
export type Disciplina = typeof schema.disciplinas.$inferSelect;

export interface EstruturaTrilha {
  concurso: Concurso;
  edital: boolean;
  /** Unidades na ordem do aluno, com todas as seções (inclusive fora do edital). */
  unidades: { unidade: Unidade; disciplina: Disciplina; secoes: { secao: Secao; licoes: Licao[] }[] }[];
}

/** Unidades visíveis ao aluno (comuns + da área), na ordem intercalada. */
export async function estruturaDaTrilha(db: Db, u: Pick<Usuario, 'concursoId' | 'area'>): Promise<EstruturaTrilha | null> {
  const concurso = await concursoDoUsuario(db, u);
  if (!concurso) return null;
  const edital = modoEdital(concurso);
  const us = await db
    .select({ unidade: unidades, disciplina: disciplinas })
    .from(unidades)
    .innerJoin(disciplinas, eq(disciplinas.id, unidades.disciplinaId))
    .where(
      and(
        eq(unidades.concursoId, concurso.id),
        u.area ? or(isNull(unidades.area), eq(unidades.area, u.area)) : isNull(unidades.area),
      ),
    )
    .orderBy(asc(unidades.ordem), asc(unidades.criadoEm));
  const idsU = us.map((x) => x.unidade.id);
  const ss = idsU.length
    ? await db.select().from(secoes).where(inArray(secoes.unidadeId, idsU)).orderBy(asc(secoes.ordem))
    : [];
  const idsS = ss.map((s) => s.id);
  const ls = idsS.length
    ? await db.select().from(licoes).where(inArray(licoes.secaoId, idsS)).orderBy(asc(licoes.ordem))
    : [];
  const licoesPorSecao = agrupar(ls, (l) => l.secaoId);
  const secoesPorUnidade = agrupar(ss, (s) => s.unidadeId);

  // Intercala por seção (3 comuns : 5 específicas) e ordena as unidades pela primeira aparição.
  const comuns = us.filter((x) => x.unidade.area === null);
  const especificas = us.filter((x) => x.unidade.area !== null);
  const secoesDe = (lista: typeof us) =>
    lista.flatMap((x) => (secoesPorUnidade.get(x.unidade.id) ?? []).map((s) => s.unidadeId));
  const ordemUnidades: string[] = [];
  for (const uid of intercalarSecoes(secoesDe(comuns), secoesDe(especificas))) {
    if (!ordemUnidades.includes(uid)) ordemUnidades.push(uid);
  }
  for (const x of us) if (!ordemUnidades.includes(x.unidade.id)) ordemUnidades.push(x.unidade.id);
  const porId = new Map(us.map((x) => [x.unidade.id, x]));
  return {
    concurso,
    edital,
    unidades: ordemUnidades.map((id) => {
      const x = porId.get(id)!;
      return {
        ...x,
        secoes: (secoesPorUnidade.get(id) ?? []).map((secao) => ({
          secao,
          licoes: licoesPorSecao.get(secao.id) ?? [],
        })),
      };
    }),
  };
}

/** No modo edital, seções "Fora do edital" saem da trilha (continuam no Guia). */
export function secaoNaTrilha(e: Pick<EstruturaTrilha, 'edital'>, s: Secao): boolean {
  return !(e.edital && s.noEdital === false);
}

export interface TrilhaCalculada {
  estrutura: EstruturaTrilha;
  nos: Map<string, NoDaTrilha & { licao: Licao; secao: Secao; unidade: Unidade }>;
  ordem: string[];
  progresso: Map<string, { vezes: number; melhorPrecisao: number | null; concluidaEm: Date | null }>;
}

export async function calcularTrilha(db: Db, u: Pick<Usuario, 'id' | 'concursoId' | 'area'>): Promise<TrilhaCalculada | null> {
  const estrutura = await estruturaDaTrilha(db, u);
  if (!estrutura) return null;
  const lista: { licao: Licao; secao: Secao; unidade: Unidade }[] = [];
  for (const x of estrutura.unidades) {
    for (const s of x.secoes) {
      if (!secaoNaTrilha(estrutura, s.secao)) continue;
      for (const l of s.licoes) lista.push({ licao: l, secao: s.secao, unidade: x.unidade });
    }
  }
  const prog = await db
    .select()
    .from(progressoLicoes)
    .where(eq(progressoLicoes.usuarioId, u.id));
  const progresso = new Map(prog.map((p) => [p.licaoId, p]));
  const nos = estadoDaTrilha(
    lista.map((x) => ({ id: x.licao.id, tipo: x.licao.tipo })),
    Object.fromEntries(prog.map((p) => [p.licaoId, { vezes: p.vezes, concluidaEm: p.concluidaEm }])),
  );
  const mapa = new Map(nos.map((n, i) => [n.id, { ...n, ...lista[i]! }]));
  return { estrutura, nos: mapa, ordem: nos.map((n) => n.id), progresso };
}

export function tituloDaLicao(l: Licao, s: Secao): string {
  if (l.titulo) return l.titulo;
  if (l.tipo === 'bau') return 'Baú';
  if (l.tipo === 'desafio') return 'Desafio da unidade';
  return `${s.titulo} · Lição ${l.ordem}`;
}

/** Frase contextual da Capi. */
async function fraseDaCapi(db: Db, u: Pick<Usuario, 'id'>, agora: Date, ateBau: number | null, fim: boolean): Promise<string> {
  const ontem = somarDias(diaSP(agora), -1);
  const erros = await db
    .select({ assunto: assuntos.nome, n: sql<number>`count(*)::int` })
    .from(tentativas)
    .innerJoin(questoes, eq(questoes.id, tentativas.questaoId))
    .innerJoin(assuntos, eq(assuntos.id, questoes.assuntoId))
    .innerJoin(
      revisoes,
      and(eq(revisoes.usuarioId, tentativas.usuarioId), eq(revisoes.questaoId, tentativas.questaoId), eq(revisoes.status, 'ativa')),
    )
    .where(
      and(
        eq(tentativas.usuarioId, u.id),
        eq(tentativas.acertou, false),
        gte(tentativas.respondidaEm, inicioDoDiaSP(ontem)),
        lt(tentativas.respondidaEm, inicioDoDiaSP(diaSP(agora))),
      ),
    )
    .groupBy(assuntos.nome)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  const e = erros[0];
  if (e && Number(e.n) >= 2) return `Você errou ${e.n} de ${e.assunto.toLowerCase()} ontem. Bora revisar?`;
  if (fim) return 'Você completou a trilha! Que tal um simulado?';
  if (ateBau !== null && ateBau > 0) return textoFaltamParaBau(ateBau);
  if (ateBau === 0) return 'O baú está liberado! Toque para abrir.';
  return 'Bora para a próxima lição?';
}

export async function montarTrilhaResposta(db: Db, u: Usuario, agora: Date): Promise<TrilhaResposta> {
  const t = await calcularTrilha(db, u);
  if (!t) {
    return { area: u.area, unidades: [], atual: null, fraseCapi: 'Bora para a próxima lição?', licoesAteBau: null, versaoConteudo: 1 };
  }
  const nos = t.ordem.map((id) => t.nos.get(id)!);
  let atual: TrilhaResposta['atual'] = null;
  const resp: UnidadeTrilha[] = [];
  t.estrutura.unidades.forEach((x, iU) => {
    const secoesVisiveis = x.secoes.filter((s) => secaoNaTrilha(t.estrutura, s.secao));
    const desafio = x.secoes.flatMap((s) => s.licoes).find((l) => l.tipo === 'desafio');
    resp.push({
      id: x.unidade.id,
      numero: iU + 1,
      ordem: x.unidade.ordem,
      titulo: x.unidade.titulo,
      area: x.unidade.area,
      disciplina: { id: x.disciplina.id, slug: x.disciplina.slug, nome: x.disciplina.nome, cor: x.disciplina.cor },
      coroada: Boolean(desafio && (t.progresso.get(desafio.id)?.melhorPrecisao ?? 0) >= 70),
      secoes: secoesVisiveis.map((s) => ({
        id: s.secao.id,
        ordem: s.secao.ordem,
        titulo: s.secao.titulo,
        assuntoId: s.secao.assuntoId,
        noEdital: t.estrutura.edital ? s.secao.noEdital : null,
        licoes: s.licoes.map((l) => {
          const n = t.nos.get(l.id)!;
          if (n.estado === 'atual' && !atual) atual = { unidadeId: x.unidade.id, secaoId: s.secao.id, licaoId: l.id };
          const p = t.progresso.get(l.id);
          return {
            id: l.id,
            ordem: l.ordem,
            tipo: l.tipo,
            tamanho: l.tamanho,
            titulo: tituloDaLicao(l, s.secao),
            estado: n.estado,
            vezes: n.vezes,
            anel: n.anel,
            podeAbrir: n.podeAbrir,
            melhorPrecisao: p?.melhorPrecisao ?? null,
          };
        }),
      })),
    });
  });
  const ateBau = licoesAteOBau(nos);
  return {
    area: u.area,
    unidades: resp,
    atual,
    fraseCapi: await fraseDaCapi(db, u, agora, ateBau, nos.length > 0 && !atual),
    licoesAteBau: ateBau,
    versaoConteudo: t.estrutura.concurso.versaoConteudo,
  };
}
