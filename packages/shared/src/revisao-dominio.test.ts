import { describe, expect, it } from 'vitest';
import {
  aplicarRespostaNaRevisao,
  estaVencida,
  filtrarPendentes,
  revisaoAposAcerto,
  revisaoAposErro,
  type ItemRevisao,
} from './revisao.js';
import {
  dominioDaDisciplina,
  dominioDoAssunto,
  formatarDominio,
  precisaoPercentual,
} from './dominio-estudo.js';
import { inicioDoDiaSP } from './datas.js';

describe('revisão espaçada (PRD 6.5)', () => {
  it('erro vence amanhã às 00:00 de SP, mesmo errando à noite', () => {
    const item = revisaoAposErro(new Date('2026-10-24T02:00:00Z')); // 23/10 23:00 SP
    expect(item).toEqual({ etapa: 0, venceEm: inicioDoDiaSP('2026-10-24'), status: 'ativa' });
  });

  it('4 acertos espaçados (1, 3, 7, 15) dominam a questão (critério de aceite)', () => {
    let agora = new Date('2026-10-23T15:00:00Z');
    let item: ItemRevisao | null = aplicarRespostaNaRevisao(null, false, agora);
    const esperas: string[] = [];
    for (let i = 0; i < 4; i++) {
      agora = new Date(item!.venceEm.getTime() + 10 * 3600_000);
      expect(estaVencida(item!, agora)).toBe(true);
      item = aplicarRespostaNaRevisao(item, true, agora);
      esperas.push(item!.status === 'ativa' ? item!.venceEm.toISOString().slice(0, 10) : 'fim');
    }
    expect(esperas).toEqual(['2026-10-27', '2026-11-03', '2026-11-18', 'fim']);
    expect(item).toMatchObject({ etapa: 4, status: 'dominada' });
    expect(estaVencida(item!, new Date('2030-01-01'))).toBe(false);
  });

  it('acertar antes do vencimento não avança', () => {
    const item = revisaoAposErro(new Date('2026-10-23T15:00:00Z'));
    expect(revisaoAposAcerto(item, new Date('2026-10-23T20:00:00Z'))).toBe(item);
  });

  it('errar na revisão volta à etapa 0', () => {
    const item: ItemRevisao = { etapa: 3, venceEm: new Date('2026-10-01'), status: 'ativa' };
    expect(aplicarRespostaNaRevisao(item, false, new Date('2026-10-23T15:00:00Z'))?.etapa).toBe(0);
    expect(aplicarRespostaNaRevisao(null, true, new Date())).toBeNull();
  });

  it('pendentes = ativas com vence_em <= agora', () => {
    const agora = new Date('2026-10-23T15:00:00Z');
    const itens: ItemRevisao[] = [
      { etapa: 0, venceEm: new Date('2026-10-23T03:00:00Z'), status: 'ativa' },
      { etapa: 0, venceEm: agora, status: 'ativa' },
      { etapa: 1, venceEm: new Date('2026-10-24T03:00:00Z'), status: 'ativa' },
      { etapa: 4, venceEm: new Date('2026-10-01T03:00:00Z'), status: 'dominada' },
    ];
    expect(filtrarPendentes(itens, agora)).toHaveLength(2);
  });
});

describe('domínio (PRD 6.6)', () => {
  it('mostra "—" com menos de 5 tentativas', () => {
    const d = dominioDoAssunto([true, true, false, true]);
    expect(d.valor).toBeNull();
    expect(formatarDominio(d.valor)).toBe('—');
  });

  it('usa só as últimas 30 tentativas', () => {
    const tentativas = [...Array(10).fill(false), ...Array(30).fill(true)];
    expect(dominioDoAssunto(tentativas)).toEqual({ valor: 1, tentativas: 30, acertos: 30 });
    expect(formatarDominio(0.734)).toBe('73%');
  });

  it('disciplina é média ponderada pelas tentativas', () => {
    const a = dominioDoAssunto([true, true, true, true, true, true, true, true, true, true]); // 10, 100%
    const b = dominioDoAssunto([false, false, false, false, false]); // 5, 0%
    const c = dominioDoAssunto([true]); // sem domínio, ignorado
    expect(dominioDaDisciplina([a, b, c])).toBeCloseTo(10 / 15);
    expect(dominioDaDisciplina([c])).toBeNull();
  });

  it('precisão em porcentagem', () => {
    expect(precisaoPercentual(4, 5)).toBe(80);
    expect(precisaoPercentual(0, 0)).toBe(0);
  });
});
