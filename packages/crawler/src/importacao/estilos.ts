/**
 * Negrito, sublinhado e itálico do caderno (D18).
 *
 * O `pdftotext` só devolve texto: o termo sublinhado ("a palavra sublinhada…", "o termo em
 * destaque…") some e a questão de Português fica ambígua. O helper opcional
 * `python/estilos_pdf.py` (PyMuPDF, sem rede) lê as fontes e os traços desenhados no PDF e
 * devolve os trechos estilizados; aqui eles são encaixados no texto do pdftotext como Markdown
 * que o app já renderiza (`apps/web/src/ui/Markdown.tsx`, que não tem sublinhado):
 *   - sublinhado -> `**trecho**`;
 *   - negrito -> marca provisória (`marcas.ts`) que o parser só promove a `**trecho**` na
 *     questão que pede um destaque; nas outras é removida (o comando da questão sai em negrito
 *     em quase todo caderno);
 *   - itálico -> `*trecho*`, só trechos curtos; descartado se cai dentro de outro destaque.
 * Sem Python/PyMuPDF o coletor funciona igual, só sem as marcas.
 */
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ABRE_NEGRITO, FECHA_NEGRITO } from './marcas.js';
import { normalizarTextoPdf } from './texto-pdf.js';

const executar = promisify(execFile);

export interface RunEstilo {
  /** Texto do trecho (uma linha do PDF). */
  t: string;
  /** `u` sublinhado, `b` negrito, `i` itálico (um run por estilo). */
  e: 'u' | 'b' | 'i';
  /** Até 24 caracteres (sem espaços) antes e depois, na ordem de leitura. */
  a: string;
  d: string;
  /** A linha inteira tem esse estilo (título, citação): normalmente não é destaque. */
  L: boolean;
  /** Quantas vezes o mesmo trecho com contexto aparece antes na página (0 = a primeira). */
  k?: number;
}

export interface EstilosPdf {
  paginas: { runs: RunEstilo[] }[];
}

export interface ResultadoEstilos {
  texto: string;
  aplicados: number;
  /** Trechos que não foram achados no texto (ou ambíguos) e ficaram sem marca. */
  descartados: number;
}

const SCRIPT = fileURLToPath(new URL('../../python/estilos_pdf.py', import.meta.url));

let pythonDisponivel: Promise<string | null> | null = null;

/** Primeiro Python com PyMuPDF (PYTHON_BIN, python3, python), ou null. */
export function acharPython(): Promise<string | null> {
  pythonDisponivel ??= (async () => {
    const candidatos = [process.env.PYTHON_BIN, 'python3', 'python'].filter(
      (x): x is string => !!x,
    );
    for (const bin of candidatos) {
      try {
        await executar(bin, ['-I', '-c', 'import pymupdf'], { timeout: 20_000 });
        return bin;
      } catch {
        /* tenta o próximo */
      }
    }
    return null;
  })();
  return pythonDisponivel;
}

/** Estilos do PDF, ou null quando não há Python/PyMuPDF (ou o PDF não abre). */
export async function extrairEstilosPdf(caminho: string): Promise<EstilosPdf | null> {
  const python = await acharPython();
  if (!python) return null;
  try {
    const { stdout } = await executar(python, ['-I', SCRIPT, caminho], {
      maxBuffer: 256 * 1024 * 1024,
      encoding: 'utf8',
      timeout: 120_000,
    });
    const r = JSON.parse(stdout) as EstilosPdf;
    return Array.isArray(r.paginas) ? r : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------- aplicação (pura) */

const compacto = (s: string): string => normalizarTextoPdf(s).normalize('NFC').replace(/\s+/g, '');

/** Título/aviso de linha inteira em negrito: não é destaque do enunciado. */
const RE_TITULO = /^(Texto|TEXTO|Leia|Observe|Considere|Analise|Instru|QUEST[ÃA]O|CARGO)\b/;

function descartarLinhaToda(t: string): boolean {
  const palavras = t.trim().split(/\s+/).length;
  if (palavras >= 5) return true;
  if (!/[a-zà-ÿ]/.test(t)) return true; // só maiúsculas/números: título de seção
  return RE_TITULO.test(t.trim());
}

/** Máximo de palavras de um destaque de verdade; acima disso é título, comando ou citação. */
const MAX_PALAVRAS = { u: 12, b: 6, i: 5 } as const;

/** Link (sublinhado pelo leitor de PDF) ou pedaço dele: nunca é destaque. */
const RE_LINK = /https?:|www\.|\.(com|gov|org|net)\b|\/[\w-]+\/|^\S*\/\S*$|^\S+-\S+-\S+/i;

/** O trecho deve ficar de fora do texto (ruído de estilo)? */
function ehRuido(run: RunEstilo): boolean {
  const t = run.t.trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return true;
  if (run.L && descartarLinhaToda(t)) return true;
  if (t.split(/\s+/).length > MAX_PALAVRAS[run.e]) return true;
  if (RE_LINK.test(t)) return true;
  // Comando da questão em negrito ("assinale a alternativa correta:").
  if (run.e === 'b' && /[:?]$/.test(t)) return true;
  return false;
}

interface Pagina {
  texto: string;
  /** compacto (sem espaços) e, para cada caractere dele, o índice no texto da página. */
  c: string;
  idx: number[];
}

function indexar(texto: string): Pagina {
  let c = '';
  const idx: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]!;
    if (/\s/.test(ch)) continue;
    c += ch;
    idx.push(i);
  }
  return { texto, c, idx };
}

function todasAsPosicoes(c: string, padrao: string): number[] {
  const r: number[] = [];
  if (!padrao) return r;
  for (let i = c.indexOf(padrao); i >= 0; i = c.indexOf(padrao, i + 1)) r.push(i);
  return r;
}

/** Posição (no compacto) do trecho, usando o contexto, do mais ao menos específico. */
function localizar(pg: Pagina, run: RunEstilo, usadas: Set<number>): number | null {
  const t = compacto(run.t);
  const a = compacto(run.a);
  const d = compacto(run.d);
  const tentativas: [string, number][] = [
    [a + t + d, a.length],
    [a.slice(-8) + t + d.slice(0, 8), Math.min(8, a.length)],
    [t + d.slice(0, 8), 0],
    [a.slice(-8) + t, Math.min(8, a.length)],
  ];
  for (const [i, [padrao, desloc]] of tentativas.entries()) {
    if (padrao.length < t.length) continue;
    const todas = todasAsPosicoes(pg.c, padrao).map((p) => p + desloc);
    // Mesma frase duas vezes na página (no texto e numa alternativa): vale a ordem do PDF.
    const daOrdem = i === 0 && run.k !== undefined ? todas[run.k] : undefined;
    if (daOrdem !== undefined && !usadas.has(daOrdem)) return daOrdem;
    const livres = todas.filter((p) => !usadas.has(p));
    if (livres.length) return livres[0]!;
  }
  // Só o trecho: serve se for único na página.
  const todas = todasAsPosicoes(pg.c, t);
  return todas.length === 1 && !usadas.has(todas[0]!) ? todas[0]! : null;
}

/**
 * Insere as marcas no texto do pdftotext (páginas separadas por \f), usando os trechos
 * estilizados do PDF. Puro e determinístico.
 */
export function aplicarEstilos(textoBruto: string, estilos: EstilosPdf): ResultadoEstilos {
  const paginasTexto = normalizarTextoPdf(textoBruto).split('\f');
  let aplicados = 0;
  let descartados = 0;
  const saida = paginasTexto.map((txt, n) => {
    const runs = estilos.paginas[n]?.runs ?? [];
    if (!runs.length) return txt;
    const pg = indexar(txt);
    const usadas = new Set<number>();
    const ocupado: [number, number][] = []; // intervalos já marcados (índices do texto)
    const insercoes: { pos: number; marca: string; fecha: boolean }[] = [];
    // Sublinhado, depois negrito, depois itálico: o que cai dentro de um estilo mais forte
    // é descartado (sem marcas aninhadas).
    const peso = { u: 0, b: 1, i: 2 } as const;
    const ordem = [...runs].sort((x, y) => peso[x.e] - peso[y.e]);
    for (const run of ordem) {
      if (ehRuido(run)) continue;
      const ini = localizar(pg, run, usadas);
      const tam = compacto(run.t).length;
      if (ini === null || !tam) {
        descartados++;
        continue;
      }
      const de = pg.idx[ini]!;
      const ate = pg.idx[ini + tam - 1]!;
      if (ocupado.some(([x, y]) => de <= y && ate >= x)) continue;
      for (let k = ini; k < ini + tam; k++) usadas.add(k);
      ocupado.push([de, ate]);
      const [abre, fecha] =
        run.e === 'u' ? ['**', '**'] : run.e === 'b' ? [ABRE_NEGRITO, FECHA_NEGRITO] : ['*', '*'];
      // Uma marca por linha: o trecho que atravessa a quebra de linha fecha e reabre.
      let i = de;
      while (i <= ate) {
        if (/\s/.test(txt[i]!)) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 <= ate && txt[j + 1] !== '\n') j++;
        let fim = j;
        while (/\s/.test(txt[fim]!)) fim--;
        insercoes.push(
          { pos: i, marca: abre, fecha: false },
          { pos: fim + 1, marca: fecha, fecha: true },
        );
        i = j + 1;
      }
      aplicados++;
    }
    insercoes.sort((x, y) => y.pos - x.pos);
    let r = txt;
    for (const { pos, marca } of insercoes) r = r.slice(0, pos) + marca + r.slice(pos);
    return r;
  });
  return { texto: saida.join('\f'), aplicados, descartados };
}
