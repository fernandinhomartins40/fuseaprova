/**
 * Questões para o aluno. Regra de ouro: só `publicada`, de prova de origem ativa (ou autoral),
 * e o gabarito nunca vai junto antes da resposta (exceto cifrado no pacote offline).
 */
import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { textoChipOrigem, type Letra, type SlugDisciplina } from '@fuse/shared';
import type { QuestaoParaAluno } from '@fuse/shared/api';
import { emUuids, type Db } from '../util.js';

const { questoes, provasOrigem, disciplinas, assuntos } = schema;

/** Condição SQL de questão visível ao aluno. */
export function questaoVisivel(): SQL {
  return and(
    eq(questoes.status, 'publicada'),
    or(
      isNull(questoes.provaOrigemId),
      sql`exists (select 1 from ${provasOrigem} po where po.id = ${questoes.provaOrigemId} and po.status = 'ativa')`,
    ),
  )!;
}

export interface QuestaoCompleta {
  aluno: QuestaoParaAluno;
  /** Gabarito (em questão anulada sem letra, a 1ª alternativa só para cumprir o contrato). */
  gabarito: Letra;
  /** D9: null só em questão anulada importada sem letra. */
  gabaritoReal: Letra | null;
  explicacao: string;
  dicaBolso: string | null;
  /** Dica do botão DICA (da questão ou do assunto). */
  dica: string | null;
  visivel: boolean;
  status: string;
  disciplina: SlugDisciplina;
  assuntoId: string;
}

/** Carrega questões por id (com os dados do chip de origem). `soVisiveis` filtra no SQL. */
export async function carregarQuestoes(
  db: Db,
  ids: readonly string[],
  opcoes: { soVisiveis?: boolean; revisao?: ReadonlySet<string> } = {},
): Promise<Map<string, QuestaoCompleta>> {
  const mapa = new Map<string, QuestaoCompleta>();
  if (ids.length === 0) return mapa;
  const filtro = opcoes.soVisiveis
    ? and(emUuids(questoes.id, ids), questaoVisivel())
    : emUuids(questoes.id, ids);
  const rows = await db
    .select({
      q: questoes,
      d: disciplinas,
      a: { id: assuntos.id, nome: assuntos.nome, dicaTexto: assuntos.dicaTexto },
      p: { orgao: provasOrigem.orgao, ano: provasOrigem.ano, cargo: provasOrigem.cargo, status: provasOrigem.status },
      visivel: sql<boolean>`${questaoVisivel()}`,
    })
    .from(questoes)
    .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
    .innerJoin(assuntos, eq(assuntos.id, questoes.assuntoId))
    .leftJoin(provasOrigem, eq(provasOrigem.id, questoes.provaOrigemId))
    .where(filtro);
  for (const r of rows) {
    const dica = r.q.dica?.trim() || r.a.dicaTexto?.trim() || null;
    const prova = r.q.origem === 'fau_real' && r.p ? r.p : null;
    mapa.set(r.q.id, {
      aluno: {
        id: r.q.id,
        origem: r.q.origem,
        chipOrigem: textoChipOrigem({ origem: r.q.origem, orgao: prova?.orgao, ano: prova?.ano }),
        provaOrigem: prova ? { orgao: prova.orgao, ano: prova.ano, cargo: prova.cargo } : null,
        disciplina: { id: r.d.id, slug: r.d.slug, nome: r.d.nome, cor: r.d.cor },
        assunto: { id: r.a.id, nome: r.a.nome },
        dificuldade: r.q.dificuldade,
        textoApoio: r.q.textoApoio,
        enunciado: r.q.enunciado,
        alternativas: r.q.alternativas,
        temDica: Boolean(dica),
        revisao: opcoes.revisao?.has(r.q.id) ?? false,
      },
      gabarito: r.q.gabarito ?? r.q.alternativas[0]?.letra ?? 'A',
      gabaritoReal: r.q.gabarito,
      explicacao: r.q.explicacao ?? '',
      dicaBolso: r.q.dicaBolso,
      dica,
      visivel: Boolean(r.visivel),
      status: r.q.status,
      disciplina: r.d.slug,
      assuntoId: r.a.id,
    });
  }
  return mapa;
}

/** Na ordem pedida, só as encontradas. */
export function emOrdem<T>(ids: readonly string[], mapa: Map<string, T>): T[] {
  return ids.flatMap((id) => {
    const v = mapa.get(id);
    return v ? [v] : [];
  });
}
