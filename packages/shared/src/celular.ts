/**
 * Celular brasileiro: 11 dígitos (DDD + 9 + 8 dígitos).
 */
import { somenteDigitos } from './cpf.js';

/** DDDs válidos no Brasil (Anatel). */
export const DDDS_VALIDOS: ReadonlySet<string> = new Set(
  [
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
    44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
    79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
  ].map(String),
);

/** Tira tudo que não é dígito e o prefixo +55, se vier. */
export function limparCelular(valor: string): string {
  let d = somenteDigitos(valor);
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}

export function validarCelular(valor: string): boolean {
  const d = limparCelular(valor);
  return /^\d{2}9\d{8}$/.test(d) && DDDS_VALIDOS.has(d.slice(0, 2));
}

/** Máscara progressiva: "(42) 99876-5432". */
export function formatarCelular(valor: string): string {
  const d = limparCelular(valor);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular oculto para logs: "(42) *****-5432". */
export function ocultarCelular(valor: string): string {
  const d = limparCelular(valor);
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`;
}
