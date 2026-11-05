import { describe, expect, it } from 'vitest';
import { DURACAO_TESTE_LIBERADO_MS, temAcessoAoEstudo } from './teste.js';

const agora = new Date('2026-11-05T12:00:00-03:00');
const horas = (n: number) => new Date(agora.getTime() + n * 3600_000);

describe('acesso ao estudo (D35 e D39)', () => {
  it('quem pagou estuda', () => {
    expect(temAcessoAoEstudo({ acesso: true, testeAte: null }, agora)).toBe(true);
    expect(temAcessoAoEstudo({ acesso: true }, agora)).toBe(true);
  });

  it('o teste liberado pelo superadmin dura 24 horas e vence sozinho', () => {
    expect(DURACAO_TESTE_LIBERADO_MS).toBe(24 * 3600_000);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: horas(1) }, agora)).toBe(true);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: agora }, agora)).toBe(false);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: horas(-1) }, agora)).toBe(false);
  });

  it('sem pagar e sem teste não estuda', () => {
    expect(temAcessoAoEstudo({ acesso: false, testeAte: null }, agora)).toBe(false);
    expect(temAcessoAoEstudo({ acesso: false }, agora)).toBe(false);
  });
});
