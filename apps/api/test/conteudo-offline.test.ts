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
});
