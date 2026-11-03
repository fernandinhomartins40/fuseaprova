import { describe, expect, it } from 'vitest';
import { acessoVencido, fimDoAcesso } from './validadeAcesso.js';

const pago = new Date('2026-11-02T12:00:00Z');

describe('validade do acesso (D33)', () => {
  it('sem homologação, vale 24 meses desde a liberação', () => {
    expect(fimDoAcesso(pago, null).toISOString()).toBe('2028-11-02T12:00:00.000Z');
  });

  it('com homologação, termina no fim daquele dia em São Paulo', () => {
    expect(fimDoAcesso(pago, '2027-06-10').toISOString()).toBe('2027-06-11T03:00:00.000Z');
  });

  it('vale o que vier primeiro', () => {
    expect(fimDoAcesso(pago, '2029-01-01').toISOString()).toBe('2028-11-02T12:00:00.000Z');
  });

  it('o último instante ainda tem acesso e o seguinte não', () => {
    const fim = fimDoAcesso(pago, '2027-06-10');
    expect(acessoVencido(pago, '2027-06-10', new Date(fim.getTime() - 1))).toBe(false);
    expect(acessoVencido(pago, '2027-06-10', fim)).toBe(true);
  });
});
