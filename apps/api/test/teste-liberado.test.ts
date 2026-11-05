import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { DURACAO_TESTE_LIBERADO_MS } from '@fuse/shared';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;

beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
// A sessão do superadmin dura 12 h, e um dos testes avança o relógio 24 h.
beforeEach(async () => {
  sup = await t.superadmin();
});
afterAll(() => t.fechar());

const liberar = (id: string, cookie = sup.cookie) => t.chamar('superUsuarioTesteLiberar', { cookie, params: { id } });

describe('teste de 24 h liberado pelo superadmin (D39)', () => {
  it('o cadastro continua sem teste; o botão libera 24 h e o acesso vence sozinho', async () => {
    const a = await t.cadastrar();
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(402);

    const r = await liberar(a.id);
    expect(r.statusCode, r.body).toBe(200);
    const fim = new Date(t.relogio.agora().getTime() + DURACAO_TESTE_LIBERADO_MS).toISOString();
    expect(r.json()).toEqual({ ok: true, testeAte: fim });
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
    expect((await t.chamar('meObter', { cookie: a.cookie })).json()).toMatchObject({ acesso: true, acessoPago: false, testeAte: fim });

    const lista = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { q: a.email } })).json();
    expect(lista.itens[0]).toMatchObject({ id: a.id, acesso: false, testeAte: fim });
    const [aud] = await t.db.select().from(schema.auditoria).where(eq(schema.auditoria.acao, 'usuario.teste_liberar'));
    expect(aud).toMatchObject({ alvo: `usuario:${a.id}` });

    // O pacote offline não dura mais do que o teste.
    const pacote = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    expect(pacote.expiraEm).toBe(fim);

    t.relogio.avancar(DURACAO_TESTE_LIBERADO_MS + 1000);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(402);
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login.json()).toMatchObject({ proximo: 'pagamento', usuario: { acesso: false } });
  });

  it('renovar conta 24 h a partir de agora', async () => {
    const a = await t.cadastrar();
    await liberar(a.id);
    t.relogio.avancar(3600_000);
    const r = (await liberar(a.id)).json();
    expect(r.testeAte).toBe(new Date(t.relogio.agora().getTime() + DURACAO_TESTE_LIBERADO_MS).toISOString());
  });

  it('pagar durante o teste gasta o teste; quem pagou, a equipe e conta bloqueada não recebem', async () => {
    const a = await t.cadastrar();
    await liberar(a.id);
    const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pix.json().pedidoId));
    await t.webhook('PAYMENT_CONFIRMED', p!.asaasPaymentId!);
    expect((await usuario(t, a.id)).testeAte).toBeNull();
    const pago = await liberar(a.id);
    expect(pago.statusCode).toBe(409);
    expect(pago.json().erro).toBe('Este aluno já tem acesso pago.');

    const adm = await t.admin();
    expect((await liberar(adm.id)).json().erro).toBe('Só alunos recebem o teste de 24 horas.');

    const b = await t.cadastrar();
    await t.db.update(schema.usuarios).set({ bloqueadoEm: t.relogio.agora() }).where(eq(schema.usuarios.id, b.id));
    expect((await liberar(b.id)).statusCode).toBe(409);
  });

  it('só o superadmin libera', async () => {
    const a = await t.cadastrar();
    const adm = await t.admin();
    expect((await liberar(a.id, adm.cookie)).statusCode).toBe(403);
    expect((await liberar(a.id, a.cookie)).statusCode).toBe(403);
  });
});
