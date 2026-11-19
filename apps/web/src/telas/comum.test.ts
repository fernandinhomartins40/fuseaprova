import { describe, expect, it } from 'vitest';
import { textoVagas } from './comum';

describe('textoVagas (D45)', () => {
  it('cargo do edital: vagas no singular e no plural, e cadastro reserva sem vaga imediata', () => {
    expect(textoVagas({ vagas: 1, generico: false })).toBe('1 vaga');
    expect(textoVagas({ vagas: 25, generico: false })).toBe('25 vagas');
    expect(textoVagas({ vagas: null, generico: false })).toBe('Cadastro reserva');
    expect(textoVagas({ vagas: 0, generico: false })).toBe('Cadastro reserva');
  });

  it('cargo genérico não tem vaga', () => {
    expect(textoVagas({ vagas: null, generico: true })).toBeNull();
  });
});
