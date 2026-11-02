import { readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { DURACAO_TESTE_MS } from '@fuse/shared';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

const me = async (a: Aluno) => (await t.chamar('meObter', { cookie: a.cookie })).json();
const trilha = async (a: Aluno) => (await t.chamar('trilha', { cookie: a.cookie })).statusCode;
const pendente = (a: Aluno) =>
  t.db.update(schema.usuarios).set({ testeAte: null, testePendente: true }).where(eq(schema.usuarios.id, a.id));

async function pagar(a: Aluno) {
  const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
  expect(pix.statusCode, pix.body).toBe(200);
  const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pix.json().pedidoId));
  await t.webhook('PAYMENT_CONFIRMED', p!.asaasPaymentId!);
}

async function estornar(a: Aluno) {
  const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
  await t.webhook('PAYMENT_REFUNDED', p!.asaasPaymentId!);
}

describe('teste grátis de 3 dias (D32)', () => {
  it('a conta nova entra sem Pix, mas continua sem pagamento no banco', async () => {
    const r = await t.chamar('authCadastro', {
      corpo: { nome: 'Teste Novo Silva', email: 'teste.novo@teste.com', cpf: '111.444.777-35', celular: '(42) 99876-5432', senha: '12345678', aceiteTermos: true },
    });
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json()).toMatchObject({ proximo: 'onboarding', usuario: { acesso: true } });
    const u = await usuario(t, r.json().usuario.id);
    expect(u.acesso).toBe(false);
    expect(u.testeAte!.getTime() - t.relogio.agora().getTime()).toBe(DURACAO_TESTE_MS);
    expect(await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, u.id))).toHaveLength(0);
  });

  it('libera o conteúdo por 72 horas e bloqueia sozinho, sem job', async () => {
    const a = await t.emTeste();
    expect(await trilha(a)).toBe(200);
    expect(await me(a)).toMatchObject({ acesso: true, acessoPago: false, testeAte: expect.any(String) });

    t.relogio.avancar(DURACAO_TESTE_MS - 1000);
    expect(await trilha(a)).toBe(200);
    t.relogio.avancar(1000);
    expect(await trilha(a)).toBe(402);
    expect(await me(a)).toMatchObject({ acesso: false, acessoPago: false, testeAte: expect.any(String) });
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login.json()).toMatchObject({ proximo: 'pagamento', usuario: { acesso: false } });
  });

  it('a resposta 402 não cita pagamento, porque o app nativo também a recebe', async () => {
    const a = await t.cadastrar();
    const r = await t.chamar('trilha', { cookie: a.cookie });
    expect(r.statusCode).toBe(402);
    expect(r.json().erro).not.toMatch(/pix|pag/i);
  });

  it('escolher o cargo no teste não vira acesso pago (usuarios_concursos)', async () => {
    const a = await t.emTeste();
    const [cargo] = await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, 'Agente Administrativo'));
    const r = await t.chamar('meAtualizar', { cookie: a.cookie, corpo: { cargoId: cargo!.id, onboardingConcluido: true } });
    expect(r.statusCode, r.body).toBe(200);
    const linhas = await t.db.select().from(schema.usuariosConcursos).where(eq(schema.usuariosConcursos.usuarioId, a.id));
    expect(linhas.map((l) => l.acesso)).toEqual([false]);
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('dá para pagar durante o teste, e o acesso pago não depende mais do prazo', async () => {
    const a = await t.emTeste();
    expect((await t.chamar('pagamentoStatus', { cookie: a.cookie })).json().acesso).toBe(false);
    await pagar(a);
    expect(await me(a)).toMatchObject({ acesso: true, acessoPago: true, testeAte: null });
    t.relogio.avancar(DURACAO_TESTE_MS + 1000);
    expect(await trilha(a)).toBe(200);
  });

  it('o estorno não devolve um teste vencido', async () => {
    const a = await t.emTeste();
    await pagar(a);
    t.relogio.avancar(DURACAO_TESTE_MS + 1000);
    await estornar(a);
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login.json()).toMatchObject({ proximo: 'pagamento' });
  });
});

describe('cadastros antigos (D32)', () => {
  it('o teste começa no próximo login, uma vez só', async () => {
    const a = await t.cadastrar();
    await pendente(a);
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login.json()).toMatchObject({ proximo: 'onboarding', usuario: { acesso: true } });
    const u = await usuario(t, a.id);
    expect(u.testePendente).toBe(false);
    expect(u.testeAte!.getTime()).toBe(t.relogio.agora().getTime() + DURACAO_TESTE_MS);

    t.relogio.avancar(3600_000);
    await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect((await usuario(t, a.id)).testeAte).toEqual(u.testeAte);
  });

  it('quem já tinha sessão aberta começa na próxima visita', async () => {
    const a = await t.cadastrar();
    await pendente(a);
    expect(await me(a)).toMatchObject({ acesso: true, acessoPago: false });
    expect((await usuario(t, a.id)).testePendente).toBe(false);
  });

  it('a migração marca só quem nunca pagou, nunca quem foi estornado', async () => {
    const nunca = await t.cadastrar();
    const estornado = await t.cadastrar();
    await pagar(estornado);
    await estornar(estornado);
    const pago = await t.alunoPago();

    const arquivo = new URL('../../../packages/db/drizzle/0011_teste_gratis.sql', import.meta.url);
    const carga = readFileSync(arquivo, 'utf8').split('--> statement-breakpoint').at(-1)!;
    await t.db.execute(sql.raw(carga));

    expect((await usuario(t, nunca.id)).testePendente).toBe(true);
    expect((await usuario(t, estornado.id)).testePendente).toBe(false);
    expect((await usuario(t, pago.id)).testePendente).toBe(false);
    await t.db.update(schema.usuarios).set({ testePendente: false });
  });
});
