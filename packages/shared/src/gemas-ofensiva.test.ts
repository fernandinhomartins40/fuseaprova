import { describe, expect, it } from 'vitest';
import { comprarProtetor, gastarDica, gemasPorOfensiva, podeUsarDica } from './gemas.js';
import {
  diaContaParaOfensiva,
  metaDiariaCumprida,
  ofensivaVisivel,
  progressoMetaDiaria,
  registrarDiaDeEstudo,
  verificarOfensiva,
  type EstadoOfensiva,
} from './ofensiva.js';

describe('gemas (PRD 6.3)', () => {
  it('marcos de ofensiva', () => {
    expect(gemasPorOfensiva(7)).toBe(50);
    expect(gemasPorOfensiva(30)).toBe(200);
    expect(gemasPorOfensiva(100)).toBe(500);
    expect(gemasPorOfensiva(8)).toBe(0);
  });

  it('dica custa 5 gemas', () => {
    expect(podeUsarDica(5)).toBe(true);
    expect(podeUsarDica(4)).toBe(false);
    expect(gastarDica(12)).toEqual({ ok: true, gemas: 7 });
    expect(gastarDica(4)).toMatchObject({ ok: false, codigo: 'gemas_insuficientes' });
  });

  it('protetor custa 200 e o máximo é 2', () => {
    expect(comprarProtetor(250, 0)).toEqual({ ok: true, gemas: 50, protetores: 1 });
    expect(comprarProtetor(1000, 2)).toMatchObject({ ok: false, codigo: 'limite_protetores' });
    expect(comprarProtetor(199, 1)).toMatchObject({ ok: false, codigo: 'gemas_insuficientes' });
  });
});

const base: EstadoOfensiva = { ofensiva: 5, recorde: 10, ultimoDia: '2026-10-22', protetores: 0 };

describe('ofensiva (PRD 6.4)', () => {
  it('o dia conta com 1 lição, 10 revisões ou 1 simulado', () => {
    expect(diaContaParaOfensiva({ licoesTrilha: 1, questoesRevisao: 0, simulados: 0 })).toBe(true);
    expect(diaContaParaOfensiva({ licoesTrilha: 0, questoesRevisao: 10, simulados: 0 })).toBe(true);
    expect(diaContaParaOfensiva({ licoesTrilha: 0, questoesRevisao: 9, simulados: 0 })).toBe(false);
    expect(diaContaParaOfensiva({ licoesTrilha: 0, questoesRevisao: 0, simulados: 1 })).toBe(true);
  });

  it('sobe com a primeira lição do dia e é idempotente no mesmo dia', () => {
    const r = registrarDiaDeEstudo(base, '2026-10-23');
    expect(r.estado.ofensiva).toBe(6);
    expect(r.primeiroDoDia).toBe(true);
    const r2 = registrarDiaDeEstudo(r.estado, '2026-10-23');
    expect(r2.estado.ofensiva).toBe(6);
    expect(r2.primeiroDoDia).toBe(false);
    expect(r2.gemasGanhas).toBe(0);
  });

  it('começa em 1 para quem nunca estudou e atualiza o recorde', () => {
    const r = registrarDiaDeEstudo(
      { ofensiva: 0, recorde: 0, ultimoDia: null, protetores: 0 },
      '2026-10-23',
    );
    expect(r.estado).toEqual({ ofensiva: 1, recorde: 1, ultimoDia: '2026-10-23', protetores: 0 });
  });

  it('zera depois de um dia sem estudo e sem protetor (critério de aceite)', () => {
    const q = verificarOfensiva(base, '2026-10-24');
    expect(q.zerou).toBe(true);
    expect(q.estado.ofensiva).toBe(0);
    expect(q.ofensivaAnterior).toBe(5);
    const r = registrarDiaDeEstudo(base, '2026-10-24');
    expect(r.estado.ofensiva).toBe(1);
    expect(r.quebra.zerou).toBe(true);
  });

  it('protetor salva a ofensiva e é consumido', () => {
    const q = verificarOfensiva({ ...base, protetores: 2 }, '2026-10-25');
    expect(q.zerou).toBe(false);
    expect(q.protetoresUsados).toBe(2);
    expect(q.estado).toMatchObject({ ofensiva: 5, protetores: 0, ultimoDia: '2026-10-24' });
    const r = registrarDiaDeEstudo({ ...base, protetores: 1 }, '2026-10-24');
    expect(r.estado.ofensiva).toBe(6);
    expect(r.estado.protetores).toBe(0);
  });

  it('protetores insuficientes: zera sem gastar', () => {
    const q = verificarOfensiva({ ...base, protetores: 1 }, '2026-10-26');
    expect(q).toMatchObject({ zerou: true, protetoresUsados: 0, diasPerdidos: 3 });
    expect(q.estado.protetores).toBe(1);
  });

  it('sem dias perdidos nada muda', () => {
    expect(verificarOfensiva(base, '2026-10-23').diasPerdidos).toBe(0);
    expect(verificarOfensiva({ ...base, ofensiva: 0 }, '2026-12-01').zerou).toBe(false);
    expect(ofensivaVisivel(base, '2026-10-23')).toBe(5);
    expect(ofensivaVisivel(base, '2026-10-25')).toBe(0);
  });

  it('marcos dão gemas', () => {
    const r = registrarDiaDeEstudo({ ...base, ofensiva: 6 }, '2026-10-23');
    expect(r.marco).toBe(7);
    expect(r.gemasGanhas).toBe(50);
    expect(registrarDiaDeEstudo({ ...base, ofensiva: 7 }, '2026-10-23').marco).toBeNull();
  });

  it('meta diária é separada', () => {
    expect(metaDiariaCumprida(2, 2)).toBe(true);
    expect(metaDiariaCumprida(1, 2)).toBe(false);
    expect(progressoMetaDiaria(1, 3)).toBeCloseTo(1 / 3);
    expect(progressoMetaDiaria(5, 3)).toBe(1);
    expect(progressoMetaDiaria(0, 0)).toBe(1);
  });
});
