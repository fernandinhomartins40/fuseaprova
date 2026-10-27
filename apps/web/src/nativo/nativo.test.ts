import { beforeEach, describe, expect, it, vi } from 'vitest';

const agendados: { id: number; at: Date; body: string }[] = [];
const cancelados: number[] = [];

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn(
      async ({
        notifications,
      }: {
        notifications: { id: number; body: string; schedule: { at: Date } }[];
      }) => {
        for (const n of notifications)
          agendados.push({ id: n.id, at: n.schedule.at, body: n.body });
      },
    ),
    cancel: vi.fn(async ({ notifications }: { notifications: { id: number }[] }) => {
      cancelados.push(...notifications.map((n) => n.id));
    }),
    checkPermissions: vi.fn(async () => ({ display: 'denied' })),
    requestPermissions: vi.fn(async () => ({ display: 'denied' })),
  },
}));
vi.mock('@capacitor/app', () => ({ App: {} }));
vi.mock('@capacitor/filesystem', () => ({ Directory: {}, Encoding: {}, Filesystem: {} }));
vi.mock('@capacitor/share', () => ({ Share: {} }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: {} }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
  CapacitorHttp: {},
}));

const { agendarLembretes, pedirPermissaoLembrete } = await import('./nativo');

describe('lembrete local do app nativo (D20)', () => {
  beforeEach(() => {
    agendados.length = 0;
    cancelados.length = 0;
  });

  it('agenda 7 dias no horário de São Paulo, a partir de hoje se ainda não passou', async () => {
    // 10:00 em São Paulo; lembrete às 19:00
    await agendarLembretes({
      hora: '19:00',
      ofensiva: 4,
      metaCumpridaHoje: false,
      agora: new Date('2026-11-03T10:00:00-03:00'),
    });
    expect(agendados).toHaveLength(8);
    expect(agendados[0]!.at.toISOString()).toBe('2026-11-03T22:00:00.000Z');
    expect(agendados[1]!.at.toISOString()).toBe('2026-11-04T22:00:00.000Z');
    // hoje cita a ofensiva em risco; os próximos dias, a frase geral
    expect(agendados[0]!.body).toContain('4 dias');
    expect(agendados[1]!.body).not.toContain('dias');
    expect(cancelados.length).toBeGreaterThan(0);
  });

  it('meta de hoje cumprida ou horário passado: começa amanhã', async () => {
    await agendarLembretes({
      hora: '19:00',
      ofensiva: 0,
      metaCumpridaHoje: true,
      agora: new Date('2026-11-03T10:00:00-03:00'),
    });
    expect(agendados[0]!.at.toISOString()).toBe('2026-11-04T22:00:00.000Z');
    agendados.length = 0;
    await agendarLembretes({
      hora: '08:30',
      ofensiva: 0,
      metaCumpridaHoje: false,
      agora: new Date('2026-11-03T10:00:00-03:00'),
    });
    expect(agendados[0]!.at.toISOString()).toBe('2026-11-04T11:30:00.000Z');
  });

  it('permissão negada não agenda nada', async () => {
    expect(await pedirPermissaoLembrete()).toBe('negado');
  });
});
