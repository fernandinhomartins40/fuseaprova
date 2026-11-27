import { describe, expect, it } from 'vitest';
import {
  CARACTERES_POR_LINHA,
  CORRECOES_POR_SEMANA,
  contarLinhas,
  cotaRedacao,
  notaRedacao,
  situacaoLinhas,
} from './redacao.js';

describe('contarLinhas (D49)', () => {
  it('texto vazio ou só espaços não ocupa linha', () => {
    expect(contarLinhas('')).toBe(0);
    expect(contarLinhas('  \n\n  ')).toBe(0);
  });

  it('cada parágrafo começa em linha nova, com recuo; linha em branco não conta', () => {
    expect(contarLinhas('Uma frase curta.')).toBe(1);
    expect(contarLinhas('Primeiro.\n\n\nSegundo.')).toBe(2);
  });

  it('quebra por palavra no limite da linha', () => {
    const palavra = 'abcde'; // 5 + espaço = 6 por palavra
    // recuo 3 + "abcde" (8) + 10 × " abcde" (68) = 68 cabe; a 12ª vai para a 2ª linha
    expect(contarLinhas(Array(11).fill(palavra).join(' '))).toBe(1);
    expect(contarLinhas(Array(12).fill(palavra).join(' '))).toBe(2);
  });

  it('palavra maior que a linha ocupa as linhas que precisa', () => {
    expect(contarLinhas('x'.repeat(CARACTERES_POR_LINHA * 2))).toBe(3);
    expect(contarLinhas(`${'y'.repeat(CARACTERES_POR_LINHA * 2)} fim`)).toBe(3);
  });

  it('uma redação de 25 linhas cheias dá 25', () => {
    const linha = Array(11).fill('abcde').join(' ');
    expect(contarLinhas(Array(5).fill(Array(5).fill(linha).join(' ')).join('\n'))).toBeGreaterThanOrEqual(25);
  });
});

describe('situacaoLinhas', () => {
  it('20 a 30 é ok', () => {
    expect(situacaoLinhas(19)).toBe('curta');
    expect(situacaoLinhas(20)).toBe('ok');
    expect(situacaoLinhas(30)).toBe('ok');
    expect(situacaoLinhas(31)).toBe('longa');
  });
});

describe('cotaRedacao', () => {
  it('3 por semana, renova na segunda 0h de São Paulo', () => {
    const agora = new Date('2026-11-27T15:00:00Z'); // sexta
    const c = cotaRedacao(1, agora);
    expect(c).toMatchObject({ usadas: 1, limite: CORRECOES_POR_SEMANA, restantes: 2 });
    expect(c.desde.toISOString()).toBe('2026-11-23T03:00:00.000Z');
    expect(c.renovaEm.toISOString()).toBe('2026-11-30T03:00:00.000Z');
    expect(cotaRedacao(5, agora).restantes).toBe(0);
    expect(cotaRedacao(-1, agora).usadas).toBe(0);
  });
});

describe('notaRedacao', () => {
  it('prende cada aspecto ao máximo da Tabela 10.1 e soma', () => {
    expect(notaRedacao({ conteudo: 60, estrutura: 35.4, expressao: -2 }, false)).toEqual({
      notas: { conteudo: 50, estrutura: 35, expressao: 0 },
      total: 85,
    });
    expect(notaRedacao({ conteudo: Number.NaN, estrutura: 10, expressao: 5 }, false).total).toBe(15);
  });

  it('redação zerada vale 0 em tudo', () => {
    expect(notaRedacao({ conteudo: 40, estrutura: 30, expressao: 8 }, true).total).toBe(0);
  });
});
