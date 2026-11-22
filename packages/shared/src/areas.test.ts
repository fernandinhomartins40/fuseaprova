import { describe, expect, it } from 'vitest';
import { alternarListas, areasDaTrilha, focarSecoes } from './areas.js';

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

describe('focarSecoes (D46)', () => {
  const l = (id: string, tipo = 'normal') => ({ id, tipo });
  const unidade = [
    { secao: 'sus', licoes: [l('sus1'), l('sus-bau', 'bau')] },
    { secao: 'veterinaria', licoes: [l('vet1'), l('vet-bau', 'bau')] },
    { secao: 'clinica', licoes: [l('cli1'), l('cli-bau', 'bau')] },
    { secao: 'odonto', licoes: [l('odo1'), l('odo-bau', 'bau'), l('desafio', 'desafio')] },
  ];

  it('tira as seções fora do foco e leva o desafio para a última que ficou', () => {
    const r = focarSecoes(unidade, (s) => s === 'sus' || s === 'clinica');
    expect(r.map((s) => s.secao)).toEqual(['sus', 'clinica']);
    expect(r[1]!.licoes.map((x) => x.id)).toEqual(['cli1', 'cli-bau', 'desafio']);
    // Os baús das seções que saíram não mudam de lugar, e a lista de entrada fica intacta.
    expect(r.flatMap((s) => s.licoes).map((x) => x.id)).not.toContain('vet-bau');
    expect(unidade[2]!.licoes).toHaveLength(2);
  });

  it('com a seção do desafio no foco, nada muda de lugar', () => {
    const r = focarSecoes(unidade, (s) => s !== 'veterinaria');
    expect(r.map((s) => s.secao)).toEqual(['sus', 'clinica', 'odonto']);
    expect(r[2]!.licoes.map((x) => x.id)).toEqual(['odo1', 'odo-bau', 'desafio']);
  });

  it('sem nenhuma seção no foco, não sobra nada', () => {
    expect(focarSecoes(unidade, () => false)).toEqual([]);
  });
});

describe('alternarListas', () => {
  it('alterna um item de cada lista e termina a maior', () => {
    expect(alternarListas([['a1', 'a2', 'a3'], ['b1'], []])).toEqual(['a1', 'b1', 'a2', 'a3']);
    expect(alternarListas([])).toEqual([]);
  });
});
