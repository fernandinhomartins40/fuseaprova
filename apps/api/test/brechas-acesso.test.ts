import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { completarCpf, MS_DIA } from '@fuse/shared';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
let palmital: { id: string; homologadoEm: string | null };
let adm: Aluno;
let dono: Awaited<ReturnType<AmbienteTeste['superadmin']>>;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  adm = await t.admin();
  dono = await t.superadmin();
  palmital = (await t.chamar('adminConcursosListar', { cookie: adm.cookie })).json().itens[0];
}, 60_000);
afterAll(() => t.fechar());

const trilha = async (a: Aluno) => (await t.chamar('trilha', { cookie: a.cookie })).statusCode;
const me = async (a: Aluno) => (await t.chamar('meObter', { cookie: a.cookie })).json();
const linhas = (a: Aluno) => t.db.select().from(schema.usuariosConcursos).where(eq(schema.usuariosConcursos.usuarioId, a.id));
const voltarAoMes = (a: Aluno, meses: number) => {
  const d = t.relogio.agora();
  d.setUTCMonth(d.getUTCMonth() - meses);
  return t.db.update(schema.usuariosConcursos).set({ acessoEm: d }).where(eq(schema.usuariosConcursos.usuarioId, a.id));
};
const ajustarConcurso = (corpo: object, cookie = dono.cookie) =>
  t.chamar('adminConcursoAtualizar', { cookie, params: { id: palmital.id }, corpo });
const reabrirConcurso = () =>
  t.db
    .update(schema.concursos)
    .set({ homologadoEm: null, status: 'aguardando_edital', ativo: true })
    .where(eq(schema.concursos.id, palmital.id));

let n = 0;
const dadosNovos = (extra: object = {}) => ({
  nome: 'Conta Nova Silva',
  email: `nova${++n}@teste.com`,
  cpf: completarCpf(String(700000000 + n * 104729).slice(-9)),
  celular: '42998765432',
  senha: 'senha-forte-123',
  aceiteTermos: true,
  ...extra,
});
const cadastrar = (corpo: object, cookie?: string) => t.chamar('authCadastro', { corpo, cookie });

describe('validade do acesso pago (D33)', () => {
  it('termina sozinho depois de 24 meses, mantendo a conta e o progresso', async () => {
    const a = await t.alunoPago();
    expect(await trilha(a)).toBe(200);
    await voltarAoMes(a, 24);
    t.relogio.avancar(1000);
    expect(await trilha(a)).toBe(402);
    expect((await usuario(t, a.id)).acesso).toBe(false);
    expect(await me(a)).toMatchObject({ acesso: false, acessoPago: false, testeAte: null });
  });

  it('vale também no login, sem mostrar acesso por uma resposta', async () => {
    const a = await t.alunoPago();
    await voltarAoMes(a, 25);
    const r = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(r.json()).toMatchObject({ proximo: 'pagamento', usuario: { acesso: false } });
  });

  it('a homologação encerra no fim do dia e o concurso sai de venda', async () => {
    const a = await t.alunoPago();
    const novo = await t.cadastrar();
    const hoje = new Date(t.relogio.agora().getTime() - 3 * 3600_000).toISOString().slice(0, 10);
    const r = await ajustarConcurso({ homologadoEm: hoje });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ status: 'homologado', ativo: false, homologadoEm: hoje });
    expect(await trilha(a)).toBe(200);

    t.relogio.avancar(MS_DIA + 1000);
    expect(await trilha(a)).toBe(402);
    const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(pix.statusCode).toBe(404);
    expect(pix.json().erro).toMatch(/não está mais disponível/);
    expect((await t.chamar('pagamentoPix', { cookie: novo.cookie })).statusCode).toBe(404);
    await reabrirConcurso();
  });

  it('quem paga de novo depois de vencer conta a validade do zero', async () => {
    const a = await t.alunoPago();
    await voltarAoMes(a, 24);
    t.relogio.avancar(1000);
    expect(await trilha(a)).toBe(402);
    const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(pix.statusCode, pix.body).toBe(200);
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pix.json().pedidoId));
    await t.webhook('PAYMENT_CONFIRMED', p!.asaasPaymentId!);
    expect(await trilha(a)).toBe(200);
    expect((await linhas(a))[0]!.acessoEm).toEqual(t.relogio.agora());
  });

  it('o admin de conteúdo não encerra o acesso de ninguém; status homologado exige a data', async () => {
    expect((await ajustarConcurso({ homologadoEm: '2027-01-01' }, adm.cookie)).statusCode).toBe(403);
    const r = await ajustarConcurso({ status: 'homologado' }, (await t.superadmin()).cookie);
    expect(r.statusCode).toBe(400);
    expect(r.json().campos.homologadoEm).toBe('Informe a data da homologação.');
  });
});

describe('um concurso não abre outro (D21)', () => {
  it('quem pagou um concurso não troca para outro sem pagar', async () => {
    const a = await t.alunoPago();
    const clone = await t.chamar('adminConcursoClonar', {
      cookie: adm.cookie,
      params: { id: palmital.id },
      corpo: { nome: 'Outra Prefeitura', slug: `outra-${Date.now()}`, banca: 'FAU', orgao: 'Prefeitura', municipio: 'Outra', uf: 'PR', ano: 2027 },
    });
    const outro = clone.json().concurso.id as string;
    await t.chamar('adminConcursoAtualizar', { cookie: adm.cookie, params: { id: outro }, corpo: { ativo: true } });

    await t.chamar('meuConcursoSeguir', { cookie: a.cookie, corpo: { concursoId: outro, cargoId: null } });
    expect((await usuario(t, a.id)).concursoId).toBe(palmital.id);
    expect((await t.chamar('meuConcursoAtivar', { cookie: a.cookie, params: { id: outro } })).statusCode).toBe(402);
    await t.chamar('adminConcursoAtualizar', { cookie: adm.cookie, params: { id: outro }, corpo: { ativo: false } });
  });
});

describe('sem teste grátis (D35)', () => {
  it('o cadastro vai direto para o Pix, sem estudar e sem cookie de teste', async () => {
    const r = await cadastrar(dadosNovos());
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json()).toMatchObject({ proximo: 'pagamento', usuario: { acesso: false } });
    const cookies = ([] as string[]).concat(r.headers['set-cookie'] ?? []);
    expect(cookies.some((c) => c.startsWith('fuse_teste_usado'))).toBe(false);
    const u = await usuario(t, r.json().usuario.id);
    expect(u.testeAte).toBeNull();
    const cookie = cookies.find((c) => c.startsWith('fuse_sessao'))!.split(';')[0]!;
    expect((await t.chamar('trilha', { cookie })).statusCode).toBe(402);
    expect((await t.chamar('meObter', { cookie })).json()).toMatchObject({ acesso: false, acessoPago: false, testeAte: null });
  });

  it('cadastro antigo marcado como pendente não ganha teste ao voltar', async () => {
    const a = await t.cadastrar();
    await t.db.update(schema.usuarios).set({ testeAte: null, testePendente: true }).where(eq(schema.usuarios.id, a.id));
    expect(await trilha(a)).toBe(402);
    expect((await usuario(t, a.id)).testeAte).toBeNull();
  });
});
