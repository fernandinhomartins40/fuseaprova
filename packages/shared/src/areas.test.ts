import { describe, expect, it } from 'vitest';
import { alternarListas, areasDaTrilha } from './areas.js';

describe('areasDaTrilha (D36/D45)', () => {
  it('sem cargo, nenhuma área específica', () => {
    expect(areasDaTrilha(null, ['educacao'])).toEqual([]);
  });

  it('soma as extras, sem repetir a do cargo, na ordem das áreas (também depois do edital, D45)', () => {
    expect(areasDaTrilha('educacao', ['saude_medio', 'educacao', 'administrativo'])).toEqual([
      'educacao',
      'administrativo',
      'saude_medio',
    ]);
  });
});

describe('alternarListas', () => {
  it('alterna um item de cada lista e termina a maior', () => {
    expect(alternarListas([['a1', 'a2', 'a3'], ['b1'], []])).toEqual(['a1', 'b1', 'a2', 'a3']);
    expect(alternarListas([])).toEqual([]);
  });
});
