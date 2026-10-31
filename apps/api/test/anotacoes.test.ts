import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { fazerLicao } from './ajuda.js';

/** D28: anotações pessoais, isoladas por aluno e por concurso ativo; mini-aula e correção local. */
let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

describe('anotações (D28)', () => {
  it('só anota questão respondida; cria, troca, lista, detalha e apaga', async () => {
    const a = await t.alunoPago();
    const l = await fazerLicao(t, a.cookie, 1);
    const qid = l.inicio.questoes[0].id as string;

    const outra = await t.alunoPago();
    const negada = await t.chamar('anotacaoSalvar', { cookie: outra.cookie, params: { id: qid }, corpo: { texto: 'x' } });
    expect(negada.statusCode).toBe(409);

    const vazia = await t.chamar('anotacaoSalvar', { cookie: a.cookie, params: { id: qid }, corpo: { texto: '   ' } });
    expect(vazia.statusCode).toBe(400);

    const s1 = await t.chamar('anotacaoSalvar', { cookie: a.cookie, params: { id: qid }, corpo: { texto: 'Crase antes de feminino' } });
    expect(s1.statusCode, s1.body).toBe(200);
    const s2 = await t.chamar('anotacaoSalvar', { cookie: a.cookie, params: { id: qid }, corpo: { texto: 'Trocada' } });
    expect(s2.json().anotacao.texto).toBe('Trocada');

    const obtida = await t.chamar('anotacaoObter', { cookie: a.cookie, params: { id: qid } });
    expect(obtida.json().anotacao.texto).toBe('Trocada');

    const lista = (await t.chamar('anotacoes', { cookie: a.cookie })).json().anotacoes;
    expect(lista).toHaveLength(1);
    expect(lista[0].questaoId).toBe(qid);
    expect(lista[0].assunto.nome).toBeTruthy();
    expect(lista[0].disciplina.slug).toBeTruthy();
    expect(lista[0].resumo.length).toBeGreaterThan(0);

    const det = await t.chamar('anotacaoDetalhe', { cookie: a.cookie, params: { id: qid } });
    expect(det.statusCode, det.body).toBe(200);
    expect(det.json().correcao.gabarito).toMatch(/^[A-E]$/);
    expect(det.json().questao.id).toBe(qid);

    // Outro aluno não vê nem apaga a anotação de ninguém.
    expect((await t.chamar('anotacaoObter', { cookie: outra.cookie, params: { id: qid } })).json().anotacao).toBeNull();
    expect((await t.chamar('anotacaoDetalhe', { cookie: outra.cookie, params: { id: qid } })).statusCode).toBe(404);
    expect((await t.chamar('anotacoes', { cookie: outra.cookie })).json().anotacoes).toHaveLength(0);
    expect((await t.chamar('anotacaoExcluir', { cookie: outra.cookie, params: { id: qid } })).statusCode).toBe(204);
    expect((await t.chamar('anotacaoObter', { cookie: a.cookie, params: { id: qid } })).json().anotacao).not.toBeNull();

    expect((await t.chamar('anotacaoExcluir', { cookie: a.cookie, params: { id: qid } })).statusCode).toBe(204);
    expect((await t.chamar('anotacoes', { cookie: a.cookie })).json().anotacoes).toHaveLength(0);
  });

  it('cada concurso tem as suas anotações', async () => {
    const adm = await t.admin();
    const [c] = await t.db.select().from(schema.concursos).orderBy(schema.concursos.criadoEm).limit(1);
    const clone = await t.chamar('adminConcursoClonar', {
      cookie: adm.cookie,
      params: { id: c!.id },
      corpo: {
        nome: 'Concurso de Teste das Anotações 2026',
        slug: 'teste-anotacoes-2026',
        banca: 'Banca',
        orgao: 'Prefeitura de Teste',
        municipio: 'Teste',
        uf: 'PR',
        ano: 2026,
        dataProva: '2026-12-20',
      },
    });
    expect(clone.statusCode, clone.body).toBe(200);
    const a = await t.alunoPago();
    const l = await fazerLicao(t, a.cookie, 0);
    const qid = l.inicio.questoes[0].id as string;
    await t.chamar('anotacaoSalvar', { cookie: a.cookie, params: { id: qid }, corpo: { texto: 'No concurso 1' } });

    await t.db.update(schema.usuarios).set({ concursoId: clone.json().concurso.id }).where(eq(schema.usuarios.id, a.id));
    expect((await t.chamar('anotacoes', { cookie: a.cookie })).json().anotacoes).toHaveLength(0);
    expect((await t.chamar('anotacaoObter', { cookie: a.cookie, params: { id: qid } })).json().anotacao).toBeNull();

    await t.db.update(schema.usuarios).set({ concursoId: c!.id }).where(eq(schema.usuarios.id, a.id));
    expect((await t.chamar('anotacoes', { cookie: a.cookie })).json().anotacoes).toHaveLength(1);
  });

  it('exportação LGPD leva as anotações e a exclusão da conta apaga', async () => {
    const a = await t.alunoPago();
    const l = await fazerLicao(t, a.cookie, 0);
    const qid = l.inicio.questoes[0].id as string;
    await t.chamar('anotacaoSalvar', { cookie: a.cookie, params: { id: qid }, corpo: { texto: 'Minha nota' } });
    const exp = (await t.chamar('meExportar', { cookie: a.cookie })).json();
    expect(exp.anotacoes).toHaveLength(1);
    const { anonimizarUsuario } = await import('../src/servicos/lgpd.js');
    await t.db.transaction((tx) => anonimizarUsuario(tx, a.id, new Date()));
    const restantes = await t.db.select().from(schema.anotacoes).where(eq(schema.anotacoes.usuarioId, a.id));
    expect(restantes).toHaveLength(0);
  });
});

describe('mini-aula e correção local (D28)', () => {
  it('a questão traz a aula (ou a do assunto) e a sessão traz o gabarito cifrado que confere', async () => {
    const { decifrarTexto } = await import('@fuse/shared');
    const a = await t.alunoPago();
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const ini = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: tr.atual.licaoId } })).json();
    for (const q of ini.questoes) {
      expect(q).not.toHaveProperty('gabarito');
      if (q.aula) expect(q.aula.texto.length).toBeGreaterThan(0);
    }
    expect(ini.correcaoLocal.chave).toBeTruthy();
    const q0 = ini.questoes[0];
    const claro = JSON.parse(await decifrarTexto(ini.correcaoLocal.chave, q0.id, ini.correcaoLocal.cifrados[q0.id]));
    const [banco] = await t.db.select().from(schema.questoes).where(eq(schema.questoes.id, q0.id));
    expect(claro.gabarito).toBe(banco!.gabarito);
  });

  it('a aula própria da questão vence a do assunto', async () => {
    const a = await t.alunoPago();
    const tr = (await t.chamar('trilha', { cookie: a.cookie })).json();
    const ini1 = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: tr.atual.licaoId } })).json();
    const qid = ini1.questoes[0].id as string;
    const aula = { titulo: 'Tema', texto: 'Explicação própria.', exemplos: ['Ex. 1', 'Ex. 2'], macete: 'Truque', atencao: null };
    await t.db.update(schema.questoes).set({ aula }).where(eq(schema.questoes.id, qid));
    const { carregarQuestoes } = await import('../src/servicos/questoes.js');
    const q = (await carregarQuestoes(t.db, [qid])).get(qid)!;
    expect(q.aluno.aula).toEqual(aula);
  });
});
