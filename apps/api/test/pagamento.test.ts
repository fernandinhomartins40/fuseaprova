import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

async function pedidoDe(id: string) {
  const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id));
  return p!;
}

describe('pagamento Pix (PRD 8.3)', () => {
  it('gera o Pix com os dados do Asaas e reaproveita o pendente', async () => {
    const a = await t.cadastrar();
    const r1 = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(r1.statusCode, r1.body).toBe(200);
    const pix = r1.json();
    expect(pix).toMatchObject({ valorCentavos: 39700, status: 'pendente' });
    expect(pix.imagem.length).toBeGreaterThan(10);
    expect(pix.payload).toContain('br.gov.bcb.pix');
    const r2 = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(r2.json().pedidoId).toBe(pix.pedidoId);
    const cob = t.asaas.cobrancas.get((await pedidoDe(pix.pedidoId)).asaasPaymentId!)!;
    expect(cob.dados).toMatchObject({ billingType: 'PIX', value: 397, description: 'Fuse Aprova – acesso completo' });
    expect(cob.dados.externalReference).toBe(`usuario:${a.id}`);
    expect(t.asaas.clientes.at(-1)).toMatchObject({ externalReference: `usuario:${a.id}`, mobilePhone: '42998765432' });
  });

  it('webhook repetido 5 vezes não duplica nada', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    const emailsAntes = t.mailer.enviados.length;
    for (let i = 0; i < 5; i++) {
      const r = await t.webhook('PAYMENT_CONFIRMED', pid, 'evt_repetido_1');
      expect(r.statusCode).toBe(200);
    }
    await t.app.deps.aguardarTarefas();
    const [n] = await t.db.select({ n: count() }).from(schema.webhookEventos).where(eq(schema.webhookEventos.id, 'evt_repetido_1'));
    expect(Number(n!.n)).toBe(1);
    expect(t.mailer.enviados.length - emailsAntes).toBe(1);
    expect(t.mailer.enviados.at(-1)!.html).toContain('R$ 397,00');
    expect(t.mailer.enviados.at(-1)!.html).toContain(pid);
    const p = await pedidoDe(pix.pedidoId);
    expect(p.status).toBe('pago');
    expect((await usuario(t, a.id)).acesso).toBe(true);
    // outro evento de pagamento do mesmo pedido também não duplica o e-mail
    await t.webhook('PAYMENT_RECEIVED', pid, 'evt_repetido_2');
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.length - emailsAntes).toBe(1);
    const st = (await t.chamar('pagamentoStatus', { cookie: a.cookie })).json();
    expect(st).toMatchObject({ status: 'pago', acesso: true, expirado: false });
  });

  it('webhook com token errado recebe 401 e não altera nada', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    const r = await t.webhook('PAYMENT_CONFIRMED', pid, 'evt_token_errado', 'token-errado');
    expect(r.statusCode).toBe(401);
    const sem = await t.chamar('webhookAsaas', { corpo: { id: 'evt_x', event: 'PAYMENT_CONFIRMED', payment: { id: pid } } });
    expect(sem.statusCode).toBe(401);
    const [n] = await t.db.select({ n: count() }).from(schema.webhookEventos).where(eq(schema.webhookEventos.id, 'evt_token_errado'));
    expect(Number(n!.n)).toBe(0);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('pendente');
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('estorno revoga o acesso e derruba as sessões', async () => {
    const a = await t.alunoPago();
    const login2 = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login2.statusCode).toBe(200);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    const r = await t.webhook('PAYMENT_REFUNDED', p!.asaasPaymentId!);
    expect(r.statusCode).toBe(200);
    expect((await usuario(t, a.id)).acesso).toBe(false);
    const [s] = await t.db.select({ n: count() }).from(schema.sessoes).where(eq(schema.sessoes.usuarioId, a.id));
    expect(Number(s!.n)).toBe(0);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(401);
    expect((await pedidoDe(p!.id)).status).toBe('estornado');
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.at(-1)!.assunto).toMatch(/reembolso/i);
  });

  it('status consulta o Asaas depois de 60 s pendente (webhook atrasado)', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    t.asaas.definirStatus(pid, 'RECEIVED');
    const antes = t.asaas.chamadas.obterCobranca;
    expect((await t.chamar('pagamentoStatus', { cookie: a.cookie })).json().status).toBe('pendente');
    expect(t.asaas.chamadas.obterCobranca).toBe(antes);
    t.relogio.avancar(61_000);
    const st = (await t.chamar('pagamentoStatus', { cookie: a.cookie })).json();
    expect(st).toMatchObject({ status: 'pago', acesso: true });
    expect((await usuario(t, a.id)).acesso).toBe(true);
  });

  it('Pix expirado: status expirado e um novo Pix é gerado', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    t.relogio.avancar(31 * 60_000);
    expect((await t.chamar('pagamentoStatus', { cookie: a.cookie })).json().expirado).toBe(true);
    const novo = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    expect(novo.pedidoId).not.toBe(pix.pedidoId);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('vencido');
  });

  it('PAYMENT_OVERDUE marca o pedido como vencido', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    await t.webhook('PAYMENT_OVERDUE', (await pedidoDe(pix.pedidoId)).asaasPaymentId!);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('vencido');
  });

  it('falha do Asaas: 502 com mensagem em português', async () => {
    const a = await t.cadastrar();
    t.asaas.falharProxima();
    const r = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(r.statusCode).toBe(502);
    expect(r.json().erro).toBe('Não foi possível gerar o Pix agora. Tente de novo em alguns minutos.');
  });

  it('reembolso pelo admin chama o estorno do Asaas e espera o webhook', async () => {
    const a = await t.alunoPago();
    const adm = await t.admin();
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    const r = await t.chamar('adminPedidoReembolso', { cookie: adm.cookie, params: { id: p!.id }, corpo: { motivo: 'Arrependimento (CDC 49)' } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().status).toBe('aguardando_webhook');
    expect(t.asaas.estornos).toContain(p!.asaasPaymentId);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const lista = (await t.chamar('adminPedidosListar', { cookie: adm.cookie, query: { status: 'pago' } })).json();
    expect(lista.itens[0].usuario.cpfOculto).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    const aud = (await t.chamar('adminAuditoria', { cookie: adm.cookie, query: { acao: 'pedido.reembolso' } })).json();
    expect(aud.total).toBeGreaterThan(0);
  });

  it('reembolso fora dos 7 dias exige confirmação', async () => {
    const a = await t.alunoPago();
    const adm = await t.admin();
    t.relogio.avancar(8 * 24 * 3600_000);
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    const r = await t.chamar('adminPedidoReembolso', { cookie: adm.cookie, params: { id: p!.id }, corpo: { motivo: 'Pedido do cliente' } });
    expect(r.statusCode).toBe(409);
    const r2 = await t.chamar('adminPedidoReembolso', { cookie: adm.cookie, params: { id: p!.id }, corpo: { motivo: 'Pedido do cliente', foraDoPrazo: true } });
    expect(r2.statusCode).toBe(200);
  });
});
