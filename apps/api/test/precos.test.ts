import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';

/** D23: preços editáveis no painel e cupons de desconto, com o Asaas acompanhando. */
let t: AmbienteTeste;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  sup = await t.superadmin();
}, 90_000);
afterAll(() => t.fechar());

const conf = () => ({ senha: sup.senha });
const pix = (a: Aluno, corpo: { cupom?: string; concursoId?: string } = {}) => t.chamar('pagamentoPix', { cookie: a.cookie, corpo });
const pedido = async (id: string) => (await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id)))[0]!;
const salvarPrecos = (precoCentavos: number, precoAdicionalCentavos: number, precoDeCentavos: number | null) =>
  t.chamar('superPrecosSalvar', {
    cookie: sup.cookie,
    corpo: { precoCentavos, precoAdicionalCentavos, precoDeCentavos, motivo: 'Preço de lançamento', confirmacao: conf() },
  });
const cupomBase = {
  descricao: '',
  validoAte: null,
  limiteUsos: null,
  concursoId: null,
  ativo: true,
  motivo: 'Campanha de Palmital',
};
const criarCupom = (dados: Record<string, unknown>) => t.chamar('superCupomCriar', { cookie: sup.cookie, corpo: { ...cupomBase, ...dados } });

describe('preços pelo painel (D23)', () => {
  it('sem nada salvo valem os do .env', async () => {
    const r = (await t.chamar('superPrecos', { cookie: sup.cookie })).json();
    expect(r).toMatchObject({ valores: { precoCentavos: 39700, precoAdicionalCentavos: 19700, precoDeCentavos: null }, padrao: { precoCentavos: 39700 }, atualizadoEm: null });
    expect((await t.chamar('configPublica')).json()).toMatchObject({ precoCentavos: 39700, precoAdicionalCentavos: 19700, precoDeCentavos: null });
  });

  it('aluno não muda preço; preço "de" menor que o preço é recusado', async () => {
    const a = await t.cadastrar();
    const r = await t.chamar('superPrecosSalvar', { cookie: a.cookie, corpo: { precoCentavos: 100, precoAdicionalCentavos: 100, precoDeCentavos: null, motivo: 'xxxxx', confirmacao: {} } });
    expect(r.statusCode).toBe(403);
    const ruim = await salvarPrecos(19700, 19700, 19700);
    expect(ruim.statusCode).toBe(400);
    expect(ruim.json().campos.precoDeCentavos).toMatch(/maior/);
    const barato = await salvarPrecos(100, 19700, null);
    expect(barato.statusCode).toBe(400);
  });

  it('salvar cancela no Asaas o Pix pendente com o valor antigo e o próximo sai com o novo', async () => {
    const a = await t.cadastrar();
    const antigo = (await pix(a)).json();
    expect(antigo.valorCentavos).toBe(39700);
    const idAsaas = (await pedido(antigo.pedidoId)).asaasPaymentId!;

    const r = await salvarPrecos(19700, 14700, 39700);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ valores: { precoCentavos: 19700, precoAdicionalCentavos: 14700, precoDeCentavos: 39700 }, atualizadoPor: { id: sup.id } });
    expect(r.json().cobrancasCanceladas).toBeGreaterThanOrEqual(1);
    expect(t.asaas.removidas).toContain(idAsaas);
    expect(await pedido(antigo.pedidoId)).toMatchObject({ status: 'vencido' });
    expect((await pedido(antigo.pedidoId)).canceladoEm).not.toBeNull();

    const novo = (await pix(a)).json();
    expect(novo).toMatchObject({ valorCentavos: 19700, valorOriginalCentavos: null, cupom: null });
    expect(novo.pedidoId).not.toBe(antigo.pedidoId);
    expect(t.asaas.cobrancas.get((await pedido(novo.pedidoId)).asaasPaymentId!)!.value).toBe(197);
    expect((await t.chamar('configPublica')).json()).toMatchObject({ precoCentavos: 19700, precoAdicionalCentavos: 14700, precoDeCentavos: 39700 });
    expect((await t.chamar('meusConcursos', { cookie: a.cookie })).json()).toMatchObject({ precoCheioCentavos: 19700, precoAdicionalCentavos: 14700 });

    // Mesmo preço: o Pix pendente é reaproveitado, nada é cancelado.
    const de_novo = await salvarPrecos(19700, 14700, 39700);
    expect(de_novo.json().cobrancasCanceladas).toBe(0);
    expect((await pix(a)).json().pedidoId).toBe(novo.pedidoId);

    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'precos.salvar' } })).json();
    expect(aud.itens[0]).toMatchObject({ acao: 'precos.salvar', motivo: 'Preço de lançamento', depois: { precoCentavos: 19700 } });
  });
});

describe('cupons (D23)', () => {
  it('cria, confere e aplica no Pix', async () => {
    const c = await criarCupom({ codigo: ' palmital 10 ', tipo: 'percentual', valor: 10 });
    expect(c.statusCode, c.body).toBe(200);
    expect(c.json().cupom).toMatchObject({ codigo: 'PALMITAL10', usos: 0, pendentes: 0, ativo: true });
    expect((await criarCupom({ codigo: 'palmital10', tipo: 'fixo', valor: 1000 })).statusCode).toBe(409);
    expect((await criarCupom({ codigo: 'GRATIS', tipo: 'percentual', valor: 100 })).json().campos.valor).toMatch(/gratuito/);

    const a = await t.cadastrar();
    const consulta = await t.chamar('pagamentoCupom', { cookie: a.cookie, corpo: { codigo: 'palmital10' } });
    expect(consulta.statusCode, consulta.body).toBe(200);
    expect(consulta.json()).toEqual({ codigo: 'PALMITAL10', descricao: '10% de desconto', valorCentavos: 17730, valorOriginalCentavos: 19700, descontoCentavos: 1970 });

    const p = (await pix(a, { cupom: 'palmital10' })).json();
    expect(p).toMatchObject({ valorCentavos: 17730, valorOriginalCentavos: 19700, cupom: 'PALMITAL10' });
    expect(t.asaas.cobrancas.get((await pedido(p.pedidoId)).asaasPaymentId!)!.value).toBe(177.3);
    // Sem o cupom, o Pix com desconto é trocado por um de preço cheio (e sai do Asaas).
    const sem = (await pix(a)).json();
    expect(sem).toMatchObject({ valorCentavos: 19700, cupom: null });
    expect(t.asaas.removidas).toContain((await pedido(p.pedidoId)).asaasPaymentId);
  });

  it('cupom inválido, de outro concurso ou esgotado responde 400 em campos.cupom', async () => {
    const a = await t.cadastrar();
    const r = await pix(a, { cupom: 'NAOEXISTE' });
    expect(r.statusCode).toBe(400);
    expect(r.json().campos.cupom).toMatch(/não encontrado/);

    const outro = await t.db.insert(schema.concursos).values({ nome: 'Outro', slug: 'outro-2026', banca: 'FAU', orgao: 'X', municipio: 'X', uf: 'PR', ano: 2026 }).returning();
    expect((await criarCupom({ codigo: 'SO-OUTRO', tipo: 'fixo', valor: 5000, concursoId: outro[0]!.id })).statusCode).toBe(200);
    expect((await t.chamar('pagamentoCupom', { cookie: a.cookie, corpo: { codigo: 'SO-OUTRO' } })).json().campos.cupom).toMatch(/não vale para este concurso/);

    const unico = (await criarCupom({ codigo: 'UMAVEZ', tipo: 'fixo', valor: 5000, limiteUsos: 1 })).json().cupom;
    const p = (await pix(a, { cupom: 'UMAVEZ' })).json();
    expect(p.valorCentavos).toBe(14700);
    expect((await t.webhook('PAYMENT_RECEIVED', (await pedido(p.pedidoId)).asaasPaymentId!)).statusCode).toBe(200);
    await t.app.deps.aguardarTarefas();
    const lista = (await t.chamar('superCupons', { cookie: sup.cookie })).json();
    expect(lista.itens.find((x: { id: string }) => x.id === unico.id)).toMatchObject({ usos: 1 });
    const b = await t.cadastrar();
    expect((await pix(b, { cupom: 'UMAVEZ' })).json().campos.cupom).toMatch(/limite/);
  });

  it('desativar o cupom cancela no Asaas os Pix pendentes feitos com ele', async () => {
    const c = (await criarCupom({ codigo: 'SEMANA', tipo: 'fixo', valor: 2000 })).json().cupom;
    const a = await t.cadastrar();
    const p = (await pix(a, { cupom: 'SEMANA' })).json();
    expect(p.valorCentavos).toBe(17700);
    const r = await t.chamar('superCupomAtualizar', {
      cookie: sup.cookie,
      params: { id: c.id },
      corpo: { ...cupomBase, codigo: 'SEMANA', tipo: 'fixo', valor: 2000, ativo: false, motivo: 'Fim da campanha' },
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ cupom: { ativo: false, pendentes: 0 }, cobrancasCanceladas: 1 });
    expect(await pedido(p.pedidoId)).toMatchObject({ status: 'vencido' });
    expect((await pix(a, { cupom: 'SEMANA' })).json().campos.cupom).toMatch(/desativado/);
  });

  it('cupom com prazo vencido não vale', async () => {
    await criarCupom({ codigo: 'ONTEM', tipo: 'percentual', valor: 5, validoAte: new Date(t.relogio.agora().getTime() - 1000).toISOString() });
    const a = await t.cadastrar();
    expect((await pix(a, { cupom: 'ONTEM' })).json().campos.cupom).toMatch(/expirou/);
  });
});
