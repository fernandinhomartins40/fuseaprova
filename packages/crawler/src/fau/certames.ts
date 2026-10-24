/**
 * `crawler fau:certames`: atualiza `provas_origem` com os certames do site da FAU.
 *
 * Compatível com o seed (packages/db/src/seed/catalogo.ts):
 * - certame já existente (mesma página, pela URL normalizada; com 2 certames na mesma
 *   página, o de nome mais parecido) → atualiza só data, ano e relevância e preenche
 *   tipo/município/regime vazios. Nome, URL e slug do catálogo ficam como estão;
 * - certame novo → entra com o MESMO id que o seed daria (`linhasProvasOrigem`, UUID v5 de
 *   `prova_origem:fau:{pagina}:{nome}`), então rodar o seed depois não duplica.
 */
import { and, eq } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { provasOrigem } from '@fuse/db/schema';
import { linhasProvasOrigem } from '@fuse/db/seed';
import type { ClienteHttp } from '../rede/cliente.js';
import { chaveComparacao, dataBrParaIso, similaridade } from '../util/texto.js';
import { paraCertameCatalogo, relevanciaPalmital } from './classificacao.js';
import {
  type CertameListado,
  normalizarUrlCertame,
  parseListaCertames,
  type ResultadoLista,
  type SituacaoCertame,
  URL_FAU_CONCURSOS,
  URL_FAU_ENCERRADOS,
} from './parser.js';

export interface ResumoCertames {
  lidos: number;
  inseridos: number;
  atualizados: number;
  inalterados: number;
  descartados: ResultadoLista['descartados'];
  porSituacao: Partial<Record<SituacaoCertame, number>>;
  novos: { id: string; nome: string; url: string }[];
}

type LinhaExistente = Pick<
  typeof provasOrigem.$inferSelect,
  | 'id'
  | 'nome'
  | 'urlPagina'
  | 'dataProva'
  | 'ano'
  | 'tipo'
  | 'municipio'
  | 'regime'
  | 'relevanciaPalmital'
>;

function urlNormalizada(url: string | null): string {
  if (!url) return '';
  try {
    return normalizarUrlCertame(url);
  } catch {
    return url.trim();
  }
}

/** Escolhe a linha existente de um certame listado (null = certame novo). */
export function casarCertame(
  c: CertameListado,
  porUrl: Map<string, LinhaExistente[]>,
  usados: Set<string>,
): LinhaExistente | null {
  const candidatos = (porUrl.get(urlNormalizada(c.url)) ?? []).filter((l) => !usados.has(l.id));
  if (!candidatos.length) return null;
  if (candidatos.length === 1) return candidatos[0]!;
  const exato = candidatos.find((l) => chaveComparacao(l.nome ?? '') === chaveComparacao(c.nome));
  if (exato) return exato;
  return [...candidatos].sort(
    (a, b) => similaridade(b.nome ?? '', c.nome) - similaridade(a.nome ?? '', c.nome),
  )[0]!;
}

/** Upsert dos certames listados em provas_origem (fonte 'fau'). */
export async function upsertCertames(
  db: BancoDados,
  certames: CertameListado[],
): Promise<Omit<ResumoCertames, 'descartados' | 'porSituacao'>> {
  const existentes = await db
    .select({
      id: provasOrigem.id,
      nome: provasOrigem.nome,
      urlPagina: provasOrigem.urlPagina,
      dataProva: provasOrigem.dataProva,
      ano: provasOrigem.ano,
      tipo: provasOrigem.tipo,
      municipio: provasOrigem.municipio,
      regime: provasOrigem.regime,
      relevanciaPalmital: provasOrigem.relevanciaPalmital,
    })
    .from(provasOrigem)
    .where(eq(provasOrigem.fonte, 'fau'));
  const porUrl = new Map<string, LinhaExistente[]>();
  for (const l of existentes) {
    const k = urlNormalizada(l.urlPagina);
    porUrl.set(k, [...(porUrl.get(k) ?? []), l]);
  }

  const usados = new Set<string>();
  const resumo = {
    lidos: certames.length,
    inseridos: 0,
    atualizados: 0,
    inalterados: 0,
    novos: [] as ResumoCertames['novos'],
  };

  for (const c of certames) {
    const cat = paraCertameCatalogo(c);
    const atual = casarCertame(c, porUrl, usados);
    if (!atual) {
      const [linha] = linhasProvasOrigem({ certames: [cat] });
      const inserido = await db
        .insert(provasOrigem)
        .values(linha!)
        .onConflictDoNothing()
        .returning({ id: provasOrigem.id });
      usados.add(linha!.id);
      if (inserido.length) {
        resumo.inseridos++;
        resumo.novos.push({ id: linha!.id, nome: c.nome, url: c.url });
      } else {
        resumo.inalterados++;
      }
      continue;
    }
    usados.add(atual.id);
    const dataProva = dataBrParaIso(c.dataProva) ?? atual.dataProva;
    const ano = cat.ano ?? atual.ano;
    const tipo = atual.tipo ?? cat.tipo;
    const mudancas: Partial<typeof provasOrigem.$inferInsert> = {};
    if (dataProva !== atual.dataProva) mudancas.dataProva = dataProva;
    if (ano !== atual.ano) mudancas.ano = ano;
    if (!atual.tipo && cat.tipo) mudancas.tipo = cat.tipo;
    if (!atual.municipio && cat.municipio) mudancas.municipio = cat.municipio;
    if (!atual.regime && cat.regime) mudancas.regime = cat.regime;
    const relevancia = relevanciaPalmital(tipo, ano);
    if (relevancia !== atual.relevanciaPalmital) {
      mudancas.relevanciaPalmital = relevancia;
      if (relevancia) mudancas.uf = 'PR';
    }
    if (Object.keys(mudancas).length) {
      await db
        .update(provasOrigem)
        .set(mudancas)
        .where(and(eq(provasOrigem.id, atual.id)));
      resumo.atualizados++;
    } else {
      resumo.inalterados++;
    }
  }
  return resumo;
}

export interface OpcoesAtualizarCertames {
  db: BancoDados;
  cliente: ClienteHttp;
  /** Também lê /novo/concursos (pré-inscrição, abertos e em andamento). Padrão true. */
  incluirAndamento?: boolean;
  log?: (msg: string) => void;
}

export async function atualizarCertames(o: OpcoesAtualizarCertames): Promise<ResumoCertames> {
  const listas: ResultadoLista[] = [];
  const enc = await o.cliente.obterTexto(URL_FAU_ENCERRADOS);
  listas.push(parseListaCertames(enc.corpo, { base: enc.url, situacaoPadrao: 'encerrado' }));
  if (o.incluirAndamento ?? true) {
    const and_ = await o.cliente.obterTexto(URL_FAU_CONCURSOS);
    listas.push(parseListaCertames(and_.corpo, { base: and_.url, situacaoPadrao: 'outro' }));
  }
  const vistos = new Set<string>();
  const certames: CertameListado[] = [];
  for (const l of listas) {
    for (const c of l.certames) {
      const k = `${urlNormalizada(c.url)}|${chaveComparacao(c.nome)}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      certames.push(c);
    }
  }
  if (!certames.length) {
    throw new Error(
      'Nenhum certame encontrado nas páginas da FAU: o layout do site pode ter mudado.',
    );
  }
  const porSituacao: ResumoCertames['porSituacao'] = {};
  for (const c of certames) porSituacao[c.situacao] = (porSituacao[c.situacao] ?? 0) + 1;
  const r = await upsertCertames(o.db, certames);
  o.log?.(`FAU: ${r.lidos} certames lidos, ${r.inseridos} novos, ${r.atualizados} atualizados.`);
  return { ...r, descartados: listas.flatMap((l) => l.descartados), porSituacao };
}
