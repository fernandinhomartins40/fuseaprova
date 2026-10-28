import { describe, expect, it } from 'vitest';
import { CupomConsultaEntrada, CupomSalvarEntrada, PrecosProduto, PrecosSalvarEntrada } from './index.js';

const confirmacao = { senha: 'x' };

describe('contratos de preço (D23)', () => {
  it('preço "de" precisa ser maior que o preço do 1º concurso', () => {
    expect(PrecosProduto.safeParse({ precoCentavos: 19700, precoAdicionalCentavos: 19700, precoDeCentavos: 39700 }).success).toBe(true);
    expect(PrecosProduto.safeParse({ precoCentavos: 19700, precoAdicionalCentavos: 19700, precoDeCentavos: null }).success).toBe(true);
    const r = PrecosSalvarEntrada.safeParse({ precoCentavos: 19700, precoAdicionalCentavos: 19700, precoDeCentavos: 19700, motivo: 'Lançamento', confirmacao });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.path).toEqual(['precoDeCentavos']);
  });

  it('preço fora dos limites é recusado', () => {
    expect(PrecosProduto.safeParse({ precoCentavos: 499, precoAdicionalCentavos: 19700, precoDeCentavos: null }).success).toBe(false);
    expect(PrecosProduto.safeParse({ precoCentavos: 19700, precoAdicionalCentavos: 500_001, precoDeCentavos: null }).success).toBe(false);
  });
});

describe('contratos de cupom (D23)', () => {
  const base = { descricao: '', validoAte: null, limiteUsos: null, concursoId: null, ativo: true, motivo: 'Campanha' };

  it('normaliza o código e limita o desconto', () => {
    expect(CupomSalvarEntrada.parse({ ...base, codigo: ' palmital 10 ', tipo: 'percentual', valor: 10 }).codigo).toBe('PALMITAL10');
    const cem = CupomSalvarEntrada.safeParse({ ...base, codigo: 'GRATIS', tipo: 'percentual', valor: 100 });
    expect(cem.success).toBe(false);
    expect(cem.error!.issues[0]!.message).toMatch(/gratuito/);
    expect(CupomSalvarEntrada.safeParse({ ...base, codigo: 'MUITO', tipo: 'fixo', valor: 500_001 }).success).toBe(false);
    expect(CupomSalvarEntrada.safeParse({ ...base, codigo: 'OK', tipo: 'fixo', valor: 100 }).success).toBe(false);
  });

  it('o aluno digita o cupom de qualquer jeito', () => {
    expect(CupomConsultaEntrada.parse({ codigo: 'semana 20' })).toEqual({ codigo: 'SEMANA20' });
    expect(CupomConsultaEntrada.safeParse({ codigo: 'a!' }).success).toBe(false);
  });
});
