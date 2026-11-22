/**
 * D46: foco no cargo. As questões de uma área vêm de provas de muitos cargos: a Saúde superior junta
 * médico, veterinário, psicólogo, dentista... Com o foco, a unidade específica da área do cargo
 * mostra só os temas que a FAU cobrou em provas da profissão do cargo, e as lições, o treino e o
 * simulado usam só as questões dessas provas.
 *
 * Nunca piora o que já existia: cargo sem profissão conhecida, ou profissão com poucas questões no
 * banco, fica sem foco, com a área inteira como antes. As áreas extras ("Estudar também para",
 * D36) e as unidades comuns (Português, Matemática e Gerais) não mudam.
 */
import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { profissaoDoNomeDeCargo, type AreaCargo, type Profissao } from '@fuse/shared';
import { profissoesDoCargo } from '@fuse/shared/palmital2026';
import type { Usuario } from '../contexto.js';
import { emUuids, type Db } from '../util.js';
import { questaoVisivel } from './questoes.js';
import { concursoDoUsuario, modoEdital, type Concurso } from './usuario.js';

const { cargos, provasOrigem, questoes, secoes, unidades } = schema;

/** Questões do foco que um tema precisa ter para ficar na trilha: uma lição inteira (5). */
export const MIN_QUESTOES_TEMA = 5;
/** Sem pelo menos isto de temas e de questões no foco, ele não vale e fica a área inteira. */
export const MIN_TEMAS_FOCO = 3;
export const MIN_QUESTOES_FOCO = 20;

export interface Foco {
  /** Área do cargo: o foco vale só nas unidades específicas dela. */
  area: AreaCargo;
  /** Provas de origem das profissões do cargo. */
  provas: string[];
  /** Temas (assuntos) da área com pelo menos MIN_QUESTOES_TEMA questões dessas provas. */
  assuntos: ReadonlySet<string>;
  /** Questões do foco nesses temas. */
  questoes: number;
}

// O nome do cargo da prova não muda de profissão: a regra roda uma vez por nome.
const profissaoPorNome = new Map<string, Profissao | null>();
function profissaoDaProva(nome: string): Profissao | null {
  let p = profissaoPorNome.get(nome);
  if (p === undefined) {
    p = profissaoDoNomeDeCargo(nome);
    profissaoPorNome.set(nome, p);
  }
  return p;
}

/** As provas de origem do foco para as questões de uma unidade da `area` (null = sem filtro). */
export function provasDoFoco(foco: Foco | null | undefined, area: string | null): string[] | null {
  return foco && area === foco.area ? foco.provas : null;
}

/** Condição SQL: a questão veio de uma das `provas`. */
export function questaoDasProvas(provas: readonly string[]) {
  return emUuids(questoes.provaOrigemId, provas);
}

/** Provas de origem das profissões de um cargo (vazio = cargo sem profissão conhecida). */
export async function provasDoCargo(db: Db, nomeDoCargo: string): Promise<string[]> {
  const profissoes = profissoesDoCargo(nomeDoCargo);
  if (profissoes.length === 0) return [];
  return (
    await db
      .select({ id: provasOrigem.id, cargo: provasOrigem.cargo })
      .from(provasOrigem)
      .where(isNotNull(provasOrigem.cargo))
  )
    .filter((p) => {
      const profissao = profissaoDaProva(p.cargo!);
      return profissao !== null && profissoes.includes(profissao);
    })
    .map((p) => p.id);
}

/** Foco da trilha de um cargo do concurso. */
export async function focoDoCargo(
  db: Db,
  cargo: { nome: string; area: AreaCargo; concursoId: string },
  edital: boolean,
): Promise<Foco | null> {
  const provas = await provasDoCargo(db, cargo.nome);
  if (provas.length === 0) return null;

  // Temas das seções da área neste concurso (no modo edital, sem as "Fora do edital").
  const temasDaArea = db
    .select({ assuntoId: secoes.assuntoId })
    .from(secoes)
    .innerJoin(unidades, eq(unidades.id, secoes.unidadeId))
    .where(
      and(
        eq(unidades.concursoId, cargo.concursoId),
        eq(unidades.area, cargo.area),
        edital ? sql`${secoes.noEdital} is distinct from false` : undefined,
      ),
    );
  const porTema = await db
    .select({ assuntoId: questoes.assuntoId, n: count() })
    .from(questoes)
    .where(
      and(
        questaoVisivel(),
        sql`${questoes.areas} @> array[${cargo.area}]::text[]`,
        questaoDasProvas(provas),
        inArray(questoes.assuntoId, temasDaArea),
      ),
    )
    .groupBy(questoes.assuntoId);
  const temas = porTema.filter((t) => Number(t.n) >= MIN_QUESTOES_TEMA);
  const total = temas.reduce((s, t) => s + Number(t.n), 0);
  if (temas.length < MIN_TEMAS_FOCO || total < MIN_QUESTOES_FOCO) return null;
  return {
    area: cargo.area,
    provas,
    assuntos: new Set(temas.map((t) => t.assuntoId)),
    questoes: total,
  };
}

/** Foco do cargo do aluno no concurso da trilha (null = área inteira, como antes da D46). */
export async function focoDoAluno(
  db: Db,
  u: { cargoId?: string | null | undefined; area: AreaCargo | null },
  concurso: Pick<Concurso, 'id' | 'status' | 'editalPublicadoEm'>,
): Promise<Foco | null> {
  if (!u.cargoId || !u.area) return null;
  const [cargo] = await db
    .select({ nome: cargos.nome, area: cargos.area, concursoId: cargos.concursoId })
    .from(cargos)
    .where(eq(cargos.id, u.cargoId));
  // Só o cargo do concurso da trilha e da mesma área dela (dado incoerente = sem foco).
  if (!cargo || cargo.concursoId !== concurso.id || cargo.area !== u.area) return null;
  return focoDoCargo(db, cargo, modoEdital(concurso));
}

/** Foco do aluno no concurso dele (para quem não tem a trilha montada à mão, como o sync). */
export async function focoAtualDoAluno(
  db: Db,
  u: Pick<Usuario, 'concursoId' | 'cargoId' | 'area'>,
): Promise<Foco | null> {
  const concurso = await concursoDoUsuario(db, u);
  return concurso ? focoDoAluno(db, u, concurso) : null;
}
