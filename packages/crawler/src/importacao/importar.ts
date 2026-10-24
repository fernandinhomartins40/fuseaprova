/**
 * `crawler importar <caderno.pdf> --gabarito <gabarito.pdf> [--prova <id>]` e a função de
 * biblioteca `importarProva`.
 *
 * Fluxo: extrai o texto (pdftotext), separa questões e alternativas, lê o gabarito
 * definitivo (anuladas e alteradas), confronta e grava:
 * - questões `rascunho` (anuladas como `anulada`), origem `fau_real`, ligadas à prova de
 *   origem com `numero_origem`; NUNCA `publicada` (publicar exige revisão humana, PRD 7.4);
 * - a importação em `importacoes` (status `confrontado`, estatísticas, divergências e o
 *   confronto número a número para o painel admin; `erro` com o log em caso de falha).
 *
 * Reimportar a mesma prova não duplica (unique prova+número) e não mexe em questões já
 * revisadas; com `forcar`, atualiza só as que continuam `rascunho`/`anulada`.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import {
  assuntos,
  type ConfrontoJson,
  disciplinas,
  importacoes,
  provasOrigem,
  questoes,
} from '@fuse/db/schema';
import { idFixo } from '@fuse/db/seed';
import type { SlugDisciplina } from '@fuse/shared';
import { sha256, sha256DoArquivo } from '../arquivos/armazenamento.js';
import { parseCaderno, qualidadeDaExtracao, type ResultadoCaderno } from './caderno.js';
import {
  confrontar,
  notaDeAlteracao,
  observacaoDoItem,
  type ResultadoConfronto,
} from './confronto.js';
import { escolherGabarito, parseGabarito, type ResultadoGabarito } from './gabarito.js';
import { lerTexto, type OpcoesPdf } from './pdf.js';
import { chaveComparacao } from '../util/texto.js';

/** Caminho de um PDF (ou .txt já extraído) ou o texto pronto. */
export type FonteTexto = string | { texto: string; nome?: string };

export interface OpcoesImportar {
  db: BancoDados;
  caderno: FonteTexto;
  gabarito: FonteTexto;
  /** Gabarito preliminar (opcional), para citar a letra antiga nas alteradas. */
  preliminar?: FonteTexto | null;
  /** Id de provas_origem. */
  provaId: string;
  /** Cargo do bloco do gabarito (quando o PDF tem vários cargos). */
  cargo?: string | null;
  /** Atualiza questões já importadas que ainda estão em rascunho/anulada. */
  forcar?: boolean;
  /** Só confronta; não grava nada. */
  simular?: boolean;
  pdf?: OpcoesPdf;
  log?: (msg: string) => void;
}

export interface ResumoImportacao {
  importacaoId: string | null;
  provaId: string;
  cargo: string | null;
  extraidas: number;
  gravadas: number;
  atualizadas: number;
  jaExistiam: number;
  anuladas: number;
  alteradas: number;
  divergencias: number;
  confronto: ResultadoConfronto;
  caderno: ResultadoCaderno;
  gabarito: ResultadoGabarito;
  avisos: string[];
}

/** Assunto provisório de cada disciplina para as questões importadas (o admin reclassifica). */
export const SLUG_ASSUNTO_IMPORTACAO = 'a-classificar';
export const NOME_ASSUNTO_IMPORTACAO = 'A classificar (importação)';

const DISCIPLINA_PADRAO: SlugDisciplina = 'especificos';

function nomeDaFonte(f: FonteTexto): string {
  return typeof f === 'string' ? f : (f.nome ?? 'texto');
}

async function hashDaFonte(f: FonteTexto): Promise<string> {
  return typeof f === 'string' ? sha256DoArquivo(f) : sha256(f.texto);
}

/** Caderno: tenta o texto normal e o `-layout` e fica com a extração de melhor qualidade. */
export async function extrairCaderno(
  f: FonteTexto,
  pdf: OpcoesPdf = {},
): Promise<ResultadoCaderno> {
  if (typeof f !== 'string') return parseCaderno(f.texto);
  if (/\.txt$/i.test(f)) return parseCaderno(await lerTexto(f));
  // -raw primeiro (1 coluna); se não sair tudo completo, compara com -layout e o modo normal.
  let melhor: ResultadoCaderno | null = null;
  for (const modo of ['raw', 'layout', 'normal'] as const) {
    const r = parseCaderno(await lerTexto(f, { ...pdf, modo }));
    if (!melhor || qualidadeDaExtracao(r) > qualidadeDaExtracao(melhor)) melhor = r;
    const completas = r.questoes.filter((q) => q.alternativas.length === 5 && q.enunciado).length;
    if (r.questoes.length && completas === r.questoes.length) break;
  }
  return melhor!;
}

export async function extrairGabarito(
  f: FonteTexto,
  pdf: OpcoesPdf = {},
): Promise<ResultadoGabarito> {
  return parseGabarito(
    typeof f === 'string' ? await lerTexto(f, { ...pdf, modo: 'layout' }) : f.texto,
  );
}

async function assuntosDeImportacao(
  db: BancoDados,
): Promise<Record<SlugDisciplina, { disciplinaId: string; assuntoId: string }>> {
  const discs = await db.select({ id: disciplinas.id, slug: disciplinas.slug }).from(disciplinas);
  if (!discs.length)
    throw new Error(
      'A tabela de disciplinas está vazia: rode o seed (`pnpm db:seed`) antes de importar.',
    );
  const mapa = {} as Record<SlugDisciplina, { disciplinaId: string; assuntoId: string }>;
  for (const d of discs) {
    await db
      .insert(assuntos)
      .values({
        id: idFixo(`assunto:${d.slug}:${SLUG_ASSUNTO_IMPORTACAO}`),
        disciplinaId: d.id,
        nome: NOME_ASSUNTO_IMPORTACAO,
        slug: SLUG_ASSUNTO_IMPORTACAO,
      })
      .onConflictDoNothing();
    const [a] = await db
      .select({ id: assuntos.id })
      .from(assuntos)
      .where(and(eq(assuntos.disciplinaId, d.id), eq(assuntos.slug, SLUG_ASSUNTO_IMPORTACAO)));
    mapa[d.slug] = { disciplinaId: d.id, assuntoId: a!.id };
  }
  return mapa;
}

function textoDoLog(r: Omit<ResumoImportacao, 'importacaoId'>, extra: string[] = []): string {
  const linhas = [
    `Questões extraídas: ${r.extraidas}; gravadas: ${r.gravadas}; atualizadas: ${r.atualizadas}; já existiam: ${r.jaExistiam}.`,
    `Anuladas: ${r.anuladas}; alteradas: ${r.alteradas}; divergências: ${r.divergencias}.`,
    r.cargo ? `Cargo do gabarito: ${r.cargo}.` : null,
    ...r.avisos.map((a) => `Aviso: ${a}`),
    ...extra,
  ];
  return linhas.filter(Boolean).join('\n');
}

export async function importarProva(o: OpcoesImportar): Promise<ResumoImportacao> {
  const { db } = o;
  const [prova] = await db
    .select()
    .from(provasOrigem)
    .where(eq(provasOrigem.id, o.provaId))
    .limit(1);
  if (!prova) throw new Error(`Prova de origem ${o.provaId} não encontrada em provas_origem.`);

  const hashCaderno = await hashDaFonte(o.caderno);
  let importacaoId: string | null = null;
  if (!o.simular) {
    const [imp] = await db
      .insert(importacoes)
      .values({
        provaOrigemId: prova.id,
        arquivoCaderno: nomeDaFonte(o.caderno),
        arquivoGabarito: nomeDaFonte(o.gabarito),
        arquivoPreliminar: o.preliminar ? nomeDaFonte(o.preliminar) : null,
        cargo: o.cargo ?? prova.cargo ?? null,
        hashCaderno,
        status: 'baixado',
      })
      .returning({ id: importacoes.id });
    importacaoId = imp!.id;
  }

  try {
    const caderno = await extrairCaderno(o.caderno, o.pdf);
    if (importacaoId) {
      await db
        .update(importacoes)
        .set({ status: 'extraido', questoesExtraidas: caderno.questoes.length })
        .where(eq(importacoes.id, importacaoId));
    }
    if (!caderno.questoes.length) throw new Error('Nenhuma questão encontrada no caderno.');

    const gabarito = await extrairGabarito(o.gabarito, o.pdf);
    // O cargo da capa do caderno vale mais que o informado: um concurso pode ter
    // "Advogado" e "Advogado SUAS I" no mesmo gabarito.
    const cargoAlvo = caderno.cargo ?? o.cargo ?? prova.cargo;
    const bloco = escolherGabarito(gabarito, cargoAlvo);
    const preliminar = o.preliminar
      ? escolherGabarito(await extrairGabarito(o.preliminar, o.pdf), bloco.cargo ?? o.cargo)
      : null;
    const confronto = confrontar(caderno.questoes, bloco, preliminar);
    const avisos = [...caderno.avisos, ...gabarito.avisos];
    if (
      caderno.cargo &&
      bloco.cargo &&
      chaveComparacao(caderno.cargo) !== chaveComparacao(bloco.cargo)
    )
      avisos.push(
        `O cargo do caderno (${caderno.cargo}) não é igual ao do gabarito (${bloco.cargo}); confira.`,
      );
    if (gabarito.preliminar && !o.simular) {
      throw new Error(
        'O arquivo passado em --gabarito é o gabarito PRELIMINAR. Use o definitivo (PRD 7.4).',
      );
    }

    let gravadas = 0;
    let atualizadas = 0;
    let jaExistiam = 0;
    const idPorNumero = new Map<number, string>();

    if (!o.simular) {
      await db.transaction(async (tx) => {
        const txDb = tx as unknown as BancoDados;
        const mapa = await assuntosDeImportacao(txDb);
        const numeros = confronto.itens.filter((i) => i.status).map((i) => i.numero);
        const existentes = numeros.length
          ? await txDb
              .select({ id: questoes.id, numero: questoes.numeroOrigem, status: questoes.status })
              .from(questoes)
              .where(
                and(eq(questoes.provaOrigemId, prova.id), inArray(questoes.numeroOrigem, numeros)),
              )
          : [];
        const existente = new Map(existentes.map((e) => [e.numero!, e]));

        for (const item of confronto.itens) {
          if (!item.status || !item.questao || !item.resposta) continue;
          const q = item.questao;
          const disc = mapa[q.disciplina ?? DISCIPLINA_PADRAO] ?? mapa[DISCIPLINA_PADRAO];
          if (!disc)
            throw new Error(`Disciplina ${q.disciplina ?? DISCIPLINA_PADRAO} não cadastrada.`);
          // D9: anulada sem letra grava gabarito null (o banco só aceita null em `anulada`).
          const letra =
            item.resposta.letra ?? (item.status === 'anulada' ? null : item.letraPreliminar);
          if (!letra && item.status !== 'anulada') continue;
          const valores = {
            provaOrigemId: prova.id,
            numeroOrigem: item.numero,
            origem: 'fau_real' as const,
            disciplinaId: disc.disciplinaId,
            assuntoId: disc.assuntoId,
            textoApoio: q.textoApoio,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            gabarito: letra,
            explicacao: notaDeAlteracao(item),
            status: item.status,
            anuladaMotivo:
              item.status === 'anulada'
                ? 'Questão anulada pela banca no gabarito definitivo.'
                : null,
          };
          const atual = existente.get(item.numero);
          if (!atual) {
            const [nova] = await txDb
              .insert(questoes)
              .values(valores)
              .onConflictDoNothing()
              .returning({ id: questoes.id });
            if (nova) {
              gravadas++;
              idPorNumero.set(item.numero, nova.id);
            }
            continue;
          }
          idPorNumero.set(item.numero, atual.id);
          if (o.forcar && (atual.status === 'rascunho' || atual.status === 'anulada')) {
            await txDb
              .update(questoes)
              .set({ ...valores, versao: sql`${questoes.versao} + 1` })
              .where(eq(questoes.id, atual.id));
            atualizadas++;
          } else {
            jaExistiam++;
          }
        }
      });
    }

    const parcial: Omit<ResumoImportacao, 'importacaoId'> = {
      provaId: prova.id,
      cargo: bloco.cargo,
      extraidas: caderno.questoes.length,
      gravadas,
      atualizadas,
      jaExistiam,
      anuladas: confronto.anuladas,
      alteradas: confronto.alteradas,
      divergencias: confronto.divergencias,
      confronto,
      caderno,
      gabarito,
      avisos,
    };
    if (importacaoId) {
      const json: ConfrontoJson[] = confronto.itens.map((i) => ({
        numero: i.numero,
        questaoId: idPorNumero.get(i.numero) ?? null,
        gabaritoDefinitivo: i.gabaritoDefinitivo,
        gabaritoExtraido: i.resposta?.letra ?? null,
        letraPreliminar: i.letraPreliminar,
        statusGravado: idPorNumero.has(i.numero) ? i.status : null,
        observacao: observacaoDoItem(i),
      }));
      await db
        .update(importacoes)
        .set({
          status: 'confrontado',
          cargo: bloco.cargo ?? o.cargo ?? prova.cargo ?? null,
          questoesExtraidas: caderno.questoes.length,
          divergencias: confronto.divergencias,
          confronto: json,
          log: textoDoLog(parcial),
        })
        .where(eq(importacoes.id, importacaoId));
    }
    o.log?.(textoDoLog(parcial));
    return { importacaoId, ...parcial };
  } catch (e) {
    if (importacaoId) {
      await db
        .update(importacoes)
        .set({ status: 'erro', log: `Erro: ${(e as Error).message}` })
        .where(eq(importacoes.id, importacaoId));
    }
    throw e;
  }
}
