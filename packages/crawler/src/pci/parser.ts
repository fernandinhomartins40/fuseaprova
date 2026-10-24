/**
 * Parsers HTML do PCI Concursos (puros, cheerio).
 *
 * - Lista (`/provas/fau-unicentro[/N]`): tabela `#lista_provas`, uma linha `tr` por prova
 *   (cargo com link para `/provas/download/{id}`, ano, órgão e organizadora) e o rodapé
 *   "Mostrando página X de Y".
 * - Página da prova (`/provas/download/{id}`): dados (cargo, ano, órgão, organizadora) e os
 *   arquivos (`a.prova-pdf-link` com `data-arquivo`). Hoje os arquivos só saem depois de um
 *   captcha (Cloudflare Turnstile), que o coletor NÃO contorna.
 */
import { load } from 'cheerio';
import { detectarBloqueioHtml, type Bloqueio } from '../rede/bloqueio.js';
import { chaveComparacao, limparEspacos } from '../util/texto.js';

export const URL_PCI_FAU = 'https://www.pciconcursos.com.br/provas/fau-unicentro';
export const URL_PCI_DOWNLOAD = 'https://www.pciconcursos.com.br/provas/download/';

export interface ProvaPciListada {
  /** Identificador do PCI (slug depois de /provas/download/). */
  id: string;
  cargo: string;
  ano: number | null;
  /** Como o PCI mostra ("Pref. Imbituva/PR"). */
  orgao: string;
  organizadora: string;
  url: string;
}

export interface PaginaListaPci {
  provas: ProvaPciListada[];
  paginaAtual: number | null;
  totalPaginas: number | null;
}

export function urlDaPaginaPci(n: number, base = URL_PCI_FAU): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Página inválida: ${n}.`);
  return n === 1 ? base : `${base}/${n}`;
}

export function urlDaProvaPci(id: string): string {
  if (/^https?:\/\//.test(id)) return id;
  return URL_PCI_DOWNLOAD + encodeURIComponent(id.trim());
}

export function idDaUrlPci(url: string): string {
  const m = /\/provas\/download\/([^/?#]+)/.exec(url);
  return m ? decodeURIComponent(m[1]!) : '';
}

/** "1-28" → [1..28]; "3" → [3]; "1,3,5-7" → [1,3,5,6,7]. */
export function parseIntervaloPaginas(texto: string, maximo = 500): number[] {
  const paginas = new Set<number>();
  for (const parte of texto
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(parte);
    if (!m) throw new Error(`Intervalo de páginas inválido: "${parte}". Use, por exemplo, 1-28.`);
    const ini = Number(m[1]);
    const fim = m[2] ? Number(m[2]) : ini;
    if (ini < 1 || fim < ini) throw new Error(`Intervalo de páginas inválido: "${parte}".`);
    if (fim - ini + 1 > maximo) throw new Error(`Intervalo grande demais: "${parte}".`);
    for (let p = ini; p <= fim; p++) paginas.add(p);
  }
  if (!paginas.size) throw new Error('Informe ao menos uma página.');
  return [...paginas].sort((a, b) => a - b);
}

export function parseListaPci(html: string): PaginaListaPci {
  const $ = load(html);
  const provas: ProvaPciListada[] = [];
  const vistos = new Set<string>();
  $('#lista_provas tbody tr, table tr.lk_link').each((_, el) => {
    const tr = $(el);
    const tds = tr.find('td');
    if (tds.length < 3) return;
    const link = tds.eq(0).find('a[href]').first();
    const url = (tr.attr('data-url') || link.attr('href') || '').trim();
    const id = idDaUrlPci(url);
    if (!id || vistos.has(id)) return;
    vistos.add(id);
    const ano = Number(limparEspacos(tds.eq(1).text()));
    provas.push({
      id,
      cargo: limparEspacos(link.text() || tds.eq(0).text()),
      ano: Number.isInteger(ano) && ano > 1900 ? ano : null,
      orgao: limparEspacos(tds.eq(2).text()),
      organizadora: limparEspacos(tds.eq(3).text()),
      url: urlDaProvaPci(id),
    });
  });
  const info = $('.provas-info-pagina strong');
  const atual = Number(info.eq(0).text());
  const total = Number(info.eq(1).text());
  return {
    provas,
    paginaAtual: Number.isInteger(atual) && atual > 0 ? atual : null,
    totalPaginas: Number.isInteger(total) && total > 0 ? total : null,
  };
}

/** A prova é da FAU-Unicentro? (a lista da organizadora só traz FAU, mas confere). */
export function ehDaFau(p: Pick<ProvaPciListada, 'organizadora' | 'id'>): boolean {
  return /FAU\s*UNICENTRO/.test(chaveComparacao(p.organizadora)) || /fau-unicentro/.test(p.id);
}

/** "Pref. Imbituva/PR" → { orgao: "Pref. Imbituva", uf: "PR" } (igual ao seed). */
export function separarUf(orgao: string): { orgao: string; uf: string | null } {
  const uf = /\/([A-Z]{2})$/.exec(orgao)?.[1] ?? null;
  return { orgao: orgao.replace(/\/[A-Z]{2}$/, ''), uf };
}

/* ------------------------------------------------------- página da prova */

export type TipoArquivoPci = 'caderno' | 'gabarito';

export interface ArquivoPci {
  nome: string;
  tipo: TipoArquivoPci;
  /** Só "gabarito_preliminar"; o PRD exige o definitivo (7.4). */
  preliminar: boolean;
  /** Link direto (se o site voltar a publicar). Hoje, null: o arquivo sai via captcha. */
  url: string | null;
}

export interface PaginaProvaPci {
  titulo: string;
  cargo: string | null;
  ano: number | null;
  orgao: string | null;
  organizadora: string | null;
  arquivos: ArquivoPci[];
  bloqueio: Bloqueio | null;
}

export function tipoDoArquivoPci(nome: string): { tipo: TipoArquivoPci; preliminar: boolean } {
  const k = chaveComparacao(nome);
  if (/GABARITO/.test(k)) return { tipo: 'gabarito', preliminar: /PRELIMINAR|PROVISORIO/.test(k) };
  return { tipo: 'caderno', preliminar: false };
}

export function parsePaginaProvaPci(html: string, base = URL_PCI_DOWNLOAD): PaginaProvaPci {
  const $ = load(html);
  const campo = (rotulo: string): string | null => {
    let valor: string | null = null;
    $('li strong, li b').each((_, el) => {
      if (valor !== null) return;
      if (chaveComparacao($(el).text()) === chaveComparacao(rotulo)) {
        valor = limparEspacos($(el).parent().text().replace($(el).text(), ''));
      }
    });
    return valor;
  };
  const ano = Number(campo('Ano:'));
  const arquivos: ArquivoPci[] = [];
  const vistos = new Set<string>();
  $('a.prova-pdf-link[data-arquivo]').each((_, el) => {
    const nome = ($(el).attr('data-arquivo') ?? '').trim();
    if (!nome || vistos.has(nome)) return;
    vistos.add(nome);
    arquivos.push({ nome, ...tipoDoArquivoPci(nome), url: null });
  });
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!/\.pdf($|\?)/i.test(href) || /^javascript:/i.test(href)) return;
    const url = new URL(href, base).href;
    const nome = decodeURIComponent(url.split('/').pop()!.split('?')[0]!);
    const existente = arquivos.find((a) => a.nome === nome);
    if (existente) existente.url = url;
    else if (!vistos.has(nome)) {
      vistos.add(nome);
      arquivos.push({ nome, ...tipoDoArquivoPci(nome), url });
    }
  });
  return {
    titulo: limparEspacos($('.card-header h5').first().text() || $('title').text()),
    cargo: campo('Cargo:'),
    ano: Number.isInteger(ano) && ano > 1900 ? ano : null,
    orgao: campo('Órgão:'),
    organizadora: campo('Organizadora:'),
    arquivos,
    bloqueio: detectarBloqueioHtml(html),
  };
}
