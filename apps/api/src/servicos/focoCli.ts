/**
 * D46: comando `pnpm --filter @fuse/api cli foco:cargo`.
 *
 *   (sem opção)              relatório de cada aluno com acesso: profissões do cargo, se o foco vale,
 *                            temas da área antes e depois, lição atual e revisões fora do foco.
 *                            Não grava nada.
 *   --revisoes --confirmar   tira da fila as revisões ativas de questões de outras profissões da
 *                            área do cargo (status `dominada`, sem apagar nada), com a lista na
 *                            auditoria. Não mexe nas questões das áreas extras (D36).
 *   --desfazer --confirmar   devolve à fila as revisões tiradas depois do último desfazer.
 *
 * O relatório não mostra nome nem e-mail: o aluno aparece pelos 8 primeiros caracteres do id.
 */
import { and, asc, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { AREAS_CARGO } from '@fuse/shared';
import { profissoesDoCargo } from '@fuse/shared/palmital2026';
import type { Usuario } from '../contexto.js';
import { emUuids, type Db } from '../util.js';
import { focoAtualDoAluno, questaoDasProvas, type Foco } from './foco.js';
import { calcularTrilha, tituloDaLicao, type TrilhaCalculada } from './trilha.js';

const { auditoria, cargos, disciplinas, questoes, revisoes, usuarios } = schema;

export const ORIGEM_FOCO = 'cli:foco:cargo';

export interface LinhaFoco {
  aluno: string;
  cargo: string | null;
  area: string | null;
  profissoes: readonly string[];
  foco: boolean;
  temasAntes: number;
  temasDepois: number;
  questoesDoFoco: number;
  atualAntes: string | null;
  atualDepois: string | null;
  revisoesFora: number;
}

const alunosComAcesso = (db: Db) =>
  db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'aluno'), eq(usuarios.acesso, true)))
    .orderBy(asc(usuarios.criadoEm));

/**
 * Revisões ativas do aluno que saem com o foco: questões específicas da área do cargo vindas de
 * provas de outras profissões. As questões que também são de uma área extra ficam.
 */
export async function revisoesForaDoFoco(db: Db, u: Usuario, foco: Foco): Promise<string[]> {
  const extras = u.areasExtras.filter((a) => AREAS_CARGO.includes(a));
  const rows = await db
    .select({ questaoId: revisoes.questaoId })
    .from(revisoes)
    .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
    .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
    .where(
      and(
        eq(revisoes.usuarioId, u.id),
        eq(revisoes.status, 'ativa'),
        eq(disciplinas.slug, 'especificos'),
        sql`${questoes.areas} @> array[${foco.area}]::text[]`,
        isNotNull(questoes.provaOrigemId),
        sql`not (${questaoDasProvas(foco.provas)})`,
        extras.length
          ? sql`not (${questoes.areas} && ${sql.raw(`'{${extras.join(',')}}'`)}::text[])`
          : undefined,
      ),
    );
  return rows.map((r) => r.questaoId);
}

function temasDaArea(t: TrilhaCalculada | null, area: string | null): number {
  if (!t || !area) return 0;
  return new Set([...t.nos.values()].filter((n) => n.unidade.area === area).map((n) => n.secao.id))
    .size;
}

function licaoAtual(t: TrilhaCalculada | null): string | null {
  const n = t && [...t.nos.values()].find((x) => x.estado === 'atual');
  return n ? `${n.unidade.titulo} › ${tituloDaLicao(n.licao, n.secao)}` : null;
}

/** Relatório do foco de cada aluno com acesso. Só lê. */
export async function relatorioFoco(db: Db): Promise<LinhaFoco[]> {
  const linhas: LinhaFoco[] = [];
  for (const u of await alunosComAcesso(db)) {
    const [cargo] = u.cargoId
      ? await db.select({ nome: cargos.nome }).from(cargos).where(eq(cargos.id, u.cargoId))
      : [];
    const antes = await calcularTrilha(db, u, { semFoco: true });
    const depois = await calcularTrilha(db, u);
    const foco = depois?.estrutura.foco ?? null;
    linhas.push({
      aluno: u.id.slice(0, 8),
      cargo: cargo?.nome ?? null,
      area: u.area,
      profissoes: cargo ? profissoesDoCargo(cargo.nome) : [],
      foco: foco !== null,
      temasAntes: temasDaArea(antes, u.area),
      temasDepois: temasDaArea(depois, u.area),
      questoesDoFoco: foco?.questoes ?? 0,
      atualAntes: licaoAtual(antes),
      atualDepois: licaoAtual(depois),
      revisoesFora: foco ? (await revisoesForaDoFoco(db, u, foco)).length : 0,
    });
  }
  return linhas;
}

export function descreverRelatorioFoco(linhas: readonly LinhaFoco[]): string {
  const saida = [`Foco no cargo (D46): ${linhas.length} alunos com acesso`];
  for (const l of linhas) {
    const profissoes = l.profissoes.length ? l.profissoes.join(', ') : 'sem profissão';
    saida.push(
      `- ${l.aluno} · ${l.cargo ?? 'sem cargo'} (${l.area ?? 'sem área'}) · ${profissoes}`,
    );
    saida.push(
      l.foco
        ? `    foco: sim · temas da área ${l.temasAntes} → ${l.temasDepois} · ${l.questoesDoFoco} questões das provas do cargo`
        : `    foco: não (fica a área inteira, ${l.temasAntes} temas, como antes)`,
    );
    if (l.atualAntes !== l.atualDepois)
      saida.push(`    lição atual: ${l.atualAntes ?? '—'} → ${l.atualDepois ?? '—'}`);
    if (l.revisoesFora) saida.push(`    revisões fora do foco: ${l.revisoesFora}`);
  }
  const comFoco = linhas.filter((l) => l.foco).length;
  const revisoesFora = linhas.reduce((s, l) => s + l.revisoesFora, 0);
  saida.push(
    `Total: ${comFoco} com foco, ${linhas.length - comFoco} sem foco, ${revisoesFora} revisões fora do foco.`,
  );
  return saida.join('\n');
}

/** Tira da fila as revisões fora do foco (status `dominada`), numa transação, com a lista na auditoria. */
export async function retirarRevisoesForaDoFoco(
  db: Db,
  agora: Date,
): Promise<{ alunos: number; revisoes: number }> {
  return db.transaction(async (tx) => {
    const itens: [string, string][] = [];
    let alunos = 0;
    for (const u of await alunosComAcesso(tx)) {
      const foco = await focoAtualDoAluno(tx, u);
      const ids = foco ? await revisoesForaDoFoco(tx, u, foco) : [];
      if (ids.length === 0) continue;
      alunos++;
      await tx
        .update(revisoes)
        .set({ status: 'dominada', atualizadoEm: agora })
        .where(
          and(
            eq(revisoes.usuarioId, u.id),
            eq(revisoes.status, 'ativa'),
            emUuids(revisoes.questaoId, ids),
          ),
        );
      for (const id of ids) itens.push([u.id, id]);
    }
    await tx.insert(auditoria).values({
      acao: 'foco.revisoes',
      alvo: 'revisoes',
      detalhes: { origem: ORIGEM_FOCO, alunos, revisoes: itens.length },
      motivo: 'CLI foco:cargo --revisoes',
      antes: { itens },
    });
    return { alunos, revisoes: itens.length };
  });
}

/** Devolve à fila as revisões tiradas depois do último desfazer. */
export async function devolverRevisoesDoFoco(db: Db, agora: Date): Promise<{ revisoes: number }> {
  return db.transaction(async (tx) => {
    const [ultimo] = await tx
      .select({ em: auditoria.criadoEm })
      .from(auditoria)
      .where(eq(auditoria.acao, 'foco.revisoes.desfazer'))
      .orderBy(desc(auditoria.criadoEm))
      .limit(1);
    const registros = await tx
      .select({ antes: auditoria.antes })
      .from(auditoria)
      .where(
        and(
          eq(auditoria.acao, 'foco.revisoes'),
          ultimo ? gt(auditoria.criadoEm, ultimo.em) : undefined,
        ),
      );
    if (registros.length === 0) throw new Error('Não há revisões tiradas da fila para devolver.');
    const porAluno = new Map<string, string[]>();
    for (const r of registros) {
      for (const [usuarioId, questaoId] of (r.antes as { itens: [string, string][] }).itens) {
        porAluno.set(usuarioId, [...(porAluno.get(usuarioId) ?? []), questaoId]);
      }
    }
    let n = 0;
    for (const [usuarioId, ids] of porAluno) {
      const voltaram = await tx
        .update(revisoes)
        .set({ status: 'ativa', atualizadoEm: agora })
        .where(
          and(
            eq(revisoes.usuarioId, usuarioId),
            eq(revisoes.status, 'dominada'),
            emUuids(revisoes.questaoId, ids),
          ),
        )
        .returning({ id: revisoes.questaoId });
      n += voltaram.length;
    }
    await tx.insert(auditoria).values({
      acao: 'foco.revisoes.desfazer',
      alvo: 'revisoes',
      detalhes: { origem: ORIGEM_FOCO, revisoes: n },
      motivo: 'CLI foco:cargo --desfazer',
    });
    return { revisoes: n };
  });
}
