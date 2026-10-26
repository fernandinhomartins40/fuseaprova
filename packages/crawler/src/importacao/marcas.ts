/**
 * Marcas de estilo no texto do caderno (D18).
 *
 * `estilos.ts` insere, no texto do pdftotext:
 *   - sublinhado -> `**trecho**` (sempre mantido);
 *   - itálico    -> `*trecho*`;
 *   - negrito    -> ABRE_NEGRITO trecho FECHA_NEGRITO (caracteres privados). O negrito é
 *     ruído na maioria dos cadernos (o comando "assinale a alternativa correta:" sai em
 *     negrito), por isso o parser só o promove a `**trecho**` na questão que pede um
 *     destaque ("termo em destaque", "em negrito"…); nas demais ele é removido.
 * O Markdown do app (apps/web/src/ui/Markdown.tsx) renderiza `**` e `*`.
 */
export const ABRE_NEGRITO = '';
export const FECHA_NEGRITO = '';

/** Todas as marcas, para as regras de estrutura olharem só o texto. */
export const RE_MARCAS = /[*]/g;

export function semMarcas(texto: string): string {
  return texto.replace(RE_MARCAS, '');
}

/** A questão fala de um trecho destacado/sublinhado/em negrito? */
export const RE_PEDE_DESTAQUE =
  /destaq|negrit|grifad|grifo|sublinh|ressaltad|real[çc]ad|em evid[êe]ncia|it[áa]lic/i;

/** "**a** **b**" (a marca fecha e reabre na quebra de linha) vira "**a b**". */
export function fundirMarcas(texto: string): string {
  return texto
    .replace(new RegExp(`${FECHA_NEGRITO}( +)${ABRE_NEGRITO}`, 'g'), '$1')
    .replace(/\*\*( +)\*\*/g, '$1')
    .replace(/(?<!\*)\*( +)\*(?!\*)/g, '$1');
}

/** Resolve o negrito: vira `**` quando a questão pede destaque, senão some. */
export function resolverNegrito(texto: string, manter: boolean): string {
  const r = fundirMarcas(texto)
    .replaceAll(ABRE_NEGRITO, manter ? '**' : '')
    .replaceAll(FECHA_NEGRITO, manter ? '**' : '');
  return fundirMarcas(r);
}
