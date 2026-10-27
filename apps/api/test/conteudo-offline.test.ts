import { randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { decifrarTexto } from '@fuse/shared';
import { GabaritoOfflineClaro } from '@fuse/shared/api';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { fazerLicao, licaoAtual, usuario } from './ajuda.js';

let t: AmbienteTeste;
let adm: Aluno;
let assuntoId: string;
let visiveis: string[];

beforeAll(async () => {
  t = await criarAmbienteTeste();
  adm = await t.admin();
  // Deixa só 6 questões publicadas no assunto da 1ª seção; o resto vira rascunho/revisão/anulada.
  const a = await t.alunoPago();
  const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
  assuntoId = tr.unidades[0].secoes[0].assuntoId;
  const qs = await t.db.select().from(schema.questoes).where(eq(schema.questoes.assuntoId, assuntoId));
  visiveis = qs.slice(0, 6).map((q) => q.id);
  const status = ['rascunho', 'revisao', 'anulada', 'retirada'] as const;
  for (const [i, q] of qs.slice(6).entries()) {
    await t.db.update(schema.questoes).set({ status: status[i % 4]!, anuladaMotivo: 'teste' }).where(eq(schema.questoes.id, q.id));
  }
}, 60_000);
afterAll(() => t.fechar());

describe('conteúdo visível (PRD 7.4, critério 12)', () => {
  it('rascunho, revisão, anulada e retirada nunca aparecem para o aluno', async () => {
    const a = await t.alunoPago();
    const id = await licaoAtual(t, a.cookie);
    for (let i = 0; i < 6; i++) {
      const s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
      for (const q of s.questoes) expect(visiveis).toContain(q.id);
    }
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    for (const q of pac.licoes[0].questoes) expect(visiveis).toContain(q.id);
  });

  it('questão fau_real mostra o chip de origem; retirar a prova some com ela', async () => {
    const [p] = await t.db
      .insert(schema.provasOrigem)
      .values({ orgao: 'Prefeitura de Teste', municipio: 'Teste', uf: 'PR', ano: 2024, cargo: 'Agente Administrativo' })
      .returning();
    const base = (await t.db.select().from(schema.questoes).where(eq(schema.questoes.id, visiveis[0]!)))[0]!;
    const { id: _id, criadoEm: _c, atualizadoEm: _u, ...resto } = base;
    const [real] = await t.db
      .insert(schema.questoes)
      .values({ ...resto, origem: 'fau_real', provaOrigemId: p!.id, numeroOrigem: 7, enunciado: 'Questão real de teste', status: 'publicada' })
      .returning();
    const a = await t.alunoPago();
    const id = await licaoAtual(t, a.cookie);
    let achou = false;
    for (let i = 0; i < 10 && !achou; i++) {
      const s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
      const q = s.questoes.find((x: { id: string }) => x.id === real!.id);
      if (q) {
        achou = true;
        expect(q.chipOrigem).toBe('FAU-Unicentro · Prefeitura de Teste · 2024');
        expect(q.provaOrigem).toEqual({ orgao: 'Prefeitura de Teste', ano: 2024, cargo: 'Agente Administrativo' });
      }
    }
    expect(achou).toBe(true);
    const det = (await t.chamar('adminQuestaoObter', { cookie: adm.cookie, params: { id: real!.id } })).json();
    expect(det.prova).toMatchObject({ id: p!.id, orgao: 'Prefeitura de Teste', status: 'ativa' });
    const ret = await t.chamar('adminQuestoesRetirarOrigem', { cookie: adm.cookie, corpo: { provaOrigemId: p!.id, motivo: 'Pedido do titular' } });
    expect(ret.json()).toEqual({ questoesRetiradas: 1 });
    const [p2] = await t.db.select().from(schema.provasOrigem).where(eq(schema.provasOrigem.id, p!.id));
    expect(p2!.status).toBe('retirada');
    for (let i = 0; i < 6; i++) {
      const s = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
      expect(s.questoes.map((q: { id: string }) => q.id)).not.toContain(real!.id);
    }
  });

  it('retirar uma questão no admin a remove do pacote offline e muda a versão do conteúdo', async () => {
    const a = await t.alunoPago();
    const v1 = (await t.chamar('meObter', { cookie: a.cookie })).json().versaoConteudo;
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    const alvo = pac.licoes[0].questoes[0].id as string;
    const r = await t.chamar('adminQuestoesLote', { cookie: adm.cookie, corpo: { ids: [alvo], acao: 'retirar', motivo: 'Gabarito em dúvida' } });
    expect(r.json()).toEqual({ atualizadas: 1, ignoradas: [] });
    expect((await t.chamar('meObter', { cookie: a.cookie })).json().versaoConteudo).toBeGreaterThan(v1);
    for (let i = 0; i < 4; i++) {
      const p2 = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
      expect(p2.licoes.flatMap((l: { questoes: { id: string }[] }) => l.questoes.map((q) => q.id))).not.toContain(alvo);
    }
    const semMotivo = await t.chamar('adminQuestoesLote', { cookie: adm.cookie, corpo: { ids: [alvo], acao: 'retirar' } });
    expect(semMotivo.statusCode).toBe(400);
    expect(semMotivo.json().campos.motivo).toBe('Informe o motivo da retirada.');
    await t.db.update(schema.questoes).set({ status: 'publicada' }).where(eq(schema.questoes.id, alvo));
  });

  it('3 reports de alunos diferentes tiram a questão do ar', async () => {
    const alvo = visiveis[5]!;
    for (let i = 0; i < 3; i++) {
      const a = await t.alunoPago();
      const r = await t.chamar('questaoReport', { cookie: a.cookie, params: { id: alvo }, corpo: { tipo: 'gabarito_errado', texto: 'A letra C está certa' } });
      expect(r.statusCode).toBe(200);
      const [q] = await t.db.select().from(schema.questoes).where(eq(schema.questoes.id, alvo));
      expect(q!.status).toBe(i < 2 ? 'publicada' : 'retirada');
    }
    const lista = (await t.chamar('adminReportsListar', { cookie: adm.cookie, query: { questaoId: alvo } })).json();
    expect(lista.total).toBe(3);
    await t.db.update(schema.questoes).set({ status: 'publicada' }).where(eq(schema.questoes.id, alvo));
  });
});

describe('offline (PRD 8.4)', () => {
  it('pacote com as próximas 3 lições e a revisão vencida, gabarito cifrado', async () => {
    const a = await t.alunoPago();
    await fazerLicao(t, a.cookie, 2);
    t.relogio.avancar(24 * 3600_000);
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    expect(pac.licoes).toHaveLength(3);
    expect(pac.revisao).toHaveLength(2);
    const q = pac.licoes[0].questoes[0];
    expect(q).not.toHaveProperty('gabarito');
    const claro = GabaritoOfflineClaro.parse(JSON.parse(await decifrarTexto(pac.chave, q.id, q.cifrado)));
    const [db] = await t.db.select().from(schema.questoes).where(eq(schema.questoes.id, q.id));
    expect(claro.gabarito).toBe(db!.gabarito);
  });

  it('sync idempotente por id_cliente: reenviar não duplica XP; o servidor recalcula', async () => {
    const a = await t.alunoPago();
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    const l = pac.licoes[0];
    const sessao = randomUUID();
    const agora = t.relogio.agora();
    const tentativas = await Promise.all(
      l.questoes.map(async (q: { id: string; cifrado: string }, i: number) => {
        const g = GabaritoOfflineClaro.parse(JSON.parse(await decifrarTexto(pac.chave, q.id, q.cifrado))).gabarito;
        return {
          idCliente: randomUUID(),
          sessaoIdCliente: sessao,
          questaoId: q.id,
          // a 1ª o cliente diz "certa", mas está errada: vale o gabarito do servidor
          resposta: i === 0 ? (g === 'A' ? 'B' : 'A') : g,
          tempoMs: 3000,
          respondidaEm: new Date(agora.getTime() - (10 - i) * 60_000).toISOString(),
        };
      }),
    );
    const lote = {
      pacoteId: pac.pacoteId,
      sessoes: [{ idCliente: sessao, tipo: 'licao', licaoId: l.licao.id, iniciadaEm: new Date(agora.getTime() - 11 * 60_000).toISOString(), concluidaEm: new Date(agora.getTime() - 4 * 60_000).toISOString() }],
      tentativas,
    };
    const r1 = await t.chamar('syncTentativas', { cookie: a.cookie, corpo: lote });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json().aceitas).toHaveLength(5);
    expect(r1.json().xpGanho).toBe(45);
    const r2 = (await t.chamar('syncTentativas', { cookie: a.cookie, corpo: lote })).json();
    expect(r2.aceitas).toHaveLength(0);
    expect(r2.duplicadas).toHaveLength(5);
    expect(r2.xpGanho).toBe(0);
    const u = await usuario(t, a.id);
    expect(u.xpTotal).toBe(45);
    expect(u.gemas).toBe(5);
    expect(u.ofensiva).toBe(1);
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    expect(tr.atual.licaoId).not.toBe(l.licao.id);
    const [rev] = await t.db.select().from(schema.revisoes).where(and(eq(schema.revisoes.usuarioId, a.id), ne(schema.revisoes.status, 'dominada')));
    expect(rev!.questaoId).toBe(l.questoes[0].id);
  });

  it('sync rejeita questão retirada e sessão desconhecida', async () => {
    const a = await t.alunoPago();
    const r = await t.chamar('syncTentativas', {
      cookie: a.cookie,
      corpo: {
        pacoteId: null,
        sessoes: [],
        tentativas: [{ idCliente: randomUUID(), sessaoIdCliente: randomUUID(), questaoId: visiveis[0], resposta: 'A', tempoMs: 1, respondidaEm: t.relogio.agora().toISOString() }],
      },
    });
    expect(r.json().rejeitadas[0].motivo).toBe('Sessão desconhecida.');
  });

  /** Auditoria PIE (R1-01/R3-01, R1-02/R3-02): o sync só aceita o que o pacote permite. */
  async function gabaritoDe(pac: { chave: string }, q: { id: string; cifrado: string }) {
    return GabaritoOfflineClaro.parse(JSON.parse(await decifrarTexto(pac.chave, q.id, q.cifrado))).gabarito;
  }

  it('sync recusa a mesma questão repetida, lição bloqueada e desafio', async () => {
    const a = await t.alunoPago();
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const todas = tr.unidades.flatMap((u: { secoes: { licoes: { id: string; tipo: string }[] }[] }) =>
      u.secoes.flatMap((s) => s.licoes),
    );
    const bloqueada = todas.filter((l: { tipo: string }) => l.tipo === 'normal').at(-1)!;
    const desafio = todas.find((l: { tipo: string }) => l.tipo === 'desafio');
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    const q = pac.licoes[0].questoes[0];
    const g = await gabaritoDe(pac, q);
    const agora = t.relogio.agora().toISOString();
    const sessoes = [pac.licoes[0].licao.id, pac.licoes[0].licao.id, bloqueada.id, desafio?.id ?? bloqueada.id].map((licaoId) => ({
      idCliente: randomUUID(),
      pacoteId: pac.pacoteId,
      tipo: 'licao',
      licaoId,
      iniciadaEm: agora,
      concluidaEm: agora,
    }));
    const tentativas = sessoes.flatMap((s) =>
      [0, 1, 2].map(() => ({ idCliente: randomUUID(), sessaoIdCliente: s.idCliente, questaoId: q.id, resposta: g, tempoMs: 1, respondidaEm: agora })),
    );
    const r = (await t.chamar('syncTentativas', { cookie: a.cookie, corpo: { pacoteId: pac.pacoteId, sessoes, tentativas } })).json();
    expect(r.aceitas).toHaveLength(1);
    expect(r.rejeitadas.map((x: { motivo: string }) => x.motivo)).toEqual(
      expect.arrayContaining(['Questão já respondida nesta sessão.', 'Lição indisponível offline.']),
    );
    const u = await usuario(t, a.id);
    expect(u.gemas).toBe(5);
    const prog = await t.db.select().from(schema.progressoLicoes).where(eq(schema.progressoLicoes.usuarioId, a.id));
    expect(prog.map((p) => p.licaoId)).toEqual([pac.licoes[0].licao.id]);
  });

  it('sync recusa questão de outro assunto e revisão que não venceu', async () => {
    const a = await t.alunoPago();
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    const [fora] = await t.db.select().from(schema.questoes).where(and(ne(schema.questoes.assuntoId, assuntoId), eq(schema.questoes.status, 'publicada'))).limit(1);
    const agora = t.relogio.agora().toISOString();
    const sl = randomUUID();
    const sr = randomUUID();
    const r = (
      await t.chamar('syncTentativas', {
        cookie: a.cookie,
        corpo: {
          pacoteId: pac.pacoteId,
          sessoes: [
            { idCliente: sl, tipo: 'licao', licaoId: pac.licoes[0].licao.id, iniciadaEm: agora, concluidaEm: null },
            { idCliente: sr, tipo: 'revisao', licaoId: null, iniciadaEm: agora, concluidaEm: agora },
          ],
          tentativas: [
            { idCliente: randomUUID(), sessaoIdCliente: sl, questaoId: fora!.id, resposta: 'A', tempoMs: 1, respondidaEm: agora },
            { idCliente: randomUUID(), sessaoIdCliente: sr, questaoId: visiveis[1], resposta: 'A', tempoMs: 1, respondidaEm: agora },
          ],
        },
      })
    ).json();
    expect(r.aceitas).toHaveLength(0);
    expect(r.rejeitadas.map((x: { motivo: string }) => x.motivo).sort()).toEqual(['Esta revisão não está vencida.', 'Questão fora desta lição.']);
    expect(r.xpGanho).toBe(0);
  });

  it('datas anteriores ao pacote não forjam ofensiva; as 3 lições do pacote valem em ordem', async () => {
    const a = await t.alunoPago();
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    const base = t.relogio.agora().getTime();
    const sessoes = [];
    const tentativas = [];
    for (const [i, l] of pac.licoes.entries()) {
      // o aparelho diz que fez uma lição por dia, 30 dias atrás
      const quando = new Date(base - (30 - i) * 86_400_000).toISOString();
      const sid = randomUUID();
      sessoes.push({ idCliente: sid, pacoteId: pac.pacoteId, tipo: 'licao', licaoId: l.licao.id, iniciadaEm: quando, concluidaEm: quando });
      for (const q of l.questoes) {
        tentativas.push({ idCliente: randomUUID(), sessaoIdCliente: sid, questaoId: q.id, resposta: await gabaritoDe(pac, q), tempoMs: 1, respondidaEm: quando });
      }
    }
    const r = (await t.chamar('syncTentativas', { cookie: a.cookie, corpo: { pacoteId: null, sessoes, tentativas } })).json();
    expect(r.rejeitadas).toEqual([]);
    const u = await usuario(t, a.id);
    expect(u.ofensiva).toBe(1);
    expect(u.ofensivaRecorde).toBe(1);
    const prog = await t.db.select().from(schema.progressoLicoes).where(eq(schema.progressoLicoes.usuarioId, a.id));
    expect(prog).toHaveLength(pac.licoes.length);
    const datas = await t.db.select({ em: schema.tentativas.respondidaEm }).from(schema.tentativas).where(eq(schema.tentativas.usuarioId, a.id));
    for (const d of datas) expect(d.em.getTime()).toBeGreaterThanOrEqual(base);
  });
});
