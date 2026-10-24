/**
 * Gemas (PRD 6.3). Gemas não se compram com dinheiro.
 */

export const GEMAS = {
  CONCLUIR_LICAO: 5,
  ABRIR_BAU: 20,
  SUBIR_LIGA: 50,
  CUSTO_DICA: 5,
  CUSTO_PROTETOR: 200,
} as const;

export const PROTETORES_MAX = 2;

/** Gemas por marco de ofensiva. */
export const GEMAS_MARCO_OFENSIVA: Readonly<Record<number, number>> = {
  7: 50,
  30: 200,
  100: 500,
};

export const MARCOS_OFENSIVA = [7, 30, 100] as const;
export type MarcoOfensiva = (typeof MARCOS_OFENSIVA)[number];

/** Gemas ganhas ao atingir exatamente um marco de ofensiva (0 se não for marco). */
export function gemasPorOfensiva(ofensiva: number): number {
  return GEMAS_MARCO_OFENSIVA[ofensiva] ?? 0;
}

export function podeUsarDica(gemas: number): boolean {
  return gemas >= GEMAS.CUSTO_DICA;
}

export type ResultadoGasto =
  | { ok: true; gemas: number }
  | { ok: false; codigo: 'gemas_insuficientes'; erro: string };

/** Desconta as 5 gemas da dica. */
export function gastarDica(gemas: number): ResultadoGasto {
  if (!podeUsarDica(gemas)) {
    return {
      ok: false,
      codigo: 'gemas_insuficientes',
      erro: 'Você precisa de 5 gemas para usar a dica.',
    };
  }
  return { ok: true, gemas: gemas - GEMAS.CUSTO_DICA };
}

export type ResultadoProtetor =
  | { ok: true; gemas: number; protetores: number }
  | { ok: false; codigo: 'gemas_insuficientes' | 'limite_protetores'; erro: string };

/** Compra um protetor de ofensiva (−200 gemas, no máximo 2 guardados). */
export function comprarProtetor(gemas: number, protetores: number): ResultadoProtetor {
  if (protetores >= PROTETORES_MAX) {
    return {
      ok: false,
      codigo: 'limite_protetores',
      erro: 'Você já tem 2 protetores guardados, que é o máximo.',
    };
  }
  if (gemas < GEMAS.CUSTO_PROTETOR) {
    return {
      ok: false,
      codigo: 'gemas_insuficientes',
      erro: 'Você precisa de 200 gemas para comprar um protetor.',
    };
  }
  return { ok: true, gemas: gemas - GEMAS.CUSTO_PROTETOR, protetores: protetores + 1 };
}
