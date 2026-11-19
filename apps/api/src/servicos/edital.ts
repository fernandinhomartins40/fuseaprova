/**
 * Edital do concurso (PRD 7.3): salvar os cargos do edital e publicar (modo edital). Usado pelas
 * rotas do painel (`PUT /admin/edital`, `POST /admin/edital/publicar`) e pelo comando
 * `edital:palmital` da CLI (D45), para os dois seguirem exatamente a mesma regra.
 */
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { z } from 'zod';
import type { EditalEntrada } from '@fuse/shared/api';
import { existe, falha } from '../http/erros.js';
import { auditar, type ExtraAuditoria } from '../rotas/admin/comum.js';
import { contar, type Db } from '../util.js';

const { concursos, cargos, secoes, usuarios } = schema;

export type EditalSalvar = z.output<typeof EditalEntrada>;

/**
 * Grava data da prova, links, cargos do edital e as marcações de seção. Cargos do edital que saíram
 * da lista ficam inativos (os genéricos não mudam); cargo sem `id` com nome que já existe no
 * concurso é atualizado (upsert por concurso e nome), o que transforma um genérico de mesmo nome
 * no cargo do edital. Rode dentro de uma transação.
 */
export async function salvarEdital(
  tx: Db,
  corpo: EditalSalvar,
  adminId: string | null,
  agora: Date,
  extra: ExtraAuditoria & { origem?: string } = {},
): Promise<void> {
  const [c] = await tx
    .update(concursos)
    .set({
      dataProva: corpo.dataProva,
      links: corpo.links,
      versaoConteudo: sql`${concursos.versaoConteudo} + 1`,
    })
    .where(eq(concursos.id, corpo.concursoId))
    .returning();
  existe(c, 'Concurso não encontrado.');
  const mantidos: string[] = [];
  for (const [i, k] of corpo.cargos.entries()) {
    const dados = {
      nome: k.nome,
      area: k.area,
      escolaridade: k.escolaridade,
      vagas: k.vagas,
      distribuicao: k.distribuicao,
      conteudoProgramatico: k.conteudoProgramatico,
      generico: false,
      ativo: true,
      ordem: i + 1,
    };
    if (k.id) {
      const [up] = await tx
        .update(cargos)
        .set(dados)
        .where(and(eq(cargos.id, k.id), eq(cargos.concursoId, corpo.concursoId)))
        .returning({ id: cargos.id });
      if (up) {
        mantidos.push(up.id);
        continue;
      }
    }
    const [novo] = await tx
      .insert(cargos)
      .values({ ...dados, concursoId: corpo.concursoId, criadoEm: agora })
      .onConflictDoUpdate({ target: [cargos.concursoId, cargos.nome], set: dados })
      .returning({ id: cargos.id });
    mantidos.push(novo!.id);
  }
  // Cargos do edital que saíram da lista ficam inativos (os genéricos não mudam).
  const doEdital = await tx
    .select({ id: cargos.id })
    .from(cargos)
    .where(and(eq(cargos.concursoId, corpo.concursoId), eq(cargos.generico, false)));
  const sair = doEdital.map((x) => x.id).filter((id) => !mantidos.includes(id));
  if (sair.length) await tx.update(cargos).set({ ativo: false }).where(inArray(cargos.id, sair));
  for (const s of corpo.secoes)
    await tx.update(secoes).set({ noEdital: s.noEdital }).where(eq(secoes.id, s.secaoId));
  const { origem, ...resto } = extra;
  await auditar(
    tx,
    adminId,
    'edital.salvar',
    `concurso:${corpo.concursoId}`,
    { cargos: corpo.cargos.length, secoes: corpo.secoes.length, ...(origem ? { origem } : {}) },
    agora,
    resto,
  );
}

/** Liga o modo edital. Exige cargos do edital ativos. Rode dentro de uma transação. */
export async function publicarEdital(
  tx: Db,
  concursoId: string,
  adminId: string | null,
  agora: Date,
  extra: ExtraAuditoria = {},
): Promise<{ ok: true; usuariosParaConfirmar: number }> {
  const [n] = await tx
    .select({ n: count() })
    .from(cargos)
    .where(
      and(eq(cargos.concursoId, concursoId), eq(cargos.generico, false), eq(cargos.ativo, true)),
    );
  if (contar(n?.n) === 0)
    throw falha('conflito', 'Cadastre os cargos do edital antes de publicar.');
  const [c] = await tx
    .update(concursos)
    .set({
      status: 'edital_publicado',
      editalPublicadoEm: agora,
      versaoConteudo: sql`${concursos.versaoConteudo} + 1`,
    })
    .where(eq(concursos.id, concursoId))
    .returning();
  existe(c, 'Concurso não encontrado.');
  const [p] = await tx
    .select({ n: count() })
    .from(usuarios)
    .innerJoin(cargos, eq(cargos.id, usuarios.cargoId))
    .where(
      and(
        eq(usuarios.concursoId, concursoId),
        eq(cargos.generico, true),
        isNull(usuarios.excluidoEm),
      ),
    );
  await auditar(tx, adminId, 'edital.publicar', `concurso:${concursoId}`, null, agora, extra);
  return { ok: true as const, usuariosParaConfirmar: contar(p?.n) };
}
