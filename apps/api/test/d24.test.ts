/**
 * D24 (auditoria PIE do painel superadmin, Lote 1): papéis por capacidade, guardas, rotas de negócio
 * fora do /admin, troca de papel sem acesso gratuito, último superadmin e as ações do RQ4 por
 * pedido, com DOIS concursos (Palmital, do seed, e Siqueira, clonado aqui).
 *
 * Cada caso reprova o desenho anterior (commit 2f71392).
 */
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { ROTAS, rotasComGuarda, type NomeRota } from '@fuse/shared/api';
import { ErroAsaas } from '../src/integracoes/asaas.js';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { UUID_X, usuario } from './ajuda.js';

let t: AmbienteTeste;
let adm: Aluno;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let supSem2fa: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let alunoPago: Aluno;
let palmitalId: string;
let siqueiraId: string;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  adm = await t.admin();
  sup = await t.superadmin();
  supSem2fa = await t.superadmin({ doisFatores: false });
  alunoPago = await t.alunoPago();
  const [c] = await t.db.select().from(schema.concursos).orderBy(schema.concursos.criadoEm).limit(1);
  palmitalId = c!.id;
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
  expect((await t.chamar('adminConcursoAtualizar', { cookie: adm.cookie, params: { id: siqueiraId }, corpo: { ativo: true } })).statusCode).toBe(200);
}, 120_000);
afterAll(() => t.fechar());

const params = (caminho: string) => Object.fromEntries([...caminho.matchAll(/:([A-Za-z]+)/g)].map((m) => [m[1]!, UUID_X]));
const chamarRota = (nome: NomeRota, cookie: string) => t.chamar(nome, { cookie, params: params(ROTAS[nome].caminho), corpo: {} });
const conf = () => ({ senha: sup.senha });
const pedidosDe = (usuarioId: string) => t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, usuarioId)).orderBy(schema.pedidos.criadoEm);
const pedidoPorId = async (id: string) => (await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id)))[0]!;
async function acessoNoConcurso(usuarioId: string, concursoId: string): Promise<boolean> {
  const [l] = await t.db
    .select()
    .from(schema.usuariosConcursos)
    .where(and(eq(schema.usuariosConcursos.usuarioId, usuarioId), eq(schema.usuariosConcursos.concursoId, concursoId)));
  return l?.acesso === true;
}
async function pixDe(a: Aluno, concursoId?: string, cupom?: string) {
  const r = await t.chamar('pagamentoPix', { cookie: a.cookie, corpo: { ...(concursoId ? { concursoId } : {}), ...(cupom ? { cupom } : {}) } });
  expect(r.statusCode, r.body).toBe(200);
  return pedidoPorId(r.json().pedidoId);
}
async function pagarPeloWebhook(p: { asaasPaymentId: string | null }) {
  expect((await t.webhook('PAYMENT_RECEIVED', p.asaasPaymentId!)).statusCode).toBe(200);
  await t.app.deps.aguardarTarefas();
}
const corpoManual = (extra: Record<string, unknown> = {}) => ({
  recebidoEm: '2026-10-19',
  forma: 'pix_direto',
  observacao: 'Pix direto na conta, comprovante no WhatsApp',
  confirmacao: conf(),
  ...extra,
});

/* ===================================================================== guardas */

describe('guardas por capacidade (S-01, S-02, S-13)', () => {
  const estudo = rotasComGuarda('acesso');
  const doAluno = rotasComGuarda('aluno');
  const conteudo = rotasComGuarda('conteudo');

  it('o registro tem as guardas novas e a antiga "admin" sumiu', () => {
    expect(estudo.length).toBeGreaterThan(20);
    expect(doAluno).toEqual(expect.arrayContaining(['pagamentoPix', 'pagamentoCupom', 'pagamentoStatus', 'meusConcursos', 'meExportar', 'meExcluir']));
    expect(conteudo.length).toBeGreaterThan(40);
    expect(rotasComGuarda('admin' as never)).toEqual([]);
  });

  it.each(estudo)('estudo %s: 403 para admin, superadmin com e sem 2FA (nunca 402 nem 200)', async (nome) => {
    for (const c of [adm.cookie, sup.cookie, supSem2fa.cookie]) {
      const r = await chamarRota(nome, c);
      expect(r.statusCode, `${nome}`).toBe(403);
      expect(r.json().codigo).toBe('proibido');
    }
  });

  it.each(doAluno)('do aluno %s: 403 para admin e superadmin', async (nome) => {
    for (const c of [adm.cookie, sup.cookie]) {
      const r = await chamarRota(nome, c);
      expect(r.statusCode, `${nome}`).toBe(403);
      expect(r.json().codigo).toBe('proibido');
    }
  });

  it.each(conteudo)('conteúdo %s: 403 para aluno e para superadmin sem 2FA; admin e superadmin com 2FA passam da guarda', async (nome) => {
    const al = await chamarRota(nome, alunoPago.cookie);
    expect(al.statusCode).toBe(403);
    expect(al.json().codigo).toBe('proibido');
    const sem = await chamarRota(nome, supSem2fa.cookie);
    expect(sem.statusCode).toBe(403);
    expect(sem.json().codigo).toMatch(/^dois_fatores_/);
    for (const c of [adm.cookie, sup.cookie]) {
      const r = await chamarRota(nome, c);
      expect(r.statusCode, `${nome}: ${r.body}`).not.toBe(403);
      expect(r.statusCode).toBeLessThan(500);
    }
  });

  it('as rotas de negócio não existem mais no /admin (404 para todos)', async () => {
    const caminhos = [
      ['GET', '/api/admin/pedidos'],
      ['POST', `/api/admin/pedidos/${UUID_X}/reembolso`],
      ['GET', '/api/admin/usuarios'],
      ['GET', `/api/admin/usuarios/${UUID_X}`],
      ['POST', `/api/admin/usuarios/${UUID_X}/revogar-sessoes`],
      ['POST', `/api/admin/usuarios/${UUID_X}/liberar-acesso`],
      ['POST', `/api/admin/usuarios/${UUID_X}/revogar-acesso`],
      ['GET', '/api/admin/auditoria'],
    ] as const;
    for (const [method, url] of caminhos) {
      for (const cookie of [adm.cookie, sup.cookie]) {
        const r = await t.app.inject({ method, url, headers: { cookie }, payload: method === 'POST' ? { motivo: 'teste de rota removida' } : undefined });
        expect(r.statusCode, `${method} ${url}`).toBe(404);
      }
    }
    // O painel do admin é só de conteúdo.
    const p = (await t.chamar('adminPainel', { cookie: adm.cookie })).json();
    expect(p).not.toHaveProperty('vendasHoje');
  });

  it('imagens das questões: aluno com acesso e equipe de conteúdo; aluno sem pagar 402; superadmin sem 2FA 403', async () => {
    const url = '/api/arquivos/uploads/3f0c7a8e-2b1d-4c5e-9f00-0123456789ab.png';
    const semPagar = await t.cadastrar();
    const st = async (cookie: string) => (await t.app.inject({ method: 'GET', url, headers: { cookie } })).statusCode;
    expect(await st(alunoPago.cookie)).toBe(404); // passou da guarda (arquivo não existe)
    expect(await st(adm.cookie)).toBe(404);
    expect(await st(sup.cookie)).toBe(404);
    expect(await st(semPagar.cookie)).toBe(402);
    expect(await st(supSem2fa.cookie)).toBe(403);
    expect((await t.app.inject({ method: 'GET', url })).statusCode).toBe(401);
  });

  it('equipe com acesso=true legado (CLI antiga) continua sem entrar no estudo (C7, sem migração)', async () => {
    await t.db.update(schema.usuarios).set({ acesso: true }).where(eq(schema.usuarios.id, adm.id));
    expect((await t.chamar('trilha', { cookie: adm.cookie })).statusCode).toBe(403);
    expect((await t.chamar('offlinePacote', { cookie: sup.cookie })).statusCode).toBe(403);
    await t.db.update(schema.usuarios).set({ acesso: false }).where(eq(schema.usuarios.id, adm.id));
  });

  it('S-13: a equipe não se exclui nem exporta por /me; o último superadmin nunca some', async () => {
    const corpo = { senha: sup.senha, confirmacao: 'EXCLUIR' };
    const del = await t.chamar('meExcluir', { cookie: sup.cookie, corpo });
    expect(del.statusCode).toBe(403);
    expect((await t.chamar('meExportar', { cookie: supSem2fa.cookie })).statusCode).toBe(403);
    expect((await t.chamar('meExcluir', { cookie: adm.cookie, corpo: { senha: adm.senha, confirmacao: 'EXCLUIR' } })).statusCode).toBe(403);
    expect((await usuario(t, sup.id)).excluidoEm).toBeNull();
    // A equipe não escolhe cargo pelo /me.
    const [cargo] = await t.db.select().from(schema.cargos).limit(1);
    expect((await t.chamar('meAtualizar', { cookie: adm.cookie, corpo: { cargoId: cargo!.id } })).statusCode).toBe(403);
    // /me, senha e sair continuam para todos.
    expect((await t.chamar('meObter', { cookie: adm.cookie })).statusCode).toBe(200);
  });
});

/* ======================================================== troca de papel (S-05) */

describe('troca de papel recalcula o acesso pelos pedidos (S-05) e o último superadmin (S-24)', () => {
  it('superadmin com acesso legado e sem pedido, rebaixado a aluno: 402 (sem acesso gratuito)', async () => {
    const s2 = await t.superadmin();
    // Legado: a CLI antiga ligava `acesso` e criava a linha do concurso.
    await t.db.update(schema.usuarios).set({ acesso: true, concursoId: palmitalId }).where(eq(schema.usuarios.id, s2.id));
    await t.db.insert(schema.usuariosConcursos).values({ usuarioId: s2.id, concursoId: palmitalId, acesso: true, acessoEm: t.relogio.agora() });
    const r = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: s2.id }, corpo: { papel: 'aluno', motivo: 'Saiu da sociedade', confirmacao: conf() } });
    expect(r.statusCode, r.body).toBe(200);
    expect((await usuario(t, s2.id)).acesso).toBe(false);
    expect(await acessoNoConcurso(s2.id, palmitalId)).toBe(false);
    const login = await t.chamar('authLogin', { corpo: { email: s2.email, senha: s2.senha } });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({ proximo: 'pagamento', area: 'aluno' });
    const cookie = login.headers['set-cookie']!.toString().split(';')[0]!;
    expect((await t.chamar('trilha', { cookie })).statusCode).toBe(402);
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { alvo: `usuario:${s2.id}`, acao: 'usuario.papel' } })).json();
    expect(aud.itens[0]).toMatchObject({ antes: { papel: 'superadmin', acesso: true }, depois: { papel: 'aluno', acesso: false } });
  });

  it('aluno com pedido pago vira admin e volta a aluno: recupera só o concurso pago', async () => {
    const a = await t.alunoPago();
    await t.db.insert(schema.usuariosConcursos).values({ usuarioId: a.id, concursoId: siqueiraId, acesso: true, acessoEm: t.relogio.agora() });
    for (const papel of ['admin', 'aluno'] as const) {
      const r = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: a.id }, corpo: { papel, motivo: 'Teste de troca', confirmacao: conf() } });
      expect(r.statusCode, r.body).toBe(200);
    }
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
    expect(await acessoNoConcurso(a.id, siqueiraId)).toBe(false);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    const cookie = login.headers['set-cookie']!.toString().split(';')[0]!;
    expect((await t.chamar('trilha', { cookie })).statusCode).toBe(200);
  });

  it('último superadmin: rebaixar, bloquear ou excluir o único ativo dá 409', async () => {
    const t2 = await criarAmbienteTeste({ seed: false });
    try {
      const unico = await t2.superadmin();
      const c = { confirmacao: { senha: unico.senha }, motivo: 'Teste do último' };
      const papel = await t2.chamar('superUsuarioPapel', { cookie: unico.cookie, params: { id: unico.id }, corpo: { ...c, papel: 'admin' } });
      expect(papel.json().codigo).toBe('ultimo_superadmin');
      const outro = await t2.superadmin();
      // Com dois, um rebaixa o outro; depois o que sobrou não pode ser rebaixado.
      expect((await t2.chamar('superUsuarioPapel', { cookie: unico.cookie, params: { id: outro.id }, corpo: { ...c, papel: 'admin' } })).statusCode).toBe(200);
      expect((await t2.chamar('superUsuarioPapel', { cookie: unico.cookie, params: { id: unico.id }, corpo: { ...c, papel: 'aluno' } })).json().codigo).toBe('ultimo_superadmin');
    } finally {
      await t2.fechar();
    }
  }, 60_000);
});

/* ================================================================ RQ4 por pedido */

describe('RQ4 — liberar acesso de um pedido pago (S-07, caso A)', () => {
  it('pedido pago sem o concurso liberado: o detalhe mostra, "liberar" libera só ele, é idempotente e auditado', async () => {
    const a = await t.alunoPago();
    const p2 = await pixDe(a, siqueiraId);
    expect(p2.valorCentavos).toBe(19700);
    await pagarPeloWebhook(p2);
    // A liberação falhou (simulado).
    await t.db
      .update(schema.usuariosConcursos)
      .set({ acesso: false })
      .where(and(eq(schema.usuariosConcursos.usuarioId, a.id), eq(schema.usuariosConcursos.concursoId, siqueiraId)));
    const det = (await t.chamar('superPagamentoObter', { cookie: sup.cookie, params: { id: p2.id } })).json();
    expect(det.pagamento).toMatchObject({
      status: 'pago',
      concurso: { id: siqueiraId, nome: expect.stringContaining('Siqueira') },
      concursoLiberado: false,
      usuario: { acesso: true },
    });
    // Corpo sem reconfirmação: 400; admin: 403; pedido pendente: 409.
    expect((await t.chamar('superPagamentoLiberar', { cookie: sup.cookie, params: { id: p2.id }, corpo: { motivo: 'Liberação falhou' } })).statusCode).toBe(400);
    const corpo = { motivo: 'A liberação falhou no webhook', confirmacao: conf() };
    expect((await t.chamar('superPagamentoLiberar', { cookie: adm.cookie, params: { id: p2.id }, corpo })).statusCode).toBe(403);
    const r = await t.chamar('superPagamentoLiberar', { cookie: sup.cookie, params: { id: p2.id }, corpo });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ alterado: true, pagamento: { concursoLiberado: true } });
    expect(await acessoNoConcurso(a.id, siqueiraId)).toBe(true);
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
    const de2 = await t.chamar('superPagamentoLiberar', { cookie: sup.cookie, params: { id: p2.id }, corpo });
    expect(de2.json()).toMatchObject({ alterado: false });
    expect(await pedidosDe(a.id)).toHaveLength(2);
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { alvo: `pedido:${p2.id}`, acao: 'pedido.liberar' } })).json();
    expect(aud.total).toBe(2);
    expect(aud.itens.map((i: { motivo: string }) => i.motivo)).toEqual([corpo.motivo, corpo.motivo]);

    // Sem acesso gratuito: um pedido pendente não é liberado.
    const b = await t.cadastrar();
    const pend = await pixDe(b);
    const nao = await t.chamar('superPagamentoLiberar', { cookie: sup.cookie, params: { id: pend.id }, corpo });
    expect(nao.statusCode).toBe(409);
    expect((await usuario(t, b.id)).acesso).toBe(false);
  });

  it('conciliação de um pedido pago aqui e no Asaas confere a liberação ("pago sem liberação") e corrige', async () => {
    const a = await t.alunoPago();
    const [p] = await pedidosDe(a.id);
    t.asaas.definirStatus(p!.asaasPaymentId!, 'RECEIVED');
    const ok = (await t.chamar('superPagamentoConciliar', { cookie: sup.cookie, params: { id: p!.id }, corpo: {} })).json();
    expect(ok).toMatchObject({ divergente: false, mensagem: expect.stringMatching(/Tudo certo/) });
    await t.db.update(schema.usuariosConcursos).set({ acesso: false }).where(eq(schema.usuariosConcursos.usuarioId, a.id));
    const rel = (await t.chamar('superConciliarLote', { cookie: sup.cookie, corpo: { de: '2026-10-01', ate: '2026-12-31', corrigir: false } })).json();
    const item = rel.itens.find((i: { pedidoId: string }) => i.pedidoId === p!.id);
    expect(item).toMatchObject({ divergente: true, corrigido: false, mensagem: expect.stringMatching(/Pago sem liberação/) });
    const cor = (await t.chamar('superPagamentoConciliar', { cookie: sup.cookie, params: { id: p!.id }, corpo: {} })).json();
    expect(cor).toMatchObject({ divergente: true, corrigido: true, mensagem: expect.stringMatching(/liberado agora/) });
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
  });
});

describe('RQ4 — aprovar manualmente um Pix pendente ou vencido (S-06, caso B e C)', () => {
  it('aluno com outro concurso liberado: aprova O PEDIDO de Siqueira com o valor dele (adicional + cupom) e preserva Palmital', async () => {
    const cupom = await t.chamar('superCupomCriar', {
      cookie: sup.cookie,
      corpo: { codigo: 'SIQ10', tipo: 'percentual', valor: 10, descricao: '', validoAte: null, limiteUsos: null, concursoId: null, ativo: true, motivo: 'Campanha de Siqueira', confirmacao: conf() },
    });
    expect(cupom.statusCode, cupom.body).toBe(200);
    const a = await t.alunoPago();
    const p = await pixDe(a, siqueiraId, 'SIQ10');
    expect(p).toMatchObject({ valorCentavos: 17730, valorOriginalCentavos: 19700, concursoId: siqueiraId });
    const lista = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { concursoId: siqueiraId } })).json();
    expect(lista.itens.every((x: { concurso: { id: string } }) => x.concurso.id === siqueiraId)).toBe(true);
    expect(lista.itens.find((x: { id: string }) => x.id === p.id)).toMatchObject({ cupomCodigo: 'SIQ10', valorOriginalCentavos: 19700, descontoCentavos: 1970, concursoLiberado: false });

    const r = await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p.id }, corpo: corpoManual() });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ pedidoId: p.id, jaAprovado: false, pagoNoAsaas: false, asaas: { acao: 'receber_em_dinheiro', ok: true } });
    const depois = await pedidoPorId(p.id);
    expect(depois).toMatchObject({ status: 'pago', metodo: 'manual', valorCentavos: 17730, valorOriginalCentavos: 19700, cupomId: p.cupomId, concursoId: siqueiraId, aprovadoPor: sup.id });
    expect(t.asaas.recebidasEmDinheiro).toContainEqual({ id: p.asaasPaymentId, paymentDate: '2026-10-19', value: 177.3 });
    expect(await acessoNoConcurso(a.id, siqueiraId)).toBe(true);
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
    expect(await pedidosDe(a.id)).toHaveLength(2);
    // Idempotente.
    const de2 = (await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p.id }, corpo: corpoManual() })).json();
    expect(de2).toMatchObject({ pedidoId: p.id, jaAprovado: true });
    expect(await pedidosDe(a.id)).toHaveLength(2);
    // A ficha mostra os dois concursos com o pedido que libera cada um.
    const ficha = (await t.chamar('superUsuarioObter', { cookie: sup.cookie, params: { id: a.id } })).json();
    expect(ficha.concursos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: palmitalId, acesso: true }),
        expect.objectContaining({ id: siqueiraId, acesso: true, pedidoPagoId: p.id }),
      ]),
    );
    const fin = (await t.chamar('superFinanceiro', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-12-31', concursoId: siqueiraId, metodo: 'manual' } })).json();
    expect(fin.concursoId).toBe(siqueiraId);
    expect(fin.totais.manual.centavos).toBeGreaterThanOrEqual(17730);
    const csv = (await t.chamar('superPagamentosCsv', { cookie: sup.cookie, query: { concursoId: siqueiraId } })).json();
    expect(csv.conteudo.split('\r\n')[0]).toContain('concurso;cupom;valor_original_reais;desconto_reais');
    expect(csv.conteudo).toContain('SIQ10');
  });

  it('Pix vencido comprovado por fora: este pedido vira pago (sem 2º pedido) e a cobrança é cancelada; pela ficha também usa o vencido', async () => {
    const a = await t.cadastrar();
    const p = await pixDe(a);
    await t.webhook('PAYMENT_OVERDUE', p.asaasPaymentId!);
    expect((await pedidoPorId(p.id)).status).toBe('vencido');
    const r = await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p.id }, corpo: corpoManual({ acaoAsaas: 'cancelar' }) });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().asaas).toMatchObject({ acao: 'cancelar', ok: true });
    expect(await pedidosDe(a.id)).toHaveLength(1);
    expect(await pedidoPorId(p.id)).toMatchObject({ status: 'pago', metodo: 'manual', valorCentavos: 39700 });
    expect(t.asaas.removidas).toContain(p.asaasPaymentId);
    expect((await usuario(t, a.id)).acesso).toBe(true);

    // Pela ficha, com o concurso explícito: o vencido desse concurso é usado (sem pedido novo).
    const b = await t.cadastrar();
    const pb = await pixDe(b);
    await t.webhook('PAYMENT_OVERDUE', pb.asaasPaymentId!);
    const rf = await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: b.id }, corpo: corpoManual({ concursoId: palmitalId }) });
    expect(rf.statusCode, rf.body).toBe(200);
    expect(rf.json().pedidoId).toBe(pb.id);
    expect(await pedidosDe(b.id)).toHaveLength(1);
    // Sem Pix nenhum, pela ficha: preço do concurso para o aluno (adicional, porque já pagou Palmital).
    const sieq = await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: b.id }, corpo: corpoManual({ concursoId: siqueiraId }) });
    expect(sieq.statusCode, sieq.body).toBe(200);
    const novo = await pedidoPorId(sieq.json().pedidoId);
    expect(novo).toMatchObject({ concursoId: siqueiraId, metodo: 'manual', valorCentavos: 19700, asaasPaymentId: null });
  });

  it('a cobrança já está paga no Asaas: confirma pelo Asaas (não manual) e diz isso', async () => {
    const a = await t.cadastrar();
    const p = await pixDe(a);
    t.asaas.definirStatus(p.asaasPaymentId!, 'RECEIVED');
    const r = await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p.id }, corpo: corpoManual() });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ pagoNoAsaas: true, jaAprovado: false, mensagem: expect.stringMatching(/já estava pago no Asaas/) });
    expect(await pedidoPorId(p.id)).toMatchObject({ status: 'pago', metodo: 'asaas', aprovadoPor: null });
    expect(t.asaas.recebidasEmDinheiro.map((x) => x.id)).not.toContain(p.asaasPaymentId);
    expect((await usuario(t, a.id)).acesso).toBe(true);
  });

  it('Asaas fora do ar: não aprova às cegas (502)', async () => {
    const a = await t.cadastrar();
    const p = await pixDe(a);
    t.asaas.falharProxima();
    const r = await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p.id }, corpo: corpoManual() });
    expect(r.statusCode).toBe(502);
    expect((await pedidoPorId(p.id)).status).toBe('pendente');
  });

  it('conta da equipe e a própria conta são recusadas em todas as ações do RQ4', async () => {
    const virouAdmin = await t.cadastrar();
    const pAdm = await pixDe(virouAdmin);
    await t.db.update(schema.usuarios).set({ papel: 'admin' }).where(eq(schema.usuarios.id, virouAdmin.id));
    const [proprio] = await t.db
      .insert(schema.pedidos)
      .values({ usuarioId: sup.id, concursoId: palmitalId, valorCentavos: 39700, status: 'pendente', criadoEm: t.relogio.agora() })
      .returning();
    const [proprioPago] = await t.db
      .insert(schema.pedidos)
      .values({ usuarioId: sup.id, concursoId: palmitalId, valorCentavos: 39700, status: 'pago', pagoEm: t.relogio.agora(), criadoEm: t.relogio.agora() })
      .returning();
    const motivo = { motivo: 'Teste de recusa', confirmacao: conf() };
    const casos: [NomeRota, Record<string, string>, unknown, number][] = [
      ['superPagamentoAprovarManual', { id: pAdm.id }, corpoManual(), 403],
      ['superPagamentoAprovarManual', { id: proprio!.id }, corpoManual(), 409],
      ['superPagamentoLiberar', { id: proprioPago!.id }, motivo, 409],
      ['superPagamentoEstornar', { id: proprioPago!.id }, motivo, 409],
      ['superAprovarManual', { id: virouAdmin.id }, corpoManual({ concursoId: palmitalId }), 403],
      ['superAprovarManual', { id: sup.id }, corpoManual({ concursoId: palmitalId }), 409],
      ['superAprovarManual', { id: adm.id }, corpoManual({ concursoId: palmitalId }), 403],
    ];
    for (const [nome, p, corpo, esperado] of casos) {
      const r = await t.chamar(nome, { cookie: sup.cookie, params: p, corpo });
      expect(r.statusCode, `${nome} ${JSON.stringify(p)}: ${r.body}`).toBe(esperado);
    }
    expect((await pedidoPorId(proprio!.id)).status).toBe('pendente');
    expect((await pedidoPorId(pAdm.id)).status).toBe('pendente');
    expect((await usuario(t, sup.id)).acesso).toBe(false);
  });
});

describe('RQ4 — estornar só o concurso do pedido (S-10)', () => {
  it('Asaas: uma chamada só; o webhook revoga Siqueira e mantém Palmital', async () => {
    const a = await t.alunoPago();
    const p2 = await pixDe(a, siqueiraId);
    await pagarPeloWebhook(p2);
    const corpo = { motivo: 'Desistiu de Siqueira', confirmacao: conf() };
    const [r1, r2] = await Promise.all([
      t.chamar('superPagamentoEstornar', { cookie: sup.cookie, params: { id: p2.id }, corpo }),
      t.chamar('superPagamentoEstornar', { cookie: sup.cookie, params: { id: p2.id }, corpo }),
    ]);
    expect([r1.statusCode, r2.statusCode].sort()).toEqual([200, 409]);
    expect(t.asaas.estornos.filter((x) => x === p2.asaasPaymentId)).toHaveLength(1);
    await t.webhook('PAYMENT_REFUNDED', p2.asaasPaymentId!);
    expect(await acessoNoConcurso(a.id, siqueiraId)).toBe(false);
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
  });

  it('manual: desfaz, revoga só o concurso do pedido e não chama o Asaas', async () => {
    const a = await t.alunoPago();
    const p2 = await pixDe(a, siqueiraId);
    expect((await t.chamar('superPagamentoAprovarManual', { cookie: sup.cookie, params: { id: p2.id }, corpo: corpoManual() })).statusCode).toBe(200);
    const estornosAntes = t.asaas.estornos.length;
    const r = await t.chamar('superPagamentoEstornar', { cookie: sup.cookie, params: { id: p2.id }, corpo: { motivo: 'Pix devolvido pelo banco', confirmacao: conf() } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ modo: 'manual', status: 'estornado', pagamento: { status: 'estornado', concursoLiberado: false } });
    expect(r.json().mensagem).toMatch(/devolva o valor/i);
    expect(t.asaas.estornos.length).toBe(estornosAntes);
    expect(await acessoNoConcurso(a.id, siqueiraId)).toBe(false);
    expect(await acessoNoConcurso(a.id, palmitalId)).toBe(true);
    const de2 = await t.chamar('superPagamentoEstornar', { cookie: sup.cookie, params: { id: p2.id }, corpo: { motivo: 'De novo', confirmacao: conf() } });
    expect(de2.statusCode).toBe(409);
  });
});

/* ===================================================================== S-23 */

describe('gerarPix não rebaixa um pedido pago (S-23)', () => {
  it('o Pix antigo é pago enquanto sai do Asaas: o pedido continua pago e não nasce outra cobrança', async () => {
    const a = await t.cadastrar();
    const p = await pixDe(a);
    // O QR expirou: o próximo pagamentoPix substitui o pendente.
    t.relogio.avancar(31 * 60_000);
    const original = t.asaas.removerCobranca.bind(t.asaas);
    let chamadas = 0;
    t.asaas.removerCobranca = async (id: string) => {
      chamadas++;
      // O aluno pagou no banco e o webhook chegou no meio.
      await t.webhook('PAYMENT_RECEIVED', id);
      throw new ErroAsaas('Asaas respondeu 400: só cobranças pendentes podem ser removidas.', 400);
    };
    try {
      const r = await t.chamar('pagamentoPix', { cookie: a.cookie, corpo: {} });
      expect(r.statusCode).toBe(409);
    } finally {
      t.asaas.removerCobranca = original;
    }
    expect(chamadas).toBe(1);
    expect((await pedidoPorId(p.id)).status).toBe('pago');
    expect(await pedidosDe(a.id)).toHaveLength(1);
    expect((await usuario(t, a.id)).acesso).toBe(true);
  });
});
