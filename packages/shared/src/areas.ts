/**
 * D36/D45: estudar para mais de um cargo. A trilha soma as unidades específicas da área do cargo e
 * das áreas extras. Desde a D45 as extras continuam valendo depois do edital, para o aluno não
 * perder o acesso ao banco inteiro de questões.
 */
import { AREAS_CARGO, type AreaCargo } from './dominio.js';

/** Áreas cujas unidades específicas entram na trilha, começando pela do cargo, sem repetir. */
export function areasDaTrilha(area: AreaCargo | null, extras: readonly AreaCargo[]): AreaCargo[] {
  if (!area) return [];
  return [area, ...AREAS_CARGO.filter((a) => a !== area && extras.includes(a))];
}

/**
 * Junta as seções específicas de várias áreas alternando uma de cada, para nenhuma área ficar
 * toda no fim da trilha. Cada lista já vem na ordem da sua área.
 */
export function alternarListas<T>(listas: readonly (readonly T[])[]): T[] {
  const saida: T[] = [];
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) for (const l of listas) if (i < l.length) saida.push(l[i]!);
  return saida;
}
