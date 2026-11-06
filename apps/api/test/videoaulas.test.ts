import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { carregarQuestoes } from '../src/servicos/questoes.js';

/** D41: videoaulas dos temas, servidas com a guarda de acesso e com Range. */
let t: AmbienteTeste;
const arquivos = mkdtempSync(join(tmpdir(), 'fuse-videoaulas-'));
const MP4 = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

beforeAll(async () => {
  mkdirSync(join(arquivos, 'videoaulas'), { recursive: true });
  writeFileSync(join(arquivos, 'videoaulas', 'proparoxitonas.mp4'), MP4);
  t = await criarAmbienteTeste({ config: { arquivosDir: arquivos } });
}, 60_000);
afterAll(() => t.fechar());

const pedir = (slug: string, cookie?: string, range?: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/videoaulas/${slug}`,
    headers: { ...(cookie ? { cookie } : {}), ...(range ? { range } : {}) },
  });

describe('videoaulas (D41)', () => {
  it('exige sessão e pagamento', async () => {
    expect((await pedir('proparoxitonas')).statusCode).toBe(401);
    const semPagar = await t.cadastrar();
    expect((await pedir('proparoxitonas', semPagar.cookie)).statusCode).toBe(402);
  });

  it('entrega o arquivo inteiro e por faixas', async () => {
    const a = await t.alunoPago();
    const todo = await pedir('proparoxitonas', a.cookie);
    expect(todo.statusCode).toBe(200);
    expect(todo.headers['content-type']).toBe('video/mp4');
    expect(todo.headers['accept-ranges']).toBe('bytes');
    expect(todo.rawPayload.equals(MP4)).toBe(true);

    const meio = await pedir('proparoxitonas', a.cookie, 'bytes=100-199');
    expect(meio.statusCode).toBe(206);
    expect(meio.headers['content-range']).toBe('bytes 100-199/1000');
    expect(meio.rawPayload.equals(MP4.subarray(100, 200))).toBe(true);

    const aberto = await pedir('proparoxitonas', a.cookie, 'bytes=990-');
    expect(aberto.headers['content-range']).toBe('bytes 990-999/1000');
    const final = await pedir('proparoxitonas', a.cookie, 'bytes=-5');
    expect(final.rawPayload.equals(MP4.subarray(995))).toBe(true);
    expect((await pedir('proparoxitonas', a.cookie, 'bytes=5000-')).statusCode).toBe(416);
  });

  it('com X-Accel, confere o acesso e deixa o nginx entregar', async () => {
    const x = await criarAmbienteTeste({ config: { arquivosDir: arquivos, videoaulasXAccel: true } });
    try {
      const url = '/api/videoaulas/proparoxitonas';
      const anonimo = await x.app.inject({ method: 'GET', url });
      expect(anonimo.statusCode).toBe(401);
      expect(anonimo.headers['x-accel-redirect']).toBeUndefined();
      const semPagar = await x.cadastrar();
      const bloqueado = await x.app.inject({ method: 'GET', url, headers: { cookie: semPagar.cookie } });
      expect(bloqueado.statusCode).toBe(402);
      expect(bloqueado.headers['x-accel-redirect']).toBeUndefined();

      const a = await x.alunoPago();
      const ok = await x.app.inject({ method: 'GET', url, headers: { cookie: a.cookie, range: 'bytes=0-99' } });
      expect(ok.statusCode).toBe(200);
      expect(ok.headers['x-accel-redirect']).toBe('/_videoaulas/proparoxitonas.mp4');
      expect(ok.headers['content-type']).toBe('video/mp4');
      expect(ok.rawPayload.length).toBe(0);

      const sem = await x.app.inject({ method: 'GET', url: '/api/videoaulas/nao-existe', headers: { cookie: a.cookie } });
      expect(sem.statusCode).toBe(404);
      expect(sem.headers['x-accel-redirect']).toBeUndefined();
    } finally {
      await x.fechar();
    }
  }, 60_000);

  it('slug inválido ou arquivo que não existe dão 404', async () => {
    const a = await t.alunoPago();
    expect((await pedir('..%2Fsegredo', a.cookie)).statusCode).toBe(404);
    expect((await pedir('Maiuscula', a.cookie)).statusCode).toBe(404);
    expect((await pedir('nao-existe', a.cookie)).statusCode).toBe(404);
  });

  it('a questão leva o slug da videoaula', async () => {
    const [q] = await t.db.select({ id: schema.questoes.id }).from(schema.questoes).limit(1);
    await t.db
      .update(schema.questoes)
      .set({ videoaula: 'proparoxitonas' })
      .where(eq(schema.questoes.id, q!.id));
    expect((await carregarQuestoes(t.db, [q!.id])).get(q!.id)!.aluno.videoaula).toBe(
      'proparoxitonas',
    );
  });
});
