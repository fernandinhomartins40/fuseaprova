import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { errada, fazerLicao, gabaritos, licaoAtual, responderTudo, usuario } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

describe('lição de trilha (PRD 5.8–5.12, 6)', () => {
  it('lição tem 5 questões, nunca envia gabarito antes e traz a dica da lição', async () => {
    const a = await t.alunoPago();
    const ini = await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: await licaoAtual(t, a.cookie) } });
    const s = ini.json();
    expect(s.questoes).toHaveLength(5);
    expect(s.gastaVidas).toBe(true);
    expect(s.dica).toMatchObject({ titulo: expect.any(String), texto: expect.any(String) });
    const bruto = ini.body;
    for (const campo of ['gabarito', 'explicacao', 'dicaBolso', '"dica":"']) expect(bruto).not.toContain(campo === '"dica":"' ? '"dicas"' : `"${campo}"`);
    for (const q of s.questoes) {
      expect(q).not.toHaveProperty('gabarito');
      expect(q.alternativas).toHaveLength(5);
      expect(q.chipOrigem).toBe('Questão Fuse Aprova');
    }
  });

  it('XP: 4 de 5 = 45; 5 de 5 = 65; feedback traz a explicação', async () => {
    const a = await t.alunoPago();
    const l1 = await fazerLicao(t, a.cookie, 1);
    expect(l1.fim.xpGanho).toBe(45);
    expect(l1.fim.acertos).toBe(4);
    expect(l1.fim.precisao).toBe(80);
    expect(l1.fim.erros).toHaveLength(1);
    expect(l1.respostas[0].acertou).toBe(false);
    expect(l1.respostas[0].titulo).toMatch(/^Resposta correta: [A-E]$/);
    expect(l1.respostas[0].explicacao.length).toBeGreaterThan(10);
    expect(l1.respostas[0].voltaNaRevisao).toBe(true);
    expect(l1.respostas[1].acertou).toBe(true);
    expect(l1.respostas[1].xpGanho).toBe(10);
    expect(l1.respostas[3].combo).toBe(3);
    expect(l1.respostas[3].comboVisivel).toBe(true);
    const l2 = await fazerLicao(t, a.cookie, 0);
    expect(l2.fim.xpGanho).toBe(65);
    expect(l2.fim.itensXp).toEqual(
      expect.arrayContaining([
        { tipo: 'acerto', valor: 50 },
        { tipo: 'licao_concluida', valor: 5 },
        { tipo: 'licao_perfeita', valor: 10 },
      ]),
    );
    const u = await usuario(t, a.id);
    expect(u.xpTotal).toBe(110);
    expect(u.gemas).toBe(10);
    expect(l1.fim.conquistasNovas.map((c: { codigo: string }) => c.codigo)).toContain('primeira_licao');
    expect(l2.fim.liga).toEqual({ entrou: true, xpSemana: 110 });
  });

  it('errar tira 1 vida, mas com 0 vidas a lição continua: vidas nunca travam o treino', async () => {
    const a = await t.alunoPago();
    const { respostas } = await fazerLicao(t, a.cookie, 5);
    expect(respostas.map((r) => r.vidas)).toEqual([4, 3, 2, 1, 0]);
    expect(respostas[4]).not.toHaveProperty('semVidas');
    const r = await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: await licaoAtual(t, a.cookie) } });
    expect(r.statusCode).toBe(200);
    const s = r.json();
    const gab = await gabaritos(t, [s.questoes[0].id]);
    const erro = await t.chamar('sessaoResponder', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: s.questoes[0].id, resposta: errada(gab.get(s.questoes[0].id)!), tempoMs: 1 } });
    expect(erro.statusCode).toBe(200);
    expect(erro.json().vidas).toBe(0);
    // revisão continua liberada e cada acerto devolve 1 vida
    t.relogio.avancar(24 * 3600_000);
    const me = (await t.chamar('meObter', { cookie: a.cookie })).json();
    expect(me.vidas).toBe(5); // meia-noite: vidas voltam para 5
  });

  it('recarga: +1 vida a cada 4 h contadas da perda', async () => {
    const a = await t.alunoPago();
    const id = await licaoAtual(t, a.cookie);
    const s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
    const gab = await gabaritos(t, [s.questoes[0].id]);
    const r = (await t.chamar('sessaoResponder', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: s.questoes[0].id, resposta: errada(gab.get(s.questoes[0].id)!), tempoMs: 1 } })).json();
    expect(r.vidas).toBe(4);
    expect(new Date(r.proximaVidaEm).getTime() - t.relogio.agora().getTime()).toBe(4 * 3600_000);
  });

  it('lição bloqueada não abre; concluída pode ser refeita', async () => {
    const a = await t.alunoPago();
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const licoes = tr.unidades.flatMap((u: { secoes: { licoes: { id: string; estado: string }[] }[] }) => u.secoes.flatMap((s) => s.licoes));
    const bloqueada = licoes.find((l: { estado: string }) => l.estado === 'bloqueada');
    const r = await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: bloqueada.id } });
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('licao_bloqueada');
    const primeira = tr.atual.licaoId;
    await fazerLicao(t, a.cookie);
    expect((await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: primeira } })).statusCode).toBe(200);
    const tr2 = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const no = tr2.unidades.flatMap((u: { secoes: { licoes: unknown[] }[] }) => u.secoes.flatMap((s) => s.licoes)).find((l: { id: string }) => l.id === primeira);
    expect(no).toMatchObject({ estado: 'concluida', vezes: 1, podeAbrir: true });
    expect(no.anel).toBeCloseTo(1 / 3);
  });

  it('baú abre depois das 3 lições e dá +20 gemas (uma vez)', async () => {
    const a = await t.alunoPago();
    for (let i = 0; i < 3; i++) await fazerLicao(t, a.cookie);
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const atual = tr.unidades.flatMap((u: { secoes: { licoes: { id: string; tipo: string; estado: string }[] }[] }) => u.secoes.flatMap((s) => s.licoes)).find((l: { estado: string }) => l.estado === 'atual');
    expect(atual.tipo).toBe('bau');
    expect(tr.licoesAteBau).toBe(0);
    const gemas = (await usuario(t, a.id)).gemas;
    const r = await t.chamar('licaoAbrirBau', { cookie: a.cookie, params: { id: atual.id } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toEqual({ gemasGanhas: 20, gemas: gemas + 20 });
    expect((await t.chamar('licaoAbrirBau', { cookie: a.cookie, params: { id: atual.id } })).statusCode).toBe(409);
  });

  it('dica custa 5 gemas, não cobra duas vezes e exige saldo', async () => {
    const a = await t.alunoPago();
    const id = await licaoAtual(t, a.cookie);
    let s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
    const sem = await t.chamar('sessaoDica', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: s.questoes[0].id } });
    expect(sem.statusCode).toBe(409);
    expect(sem.json().codigo).toBe('gemas_insuficientes');
    await t.db.update(schema.usuarios).set({ gemas: 12 }).where(eq(schema.usuarios.id, a.id));
    s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
    const d1 = await t.chamar('sessaoDica', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: s.questoes[0].id } });
    expect(d1.statusCode, d1.body).toBe(200);
    expect(d1.json().gemas).toBe(7);
    expect(d1.json().dica.length).toBeGreaterThan(5);
    const d2 = await t.chamar('sessaoDica', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: s.questoes[0].id } });
    expect(d2.json().gemas).toBe(7);
    await responderTudo(t, a.cookie, s.sessaoId, s.questoes.map((q: { id: string }) => q.id));
    const [tent] = await t.db.select().from(schema.tentativas).where(and(eq(schema.tentativas.sessaoEstudoId, s.sessaoId), eq(schema.tentativas.questaoId, s.questoes[0].id)));
    expect(tent!.usouDica).toBe(true);
  });

  it('responder de novo com o mesmo id_cliente não duplica; concluir exige todas', async () => {
    const a = await t.alunoPago();
    const s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: await licaoAtual(t, a.cookie) } })).json();
    expect((await t.chamar('sessaoConcluir', { cookie: a.cookie, params: { id: s.sessaoId } })).statusCode).toBe(409);
    const q = s.questoes[0].id;
    const g = (await gabaritos(t, [q])).get(q)!;
    const idCliente = '11111111-2222-4333-8444-555555555555';
    const r1 = await t.chamar('sessaoResponder', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: q, resposta: g, tempoMs: 1, idCliente } });
    const r2 = await t.chamar('sessaoResponder', { cookie: a.cookie, params: { id: s.sessaoId }, corpo: { questaoId: q, resposta: g, tempoMs: 1, idCliente } });
    expect(r2.json().xpGanho).toBe(0);
    expect(r1.json().xpGanho).toBe(10);
    expect((await usuario(t, a.id)).xpTotal).toBe(10);
  });

  it('REVISAR ERROS abre uma mini-lição só com os erros, sem gastar vidas', async () => {
    const a = await t.alunoPago();
    const l = await fazerLicao(t, a.cookie, 2);
    const r = await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { sessaoOrigemId: l.inicio.sessaoId } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().questoes.map((q: { id: string }) => q.id).sort()).toEqual([...l.fim.erros].sort());
    expect(r.json().gastaVidas).toBe(false);
    const resp = await responderTudo(t, a.cookie, r.json().sessaoId, l.fim.erros, l.fim.erros.length);
    expect(resp.at(-1).vidas).toBe(3);
  });

  it('desafio da unidade: 10 questões, sem dica e sem vidas; 70% dá a coroa', async () => {
    const a = await t.alunoPago();
    const [desafio] = await t.db.select().from(schema.licoes).where(eq(schema.licoes.tipo, 'desafio'));
    // marca as lições anteriores do caminho como concluídas
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const ids: string[] = [];
    for (const u of tr.unidades) for (const s of u.secoes) for (const l of s.licoes) ids.push(l.id);
    const alvo = ids.indexOf(tr.unidades[0].secoes.at(-1).licoes.at(-1).id);
    for (const id of ids.slice(0, alvo)) {
      await t.db.insert(schema.progressoLicoes).values({ usuarioId: a.id, licaoId: id, vezes: 1, concluidaEm: new Date() });
    }
    const idDesafio = ids[alvo]!;
    const [l] = await t.db.select().from(schema.licoes).where(eq(schema.licoes.id, idDesafio));
    expect(l!.tipo).toBe(desafio!.tipo);
    const r = await fazerLicao(t, a.cookie, 3, idDesafio);
    expect(r.inicio.questoes).toHaveLength(10);
    expect(r.inicio.gastaVidas).toBe(false);
    expect(r.inicio.dica).toBeNull();
    expect(r.respostas.at(-1).vidas).toBe(5);
    expect(r.fim.coroa).toBe(true);
    expect(r.fim.xpGanho).toBe(70 + 5 + 30);
    const tr2 = (await t.chamar('trilha', { cookie: a.cookie })).json();
    expect(tr2.unidades[0].coroada).toBe(true);
    expect(r.fim.conquistasNovas.map((c: { codigo: string }) => c.codigo)).toContain('portugues_coroado');
  });
});

describe('ofensiva (PRD 6.4)', () => {
  it('sobe com a primeira lição do dia e zera depois de um dia sem estudo e sem protetor', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-02T10:00:00-03:00');
    const d1 = await fazerLicao(t, a.cookie);
    expect(d1.fim.ofensiva).toMatchObject({ valor: 1, mostrarTela: true });
    expect(d1.fim.ofensiva.semana).toHaveLength(7);
    expect(d1.fim.ofensiva.semana[0]).toMatchObject({ dia: '2026-11-02', cumprido: true, hoje: true });
    const d1b = await fazerLicao(t, a.cookie);
    expect(d1b.fim.ofensiva).toMatchObject({ valor: 1, mostrarTela: false });
    t.relogio.definir('2026-11-03T21:00:00-03:00');
    const d2 = await fazerLicao(t, a.cookie);
    expect(d2.fim.ofensiva).toMatchObject({ valor: 2, mostrarTela: true });
    t.relogio.definir('2026-11-05T09:00:00-03:00');
    expect((await t.chamar('meObter', { cookie: a.cookie })).json().ofensiva).toBe(0);
    const d4 = await fazerLicao(t, a.cookie);
    expect(d4.fim.ofensiva).toMatchObject({ valor: 1, zerou: true, mostrarTela: true });
  });

  it('protetor salva a ofensiva', async () => {
    const a = await t.alunoPago();
    await t.db.update(schema.usuarios).set({ gemas: 450 }).where(eq(schema.usuarios.id, a.id));
    expect((await t.chamar('meComprarProtetor', { cookie: a.cookie })).json()).toEqual({ gemas: 250, protetores: 1 });
    t.relogio.definir('2026-11-10T10:00:00-03:00');
    await fazerLicao(t, a.cookie);
    t.relogio.definir('2026-11-12T10:00:00-03:00');
    const r = await fazerLicao(t, a.cookie);
    expect(r.fim.ofensiva).toMatchObject({ valor: 2, protetorUsado: true, zerou: false });
    expect((await usuario(t, a.id)).protetores).toBe(0);
  });

  it('10 questões de revisão contam o dia', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-18T10:00:00-03:00');
    await fazerLicao(t, a.cookie, 5);
    t.relogio.definir('2026-11-20T10:00:00-03:00');
    await fazerLicao(t, a.cookie, 5);
    t.relogio.definir('2026-11-22T10:00:00-03:00');
    await fazerLicao(t, a.cookie, 5);
    t.relogio.definir('2026-11-23T10:00:00-03:00');
    // mais de 10 pendentes: a revisão traz 10
    const r = (await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: {} })).json();
    expect(r.questoes).toHaveLength(10);
    await responderTudo(t, a.cookie, r.sessaoId, r.questoes.map((q: { id: string }) => q.id));
    const fim = (await t.chamar('sessaoConcluir', { cookie: a.cookie, params: { id: r.sessaoId } })).json();
    expect(fim.xpGanho).toBe(100);
    expect(fim.ofensiva.valor).toBe(2);
    expect(fim.ofensiva.mostrarTela).toBe(true);
  });
});
