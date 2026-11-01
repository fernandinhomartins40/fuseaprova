import { describe, expect, it } from 'vitest';
import { criarRng } from './aleatorio.js';
import { MS_DIA } from './datas.js';
import {
  classificarTema,
  planejarTreino,
  proximoPasso,
  TAMANHO_TREINO,
  type TemaParaTreino,
} from './desempenho.js';
import { xpDaSessao } from './xp.js';

const agora = new Date('2026-11-10T12:00:00-03:00');
const diasAtras = (n: number) => new Date(agora.getTime() - n * MS_DIA);
const tema = (
  id: string,
  classe: TemaParaTreino['classe'],
  valor: number | null,
  ultimaEm: Date | null,
): TemaParaTreino => ({
  assuntoId: id,
  classe,
  valor,
  ultimaEm,
});
const total = (p: ReturnType<typeof planejarTreino>) =>
  p.revisao.length + p.temas.reduce((s, t) => s + t.quantidade, 0);

describe('classificação dos temas (D29)', () => {
  it('forte, regular, fraco, pouco praticado e não visto', () => {
    expect(classificarTema({ tentativas: 0, valor: null })).toBe('nao_visto');
    expect(classificarTema({ tentativas: 3, valor: null })).toBe('pouco_praticado');
    expect(classificarTema({ tentativas: 10, valor: 0.9 })).toBe('forte');
    expect(classificarTema({ tentativas: 10, valor: 0.8 })).toBe('forte');
    expect(classificarTema({ tentativas: 10, valor: 0.7 })).toBe('regular');
    expect(classificarTema({ tentativas: 10, valor: 0.6 })).toBe('regular');
    expect(classificarTema({ tentativas: 10, valor: 0.4 })).toBe('fraco');
  });
});

describe('treino inteligente (D29)', () => {
  it('mistura revisão vencida, reforço dos fracos, temas novos e manutenção dos fortes', () => {
    const p = planejarTreino({
      vencidas: ['r1', 'r2', 'r3', 'r4'],
      temas: [
        tema('forte-antigo', 'forte', 0.9, diasAtras(20)),
        tema('forte-recente', 'forte', 0.95, diasAtras(1)),
        tema('regular-antigo', 'regular', 0.7, diasAtras(10)),
        tema('fraco-1', 'fraco', 0.3, diasAtras(2)),
        tema('fraco-2', 'fraco', 0.5, diasAtras(2)),
        tema('fraco-3', 'fraco', 0.55, diasAtras(2)),
        tema('pouco', 'pouco_praticado', null, diasAtras(3)),
        tema('novo', 'nao_visto', null, null),
      ],
      agora,
      rng: criarRng(1),
    });
    expect(p.revisao).toEqual(['r1', 'r2', 'r3']);
    expect(total(p)).toBe(TAMANHO_TREINO);
    const q = (id: string) => p.temas.find((t) => t.assuntoId === id);
    expect(q('fraco-1')).toMatchObject({ quantidade: 2, motivo: 'reforco' });
    expect(q('fraco-2')).toMatchObject({ quantidade: 2, motivo: 'reforco' });
    expect(q('pouco')?.motivo).toBe('novo');
    expect(q('novo')?.motivo).toBe('novo');
    expect(q('forte-antigo')?.motivo).toBe('manutencao');
    // Visto ontem: ainda não precisa de manutenção.
    expect(q('forte-recente')).toBeUndefined();
  });

  it('com a trilha toda forte e sem revisão, nunca fica sem treino: mantém os fortes', () => {
    const temas = Array.from({ length: 6 }, (_, i) => tema(`t${i}`, 'forte', 0.9, diasAtras(i)));
    const p = planejarTreino({ vencidas: [], temas, agora, rng: criarRng(2) });
    expect(p.revisao).toEqual([]);
    expect(total(p)).toBe(TAMANHO_TREINO);
    expect(p.temas.find((t) => t.assuntoId === 't5')?.motivo).toBe('manutencao');
  });

  it('com poucos temas, repete os fracos até fechar o tamanho; sem temas, só a revisão', () => {
    const p = planejarTreino({
      vencidas: [],
      temas: [tema('unico', 'fraco', 0.2, diasAtras(1))],
      agora,
      rng: criarRng(3),
      tamanho: 5,
    });
    expect(p.temas).toEqual([{ assuntoId: 'unico', quantidade: 5, motivo: 'reforco' }]);
    const soNovo = planejarTreino({
      vencidas: [],
      temas: [tema('n', 'nao_visto', null, null)],
      agora,
      rng: criarRng(5),
      tamanho: 3,
    });
    expect(soNovo.temas).toEqual([{ assuntoId: 'n', quantidade: 3, motivo: 'novo' }]);
    const soRevisao = planejarTreino({
      vencidas: ['r1', 'r2', 'r3'],
      temas: [tema('f', 'fraco', 0.1, null)],
      agora,
      rng: criarRng(6),
      tamanho: 3,
    });
    expect(soRevisao).toEqual({ revisao: ['r1', 'r2', 'r3'], temas: [] });
    const vazio = planejarTreino({ vencidas: ['r1'], temas: [], agora, rng: criarRng(4) });
    expect(vazio).toEqual({ revisao: ['r1'], temas: [] });
  });

  it('próximo passo: revisão vencida, depois a trilha, depois o treino', () => {
    expect(proximoPasso({ revisoesPendentes: 2, trilhaConcluida: false })).toBe('revisao');
    expect(proximoPasso({ revisoesPendentes: 0, trilhaConcluida: false })).toBe('trilha');
    expect(proximoPasso({ revisoesPendentes: 0, trilhaConcluida: true })).toBe('treino');
  });

  it('reforço vale só pelos acertos, como a revisão', () => {
    expect(xpDaSessao('reforco', 8, 10)).toEqual({
      total: 80,
      itens: [{ tipo: 'acerto', valor: 80 }],
    });
  });
});
