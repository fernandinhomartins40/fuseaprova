import { describe, expect, it } from 'vitest';
import { temAcessoAoEstudo } from './teste.js';

const agora = new Date('2026-11-05T12:00:00-03:00');
const horas = (n: number) => new Date(agora.getTime() + n * 3600_000);

describe('acesso ao estudo (D35, sem teste grátis)', () => {
  it('quem pagou estuda', () => {
    expect(temAcessoAoEstudo({ acesso: true, testeAte: null }, agora)).toBe(true);
  });

  it('sem pagar não estuda, mesmo com um prazo de teste antigo ainda no futuro', () => {
    expect(temAcessoAoEstudo({ acesso: false, testeAte: horas(48) }, agora)).toBe(false);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: null }, agora)).toBe(false);
  });
});
