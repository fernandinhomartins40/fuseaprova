import { and, eq, inArray } from 'drizzle-orm';
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
    const pend = async () =>
      (await t.chamar('revisao', { cookie: a.cookie })).json().pendentes as number;
    expect(await pend()).toBe(0);
    expect((await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: {} })).statusCode).toBe(
      409,
    );

    const datas = [
      '2026-11-03T08:00:00-03:00',
      '2026-11-06T08:00:00-03:00',
      '2026-11-13T08:00:00-03:00',
      '2026-11-28T08:00:00-03:00',
    ];
    const antes = [
      '2026-11-05T23:00:00-03:00',
      '2026-11-12T23:00:00-03:00',
      '2026-11-27T23:00:00-03:00',
    ];
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
    const [rev] = await t.db
      .select()
      .from(schema.revisoes)
      .where(eq(schema.revisoes.questaoId, errou));
    expect(rev!.status).toBe('dominada');
  });

  it('errar na revisão volta à etapa 0; revisão filtra por disciplina e mostra o domínio', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-01T10:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 2);
    t.relogio.definir('2026-12-02T10:00:00-03:00');
    const tela = (await t.chamar('revisao', { cookie: a.cookie })).json();
    expect(tela.pendentes).toBe(2);
    expect(tela.regra).toBe(
      'Cada erro volta em 1, 3, 7 e 15 dias. Acertou 4 vezes seguidas, a questão sai da fila.',
    );
    const port = tela.porDisciplina.find((d: { slug: string }) => d.slug === 'portugues');
    expect(port.pendentes).toBe(2);
    expect(port.dominio).toBeCloseTo(3 / 5);
    expect(
      (await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { disciplina: 'matematica' } }))
        .statusCode,
    ).toBe(409);
    const r = (
      await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { disciplina: 'portugues' } })
    ).json();
    expect(r.questoes).toHaveLength(2);
    await responderTudo(t, a.cookie, r.sessaoId, l.fim.erros, 2);
    const revs = await t.db
      .select()
      .from(schema.revisoes)
      .where(inArray(schema.revisoes.questaoId, l.fim.erros));
    for (const x of revs.filter((v) => v.usuarioId === a.id)) {
      expect(x.etapa).toBe(0);
      expect(x.venceEm.toISOString()).toBe(new Date('2026-12-03T00:00:00-03:00').toISOString());
    }
  });
});

describe('revisão antecipada (PRATICAR AGORA)', () => {
  it('mostra os erros agendados e deixa praticar antes do prazo sem avançar a etapa', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-20T20:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 1);
    const errou = l.fim.erros[0] as string;
    const tela = (await t.chamar('revisao', { cookie: a.cookie })).json();
    expect(tela.pendentes).toBe(0);
    expect(tela.agendadas).toBe(1);
    expect(tela.proximaEm).toBe(new Date('2026-11-21T00:00:00-03:00').toISOString());

    const r = await t.chamar('revisaoIniciar', { cookie: a.cookie, corpo: { antecipar: true } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().questoes.map((q: { id: string }) => q.id)).toEqual([errou]);
    await responderTudo(t, a.cookie, r.json().sessaoId, [errou]);
    const [rev] = await t.db
      .select()
      .from(schema.revisoes)
      .where(and(eq(schema.revisoes.questaoId, errou), eq(schema.revisoes.usuarioId, a.id)));
    expect(rev!.etapa).toBe(0);
    expect(rev!.venceEm.toISOString()).toBe(new Date('2026-11-21T00:00:00-03:00').toISOString());
  });
});

describe('simulado (PRD 5.14)', () => {
  async function cargoAdm() {
    const [c] = await t.db
      .select()
      .from(schema.cargos)
      .where(eq(schema.cargos.nome, 'Agente Administrativo'));
    return c!;
  }

  it('tem exatamente 5/5/5/25 do cargo, relógio de 4 h no servidor e sem gabarito', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-10T08:00:00-03:00');
    const r = await t.chamar('simuladoCriar', {
      cookie: a.cookie,
      corpo: { cargoId: (await cargoAdm()).id },
    });
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
    const qs = await t.db
      .select()
      .from(schema.questoes)
      .where(
        inArray(
          schema.questoes.id,
          s.questoes.map((q: { questao: { id: string } }) => q.questao.id),
        ),
      );
    for (const q of qs.filter(
      (x) =>
        s.questoes.find((y: { bloco: string; questao: { id: string } }) => y.questao.id === x.id)
          .bloco === 'especificos',
    )) {
      expect(q.areas).toContain('administrativo');
    }
    // sair e voltar mantém o mesmo simulado e o tempo do servidor
    t.relogio.avancar(3600_000);
    const de_novo = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
    expect(de_novo.id).toBe(s.id);
    expect(de_novo.msRestantes).toBe(3 * 3600_000);
  });

  it('nota com pesos 2,0 e 2,8; erros vão para a revisão; XP +1 por acerto e +20 se aprovado', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-11T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
    const ids: string[] = s.questoes.map((q: { questao: { id: string } }) => q.questao.id);
    const gab = await gabaritos(t, ids);
    // acerta todo o português (5 × 2,0) e 20 específicas (20 × 2,8); erra 1 de matemática
    const port = s.questoes.filter((q: { bloco: string }) => q.bloco === 'portugues');
    const esp = s.questoes.filter((q: { bloco: string }) => q.bloco === 'especificos').slice(0, 20);
    const mat = s.questoes.find((q: { bloco: string }) => q.bloco === 'matematica');
    for (const q of [...port, ...esp]) {
      const r = await t.chamar('simuladoResposta', {
        cookie: a.cookie,
        params: { id: s.id },
        corpo: { questaoId: q.questao.id, letra: gab.get(q.questao.id) },
      });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.body).not.toContain('acert');
    }
    const ult = await t.chamar('simuladoResposta', {
      cookie: a.cookie,
      params: { id: s.id },
      corpo: {
        questaoId: mat.questao.id,
        letra: errada(gab.get(mat.questao.id)!),
        revisarDepois: true,
      },
    });
    expect(ult.json().emBranco).toBe(14);
    const res = (
      await t.chamar('simuladoEntregar', { cookie: a.cookie, params: { id: s.id } })
    ).json();
    expect(res.estado).toBe('entregue');
    expect(res.pontos).toBe(5 * 2 + 20 * 2.8);
    expect(res.pontosMaximos).toBe(100);
    expect(res.aprovado).toBe(true);
    expect(res.selo).toBe('APROVADO');
    expect(res.porBloco.find((b: { bloco: string }) => b.bloco === 'portugues')).toMatchObject({
      acertos: 5,
      pontos: 10,
    });
    expect(res.porBloco.find((b: { bloco: string }) => b.bloco === 'especificos')).toMatchObject({
      acertos: 20,
      pontos: 56,
    });
    expect(res.xpGanho).toBe(25 + 20);
    expect(
      res.questoes.find((q: { questao: { id: string } }) => q.questao.id === mat.questao.id),
    ).toMatchObject({ acertou: false, gabarito: gab.get(mat.questao.id) });
    const [rev] = await t.db
      .select()
      .from(schema.revisoes)
      .where(eq(schema.revisoes.questaoId, mat.questao.id));
    expect(rev).toBeTruthy();
    const hist = (await t.chamar('simuladosListar', { cookie: a.cookie })).json();
    expect(hist.itens[0]).toMatchObject({ id: s.id, pontos: 66, aprovado: true, acertos: 25 });
    expect(
      (
        await t.chamar('simuladoResposta', {
          cookie: a.cookie,
          params: { id: s.id },
          corpo: { questaoId: mat.questao.id, letra: 'A' },
        })
      ).statusCode,
    ).toBe(409);
    const u = await usuario(t, a.id);
    expect(u.ofensiva).toBe(1);
  });

  it('tempo acabou com menos da metade respondida: não concluído, sem nota e sem gabarito (D48)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-12T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
    t.relogio.avancar(4 * 3600_000 + 1000);
    const put = await t.chamar('simuladoResposta', {
      cookie: a.cookie,
      params: { id: s.id },
      corpo: { questaoId: s.questoes[0].questao.id, letra: 'A' },
    });
    expect(put.statusCode).toBe(409);
    expect(put.json().codigo).toBe('simulado_encerrado');
    const d = (await t.chamar('simuladoObter', { cookie: a.cookie, params: { id: s.id } })).json();
    expect(d).toMatchObject({
      estado: 'entregue',
      situacao: 'nao_concluido',
      modo: 'prova',
      entregaAutomatica: true,
      recompensa: false,
      selo: 'NÃO CONCLUÍDO',
      questoes: [],
      xpGanho: 0,
      tempoGastoMs: 4 * 3600_000,
    });
    expect(JSON.stringify(d)).not.toContain('gabarito');
    expect((await usuario(t, a.id)).ofensiva).toBe(0);
    const hist = (await t.chamar('simuladosListar', { cookie: a.cookie })).json();
    expect(hist.itens[0]).toMatchObject({ id: s.id, situacao: 'nao_concluido', respondidas: 0 });
  });

  async function responder(
    cookie: string,
    s: { id: string; questoes: { questao: { id: string } }[] },
    n: number,
  ) {
    const gab = await gabaritos(
      t,
      s.questoes.map((q) => q.questao.id),
    );
    for (const q of s.questoes.slice(0, n)) {
      const r = await t.chamar('simuladoResposta', {
        cookie,
        params: { id: s.id },
        corpo: { questaoId: q.questao.id, letra: gab.get(q.questao.id) },
      });
      expect(r.statusCode, r.body).toBe(200);
    }
  }

  it('tempo acabou com metade ou mais respondida: corrige sozinho e dá XP (D48)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-15T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
    await responder(a.cookie, s, 20);
    t.relogio.avancar(4 * 3600_000 + 1000);
    // app antigo: entrega depois do fim vale como automática
    const r = (
      await t.chamar('simuladoEntregar', { cookie: a.cookie, params: { id: s.id } })
    ).json();
    expect(r).toMatchObject({
      situacao: 'corrigido',
      entregaAutomatica: true,
      recompensa: true,
      acertos: 20,
      xpGanho: 20,
    });
    expect(r.questoes).toHaveLength(40);
  });

  it('entregar com menos da metade corrige, mas não dá XP nem ofensiva (D48)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-16T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
    await responder(a.cookie, s, 19);
    const r = (
      await t.chamar('simuladoEntregar', { cookie: a.cookie, params: { id: s.id } })
    ).json();
    expect(r).toMatchObject({
      situacao: 'corrigido',
      recompensa: false,
      acertos: 19,
      xpGanho: 0,
      entregaAutomatica: false,
    });
    const u = await usuario(t, a.id);
    expect(u.ofensiva).toBe(0);
    const conq = await t.db
      .select()
      .from(schema.conquistasUsuario)
      .where(eq(schema.conquistasUsuario.usuarioId, a.id));
    expect(conq.map((c) => c.codigo)).not.toContain('primeiro_simulado');
  });

  it('descartar fecha sem nota e sem gabarito e libera um novo simulado (D48)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-17T08:00:00-03:00');
    const cargoId = (await cargoAdm()).id;
    const s = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId } })).json();
    await responder(a.cookie, s, 3);
    const r = await t.chamar('simuladoDescartar', { cookie: a.cookie, params: { id: s.id } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({
      situacao: 'descartado',
      selo: 'DESCARTADO',
      questoes: [],
      recompensa: false,
    });
    expect(r.body).not.toContain('gabarito');
    expect(
      (
        await t.chamar('simuladoResposta', {
          cookie: a.cookie,
          params: { id: s.id },
          corpo: { questaoId: s.questoes[5].questao.id, letra: 'A' },
        })
      ).statusCode,
    ).toBe(409);
    const novo = (await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId } })).json();
    expect(novo.id).not.toBe(s.id);
  });

  it('treino: o tempo só corre com a prova na tela e o prazo é de 7 dias (D48)', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-18T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id, modo: 'treino' },
      })
    ).json();
    expect(s).toMatchObject({ modo: 'treino', msRestantes: 4 * 3600_000 });
    t.relogio.avancar(30_000);
    expect(
      (await t.chamar('simuladoSinal', { cookie: a.cookie, params: { id: s.id } })).json()
        .msRestantes,
    ).toBe(4 * 3600_000 - 30_000);
    // saiu do app por 2 dias: nada é descontado
    t.relogio.avancar(2 * 24 * 3600_000);
    expect(
      (await t.chamar('simuladoSinal', { cookie: a.cookie, params: { id: s.id } })).json()
        .msRestantes,
    ).toBe(4 * 3600_000 - 30_000);
    const d = (await t.chamar('simuladoObter', { cookie: a.cookie, params: { id: s.id } })).json();
    expect(d).toMatchObject({ estado: 'andamento', msRestantes: 4 * 3600_000 - 30_000 });
    const hist = (await t.chamar('simuladosListar', { cookie: a.cookie })).json();
    expect(hist.emAndamento).toMatchObject({
      id: s.id,
      modo: 'treino',
      msRestantes: 4 * 3600_000 - 30_000,
    });
    // passou o prazo de 7 dias com pouca coisa respondida
    t.relogio.avancar(6 * 24 * 3600_000);
    const fim = (
      await t.chamar('simuladoObter', { cookie: a.cookie, params: { id: s.id } })
    ).json();
    expect(fim).toMatchObject({ situacao: 'nao_concluido', modo: 'treino', tempoGastoMs: 30_000 });
  });

  it('treino: as 4 h de tela acabam pelo sinal', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-19T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id, modo: 'treino' },
      })
    ).json();
    await t.db
      .update(schema.simulados)
      .set({ msUsados: 4 * 3600_000 - 10_000 })
      .where(eq(schema.simulados.id, s.id));
    t.relogio.avancar(20_000);
    const r = await t.chamar('simuladoSinal', { cookie: a.cookie, params: { id: s.id } });
    expect(r.statusCode).toBe(409);
    const [db] = await t.db.select().from(schema.simulados).where(eq(schema.simulados.id, s.id));
    expect(db).toMatchObject({ situacao: 'nao_concluido', msUsados: 4 * 3600_000 });
  });

  it('a varredura entrega os simulados vencidos de todos', async () => {
    const { entregarExpirados } = await import('../src/app.js');
    const a = await t.alunoPago();
    t.relogio.definir('2026-12-13T08:00:00-03:00');
    const s = (
      await t.chamar('simuladoCriar', {
        cookie: a.cookie,
        corpo: { cargoId: (await cargoAdm()).id },
      })
    ).json();
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
    const abertos = await t.db
      .select()
      .from(schema.simulados)
      .where(eq(schema.simulados.usuarioId, a.id));
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
