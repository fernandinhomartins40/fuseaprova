import { describe, expect, it } from 'vitest';
import {
  calcularCombo,
  comboVisivel,
  desafioAprovado,
  somarXp,
  xpDaResposta,
  xpDaSessao,
  xpDoSimulado,
} from './xp.js';

describe('XP (PRD 6.1)', () => {
  it('lição com 4 de 5 acertos dá 45 XP (critério de aceite)', () => {
    expect(xpDaSessao('licao', 4, 5).total).toBe(45);
  });

  it('lição com 5 de 5 dá 65 XP (critério de aceite)', () => {
    const r = xpDaSessao('licao', 5, 5);
    expect(r.total).toBe(65);
    expect(r.itens.map((i) => i.tipo)).toEqual(['acerto', 'licao_concluida', 'licao_perfeita']);
  });

  it('lição sem acertos dá só a conclusão', () => {
    expect(xpDaSessao('licao', 0, 5)).toEqual({
      total: 5,
      itens: [{ tipo: 'licao_concluida', valor: 5 }],
    });
  });

  it('desafio com 70% ou mais dá +30', () => {
    expect(xpDaSessao('desafio', 7, 10).total).toBe(70 + 5 + 30);
    expect(xpDaSessao('desafio', 6, 10).total).toBe(60 + 5);
    expect(xpDaSessao('desafio', 10, 10).total).toBe(100 + 5 + 10 + 30);
    expect(desafioAprovado(0, 0)).toBe(false);
  });

  it('revisão só dá XP por acerto', () => {
    expect(xpDaSessao('revisao', 3, 10).total).toBe(30);
    expect(xpDaSessao('revisao', 0, 0).total).toBe(0);
  });

  it('XP por resposta', () => {
    expect(xpDaResposta('licao', true)).toBe(10);
    expect(xpDaResposta('revisao', true)).toBe(10);
    expect(xpDaResposta('licao', false)).toBe(0);
    expect(xpDaResposta('simulado', true)).toBe(0);
  });

  it('simulado: +1 por acerto e +20 se aprovado', () => {
    expect(xpDoSimulado(30, true).total).toBe(50);
    expect(xpDoSimulado(10, false).total).toBe(10);
    expect(xpDoSimulado(0, false)).toEqual({ total: 0, itens: [] });
  });

  it('XP total nunca diminui', () => {
    expect(somarXp(100, 10)).toBe(110);
    expect(somarXp(100, -50)).toBe(100);
  });

  it('combo conta acertos seguidos no fim e aparece a partir de 3', () => {
    expect(calcularCombo([true, false, true, true, true])).toBe(3);
    expect(calcularCombo([true, true, false])).toBe(0);
    expect(calcularCombo([])).toBe(0);
    expect(comboVisivel(3)).toBe(true);
    expect(comboVisivel(2)).toBe(false);
  });
});
