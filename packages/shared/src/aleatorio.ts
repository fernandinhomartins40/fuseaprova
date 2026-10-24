/**
 * Sorteios com gerador injetável, para que as regras sejam testáveis e reproduzíveis.
 */

/** Gerador que devolve um número em [0, 1). */
export type Rng = () => number;

export const rngPadrao: Rng = Math.random;

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gerador determinístico (mulberry32) a partir de uma semente numérica ou de texto. */
export function criarRng(semente: number | string): Rng {
  let a = (typeof semente === 'string' ? hashTexto(semente) : semente) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro em [0, max). */
export function inteiroAleatorio(max: number, rng: Rng): number {
  return Math.floor(rng() * max);
}

/** Cópia embaralhada (Fisher–Yates). */
export function embaralhar<T>(lista: readonly T[], rng: Rng): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = inteiroAleatorio(i + 1, rng);
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

/** Escolhe um item (undefined se a lista estiver vazia). */
export function escolher<T>(lista: readonly T[], rng: Rng): T | undefined {
  return lista.length ? lista[inteiroAleatorio(lista.length, rng)] : undefined;
}
