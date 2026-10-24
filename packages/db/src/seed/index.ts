/**
 * Seed idempotente (rodar várias vezes não duplica nada):
 * - concurso Palmital-PR 2026/27 (FAU-Unicentro, aguardando_edital);
 * - cargos genéricos por área (PRD 7.2), distribuição 5/5/5/25;
 * - disciplinas portugues/matematica/gerais/especificos;
 * - todos os certames de dados/catalogo_fau.json (e a amostra do PCI) em provas_origem;
 * - unidades de exemplo com seções, lições (normais, baú e desafio), assuntos com dica e
 *   questões AUTORAIS marcadas `rascunho`.
 *
 * Com `publicarAutorais` (ou SEED_DEV_PUBLICAR=1), as autorais do seed viram `publicada`
 * para o app de desenvolvimento mostrá-las. Proibido em produção (docs/DECISOES.md).
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { SlugDisciplina } from '@fuse/shared';
import type { BancoDados } from '../cliente.js';
import {
  assuntos,
  cargos,
  concursos,
  DISTRIBUICAO_PADRAO_JSON,
  disciplinas,
  licoes,
  provasOrigem,
  questoes,
  secoes,
  unidades,
} from '../schema/tabelas.js';
import { CAMINHO_CATALOGO, lerCatalogo, linhasProvasOrigem } from './catalogo.js';
import { unidadeAdministrativo } from './conteudo/administrativo.js';
import { unidadeEstatuto, unidadeLeiOrganica } from './conteudo/gerais.js';
import { unidadeMatematica } from './conteudo/matematica.js';
import { unidadePortugues } from './conteudo/portugues.js';
import type { UnidadeSeed } from './conteudo/tipos.js';
import { CARGOS_GENERICOS, CONCURSO_PALMITAL, DISCIPLINAS } from './dados-base.js';
import { idFixo } from './ids.js';

export { idFixo } from './ids.js';
export { linhasProvasOrigem, lerCatalogo, CAMINHO_CATALOGO } from './catalogo.js';
export type { UnidadeSeed, SecaoSeed, QuestaoSeed } from './conteudo/tipos.js';

export const UNIDADES_SEED: UnidadeSeed[] = [
  unidadePortugues,
  unidadeMatematica,
  unidadeLeiOrganica,
  unidadeEstatuto,
  unidadeAdministrativo,
];

/** Lições normais por seção (PRD 7.1: 3 a 6) e baú a cada 3 lições. */
export const LICOES_POR_SECAO = 3;
export const BAU_A_CADA = 3;

export interface OpcoesSeed {
  /** Publica as questões autorais do seed (só desenvolvimento). Padrão: SEED_DEV_PUBLICAR=1. */
  publicarAutorais?: boolean;
  /** Caminho do catalogo_fau.json (padrão: dados/catalogo_fau.json na raiz). */
  caminhoCatalogo?: string;
  /** Pula a importação do catálogo (testes rápidos). */
  semCatalogo?: boolean;
  /** Mostra o progresso no console. */
  log?: (msg: string) => void;
}

export interface ResumoSeed {
  concursoId: string;
  cargos: number;
  disciplinas: number;
  provasOrigem: number;
  assuntos: number;
  unidades: number;
  secoes: number;
  licoes: number;
  questoes: number;
  autoraisPublicadas: boolean;
  pendencias: string[];
}

function emLotes<T>(lista: T[], tamanho: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) r.push(lista.slice(i, i + tamanho));
  return r;
}

export function publicarAutoraisPeloAmbiente(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SEED_DEV_PUBLICAR === '1' || env.SEED_DEV_PUBLICAR === 'true';
}

/** Estrutura de lições de uma unidade (ordem dentro de cada seção). */
export function planoDeLicoes(u: UnidadeSeed) {
  const plano: {
    secaoChave: string;
    ordem: number;
    tipo: 'normal' | 'bau' | 'desafio';
    tamanho: 5 | 10;
    titulo: string;
  }[] = [];
  let normais = 0;
  u.secoes.forEach((s, iSecao) => {
    let ordem = 0;
    for (let n = 1; n <= LICOES_POR_SECAO; n++) {
      plano.push({
        secaoChave: s.chave,
        ordem: ++ordem,
        tipo: 'normal',
        tamanho: 5,
        titulo: `${s.titulo} · Lição ${n}`,
      });
      normais++;
      if (normais % BAU_A_CADA === 0) {
        plano.push({ secaoChave: s.chave, ordem: ++ordem, tipo: 'bau', tamanho: 5, titulo: 'Baú' });
      }
    }
    if (iSecao === u.secoes.length - 1) {
      plano.push({
        secaoChave: s.chave,
        ordem: ++ordem,
        tipo: 'desafio',
        tamanho: 10,
        titulo: `Desafio: ${u.titulo}`,
      });
    }
  });
  return plano;
}

export async function semear(db: BancoDados, opcoes: OpcoesSeed = {}): Promise<ResumoSeed> {
  const log = opcoes.log ?? (() => {});
  const publicar = opcoes.publicarAutorais ?? publicarAutoraisPeloAmbiente();
  if (publicar && process.env.NODE_ENV === 'production') {
    throw new Error(
      'SEED_DEV_PUBLICAR é só para desenvolvimento e não pode ser usado em produção.',
    );
  }

  return db.transaction(async (tx) => {
    /* ---------------------------------------------------------- concurso */
    await tx
      .insert(concursos)
      .values({
        id: idFixo(CONCURSO_PALMITAL.chave),
        slug: CONCURSO_PALMITAL.slug,
        nome: CONCURSO_PALMITAL.nome,
        banca: CONCURSO_PALMITAL.banca,
        orgao: CONCURSO_PALMITAL.orgao,
        municipio: CONCURSO_PALMITAL.municipio,
        uf: CONCURSO_PALMITAL.uf,
        ano: CONCURSO_PALMITAL.ano,
        status: CONCURSO_PALMITAL.status,
        links: CONCURSO_PALMITAL.links,
      })
      .onConflictDoNothing();
    const [concurso] = await tx
      .select({ id: concursos.id })
      .from(concursos)
      .where(eq(concursos.slug, CONCURSO_PALMITAL.slug));
    const concursoId = concurso!.id;
    log('concurso ok');

    /* ------------------------------------------------------------ cargos */
    await tx
      .insert(cargos)
      .values(
        CARGOS_GENERICOS.map((c, i) => ({
          id: idFixo(`cargo:${CONCURSO_PALMITAL.slug}:${c.nome}`),
          concursoId,
          nome: c.nome,
          area: c.area,
          escolaridade: c.escolaridade,
          distribuicao: DISTRIBUICAO_PADRAO_JSON,
          generico: true,
          ordem: i + 1,
        })),
      )
      .onConflictDoNothing();
    log(`cargos ok (${CARGOS_GENERICOS.length})`);

    /* ------------------------------------------------------- disciplinas */
    await tx
      .insert(disciplinas)
      .values(DISCIPLINAS.map((d) => ({ id: idFixo(`disciplina:${d.slug}`), ...d })))
      .onConflictDoNothing();
    const linhasDisc = await tx
      .select({ id: disciplinas.id, slug: disciplinas.slug })
      .from(disciplinas);
    const idDisciplina = Object.fromEntries(linhasDisc.map((d) => [d.slug, d.id])) as Record<
      SlugDisciplina,
      string
    >;

    /* ----------------------------------------------------- provas_origem */
    let totalProvas = 0;
    if (!opcoes.semCatalogo) {
      const catalogo = await lerCatalogo(opcoes.caminhoCatalogo ?? CAMINHO_CATALOGO);
      const linhas = linhasProvasOrigem(catalogo);
      for (const lote of emLotes(linhas, 100)) {
        await tx
          .insert(provasOrigem)
          .values(lote)
          .onConflictDoUpdate({
            target: provasOrigem.id,
            set: {
              nome: sql`excluded.nome`,
              tipo: sql`excluded.tipo`,
              orgao: sql`excluded.orgao`,
              municipio: sql`excluded.municipio`,
              ano: sql`excluded.ano`,
              dataProva: sql`excluded.data_prova`,
              cargo: sql`excluded.cargo`,
              regime: sql`excluded.regime`,
              urlPagina: sql`excluded.url_pagina`,
              slugFau: sql`excluded.slug_fau`,
              relevanciaPalmital: sql`excluded.relevancia_palmital`,
            },
          });
      }
      totalProvas = linhas.length;
      log(`provas_origem ok (${totalProvas})`);
    }

    /* ------------------------------------------------- unidades e questões */
    let nAssuntos = 0;
    let nSecoes = 0;
    let nLicoes = 0;
    let nQuestoes = 0;
    const idsQuestoes: string[] = [];
    const pendencias: string[] = [];

    for (const u of UNIDADES_SEED) {
      const disciplinaId = idDisciplina[u.disciplina];
      const unidadeId = idFixo(`${u.chave}:${concursoId}`);
      if (u.todo) pendencias.push(`${u.titulo}: ${u.todo}`);
      await tx
        .insert(unidades)
        .values({
          id: unidadeId,
          concursoId,
          area: u.area,
          ordem: u.ordem,
          titulo: u.titulo,
          disciplinaId,
        })
        .onConflictDoNothing();

      const idSecao: Record<string, string> = {};
      for (const [i, s] of u.secoes.entries()) {
        await tx
          .insert(assuntos)
          .values({
            id: idFixo(`assunto:${u.disciplina}:${s.assunto.slug}`),
            disciplinaId,
            nome: s.assunto.nome,
            slug: s.assunto.slug,
            dicaTitulo: s.assunto.dicaTitulo,
            dicaTexto: s.assunto.dicaTexto,
            dicaExemplo: s.assunto.dicaExemplo,
          })
          .onConflictDoNothing();
        const [assunto] = await tx
          .select({ id: assuntos.id })
          .from(assuntos)
          .where(and(eq(assuntos.disciplinaId, disciplinaId), eq(assuntos.slug, s.assunto.slug)));
        const assuntoId = assunto!.id;
        nAssuntos++;

        const secaoId = idFixo(`${s.chave}:${unidadeId}`);
        idSecao[s.chave] = secaoId;
        await tx
          .insert(secoes)
          .values({ id: secaoId, unidadeId, ordem: i + 1, titulo: s.titulo, assuntoId })
          .onConflictDoNothing();
        nSecoes++;

        const valores = s.questoes.map((q) => {
          const id = idFixo(q.chave);
          idsQuestoes.push(id);
          return {
            id,
            origem: 'autoral' as const,
            provaOrigemId: null,
            numeroOrigem: null,
            disciplinaId,
            assuntoId,
            areas: u.area ? [u.area] : [],
            dificuldade: q.dificuldade ?? 2,
            textoApoio: q.textoApoio ?? null,
            enunciado: q.enunciado,
            alternativas: q.alternativas.map((texto, k) => ({
              letra: (['A', 'B', 'C', 'D', 'E'] as const)[k]!,
              texto,
            })),
            gabarito: q.gabarito,
            dica: q.dica,
            explicacao: q.explicacao,
            dicaBolso: q.dicaBolso,
            status: publicar ? ('publicada' as const) : ('rascunho' as const),
            publicadoEm: publicar ? new Date() : null,
          };
        });
        if (valores.length) await tx.insert(questoes).values(valores).onConflictDoNothing();
        nQuestoes += valores.length;
      }

      const plano = planoDeLicoes(u);
      await tx
        .insert(licoes)
        .values(
          plano.map((l) => ({
            id: idFixo(`licao:${l.secaoChave}:${unidadeId}:${l.ordem}`),
            secaoId: idSecao[l.secaoChave]!,
            ordem: l.ordem,
            tipo: l.tipo,
            tamanho: l.tamanho,
            titulo: l.titulo,
          })),
        )
        .onConflictDoNothing();
      nLicoes += plano.length;
      log(`unidade "${u.titulo}" ok`);
    }

    if (publicar && idsQuestoes.length) {
      await tx
        .update(questoes)
        .set({ status: 'publicada', publicadoEm: new Date() })
        .where(
          and(
            inArray(questoes.id, idsQuestoes),
            eq(questoes.status, 'rascunho'),
            eq(questoes.origem, 'autoral'),
          ),
        );
      log('autorais do seed publicadas (SEED_DEV_PUBLICAR)');
    }

    return {
      concursoId,
      cargos: CARGOS_GENERICOS.length,
      disciplinas: DISCIPLINAS.length,
      provasOrigem: totalProvas,
      assuntos: nAssuntos,
      unidades: UNIDADES_SEED.length,
      secoes: nSecoes,
      licoes: nLicoes,
      questoes: nQuestoes,
      autoraisPublicadas: publicar,
      pendencias,
    };
  });
}
