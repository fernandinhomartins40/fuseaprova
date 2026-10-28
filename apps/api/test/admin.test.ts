import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { fazerLicao } from './ajuda.js';

let t: AmbienteTeste;
let adm: Aluno;
beforeAll(async () => {
  t = await criarAmbienteTeste();
  adm = await t.admin();
}, 60_000);
afterAll(() => t.fechar());

const alternativas = ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: `Opção ${letra}` }));

describe('admin (PRD 5.17)', () => {
  it('questões: criar rascunho, publicar exige dica, explicação e revisão humana', async () => {
    const disc = (await t.chamar('adminDisciplinas', { cookie: adm.cookie })).json().itens.find((d: { slug: string }) => d.slug === 'portugues');
    const ass = (await t.chamar('adminAssuntosListar', { cookie: adm.cookie, query: { disciplina: 'portugues' } })).json().itens[0];
    expect(ass.totalQuestoes).toBeGreaterThan(0);
    const corpo = { origem: 'autoral', disciplinaId: disc.id, assuntoId: ass.id, enunciado: 'Qual a forma correta?', alternativas, gabarito: 'C', status: 'publicada' };
    const r1 = await t.chamar('adminQuestaoCriar', { cookie: adm.cookie, corpo });
    expect(r1.statusCode).toBe(400);
    expect(r1.json().erro).toMatch(/explicação/);
    const r2 = await t.chamar('adminQuestaoCriar', { cookie: adm.cookie, corpo: { ...corpo, status: 'rascunho' } });
    expect(r2.statusCode, r2.body).toBe(200);
    const q = r2.json();
    expect(q.pendencias).toEqual(expect.arrayContaining(['Falta a explicação.', 'Falta a revisão humana no painel.']));
    expect(q.prova).toBeNull();
    const pronto = { ...corpo, explicacao: 'Porque sim.', dicaBolso: 'Macete', dica: 'Pense no verbo.', revisada: true };
    const r3 = await t.chamar('adminQuestaoAtualizar', { cookie: adm.cookie, params: { id: q.id }, corpo: pronto });
    expect(r3.statusCode, r3.body).toBe(200);
    expect(r3.json()).toMatchObject({ status: 'publicada', versao: 2, revisadoPor: adm.id, pendencias: [] });
    const prev = (await t.chamar('adminQuestaoPrevia', { cookie: adm.cookie, params: { id: q.id } })).json();
    expect(prev).toMatchObject({ gabarito: 'C', questao: { chipOrigem: 'Questão Fuse Aprova · estilo FAU' } });
    const lista = (await t.chamar('adminQuestoesListar', { cookie: adm.cookie, query: { q: 'forma correta', status: 'publicada' } })).json();
    expect(lista.itens.map((x: { id: string }) => x.id)).toContain(q.id);
    const autoralComProva = await t.chamar('adminQuestaoCriar', { cookie: adm.cookie, corpo: { ...corpo, status: 'rascunho', provaOrigemId: q.id } });
    expect(autoralComProva.statusCode).toBe(400);
    const lote = (await t.chamar('adminQuestoesLote', { cookie: adm.cookie, corpo: { ids: [q.id], acao: 'anular', motivo: 'Anulada pela banca' } })).json();
    expect(lote.atualizadas).toBe(1);
  });

  it('assunto "a-classificar" não publica (422) e anulada pode ficar sem gabarito', async () => {
    const disc = (await t.db.select().from(schema.disciplinas))[0]!;
    const [ac] = await t.db.insert(schema.assuntos).values({ disciplinaId: disc.id, nome: 'A classificar', slug: 'a-classificar' }).returning();
    const [prova] = await t.db.insert(schema.provasOrigem).values({ orgao: 'Prefeitura X', ano: 2024, situacaoCertame: 'encerrado' }).returning();
    const corpo = { origem: 'fau_real', provaOrigemId: prova!.id, numeroOrigem: 3, disciplinaId: disc.id, assuntoId: ac!.id, enunciado: 'Enunciado', alternativas, gabarito: 'B', explicacao: 'x', dica: 'y', dicaBolso: 'z', revisada: true, status: 'publicada' };
    const r = await t.chamar('adminQuestaoCriar', { cookie: adm.cookie, corpo });
    expect(r.statusCode).toBe(422);
    expect(r.json().codigo).toBe('assunto_a_classificar');
    const [anulada] = await t.db.insert(schema.questoes).values({ origem: 'fau_real', provaOrigemId: prova!.id, numeroOrigem: 9, disciplinaId: disc.id, assuntoId: ac!.id, enunciado: 'Anulada', alternativas: alternativas as never, gabarito: null, status: 'anulada', anuladaMotivo: 'Banca' }).returning();
    const det = (await t.chamar('adminQuestaoObter', { cookie: adm.cookie, params: { id: anulada!.id } })).json();
    expect(det.gabarito).toBeNull();
    expect(det.prova.orgao).toBe('Prefeitura X');
    const lote = (await t.chamar('adminQuestoesLote', { cookie: adm.cookie, corpo: { ids: [anulada!.id], acao: 'rascunho' } })).json();
    expect(lote.ignoradas[0].motivo).toMatch(/gabarito/);
    await expect(t.db.insert(schema.questoes).values({ origem: 'autoral', disciplinaId: disc.id, assuntoId: ac!.id, enunciado: 'x', alternativas: alternativas as never, gabarito: null })).rejects.toThrow();
    const pr = (await t.chamar('adminProvaObter', { cookie: adm.cookie, params: { id: prova!.id } })).json();
    expect(pr.situacaoCertame).toBe('encerrado');
  });

  it('lote publicar ignora as que têm pendências', async () => {
    const [rasc] = await t.db.insert(schema.questoes).values({
      origem: 'autoral',
      disciplinaId: (await t.db.select().from(schema.disciplinas))[0]!.id,
      assuntoId: (await t.db.select().from(schema.assuntos))[0]!.id,
      enunciado: 'Sem explicação',
      alternativas: alternativas as never,
      gabarito: 'A',
    }).returning();
    const r = (await t.chamar('adminQuestoesLote', { cookie: adm.cookie, corpo: { ids: [rasc!.id], acao: 'publicar' } })).json();
    expect(r.atualizadas).toBe(0);
    expect(r.ignoradas[0].motivo).toMatch(/explicação/);
  });

  it('modo edital: publicar troca os cargos, marca seções fora e pede confirmação', async () => {
    const aluno = await t.alunoPago();
    const concurso = (await t.chamar('adminConcursosListar', { cookie: adm.cookie })).json().itens[0];
    const ed = (await t.chamar('adminEditalObter', { cookie: adm.cookie, query: { concursoId: concurso.id } })).json();
    const fora = ed.secoes[0];
    const salvar = await t.chamar('adminEditalSalvar', {
      cookie: adm.cookie,
      corpo: {
        concursoId: concurso.id,
        dataProva: '2027-03-14',
        links: [{ titulo: 'Edital', url: 'https://exemplo.com/edital.pdf' }],
        cargos: [{ nome: 'Agente Administrativo I', area: 'administrativo', escolaridade: 'medio', vagas: 3, distribuicao: { portugues: 5, matematica: 5, gerais: 5, especificos: 25 }, conteudoProgramatico: 'Língua Portuguesa…' }],
        secoes: [{ secaoId: fora.id, noEdital: false }],
      },
    });
    expect(salvar.statusCode, salvar.body).toBe(200);
    expect((await t.chamar('meObter', { cookie: aluno.cookie })).json().confirmarCargoEdital).toBe(false);
    const pub = (await t.chamar('adminEditalPublicar', { cookie: adm.cookie, corpo: { concursoId: concurso.id } })).json();
    expect(pub.usuariosParaConfirmar).toBeGreaterThanOrEqual(1);
    const me = (await t.chamar('meObter', { cookie: aluno.cookie })).json();
    expect(me.confirmarCargoEdital).toBe(true);
    const c = (await t.chamar('concurso', { cookie: aluno.cookie })).json();
    expect(c.modoEdital).toBe(true);
    expect(c.cargos.map((x: { nome: string }) => x.nome)).toEqual(['Agente Administrativo I']);
    expect(c.dataProva).toBe('2027-03-14');
    expect(c.diasParaProva).toBeGreaterThan(0);
    const tr = (await t.chamar('trilha', { cookie: aluno.cookie })).json();
    const secoes = tr.unidades.flatMap((u: { secoes: { id: string }[] }) => u.secoes.map((s) => s.id));
    expect(secoes).not.toContain(fora.id);
    const guia = (await t.chamar('guia', { cookie: aluno.cookie, params: { unidadeId: (await t.db.select().from(schema.secoes).where(eq(schema.secoes.id, fora.id)))[0]!.unidadeId } })).json();
    expect(guia.secoes.find((s: { id: string }) => s.id === fora.id)).toMatchObject({ naTrilha: false, noEdital: false });
    const generico = await t.chamar('meAtualizar', { cookie: aluno.cookie, corpo: { cargoId: (await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, 'Motorista')))[0]!.id } });
    expect(generico.statusCode).toBe(400);
    const ok = await t.chamar('meAtualizar', { cookie: aluno.cookie, corpo: { cargoId: c.cargos[0].id } });
    expect(ok.json().confirmarCargoEdital).toBe(false);
    const perfil = (await t.chamar('perfilEstatisticas', { cookie: aluno.cookie })).json();
    expect(perfil.edital.texto).toBe('prova em 14/03');
  });

  it('D24: painel de conteúdo sem receita; métricas de negócio, ficha, liberação e auditoria ficam no /super', async () => {
    const a = await t.alunoPago();
    await fazerLicao(t, a.cookie);
    const sem = await t.cadastrar();
    const p = await t.chamar('adminPainel', { cookie: adm.cookie });
    expect(p.statusCode, p.body).toBe(200);
    const j = p.json();
    expect(j).not.toHaveProperty('vendasHoje');
    expect(j).not.toHaveProperty('vendasMes');
    expect(j).not.toHaveProperty('usuariosAtivos7d');
    expect(Object.keys(j.metricas).sort()).toEqual(['licoesPorAlunoSemana', 'melhoraAcertoPp']);
    expect(j.questoesPorStatus.publicada).toBeGreaterThan(0);

    const sup = await t.superadmin();
    expect((await t.chamar('superMetricas', { cookie: adm.cookie })).statusCode).toBe(403);
    const m = await t.chamar('superMetricas', { cookie: sup.cookie });
    expect(m.statusCode, m.body).toBe(200);
    expect(m.json().metricas.conversaoCadastroPago).toBeGreaterThan(0);

    const [u] = await t.db.select().from(schema.usuarios).where(eq(schema.usuarios.id, sem.id));
    const concursoId = u!.concursoId!;
    const lib = await t.chamar('superUsuarioConcursoLiberar', {
      cookie: sup.cookie,
      params: { id: sem.id, concursoId },
      corpo: { motivo: 'Cortesia combinada com o dono', confirmacao: { senha: sup.senha } },
    });
    expect(lib.statusCode, lib.body).toBe(200);
    expect(lib.json()).toMatchObject({ alterado: true, acesso: true });
    expect(lib.json().concursos).toEqual([expect.objectContaining({ id: concursoId, acesso: true, pedidoPagoId: null })]);
    expect((await t.chamar('trilha', { cookie: sem.cookie })).statusCode).toBe(200);
    const det = (await t.chamar('superUsuarioObter', { cookie: sup.cookie, params: { id: a.id } })).json();
    expect(det.progresso.licoesConcluidas).toBe(1);
    expect(det.usuario.cpfOculto).toMatch(/^\*\*\*\./);
    expect(det.concursos[0]).toMatchObject({ id: concursoId, acesso: true, ativo: true, pedidoPagoId: det.pedidos[0].id });
    const busca = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { q: sem.email } })).json();
    expect(busca.total).toBe(1);
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'acesso.liberar' } })).json();
    expect(aud.itens[0].motivo).toMatch(/Cortesia/);
    expect(aud.itens[0].depois).toMatchObject({ concursoId, concursoLiberado: true });
  });

  it('D24: liberar e revogar por concurso só para aluno (nunca a própria conta); revogar o último concurso derruba as sessões', async () => {
    const sup = await t.superadmin();
    const outroAdmin = await t.admin();
    const a = await t.alunoPago();
    const [u] = await t.db.select().from(schema.usuarios).where(eq(schema.usuarios.id, a.id));
    const concursoId = u!.concursoId!;
    const corpo = { motivo: 'Teste de permissão', confirmacao: { senha: sup.senha } };
    for (const alvo of [outroAdmin, sup]) {
      for (const nome of ['superUsuarioConcursoLiberar', 'superUsuarioConcursoRevogar'] as const) {
        const r = await t.chamar(nome, { cookie: sup.cookie, params: { id: alvo.id, concursoId }, corpo });
        expect(r.statusCode, `${nome} em ${alvo.email}`).toBe(alvo === sup ? 409 : 403);
      }
    }
    // O admin de conteúdo não alcança o negócio.
    expect((await t.chamar('superUsuarioConcursoRevogar', { cookie: adm.cookie, params: { id: a.id, concursoId }, corpo })).statusCode).toBe(403);
    expect((await t.chamar('superUsuarioConcursoRevogar', { cookie: sup.cookie, params: { id: a.id, concursoId }, corpo: { ...corpo, confirmacao: { senha: 'errada' } } })).statusCode).toBe(403);
    const r = await t.chamar('superUsuarioConcursoRevogar', { cookie: sup.cookie, params: { id: a.id, concursoId }, corpo: { motivo: 'Chargeback por fora', confirmacao: { senha: sup.senha } } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ alterado: true, acesso: false });
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(401);
    const de = await t.chamar('superUsuarioConcursoRevogar', { cookie: sup.cookie, params: { id: a.id, concursoId }, corpo });
    expect(de.json()).toMatchObject({ alterado: false, acesso: false });
  });

  it('trilhas: criar unidade/seção/lição, reordenar e excluir', async () => {
    const concurso = (await t.chamar('adminConcursosListar', { cookie: adm.cookie })).json().itens[0];
    const disc = (await t.chamar('adminDisciplinas', { cookie: adm.cookie })).json().itens[0];
    const ass = (await t.chamar('adminAssuntosListar', { cookie: adm.cookie })).json().itens[0];
    const u = (await t.chamar('adminUnidadeCriar', { cookie: adm.cookie, corpo: { concursoId: concurso.id, area: null, ordem: 99, titulo: 'Unidade nova', disciplinaId: disc.id } })).json();
    const s = (await t.chamar('adminSecaoCriar', { cookie: adm.cookie, corpo: { unidadeId: u.id, ordem: 1, titulo: 'Seção nova', assuntoId: ass.id } })).json();
    const l1 = (await t.chamar('adminLicaoCriar', { cookie: adm.cookie, corpo: { secaoId: s.id, ordem: 1 } })).json();
    const l2 = (await t.chamar('adminLicaoCriar', { cookie: adm.cookie, corpo: { secaoId: s.id, ordem: 2, tipo: 'desafio', tamanho: 10 } })).json();
    const ord = await t.chamar('adminTrilhasOrdem', { cookie: adm.cookie, corpo: { nivel: 'licoes', paiId: s.id, ids: [l2.id, l1.id] } });
    expect(ord.statusCode).toBe(200);
    const arv = (await t.chamar('adminTrilhas', { cookie: adm.cookie, query: { area: 'comum' } })).json();
    const nova = arv.unidades.find((x: { id: string }) => x.id === u.id);
    expect(nova.secoes[0].licoes.map((l: { id: string }) => l.id)).toEqual([l2.id, l1.id]);
    expect((await t.chamar('adminUnidadeExcluir', { cookie: adm.cookie, params: { id: u.id } })).statusCode).toBe(409);
    await t.chamar('adminSecaoExcluir', { cookie: adm.cookie, params: { id: s.id } });
    expect((await t.chamar('adminUnidadeExcluir', { cookie: adm.cookie, params: { id: u.id } })).statusCode).toBe(200);
  });

  it('provas, cargos, concursos e importações', async () => {
    const prova = (await t.chamar('adminProvaCriar', { cookie: adm.cookie, corpo: { orgao: 'Câmara de Teste', ano: 2023, uf: 'pr', urlGabarito: '' } })).json();
    expect(prova).toMatchObject({ orgao: 'Câmara de Teste', uf: 'PR', status: 'ativa', totalQuestoes: 0, urlGabarito: null });
    const lista = (await t.chamar('adminProvasListar', { cookie: adm.cookie, query: { q: 'Câmara de Teste' } })).json();
    expect(lista.total).toBe(1);
    const [imp] = await t.db
      .insert(schema.importacoes)
      .values({ provaOrigemId: prova.id, status: 'confrontado', questoesExtraidas: 40, divergencias: 1, confronto: [{ numero: 1, questaoId: null, gabaritoDefinitivo: 'B', observacao: null }] })
      .returning();
    const det = (await t.chamar('adminImportacaoObter', { cookie: adm.cookie, params: { id: imp!.id } })).json();
    expect(det.confronto[0]).toMatchObject({ gabaritoDefinitivo: 'B', gabaritoExtraido: null });
    const up = (await t.chamar('adminImportacaoAtualizar', { cookie: adm.cookie, params: { id: imp!.id }, corpo: { status: 'concluido' } })).json();
    expect(up.status).toBe('concluido');
    const concurso = (await t.chamar('adminConcursosListar', { cookie: adm.cookie })).json().itens[0];
    const cargo = (await t.chamar('adminCargoCriar', { cookie: adm.cookie, corpo: { concursoId: concurso.id, nome: 'Cargo Teste', area: 'educacao' } })).json();
    expect(cargo).toMatchObject({ nome: 'Cargo Teste', generico: false });
    const edit = (await t.chamar('adminConcursoAtualizar', { cookie: adm.cookie, params: { id: concurso.id }, corpo: { dataProva: '2027-04-01' } })).json();
    expect(edit.dataProva).toBe('2027-04-01');
  });
});
