import { readFileSync } from 'node:fs';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { DESCRICAO_COBRANCA, EVENTOS_ASAAS_WEBHOOK } from '@fuse/shared/api';
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
    expect(cob.dados).toMatchObject({ billingType: 'PIX', value: 397, description: DESCRICAO_COBRANCA });
    expect(cob.dados.description).toMatch(/^Fuse Aprova: /);
    expect(cob.dados.externalReference).toBe(`fuseaprova:usuario:${a.id}`);
    expect(t.asaas.clientes.at(-1)).toMatchObject({ externalReference: `fuseaprova:usuario:${a.id}`, mobilePhone: '42998765432' });
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

  it('conta compartilhada: evento de cobrança de outra aplicação responde 200 e não grava nada', async () => {
    const token = { 'asaas-access-token': t.config.asaas.webhookToken };
    const totalAntes = async () => Number((await t.db.select({ n: count() }).from(schema.webhookEventos))[0]!.n);
    const antes = await totalAntes();
    const outros = [
      { id: 'evt_outra_app_1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_de_outra_app', externalReference: 'mercadoflow:pedido:9', customer: 'cus_x', value: 50 } },
      { id: 'evt_outra_app_2', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_de_outra_app_2', externalReference: null } },
      { id: 'evt_outra_app_3', event: 'PAYMENT_REFUNDED', payment: { id: 'pay_de_outra_app_3' } },
      { id: 'evt_sem_payment', event: 'PAYMENT_CREATED' },
    ];
    for (const corpo of outros) {
      const r = await t.chamar('webhookAsaas', { headers: token, corpo });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json()).toEqual({ ok: true });
    }
    expect(await totalAntes()).toBe(antes);
    // Mesmo com token errado, o 401 vem antes de olhar o evento.
    const errado = await t.chamar('webhookAsaas', { headers: { 'asaas-access-token': 'x' }, corpo: outros[0] });
    expect(errado.statusCode).toBe(401);
  });

  it('evento com a nossa referência é gravado mesmo sem pedido; referência antiga vale pelo pedido', async () => {
    const token = { 'asaas-access-token': t.config.asaas.webhookToken };
    const r = await t.chamar('webhookAsaas', {
      headers: token,
      corpo: { id: 'evt_ref_nossa', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_sem_pedido', externalReference: 'fuseaprova:usuario:3f0c7a8e-2b1d-4c5e-9f00-0123456789ab' } },
    });
    expect(r.statusCode).toBe(200);
    const [e] = await t.db.select().from(schema.webhookEventos).where(eq(schema.webhookEventos.id, 'evt_ref_nossa'));
    expect(e?.processadoEm).not.toBeNull();
    // Pedido antigo, criado com "usuario:<id>": reconhecido pelo payment.id.
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    const r2 = await t.chamar('webhookAsaas', {
      headers: token,
      corpo: { id: 'evt_ref_antiga', event: 'PAYMENT_RECEIVED', payment: { id: pid, externalReference: `usuario:${a.id}` } },
    });
    expect(r2.statusCode).toBe(200);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('pago');
    expect((await usuario(t, a.id)).acesso).toBe(true);
  });

  it('PAYMENT_DELETED encerra o Pix pendente', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    await t.webhook('PAYMENT_DELETED', (await pedidoDe(pix.pedidoId)).asaasPaymentId!);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('vencido');
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('deploy/asaas-webhook.sh cadastra exatamente os eventos tratados', () => {
    const script = readFileSync(new URL('../../../deploy/asaas-webhook.sh', import.meta.url), 'utf8');
    const m = /^EVENTOS=\(([^)]*)\)/m.exec(script);
    expect(m).not.toBeNull();
    expect(m![1]!.trim().split(/\s+/)).toEqual([...EVENTOS_ASAAS_WEBHOOK]);
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

  // Auditoria PIE (R1-03, R1-04, R3-03)
  it('estorno de um pedido não revoga o acesso se há outro pedido pago', async () => {
    const a = await t.alunoPago();
    const [pago] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    const [segundo] = await t.db
      .insert(schema.pedidos)
      .values({ usuarioId: a.id, asaasPaymentId: 'pay_segundo_pix', valorCentavos: 39700, status: 'pago', pagoEm: t.relogio.agora() })
      .returning();
    await t.webhook('PAYMENT_REFUNDED', segundo!.asaasPaymentId!);
    expect((await pedidoDe(segundo!.id)).status).toBe('estornado');
    expect((await pedidoDe(pago!.id)).status).toBe('pago');
    expect((await usuario(t, a.id)).acesso).toBe(true);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
  });

  it('webhook com valor menor que o do pedido não libera o acesso', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    const r = await t.chamar('webhookAsaas', {
      headers: { 'asaas-access-token': t.config.asaas.webhookToken },
      corpo: { id: 'evt_valor_menor', event: 'PAYMENT_RECEIVED', payment: { id: pid, value: 1 } },
    });
    expect(r.statusCode).toBe(200);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('pendente');
    expect((await usuario(t, a.id)).acesso).toBe(false);
    const [e] = await t.db.select().from(schema.webhookEventos).where(eq(schema.webhookEventos.id, 'evt_valor_menor'));
    expect(e!.resultado).toBe('valor_divergente');
  });

  it('status consultando o Asaas também não libera valor menor que o do pedido (validação PIE V1-07)', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const pid = (await pedidoDe(pix.pedidoId)).asaasPaymentId!;
    const c = t.asaas.cobrancas.get(pid)!;
    c.value = 1;
    t.asaas.definirStatus(pid, 'RECEIVED');
    t.relogio.avancar(120_000);
    const st = (await t.chamar('pagamentoStatus', { cookie: a.cookie })).json();
    expect(st.acesso).toBe(false);
    expect((await pedidoDe(pix.pedidoId)).status).toBe('pendente');
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('dois pedidos de Pix ao mesmo tempo geram uma cobrança só', async () => {
    const a = await t.cadastrar();
    const antes = t.asaas.cobrancas.size;
    const [r1, r2] = await Promise.all([
      t.chamar('pagamentoPix', { cookie: a.cookie }),
      t.chamar('pagamentoPix', { cookie: a.cookie }),
    ]);
    expect(r1.json().pedidoId).toBe(r2.json().pedidoId);
    expect(t.asaas.cobrancas.size - antes).toBe(1);
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
