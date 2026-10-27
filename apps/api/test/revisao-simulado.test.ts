import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { errada, fazerLicao, gabaritos, responderTudo, usuario } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste({ inicio: '2026-11-02T20:00:00-03:00' });
}, 60_000);
afterAll(() => t.fechar());

describe('revisão espaçada (PRD 6.5)', () => {
  it('a questão errada aparece no dia seguinte e some depois de 4 acertos espaçados', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-02T20:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 1);
    const errou = l.fim.erros[0] as string;
    const pend = async () => (await t.chamar('revisao', { cookie: a.cookie })).json().pendentes as number;
    expect(await pend()).toBe(0);
    expect((await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: {} })).statusCode).toBe(409);

    const datas = ['2026-11-03T08:00:00-03:00', '2026-11-06T08:00:00-03:00', '2026-11-13T08:00:00-03:00', '2026-11-28T08:00:00-03:00'];
    const antes = ['2026-11-05T23:00:00-03:00', '2026-11-12T23:00:00-03:00', '2026-11-27T23:00:00-03:00'];
    for (const [i, quando] of datas.entries()) {
      t.relogio.definir(quando);
      expect(await pend(), `pendente em ${quando}`).toBe(1);
      const r = (await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: {} })).json();
      expect(r.questoes.map((q: { id: string }) => q.id)).toEqual([errou]);
      expect(r.tipo).toBe('revisao');
      await responderTudo(t, a.cookie, r.sessaoId, [errou]);
      if (antes[i]) {
        t.relogio.definir(antes[i]!);
        expect(await pend(), `ainda não vence em ${antes[i]}`).toBe(0);
      }
    }
    t.relogio.definir('2027-01-10T08:00:00-03:00');
    expect(await pend()).toBe(0);
    const [rev] = await t.db.select().from(schema.revisoes).where(eq(schema.revisoes.questaoId, errou));
    expect(rev!.status).toBe('dominada');
  });

  it('errar na revisão volta à etapa 0; revisão filtra por disciplina e mostra o domínio', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-01T10:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 2);
    t.relogio.definir('2026-12-02T10:00:00-03:00');
    const tela = (await t.chamar('revisao', { cookie: a.cookie })).json();
    expect(tela.pendentes).toBe(2);
    expect(tela.regra).toBe('Cada erro volta em 1, 3, 7 e 15 dias. Acertou 4 vezes seguidas, a questão sai da fila.');
    const port = tela.porDisciplina.find((d: { slug: string }) => d.slug === 'portugues');
    expect(port.pendentes).toBe(2);
    expect(port.dominio).toBeCloseTo(3 / 5);
    expect((await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { disciplina: 'matematica' } })).statusCode).toBe(409);
    const r = (await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { disciplina: 'portugues' } })).json();
    expect(r.questoes).toHaveLength(2);
    await responderTudo(t, a.cookie, r.sessaoId, l.fim.erros, 2);
    const revs = await t.db.select().from(schema.revisoes).where(inArray(schema.revisoes.questaoId, l.fim.erros));
    for (const x of revs.filter((v) => v.usuarioId === a.id)) {
      expect(x.etapa).toBe(0);
      expect(x.venceEm.toISOString()).toBe(new Date('2026-12-03T00:00:00-03:00').toISOString());
    }
  });
});

describe('simulado (PRD 5.14)', () => {
  async function cargoAdm() {
    const [c] = await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, 'Agente Administrativo'));
    return c!;
  }

  it('tem exatamente 5/5/5/25 do cargo, relógio de 4 h no servidor e sem gabarito', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-10T08:00:00-03:00');
    const r = await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: (await cargoAdm()).id } });
    expect(r.statusCode, r.body).toBe(200);
    const s = r.json();
    expect(s.questoes).toHaveLength(40);
    const blocos = s.questoes.map((q: { bloco: string }) => q.bloco);
    expect(blocos.filter((b: string) => b === 'portugues')).toHaveLength(5);
    expect(blocos.filter((b: string) => b === 'matematica')).toHaveLength(5);
    expect(blocos.filter((b: string) => b === 'gerais')).toHaveLength(5);
    expect(blocos.filter((b: string) => b === 'especificos')).toHaveLength(25);
    expect(s.msRestantes).toBe(4 * 3600_000);
    expect(r.body).not.toContain('"gabarito"');
    const qs = await t.db.select().from(schema.questoes).where(inArray(schema.questoes.id, s.questoes.map((q: { questao: { id: string } }) => q.questao.id)));
    for (const q of qs.filter((x) => s.questoes.find((y: { bloco: string; questao: { id: string } }) => y.questao.id === x.id).bloco === 'especificos')) {
      expect(q.areas).toContain('administrativo');
    }
    // sair e voltar mantém o mesmo simulado e o tempo do servidor
    t.relogio.avancar(3600_000);
    const de_novo = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: (await cargoAdm()).id } })).json();
    expect(de_novo.id).toBe(s.id);
    expect(de_novo.msRestantes).toBe(3 * 3600_000);
  });

  it('nota com pesos 2,0 e 2,8; erros vão para a revisão; XP +1 por acerto e +20 se aprovado', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-11T08:00:00-03:00');
    const s = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: (await cargoAdm()).id } })).json();
    const ids: string[] = s.questoes.map((q: { questao: { id: string } }) => q.questao.id);
    const gab = await gabaritos(t, ids);
    // acerta todo o português (5 × 2,0) e 20 específicas (20 × 2,8); erra 1 de matemática
    const port = s.questoes.filter((q: { bloco: string }) => q.bloco === 'portugues');
    const esp = s.questoes.filter((q: { bloco: string }) => q.bloco === 'especificos').slice(0, 20);
    const mat = s.questoes.find((q: { bloco: string }) => q.bloco === 'matematica');
    for (const q of [...port, ...esp]) {
      const r = await t.chamar('simuladoResposta', { cookie: a.cookie, params: { id: s.id }, corpo: { questaoId: q.questao.id, letra: gab.get(q.questao.id) } });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.body).not.toContain('acert');
    }
    const ult = await t.chamar('simuladoResposta', { cookie: a.cookie, params: { id: s.id }, corpo: { questaoId: mat.questao.id, letra: errada(gab.get(mat.questao.id)!), revisarDepois: true } });
    expect(ult.json().emBranco).toBe(14);
    const res = (await t.chamar('simuladoEntregar', { cookie: a.cookie, params: { id: s.id } })).json();
    expect(res.estado).toBe('entregue');
    expect(res.pontos).toBe(5 * 2 + 20 * 2.8);
    expect(res.pontosMaximos).toBe(100);
    expect(res.aprovado).toBe(true);
    expect(res.selo).toBe('APROVADO');
    expect(res.porBloco.find((b: { bloco: string }) => b.bloco === 'portugues')).toMatchObject({ acertos: 5, pontos: 10 });
    expect(res.porBloco.find((b: { bloco: string }) => b.bloco === 'especificos')).toMatchObject({ acertos: 20, pontos: 56 });
    expect(res.xpGanho).toBe(25 + 20);
    expect(res.questoes.find((q: { questao: { id: string } }) => q.questao.id === mat.questao.id)).toMatchObject({ acertou: false, gabarito: gab.get(mat.questao.id) });
    const [rev] = await t.db.select().from(schema.revisoes).where(eq(schema.revisoes.questaoId, mat.questao.id));
    expect(rev).toBeTruthy();
    const hist = (await t.chamar('simuladosListar', { cookie: a.cookie })).json();
    expect(hist.itens[0]).toMatchObject({ id: s.id, pontos: 66, aprovado: true, acertos: 25 });
    expect((await t.chamar('simuladoResposta', { cookie: a.cookie, params: { id: s.id }, corpo: { questaoId: mat.questao.id, letra: 'A' } })).statusCode).toBe(409);
    const u = await usuario(t, a.id);
    expect(u.ofensiva).toBe(1);
  });

  it('entrega automática quando as 4 h acabam (verificada na leitura)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-12T08:00:00-03:00');
    const s = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: (await cargoAdm()).id } })).json();
    t.relogio.avancar(4 * 3600_000 + 1000);
    const put = await t.chamar('simuladoResposta', { cookie: a.cookie, params: { id: s.id }, corpo: { questaoId: s.questoes[0].questao.id, letra: 'A' } });
    expect(put.statusCode).toBe(409);
    expect(put.json().codigo).toBe('simulado_encerrado');
    const d = (await t.chamar('simuladoObter', { cookie: a.cookie, params: { id: s.id } })).json();
    expect(d).toMatchObject({ estado: 'entregue', entregaAutomatica: true, pontos: 0, selo: 'ABAIXO DO MÍNIMO', tempoGastoMs: 4 * 3600_000 });
  });

  it('a varredura entrega os simulados vencidos de todos', async () => {
    const { entregarExpirados } = await import('../src/app.js');
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-13T08:00:00-03:00');
    const s = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: (await cargoAdm()).id } })).json();
    t.relogio.avancar(5 * 3600_000);
    expect(await entregarExpirados(t.app.deps, null, t.relogio.agora())).toBeGreaterThanOrEqual(1);
    const [db] = await t.db.select().from(schema.simulados).where(eq(schema.simulados.id, s.id));
    expect(db!.entregaAutomatica).toBe(true);
  });

  it('dois toques simultâneos em COMEÇAR abrem um simulado só (auditoria PIE R3-06)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-14T08:00:00-03:00');
    const cargoId = (await cargoAdm()).id;
    const [r1, r2] = await Promise.all([
      t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId } }),
      t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId } }),
    ]);
    expect(r1.json().id).toBe(r2.json().id);
    const abertos = await t.db.select().from(schema.simulados).where(eq(schema.simulados.usuarioId, a.id));
    expect(abertos).toHaveLength(1);
  });

  it('sem questões suficientes: 409 com explicação', async () => {
    const a = await t.alunoPago({}, 'Motorista');
    const [c] = await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, 'Motorista'));
    const r = await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: c!.id } });
    expect(r.statusCode).toBe(409);
    expect(r.json().erro).toMatch(/Conhecimentos Específicos: 0 de 25/);
  });
});
