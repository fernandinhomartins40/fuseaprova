import { describe, expect, it } from 'vitest';
import {
  deslocamentoSP,
  diaDaSemana,
  diaSP,
  diasDaSemana,
  diasParaFimDaSemana,
  diferencaDias,
  ehDiaValido,
  fimSemanaSP,
  formatarDataBR,
  formatarDiaMes,
  horaMinutoSP,
  inicioDoDiaSP,
  inicioSemanaSP,
  lerDataBR,
  meiaNoiteSP,
  MS_HORA,
  partesSP,
  proximaMeiaNoiteSP,
  segundaDaSemana,
  semanaSP,
  somarDias,
} from './datas.js';

describe('datas em America/Sao_Paulo', () => {
  it('converte um instante UTC para o dia de São Paulo', () => {
    // 02:30 UTC de 24/10 = 23:30 de 23/10 em SP
    expect(diaSP(new Date('2026-10-24T02:30:00Z'))).toBe('2026-10-23');
    expect(diaSP(new Date('2026-10-24T03:00:00Z'))).toBe('2026-10-24');
    expect(partesSP(new Date('2026-10-24T03:04:05Z'))).toEqual({
      ano: 2026,
      mes: 10,
      dia: 24,
      hora: 0,
      minuto: 4,
      segundo: 5,
    });
  });

  it('calcula o deslocamento de -3 h', () => {
    expect(deslocamentoSP(new Date('2026-06-01T12:00:00.789Z'))).toBe(-3 * MS_HORA);
  });

  it('acha a meia-noite de São Paulo', () => {
    expect(inicioDoDiaSP('2026-10-23').toISOString()).toBe('2026-10-23T03:00:00.000Z');
    expect(meiaNoiteSP(new Date('2026-10-23T20:00:00Z')).toISOString()).toBe(
      '2026-10-23T03:00:00.000Z',
    );
    expect(proximaMeiaNoiteSP(new Date('2026-10-24T02:59:59Z')).toISOString()).toBe(
      '2026-10-24T03:00:00.000Z',
    );
  });

  it('lida com o horário de verão antigo (2018, quando existia)', () => {
    // Em 04/11/2018 o relógio pulou de 00:00 para 01:00 em SP.
    const inicio = inicioDoDiaSP('2018-11-04');
    expect(diaSP(inicio)).toBe('2018-11-04');
    expect(inicioDoDiaSP('2018-12-01').toISOString()).toBe('2018-12-01T02:00:00.000Z');
  });

  it('valida dias', () => {
    expect(ehDiaValido('2026-02-28')).toBe(true);
    expect(ehDiaValido('2026-02-29')).toBe(false);
    expect(ehDiaValido('2026-2-28')).toBe(false);
    expect(() => somarDias('xx', 1)).toThrow(RangeError);
  });

  it('soma e subtrai dias', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diferencaDias('2026-11-01', '2026-10-23')).toBe(9);
    expect(diferencaDias('2026-10-23', '2026-10-23')).toBe(0);
  });

  it('acha a segunda-feira da semana (seg–dom)', () => {
    expect(diaDaSemana('2026-10-25')).toBe(0); // domingo
    expect(segundaDaSemana('2026-10-25')).toBe('2026-10-19');
    expect(segundaDaSemana('2026-10-19')).toBe('2026-10-19');
    expect(segundaDaSemana('2026-10-23')).toBe('2026-10-19');
    expect(semanaSP(new Date('2026-10-26T02:59:00Z'))).toBe('2026-10-19'); // dom 23:59 SP
    expect(semanaSP(new Date('2026-10-26T03:00:00Z'))).toBe('2026-10-26'); // seg 00:00 SP
    expect(diasDaSemana('2026-10-19')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('calcula início, fim e dias restantes da semana', () => {
    const sexta = new Date('2026-10-23T15:00:00Z');
    expect(inicioSemanaSP(sexta).toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(fimSemanaSP(sexta).toISOString()).toBe('2026-10-26T03:00:00.000Z');
    expect(diasParaFimDaSemana(sexta)).toBe(3);
    expect(diasParaFimDaSemana(new Date('2026-10-25T15:00:00Z'))).toBe(1);
  });

  it('formata e lê datas no padrão brasileiro', () => {
    expect(formatarDataBR('2026-03-07')).toBe('07/03/2026');
    expect(formatarDiaMes('2026-03-07')).toBe('07/03');
    expect(horaMinutoSP(new Date('2026-10-23T10:05:00Z'))).toBe('07:05');
    expect(lerDataBR(' 07/03/2026 ')).toBe('2026-03-07');
    expect(lerDataBR('31/02/2026')).toBeNull();
    expect(lerDataBR('2026-03-07')).toBeNull();
  });
});
