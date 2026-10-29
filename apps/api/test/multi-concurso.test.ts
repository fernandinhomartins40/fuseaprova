import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { descricaoCobranca } from '@fuse/shared/api';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

/** D21: vários concursos por aluno, com compra (e preço) por concurso. */
let t: AmbienteTeste;
let adm: Aluno;
let palmitalId: string;
let siqueiraId: string;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  adm = await t.admin();
  const [c] = await t.db.select().from(schema.concursos).orderBy(schema.concursos.criadoEm).limit(1);
  palmitalId = c!.id;
  // 2º concurso: clonado do modelo, depois ativado pelo admin.
  const r = await t.chamar('adminConcursoClonar', {
    cookie: adm.cookie,
    params: { id: palmitalId },
    corpo: {
      nome: 'Concurso da Prefeitura de Siqueira Campos-PR 2026',
      slug: 'siqueira-campos-2026',
      banca: 'FAU-Unicentro',
      orgao: 'Prefeitura Municipal de Siqueira Campos',
      municipio: 'Siqueira Campos',
      uf: 'PR',
      ano: 2026,
      dataProva: '2026-11-29',
    },
  });
  expect(r.statusCode, r.body).toBe(200);
  siqueiraId = r.json().concurso.id;
}, 120_000);
afterAll(() => t.fechar());

const meus = async (a: Aluno) => (await t.chamar('meusConcursos', { cookie: a.cookie })).json();
const pix = (a: Aluno, concursoId?: string) =>
  t.chamar('pagamentoPix', { cookie: a.cookie, corpo: concursoId ? { concursoId } : {} });
async function pagar(pedidoId: string) {
  const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pedidoId));
  const r = await t.webhook('PAYMENT_RECEIVED', p!.asaasPaymentId!);
  expect(r.statusCode).toBe(200);
  await t.app.deps.aguardarTarefas();
}

describe('clonar concurso (admin)', () => {
  it('copia trilha e cargos genéricos do modelo, entra inativo e aguardando edital', async () => {
    const [c] = await t.db.select().from(schema.concursos).where(eq(schema.concursos.id, siqueiraId));
    expect(c).toMatchObject({ ativo: false, status: 'aguardando_edital', slug: 'siqueira-campos-2026' });
    const modelo = await t.db.select().from(schema.unidades).where(eq(schema.unidades.concursoId, palmitalId));
    const novas = await t.db.select().from(schema.unidades).where(eq(schema.unidades.concursoId, siqueiraId));
    expect(novas.length).toBe(modelo.length);
    expect(novas.length).toBeGreaterThan(0);
    const cargos = await t.db.select().from(schema.cargos).where(eq(schema.cargos.concursoId, siqueiraId));
    expect(cargos.length).toBeGreaterThan(0);
    expect(cargos.every((x) => x.generico)).toBe(true);
  });

  it('slug repetido é conflito; aluno não clona', async () => {
    const corpo = { nome: 'X', slug: 'siqueira-campos-2026', banca: 'FAU', orgao: 'X', municipio: 'X', uf: 'PR', ano: 2026 };
    const dup = await t.chamar('adminConcursoClonar', { cookie: adm.cookie, params: { id: palmitalId }, corpo });
    expect(dup.statusCode).toBe(409);
    const a = await t.alunoPago();
    const r = await t.chamar('adminConcursoClonar', { cookie: a.cookie, params: { id: palmitalId }, corpo: { ...corpo, slug: 'outro' } });
    expect(r.statusCode).toBe(403);
  });

  it('inativo não aparece para o aluno; ativado aparece em "disponíveis"', async () => {
    const a = await t.alunoPago();
    expect((await meus(a)).disponiveis.map((c: { id: string }) => c.id)).not.toContain(siqueiraId);
    const ativo = await t.chamar('adminConcursoAtualizar', { cookie: adm.cookie, params: { id: siqueiraId }, corpo: { ativo: true } });
    expect(ativo.statusCode, ativo.body).toBe(200);
    expect((await meus(a)).disponiveis.map((c: { id: string }) => c.id)).toContain(siqueiraId);
  });
});

describe('preço por concurso', () => {
  it('1º concurso a R$ 397; adicional a R$ 197 depois de pagar o primeiro', async () => {
    const a = await t.cadastrar();
    const l0 = await meus(a);
    expect(l0).toMatchObject({ precoCheioCentavos: 39700, precoAdicionalCentavos: 19700 });
    const dispo = l0.disponiveis.find((c: { id: string }) => c.id === siqueiraId);
    expect(dispo).toMatchObject({ precoCentavos: 39700, comDesconto: false });

    const primeiro = (await pix(a)).json();
    expect(primeiro).toMatchObject({ valorCentavos: 39700, concursoId: palmitalId });
    await pagar(primeiro.pedidoId);
    expect((await usuario(t, a.id)).acesso).toBe(true);

    const l1 = await meus(a);
    expect(l1.seguidos.find((c: { id: string }) => c.id === palmitalId)).toMatchObject({ acesso: true, ativo: true, precoCentavos: 0 });
    expect(l1.disponiveis.find((c: { id: string }) => c.id === siqueiraId)).toMatchObject({ precoCentavos: 19700, comDesconto: true });

    const segundo = await pix(a, siqueiraId);
    expect(segundo.statusCode, segundo.body).toBe(200);
    expect(segundo.json()).toMatchObject({ valorCentavos: 19700, concursoId: siqueiraId });
    const [ped] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, segundo.json().pedidoId));
    expect(ped).toMatchObject({ concursoId: siqueiraId, valorCentavos: 19700 });
    // a cobrança no Asaas sai com o valor e o nome do concurso
    const cob = t.asaas.cobrancas.get(ped!.asaasPaymentId!)!;
    expect(cob.dados).toMatchObject({ value: 197, description: descricaoCobranca(segundo.json().concursoNome) });
    expect(cob.dados.description).toContain('Siqueira Campos');
  });

  it('acesso liberado à mão (sem pedido) não dá desconto', async () => {
    const a = await t.cadastrar();
    const sup = await t.superadmin();
    const lib = await t.chamar('superUsuarioConcursoLiberar', {
      cookie: sup.cookie,
      params: { id: a.id, concursoId: palmitalId },
      corpo: { motivo: 'Cortesia de teste', confirmacao: { senha: sup.senha } },
    });
    expect(lib.statusCode, lib.body).toBe(200);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const r = await pix(a, siqueiraId);
    expect(r.json().valorCentavos).toBe(39700);
  });

  it('o Pix pendente com o preço cheio é refeito se o aluno ganhou o desconto', async () => {
    const a = await t.cadastrar();
    const cheio = (await pix(a, siqueiraId)).json();
    expect(cheio.valorCentavos).toBe(39700);
    const primeiro = (await pix(a)).json();
    await pagar(primeiro.pedidoId);
    const novo = (await pix(a, siqueiraId)).json();
    expect(novo.valorCentavos).toBe(19700);
    expect(novo.pedidoId).not.toBe(cheio.pedidoId);
  });

  it('já liberado: 409; concurso inexistente ou inativo: 404', async () => {
    const a = await t.alunoPago();
    expect((await pix(a)).statusCode).toBe(409);
    expect((await pix(a, '00000000-0000-4000-8000-000000000000')).statusCode).toBe(404);
  });
});

describe('um acesso por concurso', () => {
  it('sem pagar o 2º, ele não ativa (402) e a trilha segue no 1º', async () => {
    const a = await t.alunoPago();
    const seg = await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId } });
    expect(seg.statusCode, seg.body).toBe(200);
    const l = seg.json();
    expect(l.ativoId).toBe(palmitalId);
    expect(l.seguidos.find((c: { id: string }) => c.id === siqueiraId)).toMatchObject({ acesso: false, ativo: false });
    const at = await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: siqueiraId } });
    expect(at.statusCode).toBe(402);
    expect((await t.chamar('concurso', { cookie: a.cookie })).json().id).toBe(palmitalId);
  });

  it('depois de pagar o 2º, ativa e a trilha, o concurso e o cargo passam a ser dele', async () => {
    const a = await t.alunoPago();
    const gen = await t.db.select().from(schema.cargos).where(eq(schema.cargos.concursoId, siqueiraId));
    const cargo = gen.find((c) => c.nome === 'Agente Administrativo') ?? gen[0]!;
    await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId, cargoId: cargo.id } });
    await pagar((await pix(a, siqueiraId)).json().pedidoId);
    // continua no 1º até o aluno trocar
    expect((await meus(a)).ativoId).toBe(palmitalId);
    const at = await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: siqueiraId } });
    expect(at.statusCode, at.body).toBe(200);
    expect(at.json().ativoId).toBe(siqueiraId);
    const u = await usuario(t, a.id);
    expect(u).toMatchObject({ concursoId: siqueiraId, cargoId: cargo.id, area: cargo.area, acesso: true });
    expect((await t.chamar('concurso', { cookie: a.cookie })).json().id).toBe(siqueiraId);
    const trilha = (await t.chamar('trilha', { cookie: a.cookie })).json();
    expect(trilha.unidades.length).toBeGreaterThan(0);
    // volta para o 1º
    expect((await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: palmitalId } })).json().ativoId).toBe(palmitalId);
  });

  it('estorno do 2º revoga só ele: o aluno continua com acesso e volta para o 1º', async () => {
    const a = await t.alunoPago();
    await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId } });
    const ped = (await pix(a, siqueiraId)).json();
    await pagar(ped.pedidoId);
    await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: siqueiraId } });
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, ped.pedidoId));
    await t.webhook('PAYMENT_REFUNDED', p!.asaasPaymentId!);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const l = await meus(a);
    expect(l.ativoId).toBe(palmitalId);
    expect(l.seguidos.find((c: { id: string }) => c.id === siqueiraId).acesso).toBe(false);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
  });

  it('estorno do único concurso tira o acesso e derruba as sessões', async () => {
    const a = await t.alunoPago();
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    await t.webhook('PAYMENT_REFUNDED', p!.asaasPaymentId!);
    expect((await usuario(t, a.id)).acesso).toBe(false);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(401);
  });

  it('deixar: concurso não pago sai da lista; pago fica (409)', async () => {
    const a = await t.alunoPago();
    await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId } });
    const sai = await t.chamar('meuConcursoDeixar', { cookie: a.cookie, params: { id: siqueiraId } });
    expect(sai.statusCode).toBe(200);
    expect(sai.json().seguidos.map((c: { id: string }) => c.id)).toEqual([palmitalId]);
    const fica = await t.chamar('meuConcursoDeixar', { cookie: a.cookie, params: { id: palmitalId } });
    expect(fica.statusCode).toBe(409);
  });

  it('quem ainda não pagou escolhe o concurso antes de pagar e o Pix sai desse concurso', async () => {
    const a = await t.cadastrar();
    const seg = await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId } });
    expect(seg.json().ativoId).toBe(siqueiraId);
    const r = (await pix(a)).json();
    expect(r).toMatchObject({ concursoId: siqueiraId, valorCentavos: 39700 });
    await pagar(r.pedidoId);
    expect((await usuario(t, a.id))).toMatchObject({ acesso: true, concursoId: siqueiraId });
    expect((await meus(a)).seguidos.find((c: { id: string }) => c.id === siqueiraId).acesso).toBe(true);
  });

  it('cargo do edital/genérico é validado ao seguir', async () => {
    const a = await t.cadastrar();
    const dePalmital = (await t.db.select().from(schema.cargos).where(eq(schema.cargos.concursoId, palmitalId)))[0]!;
    const r = await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId, cargoId: dePalmital.id } });
    expect(r.statusCode).toBe(400);
    expect(r.json().campos.cargoId).toBe('Escolha um cargo da lista.');
  });

  it('concursoPorId devolve os cargos do concurso aberto para escolher antes de seguir', async () => {
    const a = await t.cadastrar();
    const r = await t.chamar('concursoPorId', { cookie: a.cookie, params: { id: siqueiraId } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ id: siqueiraId, sigla: 'SIQ · PR', modoEdital: false });
    expect(r.json().cargos.length).toBeGreaterThan(0);
  });

  it('o cargo escolhido no onboarding fica gravado na linha do concurso ativo', async () => {
    const a = await t.alunoPago();
    const [c] = await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, 'Motorista'));
    await t.chamar('meAtualizar', { cookie: a.cookie, corpo: { cargoId: c!.id } });
    const l = await meus(a);
    expect(l.seguidos.find((x: { id: string }) => x.id === palmitalId).cargo).toMatchObject({ nome: 'Motorista' });
  });

  it('excluir a conta apaga a lista de concursos', async () => {
    const a = await t.alunoPago();
    await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: siqueiraId } });
    const r = await t.chamar('meExcluir', { cookie: a.cookie, corpo: { senha: a.senha, confirmacao: 'EXCLUIR' } });
    expect(r.statusCode, r.body).toBeLessThan(300);
    const linhas = await t.db.select().from(schema.usuariosConcursos).where(eq(schema.usuariosConcursos.usuarioId, a.id));
    expect(linhas).toEqual([]);
  });
});
