import { describe, expect, it } from 'vitest';
import { avaliarSenha, compararSenhas, ROTULOS_SENHA, SENHA_MINIMA } from './validacao.js';

describe('avaliarSenha', () => {
  it('vazia ou curta: não aceita, muito fraca, com a contagem do que falta', () => {
    const vazia = avaliarSenha('');
    expect(vazia).toMatchObject({ nivel: 0, rotulo: 'Muito fraca', aceita: false, dica: null });
    expect(vazia.criterios.map((c) => c.ok)).toEqual([false, false, false, false]);
    const curta = avaliarSenha('Ab1!');
    expect(curta.aceita).toBe(false);
    expect(curta.nivel).toBe(0);
    expect(curta.dica).toBe(`Faltam ${SENHA_MINIMA - 4} caracteres.`);
  });

  it('o único critério obrigatório é o tamanho mínimo da API', () => {
    const c = avaliarSenha('abcdefgz').criterios;
    expect(c.filter((x) => x.obrigatorio).map((x) => x.id)).toEqual(['tamanho']);
    expect(c.map((x) => x.id)).toEqual(['tamanho', 'maiusculas', 'numero', 'simbolo']);
  });

  it('senha comum, repetida ou em sequência é muito fraca mesmo com 8 caracteres', () => {
    for (const s of ['12345678', 'Senha1234', 'PASSWORD', 'aaaaaaaa', 'abcdefgh', '87654321']) {
      const r = avaliarSenha(s);
      expect(r.aceita, s).toBe(true);
      expect(r.nivel, s).toBe(0);
      expect(r.dica, s).toMatch(/muito comum/);
    }
  });

  it('escala: fraca, razoável, boa e forte', () => {
    expect(avaliarSenha('zxcvbnmk').nivel).toBe(1); // 8, só minúsculas
    expect(avaliarSenha('Marina2026').nivel).toBe(2); // 3 tipos
    expect(avaliarSenha('Marina#2026').nivel).toBe(3); // 4 tipos
    expect(avaliarSenha('Marina#2026x').nivel).toBe(4); // 12+ e 4 tipos
    expect(avaliarSenha('minha casa azul de praia').nivel).toBe(3); // frase longa
    const forte = avaliarSenha('6TxNe9Cmb2ddgZJFa7K');
    expect(forte).toMatchObject({ nivel: 4, rotulo: 'Forte', aceita: true });
    expect(forte.dica).toBeNull();
    expect(ROTULOS_SENHA).toHaveLength(5);
  });

  it('dá a dica que mais ajuda: tamanho primeiro, depois o critério que falta', () => {
    expect(avaliarSenha('zxcvbnmk').dica).toMatch(/12 ou mais/);
    expect(avaliarSenha('zxcvbnmkpqwe').dica).toBe('Letras maiúsculas e minúsculas');
  });

  it('usar o nome ou o e-mail na senha limita a Fraca', () => {
    const r = avaliarSenha('Marina#2026x', ['marina.souza@email.com', 'Marina Souza']);
    expect(r.nivel).toBe(1);
    expect(r.dica).toMatch(/nome ou e-mail/);
    // acento no nome e termos curtos demais não contam
    expect(avaliarSenha('Joaquim#2026x', ['Joaquím Pinto']).nivel).toBe(1);
    expect(avaliarSenha('Zé#20267abcd', ['ze@x.com', '']).nivel).toBe(4);
  });

  it('critérios refletem o que foi digitado', () => {
    const r = avaliarSenha('Ab3!efgh');
    expect(r.criterios.every((c) => c.ok)).toBe(true);
    const so = avaliarSenha('abcdefgz').criterios;
    expect(so.map((c) => c.ok)).toEqual([true, false, false, false]);
  });
});

describe('compararSenhas', () => {
  it('vazia, digitando, coincide e diferente', () => {
    expect(compararSenhas('Segredo#1', '')).toBe('vazia');
    expect(compararSenhas('Segredo#1', 'Segr')).toBe('digitando');
    expect(compararSenhas('Segredo#1', 'Segredo#1')).toBe('coincide');
    expect(compararSenhas('Segredo#1', 'Segreto')).toBe('diferente');
    expect(compararSenhas('Segredo#1', 'Segredo#12')).toBe('diferente');
    expect(compararSenhas('', 'a')).toBe('diferente');
  });
});
