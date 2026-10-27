import { describe, expect, it } from 'vitest';
import { rotaInicial } from './rotaInicial';

describe('rotaInicial', () => {
  it('manda cada papel para a sua casa', () => {
    expect(rotaInicial({ papel: 'superadmin', acesso: false })).toBe('/super');
    expect(rotaInicial({ papel: 'admin', acesso: true })).toBe('/admin');
    expect(rotaInicial({ papel: 'aluno', acesso: true })).toBe('/aprender');
    expect(rotaInicial({ papel: 'aluno', acesso: false })).toBe('/pagamento');
  });
});
