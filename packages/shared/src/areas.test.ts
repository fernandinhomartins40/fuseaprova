import { describe, expect, it } from 'vitest';
import { alternarListas, areasDaTrilha } from './areas.js';

describe('areasDaTrilha (D36)', () => {
  it('sem cargo, nenhuma área específica', () => {
    expect(areasDaTrilha(null, ['educacao'], false)).toEqual([]);
  });

  it('antes do edital soma as extras, sem repetir a do cargo, na ordem das áreas', () => {
    expect(areasDaTrilha('educacao', ['saude_medio', 'educacao', 'administrativo'], false)).toEqual([
      'educacao',
      'administrativo',
      'saude_medio',
    ]);
  });

  it('com o edital publicado vale só o cargo', () => {
    expect(areasDaTrilha('educacao', ['administrativo'], true)).toEqual(['educacao']);
  });
});

describe('alternarListas', () => {
  it('alterna um item de cada lista e termina a maior', () => {
    expect(alternarListas([['a1', 'a2', 'a3'], ['b1'], []])).toEqual(['a1', 'b1', 'a2', 'a3']);
    expect(alternarListas([])).toEqual([]);
  });
});
