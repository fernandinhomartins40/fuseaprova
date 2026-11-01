import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { rotaNotificacaoValida } from '@fuse/shared';
import { LembretesResposta } from '@fuse/shared/api';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { fazerLicao } from './ajuda.js';

/** D30: plano de lembretes (notificações locais do app), calculado no servidor. */
let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

const { usuarios } = schema;

describe('GET /me/lembretes (D30)', () => {
  it('exige pagamento', async () => {
    const a = await t.cadastrar();
    expect((await t.chamar('meLembretes', { cookie: a.cookie })).statusCode).toBe(402);
    expect((await t.chamar('meLembretes')).statusCode).toBe(401);
  });

  it('respeita o opt-out: notificações desligadas ou sem horário não geram nada', async () => {
    const a = await t.alunoPago();
    await t.db
      .update(usuarios)
      .set({ notificacoes: false, lembreteHora: '19:00' })
      .where(eq(usuarios.id, a.id));
    const r1 = await t.chamar('meLembretes', { cookie: a.cookie });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json()).toMatchObject({ ativo: false, itens: [] });

    await t.db
      .update(usuarios)
      .set({ notificacoes: true, lembreteHora: null })
      .where(eq(usuarios.id, a.id));
    expect((await t.chamar('meLembretes', { cookie: a.cookie })).json()).toMatchObject({
      ativo: false,
      itens: [],
    });
  });

  it('até 7 dias, no máximo 2 por dia, toda notificação com rota válida e texto do progresso', async () => {
    const a = await t.alunoPago();
    // erra questões para gerar revisões e um tema fraco
    await fazerLicao(t, a.cookie, 5);
    await t.db
      .update(usuarios)
      .set({ notificacoes: true, lembreteHora: '23:55' })
      .where(eq(usuarios.id, a.id));
    const r = await t.chamar('meLembretes', { cookie: a.cookie });
    expect(r.statusCode, r.body).toBe(200);
    const corpo = LembretesResposta.parse(r.json());
    expect(corpo.ativo).toBe(true);
    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(corpo.itens.length).toBeLessThanOrEqual(14);
    const porDia = new Map<string, number>();
    for (const i of corpo.itens) {
      expect(rotaNotificacaoValida(i.rota), i.rota).toBe(true);
      expect(i.titulo.length).toBeGreaterThan(0);
      expect(new Date(i.quando).getTime()).toBeGreaterThan(t.relogio.agora().getTime());
      const d = i.quando.slice(0, 10);
      porDia.set(d, (porDia.get(d) ?? 0) + 1);
    }
    expect(Math.max(...porDia.values())).toBeLessThanOrEqual(2);
    // os erros da lição viram revisão ou tema fraco em algum dos lembretes
    expect(
      corpo.itens.some((i) => i.rota.startsWith('/revisar') || i.rota.startsWith('/reforco')),
    ).toBe(true);
  });
});
