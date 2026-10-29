import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { fazerLicao } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste({ inicio: '2026-11-04T10:00:00-03:00' });
}, 60_000);
afterAll(() => t.fechar());

describe('liga (PRD 6.7)', () => {
  it('entra no primeiro XP da semana; ranking com nome abreviado ou apelido', async () => {
    const a = await t.alunoPago({ nome: 'Marina Souza Lima' });
    const b = await t.alunoPago({ nome: 'Carlos Pereira' });
    const vazia = (await t.chamar('liga', { cookie: a.cookie })).json();
    expect(vazia).toMatchObject({ participando: false, divisao: 'bronze', nomeDivisao: 'Bronze', ranking: [] });
    expect(vazia.regra).toBe('Os 3 primeiros sobem de liga · termina em 5 dias');
    await t.chamar('meAtualizar', { cookie: b.cookie, corpo: { apelidoLiga: 'Carlão' } });
    await fazerLicao(t, a.cookie);
    await fazerLicao(t, b.cookie, 1);
    const l = (await t.chamar('liga', { cookie: a.cookie })).json();
    expect(l.participando).toBe(true);
    expect(l.ranking.map((r: { nome: string; xpSemana: number }) => [r.nome, r.xpSemana])).toEqual([
      ['Marina L.', 65],
      ['Carlão', 45],
    ]);
    expect(l.ranking[0].eu).toBe(true);
    expect(l.minhaPosicao).toBe(1);
    expect(l.grupo).toMatchObject({ tamanho: 2, promocaoAte: 2, rebaixamentoDesde: null });
    expect(JSON.stringify(l.ranking)).not.toContain(a.id);
  });

  it('modal do resultado semanal aparece uma vez', async () => {
    const a = await t.alunoPago();
    await fazerLicao(t, a.cookie);
    await t.db.update(schema.ligasMembros).set({ resultado: 'subiu', posicaoFinal: 1 }).where(eq(schema.ligasMembros.usuarioId, a.id));
    expect((await t.chamar('meObter', { cookie: a.cookie })).json().resultadoLigaPendente).toBe(true);
    const l = (await t.chamar('liga', { cookie: a.cookie })).json();
    expect(l.resultadoAnterior).toMatchObject({ resultado: 'subiu', mensagem: 'Você subiu para a Liga Prata!', gemasGanhas: 50 });
    await t.chamar('ligaResultadoVisto', { cookie: a.cookie, corpo: { semana: l.resultadoAnterior.semana } });
    expect((await t.chamar('liga', { cookie: a.cookie })).json().resultadoAnterior).toBeNull();
  });
});

describe('perfil e push', () => {
  it('estatísticas, domínio e conquistas', async () => {
    const a = await t.alunoPago();
    await fazerLicao(t, a.cookie, 1);
    const p = (await t.chamar('perfilEstatisticas', { cookie: a.cookie })).json();
    expect(p).toMatchObject({ xpTotal: 45, questoesFeitas: 5, precisao: 80, seloAcesso: 'Acesso completo · pago via Pix' });
    expect(p.dominio).toHaveLength(4);
    expect(p.dominio.find((d: { slug: string }) => d.slug === 'portugues')).toMatchObject({ valor: 0.8, texto: '80%' });
    expect(p.dominio.find((d: { slug: string }) => d.slug === 'matematica').texto).toBe('—');
    expect(p.conquistas).toHaveLength(9);
    expect(p.conquistas.find((c: { codigo: string }) => c.codigo === 'primeira_licao').obtida).toBe(true);
    expect(p.edital.texto).toBe('em elaboração');
    expect(p.cargo).toMatchObject({ nome: 'Agente Administrativo', area: 'administrativo' });
    const me = (await t.chamar('meObter', { cookie: a.cookie })).json();
    expect(me).toMatchObject({ nomeExibicao: expect.any(String), metaHoje: { feitas: 1, meta: 1, cumprida: true }, ofensivaHojeContou: true });
    expect(me.concurso.sigla).toBe('PAL · PR');
  });

  it('chave VAPID, inscrição e remoção', async () => {
    const a = await t.alunoPago();
    expect((await t.chamar('pushChave', { cookie: a.cookie })).json().chavePublica).toBe(t.config.vapid.publica);
    const ins = await t.chamar('pushInscrever', { cookie: a.cookie, corpo: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'k', auth: 'a' } } });
    expect(ins.statusCode).toBe(200);
    await t.chamar('pushInscrever', { cookie: a.cookie, corpo: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'k2', auth: 'a2' } } });
    const lista = await t.db.select().from(schema.pushInscricoes).where(eq(schema.pushInscricoes.usuarioId, a.id));
    expect(lista).toHaveLength(1);
    expect(lista[0]!.p256dh).toBe('k2');
    await t.chamar('pushRemover', { cookie: a.cookie, corpo: {} });
    expect(await t.db.select().from(schema.pushInscricoes).where(eq(schema.pushInscricoes.usuarioId, a.id))).toHaveLength(0);
  });

  it('inscrição de push só aceita serviço de push de navegador (auditoria PIE R1-06)', async () => {
    const a = await t.alunoPago();
    for (const endpoint of ['https://127.0.0.1:5432/x', 'http://fcm.googleapis.com/x', 'https://postgres/x', 'https://fcm.googleapis.com.mal.com/x']) {
      const r = await t.chamar('pushInscrever', { cookie: a.cookie, corpo: { endpoint, keys: { p256dh: 'k', auth: 'a' } } });
      expect(r.statusCode, endpoint).toBe(400);
    }
    for (const endpoint of ['https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x', 'https://wns2-par02p.notify.windows.com/w/?token=x']) {
      const r = await t.chamar('pushInscrever', { cookie: a.cookie, corpo: { endpoint, keys: { p256dh: 'k', auth: 'a' } } });
      expect(r.statusCode, endpoint).toBe(200);
    }
  });

  it('concurso com áreas para o onboarding', async () => {
    const a = await t.alunoPago();
    const c = (await t.chamar('concurso', { cookie: a.cookie })).json();
    expect(c).toMatchObject({ sigla: 'PAL · PR', modoEdital: false, status: 'aguardando_edital' });
    expect(c.areas.map((x: { area: string }) => x.area)).toContain('operacional');
    expect(c.areas.find((x: { area: string }) => x.area === 'operacional').exemplos).toContain('Motorista');
  });
});
