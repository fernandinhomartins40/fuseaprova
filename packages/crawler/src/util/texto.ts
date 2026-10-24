/** Utilitários de texto usados pelos parsers (puros). */

/** Remove acentos: "Câmara" → "Camara". */
export function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Junta espaços repetidos e apara as pontas (inclui NBSP). */
export function limparEspacos(texto: string): string {
  return texto
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Forma comparável: sem acento, maiúscula, só letras e dígitos separados por espaço. */
export function chaveComparacao(texto: string): string {
  return limparEspacos(
    semAcentos(texto)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' '),
  );
}

/** Similaridade de Jaccard entre os conjuntos de palavras (0 a 1). */
export function similaridade(a: string, b: string): number {
  const pa = new Set(chaveComparacao(a).split(' ').filter(Boolean));
  const pb = new Set(chaveComparacao(b).split(' ').filter(Boolean));
  if (!pa.size && !pb.size) return 1;
  let comum = 0;
  for (const p of pa) if (pb.has(p)) comum++;
  return comum / (pa.size + pb.size - comum);
}

/** "salgado filho" → "salgado-filho" (para nomes de pasta e arquivo). */
export function slugificar(texto: string): string {
  return (
    semAcentos(texto)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'sem-nome'
  );
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** "SALGADO FILHO" → "Salgado Filho"; "BOM JESUS DO SUL" → "Bom Jesus do Sul". */
export function tituloProprio(texto: string): string {
  return limparEspacos(texto)
    .split(' ')
    .map((p, i) => {
      const minus = p.toLocaleLowerCase('pt-BR');
      if (i > 0 && MINUSCULAS.has(minus)) return minus;
      return minus.charAt(0).toLocaleUpperCase('pt-BR') + minus.slice(1);
    })
    .join(' ');
}

/** "26/07/2026" → "2026-07-26" (ou null). */
export function dataBrParaIso(data: string | null | undefined): string | null {
  const m = data ? /(\d{2})\/(\d{2})\/(\d{4})/.exec(data) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
