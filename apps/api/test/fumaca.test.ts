import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

describe('fumaça', () => {
  it('saúde e trilha', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/api/saude' })).statusCode).toBe(200);
    const a = await t.alunoPago();
    const me = await t.chamar('meObter', { cookie: a.cookie });
    expect(me.statusCode, me.body).toBe(200);
    const tr = await t.chamar('trilha', { cookie: a.cookie });
    expect(tr.statusCode, tr.body).toBe(200);
    const atual = tr.json().atual;
    const ini = await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: atual.licaoId } });
    expect(ini.statusCode, ini.body).toBe(200);
    expect(ini.json().questoes).toHaveLength(5);
  });
});
