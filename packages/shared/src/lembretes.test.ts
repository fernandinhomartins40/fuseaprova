import { describe, expect, it } from 'vitest';
import {
  avisoOfensiva,
  escolherLembrete,
  normalizarRotaNotificacao,
  planejarLembretes,
  ROTA_DO_TIPO,
  ROTAS_NOTIFICACAO,
  rotaNotificacaoValida,
  rotaReforcoDoTema,
  TIPOS_LEMBRETE,
  type ContextoLembrete,
  type EntradaPlanoLembretes,
} from './lembretes.js';
import { ItemLembrete, LembretesResposta } from './api/lembretes.js';

const ID = '3f1c2b9a-6d4e-4f1a-9b2c-1a2b3c4d5e6f';
const ID2 = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const ctx = (o: Partial<ContextoLembrete> = {}): ContextoLembrete => ({
  revisoes: 0,
  ofensiva: 0,
  diasParaProva: null,
  tema: null,
  temaMaisFraco: false,
  trilhaConcluida: false,
  diaSemana: 2,
  indice: 1,
  ...o,
});

// 10:00 de terça, 03/11/2026, em São Paulo
const AGORA = new Date('2026-11-03T10:00:00-03:00');
const base = (o: Partial<EntradaPlanoLembretes> = {}): EntradaPlanoLembretes => ({
  agora: AGORA,
  notificacoes: true,
  hora: '19:00',
  acesso: true,
  metaCumpridaHoje: false,
  estudouHoje: false,
  ofensiva: 0,
  revisoesVencidas: 0,
  revisoesPorDia: {},
  temasFracos: [],
  trilhaConcluida: false,
  dataProva: null,
  ...o,
});

describe('rotas das notificações (D30)', () => {
  it('lista fechada e reforço de tema com uuid', () => {
    for (const r of ROTAS_NOTIFICACAO) expect(rotaNotificacaoValida(r)).toBe(true);
    expect(rotaNotificacaoValida(rotaReforcoDoTema(ID))).toBe(true);
    expect(rotaNotificacaoValida('/reforco/praticar?assunto=abc')).toBe(false);
    expect(rotaNotificacaoValida('/admin')).toBe(false);
    expect(rotaNotificacaoValida('https://exemplo.com/aprender')).toBe(false);
    expect(rotaNotificacaoValida('//exemplo.com')).toBe(false);
    expect(rotaNotificacaoValida(undefined)).toBe(false);
    expect(rotaNotificacaoValida(42)).toBe(false);
  });

  it('rota inválida vira a trilha', () => {
    expect(normalizarRotaNotificacao('/revisar')).toBe('/revisar');
    expect(normalizarRotaNotificacao('/super')).toBe('/aprender');
    expect(normalizarRotaNotificacao(null)).toBe('/aprender');
  });

  it('todo tipo de notificação tem uma rota válida', () => {
    for (const tipo of TIPOS_LEMBRETE) {
      expect(rotaNotificacaoValida(ROTA_DO_TIPO[tipo]({ tema: null })), tipo).toBe(true);
      expect(
        rotaNotificacaoValida(ROTA_DO_TIPO[tipo]({ tema: { assuntoId: ID, nome: 'Crase' } })),
        tipo,
      ).toBe(true);
    }
    expect(ROTA_DO_TIPO.tema_fraco({ tema: null })).toBe('/desempenho');
  });
});

describe('escolherLembrete', () => {
  it('reta final da prova vem antes de tudo', () => {
    const t = escolherLembrete(ctx({ diasParaProva: 1, revisoes: 5 }));
    expect(t).toMatchObject({
      tipo: 'prova_perto',
      titulo: 'A prova é amanhã',
      rota: '/reforco/praticar',
    });
    expect(escolherLembrete(ctx({ diasParaProva: 3 })).titulo).toBe('Faltam 3 dias para a prova');
  });

  it('revisão vencida hoje e revisões que voltam num dia seguinte', () => {
    expect(escolherLembrete(ctx({ revisoes: 3, indice: 0 }))).toMatchObject({
      tipo: 'revisao_vencida',
      titulo: '3 erros esperando revisão',
      rota: '/revisar/praticar',
    });
    expect(escolherLembrete(ctx({ revisoes: 1, indice: 0 })).titulo).toBe(
      '1 erro esperando revisão',
    );
    expect(escolherLembrete(ctx({ revisoes: 2, indice: 2 }))).toMatchObject({
      tipo: 'revisao_agendada',
      titulo: '2 questões voltam hoje',
    });
    expect(escolherLembrete(ctx({ revisoes: 1, indice: 2 })).titulo).toBe('1 questão volta hoje');
  });

  it('prova em até 30 dias: simulado no sábado e treino dia sim, dia não', () => {
    expect(escolherLembrete(ctx({ diasParaProva: 12, diaSemana: 6 }))).toMatchObject({
      tipo: 'simulado',
      titulo: 'Faltam 12 dias para a prova: que tal um simulado?',
      rota: '/simulado',
    });
    expect(escolherLembrete(ctx({ diasParaProva: 5, diaSemana: 6, indice: 2 })).tipo).toBe(
      'prova_perto',
    );
    expect(escolherLembrete(ctx({ diasParaProva: 12, indice: 2 })).titulo).toBe(
      'Faltam 12 dias para a prova',
    );
    expect(escolherLembrete(ctx({ diasParaProva: 12, indice: 1 })).tipo).toBe('trilha');
    expect(escolherLembrete(ctx({ diasParaProva: 40, indice: 2 })).tipo).toBe('trilha');
  });

  it('tema fraco, resumo do domingo, treino e trilha', () => {
    expect(
      escolherLembrete(ctx({ tema: { assuntoId: ID, nome: 'Crase' }, temaMaisFraco: true })),
    ).toMatchObject({
      tipo: 'tema_fraco',
      titulo: 'Reforce Crase: seu ponto mais fraco',
      rota: `/reforco/praticar?assunto=${ID}`,
    });
    expect(escolherLembrete(ctx({ tema: { assuntoId: ID, nome: 'Crase' } })).titulo).toBe(
      'Reforce Crase',
    );
    expect(escolherLembrete(ctx({ diaSemana: 0 }))).toMatchObject({
      tipo: 'resumo_semana',
      rota: '/desempenho',
    });
    expect(escolherLembrete(ctx({ trilhaConcluida: true }))).toMatchObject({
      tipo: 'treino',
      rota: '/reforco/praticar',
    });
    expect(escolherLembrete(ctx({ ofensiva: 5 })).titulo).toBe(
      'Ofensiva de 5 dias: não pare agora',
    );
    const t0 = escolherLembrete(ctx({ indice: 0 }));
    const t1 = escolherLembrete(ctx({ indice: 1 }));
    expect(t0).toMatchObject({ tipo: 'trilha', titulo: 'Hora de estudar', rota: '/aprender' });
    expect(t0.corpo).not.toBe(t1.corpo);
  });

  it('aviso da ofensiva abre a trilha', () => {
    expect(avisoOfensiva(4)).toMatchObject({
      tipo: 'ofensiva_risco',
      titulo: 'Sua ofensiva de 4 dias está em risco',
      rota: '/aprender',
    });
  });
});

describe('planejarLembretes', () => {
  it('opt-out, sem horário ou sem acesso: nada', () => {
    expect(planejarLembretes(base({ notificacoes: false }))).toEqual([]);
    expect(planejarLembretes(base({ hora: null }))).toEqual([]);
    expect(planejarLembretes(base({ acesso: false }))).toEqual([]);
  });

  it('7 dias no horário de São Paulo, 1 por dia, todos com rota válida', () => {
    const p = planejarLembretes(base());
    expect(p).toHaveLength(7);
    expect(p[0]!.quando.toISOString()).toBe('2026-11-03T22:00:00.000Z');
    expect(p[6]!.quando.toISOString()).toBe('2026-11-09T22:00:00.000Z');
    for (const i of p) {
      expect(rotaNotificacaoValida(i.rota)).toBe(true);
      expect(ItemLembrete.parse({ ...i, quando: i.quando.toISOString() })).toBeTruthy();
    }
    // domingo (08/11) é o resumo da semana
    expect(p[5]).toMatchObject({ tipo: 'resumo_semana' });
    expect(
      LembretesResposta.safeParse({
        ativo: true,
        itens: [{ ...p[0]!, quando: 'x' }],
        geradoEm: AGORA.toISOString(),
      }).success,
    ).toBe(false);
    expect(
      ItemLembrete.safeParse({ ...p[0]!, quando: AGORA.toISOString(), rota: '/admin' }).success,
    ).toBe(false);
  });

  it('hoje fica de fora se a meta foi cumprida ou o horário passou', () => {
    expect(planejarLembretes(base({ metaCumpridaHoje: true }))[0]!.quando.toISOString()).toBe(
      '2026-11-04T22:00:00.000Z',
    );
    expect(planejarLembretes(base({ hora: '08:30' }))[0]!.quando.toISOString()).toBe(
      '2026-11-04T11:30:00.000Z',
    );
  });

  it('revisões de hoje e dos próximos dias, temas fracos em rodízio', () => {
    const p = planejarLembretes(
      base({
        revisoesVencidas: 3,
        revisoesPorDia: { '2026-11-05': 2 },
        temasFracos: [
          { assuntoId: ID, nome: 'Crase' },
          { assuntoId: ID2, nome: 'Regra de três' },
        ],
      }),
    );
    expect(p.map((i) => i.tipo)).toEqual([
      'revisao_vencida',
      'tema_fraco',
      'revisao_agendada',
      'tema_fraco',
      'tema_fraco',
      'tema_fraco',
      'tema_fraco',
    ]);
    expect(p[1]!.titulo).toBe('Reforce Crase: seu ponto mais fraco');
    expect(p[3]!.titulo).toBe('Reforce Regra de três');
    expect(p[3]!.rota).toBe(`/reforco/praticar?assunto=${ID2}`);
    expect(p[4]!.titulo).toBe('Reforce Crase: seu ponto mais fraco');
  });

  it('dia da prova sem lembrete; contagem regressiva antes', () => {
    const p = planejarLembretes(base({ dataProva: '2026-11-05' }));
    expect(p.map((i) => i.quando.toISOString().slice(0, 10))).toEqual([
      '2026-11-03',
      '2026-11-04',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
    ]);
    expect(p[0]!.titulo).toBe('Faltam 2 dias para a prova');
    expect(p[1]!.titulo).toBe('A prova é amanhã');
    expect(p[2]!.tipo).not.toBe('prova_perto');
  });

  it('aviso da ofensiva às 21:00, só hoje e só se não estudou (máximo 2 por dia)', () => {
    const p = planejarLembretes(base({ ofensiva: 6 }));
    expect(p).toHaveLength(8);
    expect(p[0]!.titulo).toBe('Ofensiva de 6 dias: não pare agora');
    expect(p[1]).toMatchObject({ tipo: 'ofensiva_risco' });
    expect(p[1]!.quando.toISOString()).toBe('2026-11-04T00:00:00.000Z');
    const porDia = new Map<string, number>();
    for (const i of p) {
      const d = i.quando.toISOString().slice(0, 10);
      porDia.set(d, (porDia.get(d) ?? 0) + 1);
    }
    expect(Math.max(...porDia.values())).toBeLessThanOrEqual(2);
    // já estudou, ofensiva pequena, lembrete tarde demais ou aviso já passou: sem aviso
    expect(planejarLembretes(base({ ofensiva: 6, estudouHoje: true }))).toHaveLength(7);
    expect(planejarLembretes(base({ ofensiva: 1 }))).toHaveLength(7);
    expect(planejarLembretes(base({ ofensiva: 6, hora: '20:30' }))).toHaveLength(7);
    expect(
      planejarLembretes(base({ ofensiva: 6, agora: new Date('2026-11-03T21:30:00-03:00') })),
    ).toHaveLength(6);
    // meta cumprida, mas a ofensiva ainda não contou hoje: só o aviso hoje
    const s = planejarLembretes(base({ ofensiva: 6, metaCumpridaHoje: true }));
    expect(s[0]).toMatchObject({ tipo: 'ofensiva_risco' });
  });

  it('respeita o número de dias pedido', () => {
    expect(planejarLembretes(base({ dias: 2 }))).toHaveLength(2);
  });
});
