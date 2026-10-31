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

// App nativo (CapacitorHttp no Android): POST sem corpo chega com Content-Type de formulário.
describe('POST sem corpo vindo do app nativo', () => {
  it('form-urlencoded vazio vale como sem corpo; com conteúdo continua 415', async () => {
    const a = await t.alunoPago();
    const tr = await t.chamar('trilha', { cookie: a.cookie });
    const url = `/api/licoes/${tr.json().atual.licaoId as string}/iniciar`;
    const headers = { cookie: a.cookie, 'content-type': 'application/x-www-form-urlencoded' };
    const ok = await t.app.inject({ method: 'POST', url, headers, payload: '' });
    expect(ok.statusCode, ok.body).toBe(200);
    const recusado = await t.app.inject({ method: 'POST', url, headers, payload: 'a=1' });
    expect(recusado.statusCode).toBe(415);
  });
});
