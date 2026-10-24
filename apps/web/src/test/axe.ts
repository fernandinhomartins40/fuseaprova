import axe from 'axe-core';

/**
 * Roda o axe-core no elemento e devolve as violações sérias ou críticas.
 * `color-contrast` fica de fora porque o jsdom não calcula estilos de layout
 * (o contraste é garantido nos tokens e conferido nas capturas).
 */
export async function violacoesSerias(el: Element): Promise<string[]> {
  const r = await axe.run(el, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations'],
  });
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
