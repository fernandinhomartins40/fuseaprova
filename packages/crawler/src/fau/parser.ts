/**
 * Parsers HTML do site da FAU (puros, cheerio).
 *
 * - Listagens (`/novo/encerrados/` e `/novo/concursos`): cartões `.portal-card-concurso` com
 *   o título em `h3.portal-card-title`, a data em `.portal-card-meta strong` e o link "Saber mais".
 * - Página do certame (`/novo/concurso/{slug}`): título `h1`, status (badge) e a lista de
 *   documentos em `.list-group a` (título em `.fw-semibold`).
 */
import { load } from 'cheerio';
import type { TipoArquivoColeta } from '@fuse/shared';
import { chaveComparacao, limparEspacos } from '../util/texto.js';

export const URL_FAU_ENCERRADOS = 'https://www.concursosfau.com.br/novo/encerrados/';
export const URL_FAU_CONCURSOS = 'https://www.concursosfau.com.br/novo/concursos';
export const URL_FAU_CONCURSO = 'https://www.concursosfau.com.br/novo/concurso/';

export type SituacaoCertame = 'encerrado' | 'em_andamento' | 'aberto' | 'pre_inscricao' | 'outro';

export interface CertameListado {
  nome: string;
  /** "dd/mm/aaaa" ou null ("-" no site). */
  dataProva: string | null;
  /** URL normalizada (como no catálogo: `new URL(href.trim()).href`). */
  url: string;
  slug: string;
  situacao: SituacaoCertame;
}

export interface ResultadoLista {
  certames: CertameListado[];
  /** Cartões ignorados (testes, avisos, sem link). */
  descartados: { nome: string; url: string; motivo: string }[];
}

/** Nomes de cartões que não são certames (testes e avisos do próprio site). */
const NOMES_DESCARTADOS = /^(teste\w*|aviso importante|prova de t[ií]tulos?|cargo paula freitas)$/i;

/** URL do certame como o catálogo guarda ("PMM " → "PMM"; espaços e acentos codificados). */
export function normalizarUrlCertame(href: string, base = URL_FAU_CONCURSO): string {
  return new URL(href.trim(), base).href;
}

/** Último segmento da URL (igual ao `slugDaPagina` do seed). */
export function slugDaUrl(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? '';
}

export function situacaoPeloTitulo(titulo: string, padrao: SituacaoCertame): SituacaoCertame {
  const k = chaveComparacao(titulo);
  if (/ANDAMENTO/.test(k)) return 'em_andamento';
  if (/PRE INSCRICAO/.test(k)) return 'pre_inscricao';
  if (/ABERTO|ABERTAS/.test(k)) return 'aberto';
  if (/ENCERRAD|FINALIZAD/.test(k)) return 'encerrado';
  return padrao;
}

/** Lê os cartões de uma página de listagem da FAU. */
export function parseListaCertames(
  html: string,
  opcoes: { base?: string; situacaoPadrao?: SituacaoCertame } = {},
): ResultadoLista {
  const $ = load(html);
  const base = opcoes.base ?? URL_FAU_ENCERRADOS;
  const padrao = opcoes.situacaoPadrao ?? 'encerrado';
  const certames: CertameListado[] = [];
  const descartados: ResultadoLista['descartados'] = [];
  const vistos = new Set<string>();

  $('.portal-card-concurso').each((_, el) => {
    const card = $(el);
    const h3 = card.find('.portal-card-title').first();
    const nome = limparEspacos(h3.attr('title') || h3.text());
    const href = card.find('a[href]').first().attr('href') ?? '';
    const data = limparEspacos(card.find('.portal-card-meta strong').first().text());
    const tituloSecao = card
      .closest('.portal-section')
      .find('.portal-section-title')
      .first()
      .text();
    const situacao = tituloSecao ? situacaoPeloTitulo(tituloSecao, padrao) : padrao;

    let url = '';
    try {
      url = href ? normalizarUrlCertame(href, base) : '';
    } catch {
      url = '';
    }
    const slug = url ? slugDaUrl(new URL(url).pathname.replace(/^\/novo\/concurso\/?/, '')) : '';
    if (!nome || !slug) {
      descartados.push({ nome, url, motivo: 'cartão sem nome ou sem link' });
      return;
    }
    if (
      NOMES_DESCARTADOS.test(nome) ||
      /^teste(bb)?$|^teste-/i.test(decodeURIComponentSeguro(slug))
    ) {
      descartados.push({ nome, url, motivo: 'teste ou aviso do site' });
      return;
    }
    const chave = `${url}|${nome}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    certames.push({
      nome,
      dataProva: /^\d{2}\/\d{2}\/\d{4}$/.test(data) ? data : null,
      url,
      slug,
      situacao,
    });
  });
  return { certames, descartados };
}

/* ------------------------------------------------------- página do certame */

export interface DocumentoCertame {
  titulo: string;
  url: string;
  /** Seção da página ("Editais", "Provas"…). */
  secao: string;
  /** Tipo para `arquivos_coletados`; null = não interessa ao coletor. */
  tipo: TipoArquivoColeta | null;
}

export interface PaginaCertame {
  nome: string;
  status: string;
  dataProva: string | null;
  documentos: DocumentoCertame[];
}

/**
 * Classifica um documento pelo título. Interessam: edital de abertura, retificações e anexos
 * de conteúdo programático (`edital`), gabarito DEFINITIVO (`gabarito`), respostas aos
 * recursos (`recursos`) e cadernos de prova (`caderno`, só existem com o certame em andamento).
 * Gabarito preliminar, notas, ensalamento, homologações etc. ficam de fora (null).
 */
export function classificarDocumento(titulo: string, url = ''): TipoArquivoColeta | null {
  const k = chaveComparacao(`${titulo} ${decodeURIComponentSeguro(url.split('/').pop() ?? '')}`);
  const t = chaveComparacao(titulo);
  if (/GABARITO/.test(t)) {
    if (/PRELIMINAR|PROVISORIO/.test(t)) return null;
    if (/DEFINITIVO|OFICIAL|FINAL|APOS RECURSO/.test(t)) return 'gabarito';
    return /DEFINITIVO/.test(k) ? 'gabarito' : null;
  }
  if (/RECURSO/.test(t) && /RESPOSTA|RESULTADO|JULGAMENTO|PARECER/.test(t)) return 'recursos';
  if (/CADERNO/.test(t)) return 'caderno';
  if (/^PROVAS?\b/.test(t) && !/TITULO|PRATICA|REDACAO/.test(t)) return 'caderno';
  if (/^(EDITAL )?(DE )?ABERTURA\b/.test(t) || /EDITAL DE ABERTURA/.test(t)) return 'edital';
  if (/^RETIFICACAO\b/.test(t) && /ABERTURA|ANEXO|CONTEUDO|EDITAL N/.test(t)) return 'edital';
  if (/CONTEUDO PROGR/.test(t)) return 'edital';
  return null;
}

function decodeURIComponentSeguro(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Lê a página de um certame da FAU. */
export function parsePaginaCertame(html: string, base = URL_FAU_CONCURSO): PaginaCertame {
  const $ = load(html);
  const nome = limparEspacos($('h1').first().text());
  const status = limparEspacos($('.badge').first().text());
  let dataProva: string | null = null;
  $('.small, .text-muted').each((_, el) => {
    if (dataProva) return;
    if (/data do concurso|data da prova/i.test($(el).text())) {
      const m = /(\d{2}\/\d{2}\/\d{4})/.exec($(el).parent().text());
      if (m) dataProva = m[1]!;
    }
  });

  const documentos: DocumentoCertame[] = [];
  const vistos = new Set<string>();
  $('a[href]').each((_, el) => {
    const a = $(el);
    const href = (a.attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return;
    let url: string;
    try {
      url = new URL(href, base).href;
    } catch {
      return;
    }
    const ehPdf =
      /\.pdf($|\?)/i.test(url) ||
      /\/uploads\//i.test(url) ||
      a.find('.badge').text().trim() === 'PDF';
    if (!ehPdf || vistos.has(url)) return;
    vistos.add(url);
    const titulo = limparEspacos(a.find('.fw-semibold').first().text() || a.text()).replace(
      /\s*PDF$/,
      '',
    );
    const secao =
      limparEspacos(a.closest('.list-group').prevAll('h3, h4, h5').first().text()) || 'Documentos';
    documentos.push({ titulo, url, secao, tipo: classificarDocumento(titulo, url) });
  });
  return { nome, status, dataProva, documentos };
}
