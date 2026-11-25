import { describe, expect, it } from 'vitest';
import {
  calcularNota,
  minimoRespondidas,
  msRestantesDoModo,
  prazoDoSimulado,
  somarTempoTreino,
  DISTRIBUICAO_PADRAO,
  montarSimulado,
  msRestantesSimulado,
  pontuacaoMaxima,
  questoesEmBranco,
  simuladoExpirado,
  terminoDoSimulado,
  totalDeQuestoes,
} from './simulado.js';
import { criarRng } from './aleatorio.js';

const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);

describe('nota do simulado (PRD 1.2)', () => {
  it('padrão: 40 questões e 100 pontos', () => {
    expect(totalDeQuestoes(DISTRIBUICAO_PADRAO)).toBe(40);
    expect(pontuacaoMaxima(DISTRIBUICAO_PADRAO)).toBe(100);
  });

  it('pesos 2,0 nos comuns e 2,8 nos específicos', () => {
    const n = calcularNota({ portugues: 5, matematica: 3, gerais: 2, especificos: 10 });
    expect(n.pontos).toBe(10 + 6 + 4 + 28);
    expect(n.percentual).toBe(48);
    expect(n.aprovado).toBe(false);
    expect(n.acertos).toBe(20);
    expect(n.porBloco[3]).toEqual({
      bloco: 'especificos',
      questoes: 25,
      acertos: 10,
      pontos: 28,
      pontosMaximos: 70,
    });
  });

  it('aprovado com 50 pontos exatos', () => {
    // 5 comuns (10) + 15 específicos (42) = 52; 4 comuns (8) + 15 esp (42) = 50
    expect(calcularNota({ portugues: 4, especificos: 15 }).pontos).toBe(50);
    expect(calcularNota({ portugues: 4, especificos: 15 }).aprovado).toBe(true);
    expect(calcularNota({ portugues: 3, especificos: 15 }).aprovado).toBe(false);
    expect(calcularNota({ portugues: 5, matematica: 5, gerais: 5, especificos: 25 }).pontos).toBe(
      100,
    );
  });

  it('não passa do total do bloco nem fica negativo', () => {
    const n = calcularNota({ portugues: 99, matematica: -3 });
    expect(n.porBloco[0]!.acertos).toBe(5);
    expect(n.porBloco[1]!.acertos).toBe(0);
  });

  it('distribuição e pesos do edital', () => {
    const d = { portugues: 10, matematica: 10, gerais: 0, especificos: 20 };
    const pesos = { portugues: 2.5, matematica: 2.5, gerais: 1, especificos: 2.5 };
    expect(pontuacaoMaxima(d, pesos)).toBe(100);
    const n = calcularNota({ portugues: 10, especificos: 10 }, d, pesos);
    expect(n.pontos).toBe(50);
    expect(n.aprovado).toBe(true);
    const vazio = calcularNota({}, { portugues: 0, matematica: 0, gerais: 0, especificos: 0 });
    expect(vazio).toMatchObject({ percentual: 0, aprovado: false });
  });
});

describe('montagem do simulado', () => {
  it('sorteia exatamente 5/5/5/25 na ordem dos blocos (critério de aceite)', () => {
    const r = montarSimulado(
      {
        portugues: ids('p', 12),
        matematica: ids('m', 6),
        gerais: ids('g', 5),
        especificos: ids('e', 40),
      },
      DISTRIBUICAO_PADRAO,
      criarRng(1),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.questoes).toHaveLength(40);
    expect(new Set(r.questoes).size).toBe(40);
    expect(r.blocos.filter((b) => b === 'especificos')).toHaveLength(25);
    expect(r.blocos.slice(0, 5)).toEqual(Array(5).fill('portugues'));
    expect(r.questoes.slice(0, 5).every((q) => q.startsWith('p'))).toBe(true);
  });

  it('avisa quando faltam questões', () => {
    const r = montarSimulado({ portugues: ids('p', 5) }, DISTRIBUICAO_PADRAO, criarRng(1));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.faltando.map((f) => f.bloco)).toEqual(['matematica', 'gerais', 'especificos']);
  });

  it('tempo de 4 h contado no servidor', () => {
    const ini = new Date('2026-10-23T12:00:00Z');
    const fim = terminoDoSimulado(ini);
    expect(fim.toISOString()).toBe('2026-10-23T16:00:00.000Z');
    expect(msRestantesSimulado(fim, new Date('2026-10-23T15:00:00Z'))).toBe(3600_000);
    expect(msRestantesSimulado(fim, new Date('2026-10-23T17:00:00Z'))).toBe(0);
    expect(simuladoExpirado(fim, fim)).toBe(true);
    expect(simuladoExpirado(fim, ini)).toBe(false);
  });

  it('conta as questões em branco', () => {
    expect(questoesEmBranco(['a', 'b', 'c'], { a: { letra: 'A' }, b: { letra: null } })).toBe(2);
  });
});

describe('modos do simulado (D48)', () => {
  const ini = new Date('2026-12-01T08:00:00-03:00');
  it('prazo: 4 h na prova e 7 dias no treino', () => {
    expect(prazoDoSimulado('prova', ini).getTime() - ini.getTime()).toBe(4 * 3600_000);
    expect(prazoDoSimulado('treino', ini).getTime() - ini.getTime()).toBe(7 * 24 * 3600_000);
  });
  it('treino só soma o tempo entre sinais próximos', () => {
    const t = (s: number) => new Date(ini.getTime() + s * 1000);
    expect(somarTempoTreino(0, null, t(10))).toBe(0);
    expect(somarTempoTreino(5000, t(0), t(30))).toBe(35_000);
    expect(somarTempoTreino(5000, t(0), t(91))).toBe(5000);
    expect(somarTempoTreino(5000, t(30), t(0))).toBe(5000);
  });
  it('tempo restante por modo', () => {
    const fim = prazoDoSimulado('treino', ini);
    expect(msRestantesDoModo('treino', fim, 3600_000, ini)).toBe(3 * 3600_000);
    expect(msRestantesDoModo('treino', fim, 5 * 3600_000, ini)).toBe(0);
    expect(msRestantesDoModo('treino', fim, 0, new Date(fim.getTime() - 1000))).toBe(1000);
    expect(msRestantesDoModo('prova', prazoDoSimulado('prova', ini), 0, ini)).toBe(4 * 3600_000);
  });
  it('mínimo de respondidas: metade, arredondada para cima', () => {
    expect(minimoRespondidas(40)).toBe(20);
    expect(minimoRespondidas(45)).toBe(23);
  });
});
