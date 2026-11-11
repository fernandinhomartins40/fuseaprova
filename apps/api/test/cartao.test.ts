/**
 * D43: cartão de crédito em até 6x sem juros (página do Asaas), por tempo limitado.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { valorMenorQueOPedido } from '../src/servicos/pagamento.js';
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

const token = () => ({ 'asaas-access-token': t.config.asaas.webhookToken });

describe('cartão em até 6x (D43)', () => {
  it('cria o parcelamento no Asaas, devolve a página do Asaas e reaproveita o pendente', async () => {
    const a = await t.cadastrar();
    const r = await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 6 } });
    expect(r.statusCode, r.body).toBe(200);
    const c = r.json();
    expect(c).toMatchObject({ valorCentavos: 39700, parcelas: 6 });
    expect(c.url).toMatch(/^https:\/\//);
    const p = await pedidoDe(c.pedidoId);
    expect(p).toMatchObject({ parcelas: 6, status: 'pendente', cartaoUrl: c.url });
    expect(t.asaas.cobrancas.get(p.asaasPaymentId!)!.dados).toMatchObject({
      billingType: 'CREDIT_CARD',
      installmentCount: 6,
      totalValue: 397,
    });
    // Mesmo pedido: reaproveita; outra quantidade de parcelas: troca e remove o parcelamento antigo.
    expect((await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 6 } })).json().pedidoId).toBe(c.pedidoId);
    const r3 = (await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 3 } })).json();
    expect(r3.pedidoId).not.toBe(c.pedidoId);
    expect((await pedidoDe(c.pedidoId)).status).toBe('vencido');
    expect(t.asaas.parcelamentosRemovidos).toContain(t.asaas.cobrancas.get(p.asaasPaymentId!)!.installment);
  });

  it('à vista no cartão manda value, sem parcelamento', async () => {
    const a = await t.cadastrar();
    const c = (await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 1 } })).json();
    const dados = t.asaas.cobrancas.get((await pedidoDe(c.pedidoId)).asaasPaymentId!)!.dados;
    expect(dados).toMatchObject({ billingType: 'CREDIT_CARD', value: 397 });
    expect(dados.installmentCount).toBeUndefined();
  });

  it('parcelas fora de 1 a 6 dão 400', async () => {
    const a = await t.cadastrar();
    expect((await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 7 } })).statusCode).toBe(400);
    expect((await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 0 } })).statusCode).toBe(400);
  });

  it('o webhook da 1ª parcela libera, mesmo com o valor de UMA parcela, e cancela o Pix aberto', async () => {
    const a = await t.cadastrar();
    const pix = (await t.chamar('pagamentoPix', { cookie: a.cookie })).json();
    const c = (await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 6 } })).json();
    // O Pix continua valendo enquanto o aluno está no Asaas.
    expect((await pedidoDe(pix.pedidoId)).status).toBe('pendente');
    const pid = (await pedidoDe(c.pedidoId)).asaasPaymentId!;
    const r = await t.chamar('webhookAsaas', {
      headers: token(),
      corpo: { id: 'evt_cartao_6x', event: 'PAYMENT_CONFIRMED', payment: { id: pid, value: 66.16, netValue: 63.5, billingType: 'CREDIT_CARD' } },
    });
    expect(r.statusCode, r.body).toBe(200);
    const p = await pedidoDe(c.pedidoId);
    expect(p.status).toBe('pago');
    expect(p.valorLiquidoCentavos).toBe(6350 * 6);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const pixDepois = await pedidoDe(pix.pedidoId);
    expect(pixDepois.status).toBe('vencido');
    expect(t.asaas.removidas).toContain(pixDepois.asaasPaymentId);
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.at(-1)!.html).toContain('Cartão de crédito em 6x sem juros');
  });

  it('parcela abaixo do valor certo não libera', async () => {
    const a = await t.cadastrar();
    const c = (await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 6 } })).json();
    const pid = (await pedidoDe(c.pedidoId)).asaasPaymentId!;
    await t.chamar('webhookAsaas', {
      headers: token(),
      corpo: { id: 'evt_cartao_menor', event: 'PAYMENT_CONFIRMED', payment: { id: pid, value: 10 } },
    });
    expect((await pedidoDe(c.pedidoId)).status).toBe('pendente');
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('reembolso do superadmin estorna o parcelamento inteiro', async () => {
    const a = await t.cadastrar();
    const sup = await t.superadmin();
    const c = (await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 4 } })).json();
    const pid = (await pedidoDe(c.pedidoId)).asaasPaymentId!;
    await t.webhook('PAYMENT_CONFIRMED', pid);
    const corpo = { motivo: 'Garantia de 7 dias', confirmacao: { senha: sup.senha } };
    const r = await t.chamar('superPagamentoEstornar', { cookie: sup.cookie, params: { id: c.pedidoId }, corpo });
    expect(r.statusCode, r.body).toBe(200);
    expect(t.asaas.parcelamentosEstornados).toEqual([t.asaas.cobrancas.get(pid)!.installment]);
    expect(t.asaas.estornos).not.toContain(pid);
    await t.webhook('PAYMENT_REFUNDED', pid);
    expect((await usuario(t, a.id)).acesso).toBe(false);
  });

  it('depois de CARTAO_ATE o cartão some da config pública e a rota recusa', async () => {
    const a = await t.cadastrar();
    expect((await t.chamar('configPublica', {})).json().cartaoAte).toBe(t.config.cartaoAte);
    const antes = t.relogio.agora();
    t.relogio.definir('2026-11-26T00:01:00-03:00');
    try {
      expect((await t.chamar('configPublica', {})).json().cartaoAte).toBeNull();
      const r = await t.chamar('pagamentoCartao', { cookie: a.cookie, corpo: { parcelas: 2 } });
      expect(r.statusCode).toBe(409);
    } finally {
      t.relogio.definir(antes);
    }
  });

  it('valorMenorQueOPedido aceita o arredondamento das parcelas', () => {
    expect(valorMenorQueOPedido(6616, 39700, 6)).toBe(false);
    expect(valorMenorQueOPedido(6617, 39700, 6)).toBe(false);
    expect(valorMenorQueOPedido(6600, 39700, 6)).toBe(true);
    expect(valorMenorQueOPedido(39699, 39700, null)).toBe(true);
    expect(valorMenorQueOPedido(undefined, 39700, 6)).toBe(false);
  });
});
