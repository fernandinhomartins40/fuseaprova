import { describe, expect, it } from 'vitest';
import {
  divisaoAnterior,
  escolherGrupo,
  fecharGrupo,
  nomeNaLiga,
  ordenarRanking,
  proximaDivisao,
  resultadoDaPosicao,
  somarXpNaLiga,
  temRebaixamento,
  zonasDoGrupo,
  type MembroLiga,
} from './liga.js';
import { conquistasAtingidas, dadosDaConquista, novasConquistas } from './conquistas.js';

const t = (min: number) => new Date(Date.UTC(2026, 9, 19, 12, min));
const membros = (n: number): MembroLiga[] =>
  Array.from({ length: n }, (_, i) => ({
    usuarioId: `u${String(i).padStart(2, '0')}`,
    xpSemana: (n - i) * 10,
    alcancadoEm: t(i),
  }));

describe('liga (PRD 6.7)', () => {
  it('divisões em ordem, sem passar dos extremos', () => {
    expect(proximaDivisao('bronze')).toBe('prata');
    expect(proximaDivisao('diamante')).toBe('diamante');
    expect(divisaoAnterior('prata')).toBe('bronze');
    expect(divisaoAnterior('bronze')).toBe('bronze');
  });

  it('empate: vence quem chegou ao XP primeiro', () => {
    const r = ordenarRanking([
      { usuarioId: 'b', xpSemana: 50, alcancadoEm: t(5) },
      { usuarioId: 'a', xpSemana: 50, alcancadoEm: t(1) },
      { usuarioId: 'c', xpSemana: 80, alcancadoEm: t(9) },
      { usuarioId: 'e', xpSemana: 50, alcancadoEm: t(1) },
    ]);
    expect(r.map((m) => m.usuarioId)).toEqual(['c', 'a', 'e', 'b']);
  });

  it('fecha um grupo de 30: 3 sobem, 3 descem, o resto fica', () => {
    const r = fecharGrupo(membros(30), 'prata');
    const res = r.map((x) => x.resultado);
    expect(res.filter((x) => x === 'subiu')).toHaveLength(3);
    expect(res.filter((x) => x === 'desceu')).toHaveLength(3);
    expect(r[0]).toMatchObject({ posicao: 1, resultado: 'subiu', novaDivisao: 'ouro' });
    expect(r[29]).toMatchObject({ posicao: 30, resultado: 'desceu', novaDivisao: 'bronze' });
    expect(r[15]).toMatchObject({ resultado: 'ficou', novaDivisao: 'prata' });
  });

  it('grupos com 10 ou menos não têm rebaixamento; Bronze não desce; Diamante não sobe', () => {
    expect(temRebaixamento(10)).toBe(false);
    expect(temRebaixamento(11)).toBe(true);
    expect(fecharGrupo(membros(10), 'ouro').filter((x) => x.resultado === 'desceu')).toHaveLength(
      0,
    );
    expect(resultadoDaPosicao(20, 20, 'bronze')).toBe('ficou');
    expect(resultadoDaPosicao(1, 20, 'diamante')).toBe('ficou');
    expect(resultadoDaPosicao(20, 20, 'diamante')).toBe('desceu');
  });

  it('zonas de promoção e rebaixamento', () => {
    expect(zonasDoGrupo(30, 'prata')).toEqual({ promocaoAte: 3, rebaixamentoDesde: 28 });
    expect(zonasDoGrupo(8, 'prata')).toEqual({ promocaoAte: 3, rebaixamentoDesde: null });
    expect(zonasDoGrupo(2, 'bronze')).toEqual({ promocaoAte: 2, rebaixamentoDesde: null });
    expect(zonasDoGrupo(30, 'diamante')).toEqual({ promocaoAte: 0, rebaixamentoDesde: 28 });
  });

  it('escolhe grupo com vaga ou pede um novo', () => {
    expect(escolherGrupo([])).toBeNull();
    expect(escolherGrupo([{ id: 'a', membros: 30 }])).toBeNull();
    expect(
      escolherGrupo([
        { id: 'b', membros: 12 },
        { id: 'a', membros: 29 },
        { id: 'c', membros: 29 },
      ]),
    ).toBe('a');
  });

  it('alcancado_em muda só quando o XP sobe', () => {
    const m = { usuarioId: 'u', xpSemana: 10, alcancadoEm: t(0) };
    expect(somarXpNaLiga(m, 0, t(5))).toBe(m);
    expect(somarXpNaLiga(m, 15, t(5))).toEqual({ usuarioId: 'u', xpSemana: 25, alcancadoEm: t(5) });
  });

  it('nome na liga: primeiro nome + inicial, ou apelido', () => {
    expect(nomeNaLiga('Marina Souza Lima')).toBe('Marina L.');
    expect(nomeNaLiga('marina souza')).toBe('marina S.');
    expect(nomeNaLiga('Cher')).toBe('Cher');
    expect(nomeNaLiga('   ')).toBe('Aluno');
    expect(nomeNaLiga('Marina Souza', '  Capivara42 ')).toBe('Capivara42');
    expect(nomeNaLiga('Marina Souza', '   ')).toBe('Marina S.');
  });
});

describe('conquistas (PRD 6.8)', () => {
  const zero = {
    licoesConcluidas: 0,
    ofensivaRecorde: 0,
    questoesRespondidas: 0,
    simuladosEntregues: 0,
    simuladosAprovados: 0,
    unidadesPortuguesCoroadas: 0,
    divisao: 'bronze' as const,
  };

  it('nenhuma no começo', () => {
    expect(conquistasAtingidas(zero)).toEqual([]);
  });

  it('todas quando tudo foi feito', () => {
    expect(
      conquistasAtingidas({
        licoesConcluidas: 50,
        ofensivaRecorde: 30,
        questoesRespondidas: 500,
        simuladosEntregues: 2,
        simuladosAprovados: 1,
        unidadesPortuguesCoroadas: 1,
        divisao: 'safira',
      }),
    ).toHaveLength(9);
  });

  it('só as novas', () => {
    const e = { ...zero, licoesConcluidas: 1, ofensivaRecorde: 7, divisao: 'ouro' as const };
    expect(novasConquistas(e, ['primeira_licao'])).toEqual(['ofensiva_7', 'liga_ouro']);
    expect(dadosDaConquista('liga_ouro').titulo).toBe('Liga Ouro');
  });
});
