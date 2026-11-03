import { describe, expect, it } from 'vitest';
import { DURACAO_TESTE_MS, emailCanonico, fimDoTeste, temAcessoAoEstudo, textoTesteRestante } from './teste.js';

const agora = new Date('2026-11-02T12:00:00-03:00');
const horas = (n: number) => new Date(agora.getTime() + n * 3600_000);

describe('emailCanonico (D33)', () => {
  it('junta as variações de uma caixa do Gmail', () => {
    for (const e of ['Maria.Silva@gmail.com', 'mariasilva+2@gmail.com', 'm.a.r.i.a.silva@googlemail.com']) {
      expect(emailCanonico(e)).toBe('mariasilva@gmail.com');
    }
  });

  it('nos outros provedores tira só a etiqueta, porque o ponto faz parte do nome', () => {
    expect(emailCanonico('Maria.Silva+x@empresa.com.br')).toBe('maria.silva@empresa.com.br');
  });
});

describe('teste grátis (D32)', () => {
  it('dura exatamente 72 horas', () => {
    expect(DURACAO_TESTE_MS).toBe(72 * 3600_000);
    expect(fimDoTeste(agora)).toEqual(horas(72));
  });

  it('quem pagou estuda com ou sem prazo de teste', () => {
    expect(temAcessoAoEstudo({ acesso: true, testeAte: null }, agora)).toBe(true);
    expect(temAcessoAoEstudo({ acesso: true, testeAte: horas(-100) }, agora)).toBe(true);
  });

  it('sem pagar, só estuda antes do fim do prazo', () => {
    expect(temAcessoAoEstudo({ acesso: false, testeAte: horas(1) }, agora)).toBe(true);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: agora }, agora)).toBe(false);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: horas(-1) }, agora)).toBe(false);
    expect(temAcessoAoEstudo({ acesso: false, testeAte: null }, agora)).toBe(false);
  });

  it('o texto arredonda para cima e chama as últimas 24 horas de último dia', () => {
    expect(textoTesteRestante(horas(72), agora)).toBe('Faltam 3 dias');
    expect(textoTesteRestante(horas(25), agora)).toBe('Faltam 2 dias');
    expect(textoTesteRestante(horas(24), agora)).toBe('Último dia');
    expect(textoTesteRestante(horas(1), agora)).toBe('Último dia');
  });
});
