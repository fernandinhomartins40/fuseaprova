/**
 * Admin de conteúdo (PRD 5.17): concursos, cargos, provas, questões, uploads, assuntos,
 * trilhas, edital e importações. Toda mudança de conteúdo sobe `versao_conteudo`.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, count, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { pendenciasParaPublicar, SLUG_ASSUNTO_A_CLASSIFICAR } from '@fuse/shared';
import type { z } from 'zod';
import type { QuestaoAdmin, QuestaoAdmin as QuestaoAdminSchema, QuestaoEntrada } from '@fuse/shared/api';
import type { Registrador } from '../../http/registrar.js';
import { ehViolacaoUnica, existe, falha } from '../../http/erros.js';
import { clonarConcurso } from '../../servicos/concursos.js';
import { carregarQuestoes } from '../../servicos/questoes.js';
import { concursoAtivo, subirVersaoConteudo } from '../../servicos/usuario.js';
import { contar, contem, iso, isoOuNull, type Db } from '../../util.js';
import { auditar, mapCargo, mapConcurso, mapLicao, mapProva, mapSecao, paginacao } from './comum.js';

const {
  concursos,
  cargos,
  provasOrigem,
  questoes,
  disciplinas,
  assuntos,
  reports,
  unidades,
  secoes,
  licoes,
  importacoes,
  usuarios,
} = schema;

type Questao = typeof schema.questoes.$inferSelect;
type DadosQuestao = z.output<typeof QuestaoEntrada>;

async function reportsAbertos(db: Db, ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const r = await db
    .select({ id: reports.questaoId, n: count() })
    .from(reports)
    .where(and(inArray(reports.questaoId, ids), eq(reports.status, 'aberto')))
    .groupBy(reports.questaoId);
  return new Map(r.map((x) => [x.id, contar(x.n)]));
}

async function pendenciasDa(db: Db, q: Pick<Questao, 'enunciado' | 'alternativas' | 'gabarito' | 'explicacao' | 'dicaBolso' | 'dica' | 'revisadoPor' | 'assuntoId'>) {
  const [a] = await db.select({ d: assuntos.dicaTexto }).from(assuntos).where(eq(assuntos.id, q.assuntoId));
  return pendenciasParaPublicar({
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    gabarito: q.gabarito ?? '',
    explicacao: q.explicacao,
    dicaBolso: q.dicaBolso,
    dica: q.dica?.trim() || a?.d?.trim() || null,
    revisadoPor: q.revisadoPor,
  });
}

async function mapQuestao(db: Db, q: Questao): Promise<z.input<typeof QuestaoAdminSchema>> {
  const rep = await reportsAbertos(db, [q.id]);
  const [p] = q.provaOrigemId ? await db.select().from(provasOrigem).where(eq(provasOrigem.id, q.provaOrigemId)) : [];
  return {
    id: q.id,
    prova: p
      ? {
          id: p.id,
          banca: p.banca,
          nome: p.nome,
          orgao: p.orgao,
          municipio: p.municipio,
          uf: p.uf,
          ano: p.ano,
          cargo: p.cargo,
          status: p.status,
          urlPagina: p.urlPagina,
        }
      : null,
    provaOrigemId: q.provaOrigemId,
    numeroOrigem: q.numeroOrigem,
    origem: q.origem,
    disciplinaId: q.disciplinaId,
    assuntoId: q.assuntoId,
    areas: q.areas as QuestaoAdmin['areas'],
    dificuldade: q.dificuldade,
    textoApoio: q.textoApoio,
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    gabarito: q.gabarito,
    dica: q.dica,
    explicacao: q.explicacao,
    dicaBolso: q.dicaBolso,
    status: q.status,
    anuladaMotivo: q.anuladaMotivo,
    versao: q.versao,
    criadoPor: q.criadoPor,
    revisadoPor: q.revisadoPor,
    publicadoEm: isoOuNull(q.publicadoEm),
    criadoEm: iso(q.criadoEm),
    atualizadoEm: iso(q.atualizadoEm),
    reportsAbertos: rep.get(q.id) ?? 0,
    pendencias: await pendenciasDa(db, q),
  };
}

async function conferirAssunto(db: Db, disciplinaId: string, assuntoId: string) {
  const [a] = await db.select().from(assuntos).where(eq(assuntos.id, assuntoId));
  if (!a || a.disciplinaId !== disciplinaId) {
    throw falha('validacao', 'O assunto não pertence à disciplina escolhida.', { assuntoId: 'Assunto inválido.' });
  }
}

const ROTULO_PUBLICAR = 'Para publicar: ';

/** D9: questão no assunto provisório "a-classificar" (criado pelo importador) não publica. */
async function emAssuntoAClassificar(db: Db, assuntoId: string): Promise<boolean> {
  const [a] = await db.select({ slug: assuntos.slug }).from(assuntos).where(eq(assuntos.id, assuntoId));
  return a?.slug === SLUG_ASSUNTO_A_CLASSIFICAR;
}

export function rotasAdminConteudo(r: Registrador): void {
  /* -------------------------------------------------------- concursos */
  r.rota('adminConcursosListar', async ({ deps }) => ({
    itens: (await deps.db.select().from(concursos).orderBy(asc(concursos.criadoEm))).map(mapConcurso),
  }));
  r.rota('adminConcursoObter', async ({ params, deps }) => {
    const [c] = await deps.db.select().from(concursos).where(eq(concursos.id, params.id));
    return mapConcurso(existe(c, 'Concurso não encontrado.'));
  });
  r.rota('adminConcursoCriar', async ({ corpo, deps, usuario, agora }) => {
    try {
      const [c] = await deps.db.insert(concursos).values({ ...corpo, criadoEm: agora }).returning();
      await auditar(deps.db, usuario.id, 'concurso.editar', `concurso:${c!.id}`, { criado: true }, agora);
      return mapConcurso(c!);
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conflito', 'Já existe um concurso com esse slug.');
      throw e;
    }
  });
  r.rota('adminConcursoClonar', async ({ params, corpo, deps, usuario, agora }) => {
    try {
      const r = await clonarConcurso(deps.db, params.id, corpo, agora);
      await auditar(
        deps.db,
        usuario.id,
        'concurso.editar',
        `concurso:${r.concurso.id}`,
        { clonadoDe: params.id, unidades: r.unidades, secoes: r.secoes, licoes: r.licoes, cargos: r.cargos },
        agora,
      );
      return { concurso: mapConcurso(r.concurso), unidades: r.unidades, secoes: r.secoes, licoes: r.licoes, cargos: r.cargos };
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conflito', 'Já existe um concurso com esse slug.');
      throw e;
    }
  });
  r.rota('adminConcursoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [c] = await deps.db
      .update(concursos)
      .set({ ...corpo, versaoConteudo: sql`${concursos.versaoConteudo} + 1` })
      .where(eq(concursos.id, params.id))
      .returning();
    existe(c, 'Concurso não encontrado.');
    await auditar(deps.db, usuario.id, 'concurso.editar', `concurso:${params.id}`, corpo, agora);
    return mapConcurso(c!);
  });

  /* ----------------------------------------------------------- cargos */
  r.rota('adminCargosListar', async ({ query, deps }) => ({
    itens: (
      await deps.db
        .select()
        .from(cargos)
        .where(query.concursoId ? eq(cargos.concursoId, query.concursoId) : undefined)
        .orderBy(asc(cargos.ordem), asc(cargos.nome))
    ).map(mapCargo),
  }));
  r.rota('adminCargoCriar', async ({ corpo, deps, usuario, agora }) => {
    try {
      const [c] = await deps.db.insert(cargos).values({ ...corpo, criadoEm: agora }).returning();
      await subirVersaoConteudo(deps.db, corpo.concursoId);
      await auditar(deps.db, usuario.id, 'cargo.editar', `cargo:${c!.id}`, { criado: true, nome: c!.nome }, agora);
      return mapCargo(c!);
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conflito', 'Já existe um cargo com esse nome neste concurso.');
      throw e;
    }
  });
  r.rota('adminCargoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [c] = await deps.db.update(cargos).set(corpo).where(eq(cargos.id, params.id)).returning();
    existe(c, 'Cargo não encontrado.');
    await subirVersaoConteudo(deps.db, c!.concursoId);
    await auditar(deps.db, usuario.id, 'cargo.editar', `cargo:${params.id}`, corpo, agora);
    return mapCargo(c!);
  });

  /* ----------------------------------------------------------- provas */
  r.rota('adminProvasListar', async ({ query, deps }) => {
    const filtros: (SQL | undefined)[] = [
      query.q
        ? or(contem(provasOrigem.orgao, query.q), contem(provasOrigem.nome, query.q), contem(provasOrigem.cargo, query.q))
        : undefined,
      query.banca ? eq(provasOrigem.banca, query.banca) : undefined,
      query.uf ? eq(provasOrigem.uf, query.uf.toUpperCase()) : undefined,
      query.ano ? eq(provasOrigem.ano, query.ano) : undefined,
      query.status ? eq(provasOrigem.status, query.status) : undefined,
      query.relevanciaPalmital !== undefined ? eq(provasOrigem.relevanciaPalmital, query.relevanciaPalmital) : undefined,
    ];
    const onde = and(...filtros);
    const total = contar((await deps.db.select({ n: count() }).from(provasOrigem).where(onde))[0]?.n);
    const lista = await deps.db
      .select({ p: provasOrigem, n: sql<number>`(select count(*)::int from ${questoes} where ${questoes.provaOrigemId} = ${provasOrigem.id})` })
      .from(provasOrigem)
      .where(onde)
      .orderBy(desc(provasOrigem.ano), asc(provasOrigem.orgao))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map((x) => mapProva(x.p, contar(x.n))), total, pagina: query.pagina, porPagina: query.porPagina };
  });
  const obterProva = async (db: Db, id: string) => {
    const [x] = await db
      .select({ p: provasOrigem, n: sql<number>`(select count(*)::int from ${questoes} where ${questoes.provaOrigemId} = ${provasOrigem.id})` })
      .from(provasOrigem)
      .where(eq(provasOrigem.id, id));
    const v = existe(x, 'Prova não encontrada.');
    return mapProva(v.p, contar(v.n));
  };
  r.rota('adminProvaObter', async ({ params, deps }) => obterProva(deps.db, params.id));
  r.rota('adminProvaCriar', async ({ corpo, deps, usuario, agora }) => {
    const [p] = await deps.db.insert(provasOrigem).values({ ...corpo, fonte: 'manual', criadoEm: agora }).returning();
    await auditar(deps.db, usuario.id, 'prova.editar', `prova:${p!.id}`, { criada: true }, agora);
    return obterProva(deps.db, p!.id);
  });
  r.rota('adminProvaAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [p] = await deps.db.update(provasOrigem).set(corpo).where(eq(provasOrigem.id, params.id)).returning();
    existe(p, 'Prova não encontrada.');
    if (corpo.status) await subirVersaoConteudo(deps.db);
    await auditar(deps.db, usuario.id, 'prova.editar', `prova:${params.id}`, corpo, agora);
    return obterProva(deps.db, params.id);
  });

  /* ---------------------------------------------------------- questões */
  r.rota('adminQuestoesListar', async ({ query, deps }) => {
    const { db } = deps;
    const reportsSql = sql<number>`(select count(*)::int from ${reports} where ${reports.questaoId} = ${questoes.id} and ${reports.status} = 'aberto')`;
    const onde = and(
      query.q ? contem(questoes.enunciado, query.q) : undefined,
      query.disciplina ? eq(disciplinas.slug, query.disciplina) : undefined,
      query.assuntoId ? eq(questoes.assuntoId, query.assuntoId) : undefined,
      query.status ? eq(questoes.status, query.status) : undefined,
      query.origem ? eq(questoes.origem, query.origem) : undefined,
      query.area ? sql`${questoes.areas} @> array[${query.area}]::text[]` : undefined,
      query.provaOrigemId ? eq(questoes.provaOrigemId, query.provaOrigemId) : undefined,
      query.dificuldade ? eq(questoes.dificuldade, query.dificuldade) : undefined,
      query.comReports ? sql`${reportsSql} > 0` : undefined,
    );
    const base = db
      .select({ n: count() })
      .from(questoes)
      .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
      .where(onde);
    const total = contar((await base)[0]?.n);
    const ordem =
      query.ordenar === 'antigas'
        ? [asc(questoes.criadoEm)]
        : query.ordenar === 'numero'
          ? [asc(questoes.provaOrigemId), asc(questoes.numeroOrigem)]
          : query.ordenar === 'reports'
            ? [desc(reportsSql), desc(questoes.atualizadoEm)]
            : [desc(questoes.atualizadoEm)];
    const lista = await db
      .select({
        q: questoes,
        d: disciplinas,
        a: { id: assuntos.id, nome: assuntos.nome },
        p: { id: provasOrigem.id, orgao: provasOrigem.orgao, ano: provasOrigem.ano },
        rep: reportsSql,
      })
      .from(questoes)
      .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
      .innerJoin(assuntos, eq(assuntos.id, questoes.assuntoId))
      .leftJoin(provasOrigem, eq(provasOrigem.id, questoes.provaOrigemId))
      .where(onde)
      .orderBy(...ordem)
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return {
      itens: lista.map((x) => ({
        id: x.q.id,
        status: x.q.status,
        origem: x.q.origem,
        disciplina: { id: x.d.id, slug: x.d.slug, nome: x.d.nome, cor: x.d.cor },
        assunto: x.a,
        areas: x.q.areas as QuestaoAdmin['areas'],
        dificuldade: x.q.dificuldade,
        trecho: x.q.enunciado.length > 140 ? `${x.q.enunciado.slice(0, 137)}...` : x.q.enunciado,
        provaOrigem: x.p && x.p.id ? { id: x.p.id, orgao: x.p.orgao, ano: x.p.ano } : null,
        numeroOrigem: x.q.numeroOrigem,
        reportsAbertos: contar(x.rep),
        versao: x.q.versao,
        atualizadoEm: iso(x.q.atualizadoEm),
      })),
      total,
      pagina: query.pagina,
      porPagina: query.porPagina,
    };
  });

  r.rota('adminQuestaoObter', async ({ params, deps }) => {
    const [q] = await deps.db.select().from(questoes).where(eq(questoes.id, params.id));
    return mapQuestao(deps.db, existe(q, 'Questão não encontrada.'));
  });

  const salvarQuestao = async (
    db: Db,
    adminId: string,
    corpo: DadosQuestao,
    agora: Date,
    anterior: Questao | null,
  ) => {
    await conferirAssunto(db, corpo.disciplinaId, corpo.assuntoId);
    if (corpo.provaOrigemId) {
      const [p] = await db.select({ id: provasOrigem.id }).from(provasOrigem).where(eq(provasOrigem.id, corpo.provaOrigemId));
      if (!p) throw falha('validacao', 'Prova de origem não encontrada.', { provaOrigemId: 'Prova não encontrada.' });
    }
    const { revisada, ...dados } = corpo;
    const revisadoPor = revisada ? adminId : (anterior?.revisadoPor ?? null);
    if (dados.status === 'publicada') {
      if (await emAssuntoAClassificar(db, dados.assuntoId)) throw falha('assunto_a_classificar');
      const pend = await pendenciasDa(db, { ...dados, revisadoPor });
      if (pend.length) throw falha('validacao', ROTULO_PUBLICAR + pend.join(' '), { status: pend.join(' ') });
    }
    const valores = {
      ...dados,
      revisadoPor,
      publicadoEm: dados.status === 'publicada' ? (anterior?.publicadoEm ?? agora) : (anterior?.publicadoEm ?? null),
    };
    try {
      if (anterior) {
        const [q] = await db
          .update(questoes)
          .set({ ...valores, versao: anterior.versao + 1, atualizadoEm: agora })
          .where(eq(questoes.id, anterior.id))
          .returning();
        return q!;
      }
      const [q] = await db
        .insert(questoes)
        .values({ ...valores, criadoPor: adminId, criadoEm: agora, atualizadoEm: agora })
        .returning();
      return q!;
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conflito', 'Já existe uma questão com esse número nesta prova.');
      throw e;
    }
  };

  r.rota('adminQuestaoCriar', async ({ corpo, deps, usuario, agora }) => {
    const q = await salvarQuestao(deps.db, usuario.id, corpo, agora, null);
    await subirVersaoConteudo(deps.db);
    await auditar(deps.db, usuario.id, 'questao.criar', `questao:${q.id}`, { status: q.status }, agora);
    return mapQuestao(deps.db, q);
  });
  r.rota('adminQuestaoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [ant] = await deps.db.select().from(questoes).where(eq(questoes.id, params.id));
    const q = await salvarQuestao(deps.db, usuario.id, corpo, agora, existe(ant, 'Questão não encontrada.'));
    await subirVersaoConteudo(deps.db);
    await auditar(deps.db, usuario.id, 'questao.editar', `questao:${q.id}`, { de: ant!.status, para: q.status, versao: q.versao }, agora);
    return mapQuestao(deps.db, q);
  });

  r.rota('adminQuestaoPrevia', async ({ params, deps }) => {
    const q = existe((await carregarQuestoes(deps.db, [params.id])).get(params.id), 'Questão não encontrada.');
    return { questao: q.aluno, gabarito: q.gabaritoReal, explicacao: q.explicacao || null, dicaBolso: q.dicaBolso, dica: q.dica };
  });

  r.rota('adminQuestoesLote', async ({ corpo, deps, usuario, agora }) => {
    const lista = await deps.db.select().from(questoes).where(inArray(questoes.id, corpo.ids));
    const ignoradas: { id: string; motivo: string }[] = corpo.ids
      .filter((id) => !lista.some((q) => q.id === id))
      .map((id) => ({ id, motivo: 'Questão não encontrada.' }));
    let atualizadas = 0;
    for (const q of lista) {
      let set: Partial<Questao> | null = null;
      switch (corpo.acao) {
        case 'publicar': {
          const pend = await pendenciasDa(deps.db, q);
          if (await emAssuntoAClassificar(deps.db, q.assuntoId)) {
            ignoradas.push({ id: q.id, motivo: 'Classifique o assunto antes de publicar.' });
          } else if (pend.length) ignoradas.push({ id: q.id, motivo: pend.join(' ') });
          else set = { status: 'publicada', publicadoEm: q.publicadoEm ?? agora };
          break;
        }
        case 'retirar':
          set = { status: 'retirada' };
          break;
        case 'revisao':
          set = { status: 'revisao' };
          break;
        case 'rascunho':
          set = { status: 'rascunho' };
          break;
        case 'anular':
          if (!corpo.motivo) ignoradas.push({ id: q.id, motivo: 'Informe o motivo da anulação.' });
          else set = { status: 'anulada', anuladaMotivo: corpo.motivo };
          break;
      }
      if (set && set.status !== 'anulada' && q.gabarito === null) {
        ignoradas.push({ id: q.id, motivo: 'Defina o gabarito no editor antes de mudar o status.' });
        set = null;
      }
      if (set) {
        await deps.db
          .update(questoes)
          .set({ ...set, versao: q.versao + 1, atualizadoEm: agora })
          .where(eq(questoes.id, q.id));
        atualizadas++;
      }
    }
    if (atualizadas) await subirVersaoConteudo(deps.db);
    await auditar(deps.db, usuario.id, 'questao.lote', null, { acao: corpo.acao, ids: corpo.ids, atualizadas, motivo: corpo.motivo ?? null }, agora);
    return { atualizadas, ignoradas };
  });

  r.rota('adminQuestoesRetirarOrigem', async ({ corpo, deps, usuario, agora }) =>
    deps.db.transaction(async (tx) => {
      let provas: string[];
      if (corpo.provaOrigemId) {
        provas = [existe((await tx.select({ id: provasOrigem.id }).from(provasOrigem).where(eq(provasOrigem.id, corpo.provaOrigemId)))[0], 'Prova não encontrada.').id];
      } else {
        provas = (await tx.select({ id: provasOrigem.id }).from(provasOrigem).where(eq(provasOrigem.banca, corpo.banca!))).map((p) => p.id);
      }
      let retiradas = 0;
      if (provas.length) {
        await tx.update(provasOrigem).set({ status: 'retirada' }).where(inArray(provasOrigem.id, provas));
        const r2 = await tx
          .update(questoes)
          .set({ status: 'retirada', versao: sql`${questoes.versao} + 1`, atualizadoEm: agora })
          .where(and(inArray(questoes.provaOrigemId, provas), eq(questoes.origem, 'fau_real')))
          .returning({ id: questoes.id });
        retiradas = r2.length;
      }
      await subirVersaoConteudo(tx);
      await auditar(tx, usuario.id, 'questao.retirar_origem', corpo.provaOrigemId ? `prova:${corpo.provaOrigemId}` : `banca:${corpo.banca}`, { motivo: corpo.motivo, questoes: retiradas }, agora);
      return { questoesRetiradas: retiradas };
    }),
  );

  r.rota('adminUpload', async ({ req, deps }) => {
    const arquivo = await req.file();
    if (!arquivo || arquivo.fieldname !== 'arquivo') throw falha('validacao', 'Envie a imagem no campo "arquivo".');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[arquivo.mimetype];
    if (!ext) throw falha('validacao', 'Use uma imagem PNG, JPG, WEBP ou GIF.');
    const dados = await arquivo.toBuffer();
    if (arquivo.file.truncated) throw falha('validacao', 'A imagem pode ter no máximo 2 MB.');
    const nome = `${randomUUID()}.${ext}`;
    const pasta = join(deps.config.arquivosDir, 'uploads');
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, nome), dados);
    return { url: `/api/arquivos/uploads/${nome}`, nome, bytes: dados.length };
  });

  /* ------------------------------------------------ disciplinas e assuntos */
  r.rota('adminDisciplinas', async ({ deps }) => ({
    itens: (await deps.db.select().from(disciplinas).orderBy(asc(disciplinas.ordem))).map((d) => ({ id: d.id, slug: d.slug, nome: d.nome, cor: d.cor })),
  }));
  const mapAssunto = async (db: Db, ids?: string[], filtro?: SQL) => {
    const rows = await db
      .select({
        a: assuntos,
        total: sql<number>`(select count(*)::int from ${questoes} where ${questoes.assuntoId} = ${assuntos.id})`,
        pub: sql<number>`(select count(*)::int from ${questoes} where ${questoes.assuntoId} = ${assuntos.id} and ${questoes.status} = 'publicada')`,
      })
      .from(assuntos)
      .innerJoin(disciplinas, eq(disciplinas.id, assuntos.disciplinaId))
      .where(and(ids ? inArray(assuntos.id, ids) : undefined, filtro))
      .orderBy(asc(disciplinas.ordem), asc(assuntos.nome));
    return rows.map((x) => ({
      id: x.a.id,
      disciplinaId: x.a.disciplinaId,
      nome: x.a.nome,
      slug: x.a.slug,
      dicaTitulo: x.a.dicaTitulo,
      dicaTexto: x.a.dicaTexto,
      dicaExemplo: x.a.dicaExemplo,
      totalQuestoes: contar(x.total),
      publicadas: contar(x.pub),
    }));
  };
  r.rota('adminAssuntosListar', async ({ query, deps }) => ({
    itens: await mapAssunto(
      deps.db,
      undefined,
      and(query.disciplina ? eq(disciplinas.slug, query.disciplina) : undefined, query.q ? contem(assuntos.nome, query.q) : undefined),
    ),
  }));
  r.rota('adminAssuntoCriar', async ({ corpo, deps, usuario, agora }) => {
    try {
      const [a] = await deps.db.insert(assuntos).values({ ...corpo, criadoEm: agora }).returning();
      await auditar(deps.db, usuario.id, 'trilha.editar', `assunto:${a!.id}`, { criado: true }, agora);
      return (await mapAssunto(deps.db, [a!.id]))[0]!;
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conflito', 'Já existe um assunto com esse slug nesta disciplina.');
      throw e;
    }
  });
  r.rota('adminAssuntoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [a] = await deps.db.update(assuntos).set(corpo).where(eq(assuntos.id, params.id)).returning();
    existe(a, 'Assunto não encontrado.');
    await subirVersaoConteudo(deps.db);
    await auditar(deps.db, usuario.id, 'trilha.editar', `assunto:${params.id}`, corpo, agora);
    return (await mapAssunto(deps.db, [params.id]))[0]!;
  });

  /* ------------------------------------------------------------ trilhas */
  const arvore = async (db: Db, unidadeIds: string[]) => {
    if (!unidadeIds.length) return [];
    const us = await db.select().from(unidades).where(inArray(unidades.id, unidadeIds)).orderBy(asc(unidades.ordem));
    const ss = await db.select().from(secoes).where(inArray(secoes.unidadeId, unidadeIds)).orderBy(asc(secoes.ordem));
    const ls = ss.length
      ? await db.select().from(licoes).where(inArray(licoes.secaoId, ss.map((s) => s.id))).orderBy(asc(licoes.ordem))
      : [];
    return us.map((u) => ({
      id: u.id,
      concursoId: u.concursoId,
      area: u.area,
      ordem: u.ordem,
      titulo: u.titulo,
      disciplinaId: u.disciplinaId,
      secoes: ss.filter((s) => s.unidadeId === u.id).map((s) => mapSecao(s, ls.filter((l) => l.secaoId === s.id))),
    }));
  };
  r.rota('adminTrilhas', async ({ query, deps }) => {
    const concursoId = query.concursoId ?? (await concursoAtivo(deps.db))?.id;
    if (!concursoId) return { unidades: [] };
    const ids = await deps.db
      .select({ id: unidades.id })
      .from(unidades)
      .where(
        and(
          eq(unidades.concursoId, concursoId),
          query.area === 'comum' ? isNull(unidades.area) : query.area ? eq(unidades.area, query.area) : undefined,
        ),
      );
    return { unidades: await arvore(deps.db, ids.map((i) => i.id)) };
  });
  const concursoDaUnidade = async (db: Db, unidadeId: string) =>
    existe((await db.select({ c: unidades.concursoId }).from(unidades).where(eq(unidades.id, unidadeId)))[0], 'Unidade não encontrada.').c;
  const concursoDaSecao = async (db: Db, secaoId: string) =>
    existe(
      (await db.select({ c: unidades.concursoId }).from(secoes).innerJoin(unidades, eq(unidades.id, secoes.unidadeId)).where(eq(secoes.id, secaoId)))[0],
      'Seção não encontrada.',
    ).c;
  const trilhaMudou = async (db: Db, adminId: string, concursoId: string, alvo: string, detalhes: Record<string, unknown>, agora: Date) => {
    await subirVersaoConteudo(db, concursoId);
    await auditar(db, adminId, 'trilha.editar', alvo, detalhes, agora);
  };

  r.rota('adminTrilhasOrdem', async ({ corpo, deps, usuario, agora }) => {
    await deps.db.transaction(async (tx) => {
      const tabela = corpo.nivel === 'unidades' ? unidades : corpo.nivel === 'secoes' ? secoes : licoes;
      const pai = corpo.nivel === 'unidades' ? unidades.concursoId : corpo.nivel === 'secoes' ? secoes.unidadeId : licoes.secaoId;
      for (const [i, id] of corpo.ids.entries()) {
        await tx.update(tabela).set({ ordem: i + 1 }).where(and(eq(tabela.id, id), eq(pai, corpo.paiId)));
      }
      const concursoId =
        corpo.nivel === 'unidades' ? corpo.paiId : corpo.nivel === 'secoes' ? await concursoDaUnidade(tx, corpo.paiId) : await concursoDaSecao(tx, corpo.paiId);
      await trilhaMudou(tx, usuario.id, concursoId, `${corpo.nivel}:${corpo.paiId}`, { reordenar: corpo.ids }, agora);
    });
    return { ok: true as const };
  });

  r.rota('adminUnidadeCriar', async ({ corpo, deps, usuario, agora }) => {
    const [u] = await deps.db.insert(unidades).values({ ...corpo, criadoEm: agora }).returning();
    await trilhaMudou(deps.db, usuario.id, corpo.concursoId, `unidade:${u!.id}`, { criada: true }, agora);
    return (await arvore(deps.db, [u!.id]))[0]!;
  });
  r.rota('adminUnidadeAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [u] = await deps.db.update(unidades).set(corpo).where(eq(unidades.id, params.id)).returning();
    existe(u, 'Unidade não encontrada.');
    await trilhaMudou(deps.db, usuario.id, u!.concursoId, `unidade:${u!.id}`, corpo, agora);
    return (await arvore(deps.db, [u!.id]))[0]!;
  });
  r.rota('adminUnidadeExcluir', async ({ params, deps, usuario, agora }) => {
    const concursoId = await concursoDaUnidade(deps.db, params.id);
    const [n] = await deps.db.select({ n: count() }).from(secoes).where(eq(secoes.unidadeId, params.id));
    if (contar(n?.n) > 0) throw falha('conflito', 'Só é possível excluir uma unidade vazia. Remova as seções antes.');
    await deps.db.delete(unidades).where(eq(unidades.id, params.id));
    await trilhaMudou(deps.db, usuario.id, concursoId, `unidade:${params.id}`, { excluida: true }, agora);
    return { ok: true as const };
  });

  r.rota('adminSecaoCriar', async ({ corpo, deps, usuario, agora }) => {
    const concursoId = await concursoDaUnidade(deps.db, corpo.unidadeId);
    const [s] = await deps.db.insert(secoes).values(corpo).returning();
    await trilhaMudou(deps.db, usuario.id, concursoId, `secao:${s!.id}`, { criada: true }, agora);
    return mapSecao(s!, []);
  });
  r.rota('adminSecaoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [s] = await deps.db.update(secoes).set(corpo).where(eq(secoes.id, params.id)).returning();
    existe(s, 'Seção não encontrada.');
    await trilhaMudou(deps.db, usuario.id, await concursoDaSecao(deps.db, s!.id), `secao:${s!.id}`, corpo, agora);
    const ls = await deps.db.select().from(licoes).where(eq(licoes.secaoId, s!.id)).orderBy(asc(licoes.ordem));
    return mapSecao(s!, ls);
  });
  r.rota('adminSecaoExcluir', async ({ params, deps, usuario, agora }) => {
    const concursoId = await concursoDaSecao(deps.db, params.id);
    await deps.db.delete(secoes).where(eq(secoes.id, params.id));
    await trilhaMudou(deps.db, usuario.id, concursoId, `secao:${params.id}`, { excluida: true }, agora);
    return { ok: true as const };
  });

  r.rota('adminLicaoCriar', async ({ corpo, deps, usuario, agora }) => {
    const concursoId = await concursoDaSecao(deps.db, corpo.secaoId);
    const [l] = await deps.db.insert(licoes).values(corpo).returning();
    await trilhaMudou(deps.db, usuario.id, concursoId, `licao:${l!.id}`, { criada: true }, agora);
    return mapLicao(l!);
  });
  r.rota('adminLicaoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const set = Object.fromEntries(Object.entries(corpo).filter(([, v]) => v !== undefined));
    if (set.tipo === 'desafio') set.tamanho = 10;
    const [l] = await deps.db.update(licoes).set(set).where(eq(licoes.id, params.id)).returning();
    existe(l, 'Lição não encontrada.');
    await trilhaMudou(deps.db, usuario.id, await concursoDaSecao(deps.db, l!.secaoId), `licao:${l!.id}`, set, agora);
    return mapLicao(l!);
  });
  r.rota('adminLicaoExcluir', async ({ params, deps, usuario, agora }) => {
    const [l] = await deps.db.select().from(licoes).where(eq(licoes.id, params.id));
    existe(l, 'Lição não encontrada.');
    const concursoId = await concursoDaSecao(deps.db, l!.secaoId);
    await deps.db.delete(licoes).where(eq(licoes.id, params.id));
    await trilhaMudou(deps.db, usuario.id, concursoId, `licao:${params.id}`, { excluida: true }, agora);
    return { ok: true as const };
  });

  /* -------------------------------------------------------------- edital */
  const edital = async (db: Db, concursoId: string) => {
    const [c] = await db.select().from(concursos).where(eq(concursos.id, concursoId));
    const concurso = existe(c, 'Concurso não encontrado.');
    const cs = await db.select().from(cargos).where(eq(cargos.concursoId, concursoId)).orderBy(asc(cargos.ordem), asc(cargos.nome));
    const ss = await db
      .select({ s: secoes, u: unidades })
      .from(secoes)
      .innerJoin(unidades, eq(unidades.id, secoes.unidadeId))
      .where(eq(unidades.concursoId, concursoId))
      .orderBy(asc(unidades.ordem), asc(secoes.ordem));
    return {
      concurso: mapConcurso(concurso),
      cargos: cs.map(mapCargo),
      secoes: ss.map((x) => ({ id: x.s.id, titulo: x.s.titulo, unidadeTitulo: x.u.titulo, area: x.u.area, noEdital: x.s.noEdital })),
    };
  };
  r.rota('adminEditalObter', async ({ query, deps }) => edital(deps.db, query.concursoId));
  r.rota('adminEditalSalvar', async ({ corpo, deps, usuario, agora }) => {
    await deps.db.transaction(async (tx) => {
      const [c] = await tx
        .update(concursos)
        .set({ dataProva: corpo.dataProva, links: corpo.links, versaoConteudo: sql`${concursos.versaoConteudo} + 1` })
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
      for (const s of corpo.secoes) await tx.update(secoes).set({ noEdital: s.noEdital }).where(eq(secoes.id, s.secaoId));
      await auditar(tx, usuario.id, 'edital.salvar', `concurso:${corpo.concursoId}`, { cargos: corpo.cargos.length, secoes: corpo.secoes.length }, agora);
    });
    return edital(deps.db, corpo.concursoId);
  });
  r.rota('adminEditalPublicar', async ({ corpo, deps, usuario, agora }) =>
    deps.db.transaction(async (tx) => {
      const [n] = await tx.select({ n: count() }).from(cargos).where(and(eq(cargos.concursoId, corpo.concursoId), eq(cargos.generico, false), eq(cargos.ativo, true)));
      if (contar(n?.n) === 0) throw falha('conflito', 'Cadastre os cargos do edital antes de publicar.');
      const [c] = await tx
        .update(concursos)
        .set({ status: 'edital_publicado', editalPublicadoEm: agora, versaoConteudo: sql`${concursos.versaoConteudo} + 1` })
        .where(eq(concursos.id, corpo.concursoId))
        .returning();
      existe(c, 'Concurso não encontrado.');
      const [p] = await tx
        .select({ n: count() })
        .from(usuarios)
        .innerJoin(cargos, eq(cargos.id, usuarios.cargoId))
        .where(and(eq(usuarios.concursoId, corpo.concursoId), eq(cargos.generico, true), isNull(usuarios.excluidoEm)));
      await auditar(tx, usuario.id, 'edital.publicar', `concurso:${corpo.concursoId}`, null, agora);
      return { ok: true as const, usuariosParaConfirmar: contar(p?.n) };
    }),
  );

  /* ---------------------------------------------------------- importações */
  const mapImportacao = (i: typeof importacoes.$inferSelect, p: { id: string | null; orgao: string | null; ano: number | null; cargo: string | null } | null) => ({
    id: i.id,
    provaOrigem: p && p.id ? { id: p.id, orgao: p.orgao ?? '', ano: p.ano, cargo: p.cargo } : null,
    arquivoCaderno: i.arquivoCaderno,
    arquivoGabarito: i.arquivoGabarito,
    arquivoPreliminar: i.arquivoPreliminar,
    cargo: i.cargo,
    status: i.status,
    questoesExtraidas: i.questoesExtraidas,
    divergencias: i.divergencias,
    criadoEm: iso(i.criadoEm),
    atualizadoEm: iso(i.atualizadoEm),
  });
  const selImport = (db: Db) =>
    db
      .select({ i: importacoes, p: { id: provasOrigem.id, orgao: provasOrigem.orgao, ano: provasOrigem.ano, cargo: provasOrigem.cargo } })
      .from(importacoes)
      .leftJoin(provasOrigem, eq(provasOrigem.id, importacoes.provaOrigemId));
  const detalheImport = async (db: Db, id: string) => {
    const [x] = await selImport(db).where(eq(importacoes.id, id));
    const v = existe(x, 'Importação não encontrada.');
    return { ...mapImportacao(v.i, v.p), log: v.i.log, confronto: v.i.confronto };
  };
  r.rota('adminImportacoesListar', async ({ query, deps }) => {
    const onde = query.status ? eq(importacoes.status, query.status) : undefined;
    const total = contar((await deps.db.select({ n: count() }).from(importacoes).where(onde))[0]?.n);
    const lista = await selImport(deps.db)
      .where(onde)
      .orderBy(desc(importacoes.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map((x) => mapImportacao(x.i, x.p)), total, pagina: query.pagina, porPagina: query.porPagina };
  });
  r.rota('adminImportacaoObter', async ({ params, deps }) => detalheImport(deps.db, params.id));
  r.rota('adminImportacaoAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [i] = await deps.db.update(importacoes).set({ status: corpo.status, atualizadoEm: agora }).where(eq(importacoes.id, params.id)).returning();
    existe(i, 'Importação não encontrada.');
    await auditar(deps.db, usuario.id, 'questao.editar', `importacao:${params.id}`, { status: corpo.status }, agora);
    return detalheImport(deps.db, params.id);
  });
}
