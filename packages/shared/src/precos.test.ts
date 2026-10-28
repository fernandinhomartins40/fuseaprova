import { describe, expect, it } from 'vitest';
import { formatarReais, reaisParaCentavos } from './formatacao.js';
import { aplicarCupom, descreverCupom, normalizarCodigoCupom, PRECO_MINIMO_CENTAVOS } from './precos.js';

describe('aplicarCupom (D23)', () => {
  it('percentual arredonda para o centavo', () => {
    expect(aplicarCupom(19700, { tipo: 'percentual', valor: 10 })).toEqual({ centavos: 17730, descontoCentavos: 1970 });
    expect(aplicarCupom(19900, { tipo: 'percentual', valor: 15 })).toEqual({ centavos: 16915, descontoCentavos: 2985 });
  });

  it('valor fixo desconta centavos', () => {
    expect(aplicarCupom(39700, { tipo: 'fixo', valor: 20000 })).toEqual({ centavos: 19700, descontoCentavos: 20000 });
  });

  it('nunca deixa o Pix abaixo do mínimo nem de graça', () => {
    expect(aplicarCupom(19700, { tipo: 'fixo', valor: 50000 }).centavos).toBe(PRECO_MINIMO_CENTAVOS);
    expect(aplicarCupom(1000, { tipo: 'percentual', valor: 90 }).centavos).toBe(PRECO_MINIMO_CENTAVOS);
    // Acima de 90% vale 90%.
    expect(aplicarCupom(100000, { tipo: 'percentual', valor: 100 }).centavos).toBe(10000);
  });

  it('nunca cobra mais que o preço base', () => {
    expect(aplicarCupom(300, { tipo: 'percentual', valor: 10 })).toEqual({ centavos: 300, descontoCentavos: 0 });
    expect(aplicarCupom(19700, { tipo: 'fixo', valor: -500 })).toEqual({ centavos: 19700, descontoCentavos: 0 });
  });
});

describe('cupom: código e descrição', () => {
  it('normaliza o código', () => {
    expect(normalizarCodigoCupom(' palmital 10 ')).toBe('PALMITAL10');
  });

  it('descreve o desconto', () => {
    expect(descreverCupom({ tipo: 'percentual', valor: 20 }, formatarReais)).toBe('20% de desconto');
    expect(descreverCupom({ tipo: 'fixo', valor: 5000 }, formatarReais)).toBe('R$ 50,00 de desconto');
  });
});

describe('reaisParaCentavos', () => {
  it('lê o valor como o superadmin digita', () => {
    expect(reaisParaCentavos('197')).toBe(19700);
    expect(reaisParaCentavos('R$ 1.297,9')).toBe(129790);
    expect(reaisParaCentavos('177,30')).toBe(17730);
    expect(reaisParaCentavos('1297,05')).toBe(129705);
  });

  it('texto que não é valor vira null', () => {
    for (const t of ['', 'abc', '1,234', '12.34', '1.2345,00']) expect(reaisParaCentavos(t)).toBeNull();
  });
});
