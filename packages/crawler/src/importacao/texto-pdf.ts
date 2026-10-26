/**
 * Limpeza do texto que sai do pdftotext (puro): normaliza caracteres, separa as páginas
 * (\f) e remove cabeçalhos/rodapés repetidos e números de página.
 */
import { chaveComparacao } from '../util/texto.js';

/** Normaliza ligaduras, espaços especiais, hífen suave e fins de linha. */
export function normalizarTextoPdf(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\u00ad/g, '')
    .replace(/[\u00a0\u2007\u202f\u2009]/g, ' ')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/[‐‑]/g, '-')
    .replace(/\t/g, ' ');
}

const NUMERO_PAGINA = /^(p[áa]g(ina)?\.?\s*)?\d{1,3}(\s*(de|\/)\s*\d{1,3})?$/i;

/** Quantas linhas das pontas de cada página são candidatas a cabeçalho/rodapé. */
const PONTAS = 3;

/**
 * Devolve as linhas do documento (sem \f), sem números de página e sem as linhas que se
 * repetem no topo/rodapé de metade ou mais das páginas (com 3 páginas ou mais).
 * Linhas vazias são mantidas como '' (separam parágrafos).
 */
export function linhasLimpas(texto: string): string[] {
  return linhasLimpasPaginadas(texto).linhas;
}

/**
 * Como `linhasLimpas`, mas também diz onde cada página termina: `fimDePagina` guarda o índice
 * da linha vazia que fecha cada página (a quebra de página real, que o parser usa para saber
 * que uma alternativa E continua na página seguinte).
 */
export function linhasLimpasPaginadas(texto: string): {
  linhas: string[];
  fimDePagina: Set<number>;
} {
  const paginas = normalizarTextoPdf(texto)
    .split('\f')
    .map((p) => p.split('\n').map((l) => l.replace(/\s+$/, '')));
  const pontasDe = (linhas: string[]): number[] => {
    const idx = linhas.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0);
    return [...new Set([...idx.slice(0, PONTAS), ...idx.slice(-PONTAS)])];
  };

  const contagem = new Map<string, number>();
  const comConteudo = paginas.filter((p) => p.some((l) => l.trim()));
  for (const p of comConteudo) {
    const vistas = new Set<string>();
    for (const i of pontasDe(p)) {
      // Alternativas e inícios de questão nunca são cabeçalho/rodapé.
      if (/^\s*(\(?[A-E]\)|\d{1,3}\s*[.)])/.test(p[i]!)) continue;
      const k = chaveComparacao(p[i]!);
      if (k && !vistas.has(k)) {
        vistas.add(k);
        contagem.set(k, (contagem.get(k) ?? 0) + 1);
      }
    }
  }
  const limiar = Math.max(3, Math.ceil(comConteudo.length / 2));
  const repetidas = new Set(
    [...contagem].filter(([, n]) => comConteudo.length >= 3 && n >= limiar).map(([k]) => k),
  );

  const saida: string[] = [];
  const fimDePagina = new Set<number>();
  for (const p of paginas) {
    const pontas = new Set(pontasDe(p));
    p.forEach((l, i) => {
      const t = l.trim();
      if (pontas.has(i) && (NUMERO_PAGINA.test(t) || repetidas.has(chaveComparacao(t)))) return;
      saida.push(t);
    });
    fimDePagina.add(saida.length);
    saida.push('');
  }
  return { linhas: saida, fimDePagina };
}
