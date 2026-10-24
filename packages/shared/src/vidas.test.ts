import { describe, expect, it } from 'vitest';
import {
  ganharVida,
  msAteProximaVida,
  normalizarVidas,
  perderVida,
  podeJogarLicao,
  RECARGA_VIDA_MS,
  resetDiarioVidas,
  sessaoGastaVida,
  vidasAposResposta,
  VIDAS_MAX,
} from './vidas.js';
import { MS_HORA, MS_MINUTO } from './datas.js';

// 23/10/2026 10:00 em SP
const t0 = new Date('2026-10-23T13:00:00Z');
const mais = (ms: number) => new Date(t0.getTime() + ms);

describe('vidas (PRD 6.2)', () => {
  it('perder com vidas cheias começa a contar a recarga a partir da perda', () => {
    const r = perderVida({ vidas: 5, atualizadoEm: new Date('2026-10-23T03:00:00Z') }, t0);
    expect(r.vidas).toBe(4);
    expect(r.atualizadoEm).toEqual(t0);
    expect(r.proximaVidaEm).toEqual(mais(RECARGA_VIDA_MS));
  });

  it('perder com vidas incompletas mantém a contagem anterior', () => {
    const r = perderVida({ vidas: 3, atualizadoEm: t0 }, mais(MS_HORA));
    expect(r.vidas).toBe(2);
    expect(r.atualizadoEm).toEqual(t0);
  });

  it('não fica negativo', () => {
    const r = perderVida({ vidas: 0, atualizadoEm: t0 }, mais(MS_MINUTO));
    expect(r.vidas).toBe(0);
    expect(podeJogarLicao({ vidas: 0, atualizadoEm: t0 }, mais(MS_MINUTO))).toBe(false);
    expect(podeJogarLicao({ vidas: 1, atualizadoEm: t0 }, mais(MS_MINUTO))).toBe(true);
  });

  it('recarrega +1 a cada 4 h, até o máximo', () => {
    const e = { vidas: 2, atualizadoEm: t0 };
    expect(normalizarVidas(e, mais(4 * MS_HORA - 1)).vidas).toBe(2);
    const r = normalizarVidas(e, mais(4 * MS_HORA + 5 * MS_MINUTO));
    expect(r.vidas).toBe(3);
    expect(r.atualizadoEm).toEqual(mais(4 * MS_HORA));
    expect(r.proximaVidaEm).toEqual(mais(8 * MS_HORA));
    expect(normalizarVidas({ vidas: 4, atualizadoEm: t0 }, mais(9 * MS_HORA)).vidas).toBe(5);
    expect(normalizarVidas({ vidas: 4, atualizadoEm: t0 }, mais(9 * MS_HORA)).proximaVidaEm).toBe(
      null,
    );
  });

  it('volta para 5 à meia-noite de São Paulo', () => {
    const e = { vidas: 0, atualizadoEm: new Date('2026-10-24T02:00:00Z') }; // 23:00 SP
    const r = normalizarVidas(e, new Date('2026-10-24T03:00:01Z')); // 00:00:01 SP
    expect(r.vidas).toBe(VIDAS_MAX);
    expect(r.atualizadoEm.toISOString()).toBe('2026-10-24T03:00:00.000Z');
    expect(r.proximaVidaEm).toBeNull();
  });

  it('acerto em revisão dá +1 vida até o máximo', () => {
    expect(ganharVida({ vidas: 2, atualizadoEm: t0 }, mais(MS_MINUTO)).vidas).toBe(3);
    expect(ganharVida({ vidas: 5, atualizadoEm: t0 }, mais(MS_MINUTO)).vidas).toBe(5);
  });

  it('só a lição de trilha gasta vida', () => {
    expect(sessaoGastaVida('licao')).toBe(true);
    expect(sessaoGastaVida('revisao')).toBe(false);
    expect(sessaoGastaVida('desafio')).toBe(false);
    expect(sessaoGastaVida('simulado')).toBe(false);
    const e = { vidas: 3, atualizadoEm: t0 };
    const d = mais(MS_MINUTO);
    expect(vidasAposResposta(e, 'licao', false, d).vidas).toBe(2);
    expect(vidasAposResposta(e, 'licao', true, d).vidas).toBe(3);
    expect(vidasAposResposta(e, 'revisao', true, d).vidas).toBe(4);
    expect(vidasAposResposta(e, 'revisao', false, d).vidas).toBe(3);
    expect(vidasAposResposta(e, 'desafio', false, d).vidas).toBe(3);
  });

  it('informa quanto falta para a próxima vida', () => {
    expect(msAteProximaVida({ vidas: 3, atualizadoEm: t0 }, mais(MS_HORA))).toBe(3 * MS_HORA);
    expect(msAteProximaVida({ vidas: 5, atualizadoEm: t0 }, mais(MS_HORA))).toBe(0);
  });

  it('reset diário', () => {
    expect(resetDiarioVidas(t0)).toEqual({ vidas: 5, atualizadoEm: t0 });
  });
});
