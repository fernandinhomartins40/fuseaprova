import { describe, expect, it } from 'vitest';
import {
  estadoDaTrilha,
  intercalarSecoes,
  licoesAteOBau,
  montarDesafio,
  montarLicao,
  montarRevisao,
  sortearNovas,
} from './licao.js';
import { criarRng } from './aleatorio.js';
import { cifrarTexto, decifrarTexto, gerarChaveOffline } from './cifra.js';

describe('montagem de lição (PRD 5.8)', () => {
  it('prefere questões nunca respondidas e depois as vistas há mais tempo', () => {
    const r = sortearNovas(
      [
        { id: 'velha', vezesRespondida: 2, ultimaRespostaEm: new Date('2026-01-01') },
        { id: 'nova1', vezesRespondida: 0 },
        { id: 'recente', vezesRespondida: 1, ultimaRespostaEm: new Date('2026-10-01') },
        { id: 'nova2', vezesRespondida: 0, ultimaRespostaEm: null },
        { id: 'semData', vezesRespondida: 3 },
      ],
      4,
      criarRng(5),
    );
    expect(r.slice(0, 2).sort()).toEqual(['nova1', 'nova2']);
    expect(r.slice(2)).toEqual(['semData', 'velha']);
    const empate = sortearNovas(
      [
        { id: 'tres', vezesRespondida: 3 },
        { id: 'uma', vezesRespondida: 1 },
      ],
      2,
      criarRng(1),
    );
    expect(empate).toEqual(['uma', 'tres']);
  });

  it('5 questões: 4 novas + 1 revisão vencida, que nunca é a primeira', () => {
    for (let s = 0; s < 30; s++) {
      const r = montarLicao({
        novas: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
        revisoesVencidas: ['r1', 'r2'],
        rng: criarRng(s),
      });
      expect(r).toHaveLength(5);
      expect(r.filter((q) => q.revisao)).toEqual([{ questaoId: 'r1', revisao: true }]);
      expect(r[0]!.revisao).toBe(false);
    }
  });

  it('sem revisão vencida: 5 novas', () => {
    const r = montarLicao({
      novas: ['a', 'b', 'c', 'd', 'e', 'f'],
      revisoesVencidas: [],
      rng: criarRng(1),
    });
    expect(r.map((q) => q.questaoId)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('faltando novas, completa com revisões; não repete questão', () => {
    const r = montarLicao({
      novas: ['a', 'b'],
      revisoesVencidas: ['a', 'r1', 'r2', 'r3', 'r4'],
      rng: criarRng(2),
    });
    expect(r).toHaveLength(5);
    expect(new Set(r.map((q) => q.questaoId)).size).toBe(5);
    const so = montarLicao({ novas: [], revisoesVencidas: ['r1'], rng: criarRng(2) });
    expect(so).toEqual([{ questaoId: 'r1', revisao: true }]);
  });

  it('desafio: 10 questões em rodízio pelos assuntos, sem repetir', () => {
    const r = montarDesafio(
      [
        ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
        ['b1', 'b2'],
        ['c1', 'c2', 'c3', 'c4', 'c5', 'a1'],
      ],
      criarRng(9),
    );
    expect(r).toHaveLength(10);
    expect(new Set(r).size).toBe(10);
    expect(r.filter((x) => x.startsWith('b'))).toHaveLength(2);
    expect(montarDesafio([['x']], criarRng(1))).toEqual(['x']);
  });

  it('revisão: até 10, as mais atrasadas primeiro', () => {
    const vencidas = Array.from({ length: 12 }, (_, i) => ({
      questaoId: `q${i}`,
      venceEm: new Date(Date.UTC(2026, 9, 20 - i)),
    }));
    const r = montarRevisao(vencidas);
    expect(r).toHaveLength(10);
    expect(r[0]).toBe('q11');
  });
});

describe('estado da trilha', () => {
  const licoes = [
    { id: 'l1', tipo: 'normal' as const },
    { id: 'l2', tipo: 'normal' as const },
    { id: 'l3', tipo: 'normal' as const },
    { id: 'bau', tipo: 'bau' as const },
    { id: 'l4', tipo: 'normal' as const },
    { id: 'des', tipo: 'desafio' as const },
  ];

  it('concluídas, atual e bloqueadas', () => {
    const nos = estadoDaTrilha(licoes, {
      l1: { vezes: 4, concluidaEm: new Date() },
      l2: { vezes: 0, concluidaEm: null },
      l4: { vezes: 1, concluidaEm: new Date() },
    });
    expect(nos.map((n) => n.estado)).toEqual([
      'concluida',
      'atual',
      'bloqueada',
      'bloqueada',
      'concluida',
      'bloqueada',
    ]);
    expect(nos[0]).toMatchObject({ anel: 1, podeAbrir: true, vezes: 4 });
    expect(nos[1]).toMatchObject({ anel: 0, podeAbrir: true });
    expect(nos[2]!.podeAbrir).toBe(false);
    expect(licoesAteOBau(nos)).toBe(2);
  });

  it('baú concluído não reabre; sem baú à frente devolve null', () => {
    const nos = estadoDaTrilha(licoes, {
      l1: { vezes: 1, concluidaEm: new Date() },
      l2: { vezes: 1, concluidaEm: new Date() },
      l3: { vezes: 1, concluidaEm: new Date() },
      bau: { vezes: 1, concluidaEm: new Date() },
    });
    expect(nos[3]).toMatchObject({ estado: 'concluida', podeAbrir: false });
    expect(nos[4]!.estado).toBe('atual');
    expect(licoesAteOBau(nos)).toBeNull();
    const tudo = estadoDaTrilha([{ id: 'x', tipo: 'normal' }], {
      x: { vezes: 1, concluidaEm: new Date() },
    });
    expect(licoesAteOBau(tudo)).toBeNull();
  });

  it('intercala 3 comuns para 5 específicas', () => {
    const r = intercalarSecoes(
      ['c1', 'c2', 'c3', 'c4'],
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'],
    );
    expect(r).toEqual(['c1', 'c2', 'c3', 'e1', 'e2', 'e3', 'e4', 'e5', 'c4', 'e6', 'e7']);
    expect(intercalarSecoes([], [])).toEqual([]);
  });
});

describe('gabarito cifrado do pacote offline', () => {
  it('cifra e decifra amarrado ao id da questão', async () => {
    const chave = gerarChaveOffline();
    const c = await cifrarTexto(chave, 'q1', JSON.stringify({ gabarito: 'C' }));
    expect(c).not.toContain('"C"');
    expect(JSON.parse(await decifrarTexto(chave, 'q1', c))).toEqual({ gabarito: 'C' });
    await expect(decifrarTexto(chave, 'q2', c)).rejects.toThrow();
    await expect(decifrarTexto(gerarChaveOffline(), 'q1', c)).rejects.toThrow();
    await expect(decifrarTexto(chave, 'q1', 'semponto')).rejects.toThrow('inválido');
  });
});
