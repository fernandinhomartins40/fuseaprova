import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TIPOS_LEMBRETE, rotaNotificacaoValida } from '@fuse/shared';
import type { LembretesResposta } from '@fuse/shared/api';
import { paraNotificacoesLocais, rotaDaNotificacao } from './notificacoes';

/* Plugin mockado: guarda o que foi agendado, cancelado e os listeners. */
const estado = vi.hoisted(() => ({
  permissao: 'granted' as string,
  agendados: [] as Record<string, unknown>[],
  cancelados: [] as number[],
  canais: [] as string[],
  pendentes: [] as { id: number }[],
  listeners: new Map<string, (a: unknown) => void>(),
  plataforma: 'android',
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn(async ({ notifications }: { notifications: Record<string, unknown>[] }) => {
      estado.agendados.push(...notifications);
    }),
    cancel: vi.fn(async ({ notifications }: { notifications: { id: number }[] }) => {
      estado.cancelados.push(...notifications.map((n) => n.id));
    }),
    getPending: vi.fn(async () => ({ notifications: estado.pendentes })),
    createChannel: vi.fn(async ({ id }: { id: string }) => {
      estado.canais.push(id);
    }),
    checkPermissions: vi.fn(async () => ({ display: estado.permissao })),
    requestPermissions: vi.fn(async () => ({ display: estado.permissao })),
    addListener: vi.fn(async (nome: string, f: (a: unknown) => void) => {
      estado.listeners.set(nome, f);
      return { remove: async () => estado.listeners.delete(nome) };
    }),
  },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (nome: string, f: (a: unknown) => void) => {
      estado.listeners.set(nome, f);
      return { remove: async () => estado.listeners.delete(nome) };
    }),
  },
}));
vi.mock('@capacitor/filesystem', () => ({ Directory: {}, Encoding: {}, Filesystem: {} }));
vi.mock('@capacitor/share', () => ({ Share: {} }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: {} }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => estado.plataforma },
  CapacitorHttp: {},
}));

const {
  aoTocarLembrete,
  aoVoltarAoApp,
  estadoPermissaoLembrete,
  pedirPermissaoLembrete,
  sincronizarLembretes,
} = await import('./nativo');

const ID = '3f1c2b9a-6d4e-4f1a-9b2c-1a2b3c4d5e6f';
const AGORA = new Date('2026-11-03T10:00:00-03:00');
const plano: LembretesResposta = {
  ativo: true,
  geradoEm: AGORA.toISOString(),
  itens: [
    {
      tipo: 'revisao_vencida',
      quando: '2026-11-03T19:00:00-03:00',
      titulo: '3 erros esperando revisão',
      corpo: 'Revise agora.',
      rota: '/revisar/praticar',
    },
    {
      tipo: 'tema_fraco',
      quando: '2026-11-04T19:00:00-03:00',
      titulo: 'Reforce Crase',
      corpo: '10 questões.',
      rota: `/reforco/praticar?assunto=${ID}`,
    },
    {
      // já passou: fica de fora
      tipo: 'trilha',
      quando: '2026-11-03T08:00:00-03:00',
      titulo: 'Hora de estudar',
      corpo: 'x',
      rota: '/aprender',
    },
  ],
};

beforeEach(() => {
  estado.permissao = 'granted';
  estado.agendados.length = 0;
  estado.cancelados.length = 0;
  estado.canais.length = 0;
  estado.pendentes = [];
  estado.listeners.clear();
  estado.plataforma = 'android';
});

describe('toque na notificação → tela (D30)', () => {
  it('converte extra.rota em navegação, validando contra a lista fechada', () => {
    expect(rotaDaNotificacao({ rota: '/revisar/praticar' })).toBe('/revisar/praticar');
    expect(rotaDaNotificacao({ rota: `/reforco/praticar?assunto=${ID}` })).toBe(
      `/reforco/praticar?assunto=${ID}`,
    );
    expect(rotaDaNotificacao({ url: '/desempenho' })).toBe('/desempenho'); // versões antigas
    expect(rotaDaNotificacao({ rota: '/super' })).toBe('/aprender');
    expect(rotaDaNotificacao({ rota: 'https://golpe.example/aprender' })).toBe('/aprender');
    expect(rotaDaNotificacao(undefined)).toBe('/aprender');
    expect(rotaDaNotificacao('texto')).toBe('/aprender');
  });

  it('o listener do plugin abre a tela da notificação tocada', async () => {
    const abertas: string[] = [];
    const remover = await aoTocarLembrete((r) => abertas.push(r));
    const tocar = estado.listeners.get('localNotificationActionPerformed')!;
    tocar({ actionId: 'tap', notification: { id: 1000, extra: { rota: '/anotacoes' } } });
    tocar({ actionId: 'tap', notification: { id: 1001, extra: { rota: '/admin' } } });
    tocar({ actionId: 'tap', notification: { id: 1002 } });
    expect(abertas).toEqual(['/anotacoes', '/aprender', '/aprender']);
    remover();
  });

  it('todo tipo de notificação vira uma notificação com rota válida', () => {
    const itens = TIPOS_LEMBRETE.map((tipo, i) => ({
      tipo,
      quando: new Date(AGORA.getTime() + (i + 1) * 3600_000).toISOString(),
      titulo: 't',
      corpo: 'c',
      rota: tipo === 'tema_fraco' ? `/reforco/praticar?assunto=${ID}` : '/aprender',
    }));
    const n = paraNotificacoesLocais(itens, AGORA);
    expect(n).toHaveLength(TIPOS_LEMBRETE.length);
    for (const x of n) expect(rotaNotificacaoValida(x.extra.rota)).toBe(true);
  });
});

describe('agendamento das notificações locais (D30)', () => {
  it('cancela os antigos e agenda o plano: inexato, canal criado, rota no extra', async () => {
    estado.pendentes = [{ id: 1003 }, { id: 4242 }];
    const r = await sincronizarLembretes(
      async () => plano,
      () => AGORA,
    );
    expect(r).toBe('agendado');
    expect(estado.cancelados).toEqual(expect.arrayContaining([1000, 1007, 1099, 4242]));
    expect(estado.canais).toContain('lembrete-diario');
    expect(estado.agendados).toHaveLength(2);
    expect(estado.agendados[0]).toMatchObject({
      id: 1000,
      title: '3 erros esperando revisão',
      body: 'Revise agora.',
      channelId: 'lembrete-diario',
      isExactNotification: false,
      extra: { rota: '/revisar/praticar', tipo: 'revisao_vencida' },
      schedule: { allowWhileIdle: true },
    });
    expect((estado.agendados[0]!.schedule as { at: Date }).at.toISOString()).toBe(
      '2026-11-03T22:00:00.000Z',
    );
    expect(estado.agendados[1]).toMatchObject({
      id: 1001,
      extra: { rota: `/reforco/praticar?assunto=${ID}` },
    });
  });

  it('sem permissão não agenda nem pede a permissão sozinho', async () => {
    estado.permissao = 'prompt';
    const buscar = vi.fn(async () => plano);
    expect(await sincronizarLembretes(buscar, () => AGORA)).toBe('sem_permissao');
    expect(buscar).not.toHaveBeenCalled();
    expect(estado.agendados).toHaveLength(0);
  });

  it('sem conexão mantém os já agendados; sem acesso ou opt-out cancela', async () => {
    const offline = Object.assign(new Error('sem conexão'), { status: 0 });
    expect(await sincronizarLembretes(async () => Promise.reject(offline))).toBe('sem_conexao');
    expect(estado.cancelados).toHaveLength(0);

    const semAcesso = Object.assign(new Error('402'), { status: 402 });
    expect(await sincronizarLembretes(async () => Promise.reject(semAcesso))).toBe('sem_acesso');
    expect(estado.cancelados.length).toBeGreaterThan(0);

    estado.cancelados.length = 0;
    expect(await sincronizarLembretes(async () => ({ ...plano, ativo: false, itens: [] }))).toBe(
      'desligado',
    );
    expect(estado.cancelados.length).toBeGreaterThan(0);
    expect(estado.agendados).toHaveLength(0);
  });

  it('iOS: sem canal; permissão e estados', async () => {
    estado.plataforma = 'ios';
    await sincronizarLembretes(
      async () => plano,
      () => AGORA,
    );
    expect(estado.canais).toHaveLength(0);
    expect(estado.agendados).toHaveLength(2);
    expect(await estadoPermissaoLembrete()).toBe('ativado');
    estado.permissao = 'denied';
    expect(await estadoPermissaoLembrete()).toBe('negado');
    expect(await pedirPermissaoLembrete()).toBe('negado');
    estado.permissao = 'prompt';
    expect(await estadoPermissaoLembrete()).toBe('pendente');
  });

  it('voltar ao app chama o reagendamento', async () => {
    const f = vi.fn();
    await aoVoltarAoApp(f);
    estado.listeners.get('resume')!({});
    expect(f).toHaveBeenCalledOnce();
  });
});
