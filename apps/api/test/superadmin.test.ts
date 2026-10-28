import { and, count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { ROTAS, rotasComGuarda } from '@fuse/shared/api';
import { cookieDe, criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { gerarCodigoTotp } from '../src/servicos/totp.js';
import { UUID_X, usuario } from './ajuda.js';

const TOKEN_LONGO = 't'.repeat(40);
let t: AmbienteTeste;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let adm: Aluno;
let aluno: Aluno;

beforeAll(async () => {
  t = await criarAmbienteTeste({ config: { asaas: { apiKey: 'chave-teste', baseUrl: 'https://api-sandbox.asaas.com/v3', webhookToken: TOKEN_LONGO } } });
  sup = await t.superadmin();
  adm = await t.admin();
  aluno = await t.alunoPago();
}, 90_000);
afterAll(() => t.fechar());

const params = (caminho: string) =>
  Object.fromEntries([...caminho.matchAll(/:([A-Za-z]+)/g)].map((m) => [m[1]!, UUID_X]));
const conf = () => ({ senha: sup.senha });

async function pedidoDe(usuarioId: string) {
  return t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, usuarioId));
}

async function alunoComPix() {
  const a = await t.cadastrar();
  const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
  expect(pix.statusCode, pix.body).toBe(200);
  const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pix.json().pedidoId));
  return { aluno: a, pedido: p! };
}

describe('guardas do superadmin (D13)', () => {
  const rotasSuper = [...rotasComGuarda('superadmin'), ...rotasComGuarda('superadmin_2fa')];

  it('há rotas /super e todas exigem o papel superadmin', () => {
    expect(rotasSuper.length).toBeGreaterThan(40);
    for (const n of rotasSuper) expect(ROTAS[n].caminho.startsWith('/super')).toBe(true);
  });

  it.each(rotasSuper)('%s: 401 sem login, 403 para aluno e para admin', async (nome) => {
    const c = { params: params(ROTAS[nome].caminho), corpo: {} };
    expect((await t.chamar(nome, c)).statusCode).toBe(401);
    const r1 = await t.chamar(nome, { ...c, cookie: aluno.cookie });
    expect(r1.statusCode).toBe(403);
    expect(r1.json().codigo).toBe('proibido');
    const r2 = await t.chamar(nome, { ...c, cookie: adm.cookie });
    expect(r2.statusCode).toBe(403);
  });

  it('superadmin sem 2FA fica bloqueado (no /super e no /admin) até configurar', async () => {
    const novo = await t.superadmin({ doisFatores: false });
    const login = await t.chamar('authLogin', { corpo: { email: novo.email, senha: novo.senha } });
    expect(login.json().proximo).toBe('dois_fatores');
    const me = (await t.chamar('meObter', { cookie: novo.cookie })).json();
    expect(me.doisFatoresPendente).toBe(true);
    for (const nome of ['superFinanceiro', 'superUsuariosListar', 'adminPainel'] as const) {
      const r = await t.chamar(nome, { cookie: novo.cookie });
      expect(r.statusCode).toBe(403);
      expect(r.json().codigo).toBe('dois_fatores_necessario');
    }
    expect((await t.chamar('super2faStatus', { cookie: novo.cookie })).json()).toMatchObject({ configurado: false, verificadoNestaSessao: false });

    // Configura: QR em SVG gerado no servidor, código errado não ativa.
    const ini = (await t.chamar('super2faIniciar', { cookie: novo.cookie })).json();
    expect(ini.qrSvg).toMatch(/^<svg/);
    const segredo = ini.chaveManual.replace(/\s+/g, '');
    const errado = await t.chamar('super2faAtivar', { cookie: novo.cookie, corpo: { codigo: '000000' } });
    expect(errado.statusCode).toBe(400);
    expect(errado.json().codigo).toBe('codigo_invalido');
    const at = await t.chamar('super2faAtivar', { cookie: novo.cookie, corpo: { codigo: gerarCodigoTotp(segredo, t.relogio.agora()) } });
    expect(at.statusCode, at.body).toBe(200);
    const codigos: string[] = at.json().codigos;
    expect(codigos).toHaveLength(10);
    // O segredo não fica legível no banco; os códigos de recuperação só como hash.
    const u = await usuario(t, novo.id);
    expect(u.totpSegredo).not.toContain(segredo);
    const hashes = await t.db.select().from(schema.codigosRecuperacao).where(eq(schema.codigosRecuperacao.usuarioId, novo.id));
    expect(hashes.map((h) => h.hash)).not.toContain(codigos[0]);
    expect((await t.chamar('superFinanceiro', { cookie: novo.cookie })).statusCode).toBe(200);

    // Nova sessão: pede o código; o mesmo código não vale duas vezes; código de recuperação vale uma vez.
    const l2 = await t.chamar('authLogin', { corpo: { email: novo.email, senha: novo.senha } });
    const c2 = cookieDe(l2)!;
    const pend = await t.chamar('superFinanceiro', { cookie: c2 });
    expect(pend.json().codigo).toBe('dois_fatores_pendente');
    const reuso = await t.chamar('super2faVerificar', { cookie: c2, corpo: { codigo: gerarCodigoTotp(segredo, t.relogio.agora()) } });
    expect(reuso.json().codigo).toBe('codigo_invalido');
    const rec = await t.chamar('super2faVerificar', { cookie: c2, corpo: { codigoRecuperacao: codigos[0] } });
    expect(rec.statusCode, rec.body).toBe(200);
    expect(rec.json()).toMatchObject({ verificadoNestaSessao: true, codigosRecuperacaoRestantes: 9 });
    const l3 = cookieDe(await t.chamar('authLogin', { corpo: { email: novo.email, senha: novo.senha } }))!;
    expect((await t.chamar('super2faVerificar', { cookie: l3, corpo: { codigoRecuperacao: codigos[0] } })).statusCode).toBe(400);
    t.relogio.avancar(30_000);
    const ok = await t.chamar('super2faVerificar', { cookie: l3, corpo: { codigo: gerarCodigoTotp(segredo, t.relogio.agora()) } });
    expect(ok.statusCode, ok.body).toBe(200);
    const aud = await t.db.select().from(schema.auditoria).where(and(eq(schema.auditoria.adminId, novo.id), eq(schema.auditoria.acao, '2fa.recuperacao_usada')));
    expect(aud).toHaveLength(1);
  });

  it('a sessão do superadmin expira cedo (2 h sem uso; 12 h no máximo)', async () => {
    const s = await t.superadmin();
    expect((await t.chamar('superSistema', { cookie: s.cookie })).statusCode).toBe(200);
    t.relogio.avancar(2 * 3_600_000 + 60_000);
    expect((await t.chamar('superSistema', { cookie: s.cookie })).statusCode).toBe(401);
    // Aluno continua com a sessão longa.
    expect((await t.chamar('meObter', { cookie: aluno.cookie })).statusCode).toBe(200);
    const s2 = await t.superadmin();
    for (let i = 0; i < 7; i++) {
      t.relogio.avancar(100 * 60_000);
      expect((await t.chamar('superSistema', { cookie: s2.cookie })).statusCode).toBe(200);
    }
    t.relogio.avancar(100 * 60_000);
    expect((await t.chamar('superSistema', { cookie: s2.cookie })).statusCode).toBe(401);
    // As outras sessões de superadmin usadas no resto do arquivo caem: refaz o login.
    sup = await t.superadmin();
  });

  it('superadmin também usa as rotas do admin (com 2FA)', async () => {
    expect((await t.chamar('adminPainel', { cookie: sup.cookie })).statusCode).toBe(200);
  });
});

describe('reconfirmação e auditoria', () => {
  it('ação sensível sem senha certa (ou com código repetido) dá 403 reconfirmacao_invalida', async () => {
    const corpo = { papel: 'admin', motivo: 'Promoção de teste' };
    const sem = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: aluno.id }, corpo });
    expect(sem.statusCode).toBe(400);
    const errada = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: aluno.id }, corpo: { ...corpo, confirmacao: { senha: 'errada-123' } } });
    expect(errada.statusCode).toBe(403);
    expect(errada.json().codigo).toBe('reconfirmacao_invalida');
    t.relogio.avancar(30_000);
    const codigo = sup.codigo();
    const c1 = await t.chamar('superConfiguracoesSalvar', {
      cookie: sup.cookie,
      corpo: {
        suporteWhatsapp: '5542999990000',
        suporteEmail: 'ajuda@fuseaprova.com.br',
        manutencao: { ativa: false, mensagem: '' },
        aviso: { ativo: true, texto: 'Edital previsto para dezembro.', tom: 'info' },
        avisoEdital: 'Conteúdo baseado nas últimas provas da FAU.',
        motivo: 'Atualizar suporte',
        confirmacao: { codigo },
      },
    });
    expect(c1.statusCode, c1.body).toBe(200);
    const c2 = await t.chamar('superConfiguracoesSalvar', {
      cookie: sup.cookie,
      corpo: { ...c1.json().valores, motivo: 'De novo', confirmacao: { codigo } },
    });
    expect(c2.json().codigo).toBe('reconfirmacao_invalida');
  });

  it('a auditoria guarda quem, o quê, antes, depois, IP e motivo', async () => {
    const r = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'config.salvar' } })).json();
    expect(r.itens[0]).toMatchObject({
      admin: { id: sup.id },
      acao: 'config.salvar',
      motivo: 'Atualizar suporte',
      ip: expect.any(String),
      depois: expect.objectContaining({ suporteEmail: 'ajuda@fuseaprova.com.br' }),
      antes: expect.objectContaining({ suporteEmail: expect.any(String) }),
    });
    const pub = (await t.chamar('configPublica')).json();
    expect(pub).toMatchObject({ suporte: { whatsapp: '5542999990000' }, aviso: { texto: 'Edital previsto para dezembro.' }, precoCentavos: 39700 });
  });

  it('modo manutenção: 503 para alunos nas rotas de conteúdo; admin continua', async () => {
    const atual = (await t.chamar('superConfiguracoes', { cookie: sup.cookie })).json().valores;
    const salvar = (ativa: boolean) =>
      t.chamar('superConfiguracoesSalvar', {
        cookie: sup.cookie,
        corpo: { ...atual, manutencao: { ativa, mensagem: 'Voltamos às 14h.' }, motivo: 'Manutenção', confirmacao: conf() },
      });
    expect((await salvar(true)).statusCode).toBe(200);
    const r = await t.chamar('trilha', { cookie: aluno.cookie });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ erro: 'Voltamos às 14h.', codigo: 'manutencao' });
    expect((await t.chamar('meObter', { cookie: aluno.cookie })).statusCode).toBe(200);
    expect((await t.chamar('trilha', { cookie: sup.cookie })).statusCode).not.toBe(503);
    expect((await t.chamar('configPublica')).json().manutencao).toEqual({ ativa: true, mensagem: 'Voltamos às 14h.' });
    expect((await salvar(false)).statusCode).toBe(200);
    expect((await t.chamar('trilha', { cookie: aluno.cookie })).statusCode).toBe(200);
  });
});

describe('pagamentos, conciliação e webhooks', () => {
  it('lista com busca por e-mail, CPF e id do Asaas; detalhe com a linha do tempo', async () => {
    const [p] = await pedidoDe(aluno.id);
    const porEmail = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { q: aluno.email } })).json();
    expect(porEmail.itens.map((x: { id: string }) => x.id)).toContain(p!.id);
    const porId = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { q: p!.asaasPaymentId! } })).json();
    expect(porId.total).toBe(1);
    expect(porId.itens[0].usuario.cpfOculto).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    const u = await usuario(t, aluno.id);
    // S-21: só o CPF completo encontra (o trecho do meio reconstruía o CPF mascarado).
    const porCpf = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { q: u.cpf! } })).json();
    expect(porCpf.total).toBeGreaterThan(0);
    const porTrecho = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { q: u.cpf!.slice(3, 9) } })).json();
    expect(porTrecho.total).toBe(0);
    const det = (await t.chamar('superPagamentoObter', { cookie: sup.cookie, params: { id: p!.id } })).json();
    expect(det.linhaDoTempo.map((e: { titulo: string }) => e.titulo)).toEqual(expect.arrayContaining(['Pix gerado no Asaas', 'Pagamento confirmado', 'Webhook PAYMENT_CONFIRMED']));
    expect(det.webhooks[0]).toMatchObject({ evento: 'PAYMENT_CONFIRMED', resultado: 'pago', pedidoId: p!.id });
    expect(JSON.stringify(det)).not.toMatch(/pixPayload|00020126/);
  });

  it('conciliar: o Asaas diz pago e o webhook se perdeu → corrige e libera o acesso, com auditoria', async () => {
    const { aluno: a, pedido } = await alunoComPix();
    t.asaas.definirStatus(pedido.asaasPaymentId!, 'RECEIVED');
    const r = await t.chamar('superPagamentoConciliar', { cookie: sup.cookie, params: { id: pedido.id }, corpo: { motivo: 'Aluno mandou comprovante' } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ statusAsaas: 'RECEIVED', divergente: true, corrigido: true, statusLocalAntes: 'pendente', statusLocalDepois: 'pago' });
    expect((await usuario(t, a.id)).acesso).toBe(true);
    const [p] = await pedidoDe(a.id);
    expect(p!.valorLiquidoCentavos).toBe(39501);
    const [aud] = await t.db.select().from(schema.auditoria).where(eq(schema.auditoria.alvo, `pedido:${pedido.id}`));
    expect(aud).toMatchObject({ acao: 'pedido.conciliar', motivo: 'Aluno mandou comprovante', antes: expect.objectContaining({ status: 'pendente' }), depois: expect.objectContaining({ status: 'pago' }) });
    // De novo: nada a corrigir.
    const r2 = (await t.chamar('superPagamentoConciliar', { cookie: sup.cookie, params: { id: pedido.id }, corpo: {} })).json();
    expect(r2).toMatchObject({ divergente: false, corrigido: false });
  });

  it('conciliação em lote: relatório sem corrigir e depois corrigindo; pedido manual não diverge', async () => {
    const { pedido: p1 } = await alunoComPix();
    const { pedido: p2 } = await alunoComPix();
    t.asaas.definirStatus(p1.asaasPaymentId!, 'CONFIRMED');
    t.asaas.definirStatus(p2.asaasPaymentId!, 'OVERDUE');
    const { aluno: m } = await alunoComPix();
    await t.chamar('superAprovarManual', {
      cookie: sup.cookie,
      params: { id: m.id },
      corpo: { recebidoEm: '2026-10-20', forma: 'dinheiro', observacao: 'Pagou no balcão', acaoAsaas: 'nenhuma', confirmacao: conf() },
    });
    const corpo = { de: '2026-10-01', ate: '2026-10-31' };
    const rel = (await t.chamar('superConciliarLote', { cookie: sup.cookie, corpo: { ...corpo, corrigir: false } })).json();
    expect(rel.corrigidos).toBe(0);
    expect(rel.divergentes).toBeGreaterThanOrEqual(2);
    expect(rel.ignoradosManuais).toBeGreaterThanOrEqual(1);
    const [pm] = await pedidoDe(m.id);
    expect(pm!.metodo).toBe('manual');
    expect(rel.itens.some((i: { pedidoId: string }) => i.pedidoId === pm!.id)).toBe(false);
    const cor = (await t.chamar('superConciliarLote', { cookie: sup.cookie, corpo: { ...corpo, corrigir: true, motivo: 'Fechamento do mês' } })).json();
    expect(cor.corrigidos).toBeGreaterThanOrEqual(2);
    const [a1] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, p1.id));
    const [a2] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, p2.id));
    expect([a1!.status, a2!.status]).toEqual(['pago', 'vencido']);
  });

  it('reprocessar webhook é idempotente e um evento com erro fica no histórico', async () => {
    const { aluno: a, pedido } = await alunoComPix();
    // Simula um evento que falhou antes (gravado com erro e sem processado_em).
    await t.db.insert(schema.webhookEventos).values({
      id: 'evt_falhou_1',
      evento: 'PAYMENT_RECEIVED',
      corpo: { id: 'evt_falhou_1', event: 'PAYMENT_RECEIVED', payment: { id: pedido.asaasPaymentId, netValue: 395.01 } },
      recebidoEm: t.relogio.agora(),
      erro: 'timeout do banco',
      resultado: 'erro',
    });
    const comErro = (await t.chamar('superWebhooksListar', { cookie: sup.cookie, query: { situacao: 'erro' } })).json();
    expect(comErro.itens.map((x: { id: string }) => x.id)).toContain('evt_falhou_1');
    const emails = t.mailer.enviados.length;
    const r1 = (await t.chamar('superWebhookReprocessar', { cookie: sup.cookie, params: { id: 'evt_falhou_1' } })).json();
    expect(r1).toMatchObject({ ok: true, resultado: 'pago', erro: null });
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.length).toBe(emails + 1);
    const r2 = (await t.chamar('superWebhookReprocessar', { cookie: sup.cookie, params: { id: 'evt_falhou_1' } })).json();
    expect(r2).toMatchObject({ ok: true, resultado: 'sem_mudanca' });
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.length).toBe(emails + 1);
    expect(await pedidoDe(a.id)).toHaveLength(1);
    // O Asaas reenviando o mesmo evento (agora processado) não faz nada.
    expect((await t.webhook('PAYMENT_RECEIVED', pedido.asaasPaymentId!, 'evt_falhou_1')).statusCode).toBe(200);
    const [e] = await t.db.select().from(schema.webhookEventos).where(eq(schema.webhookEventos.id, 'evt_falhou_1'));
    expect(e).toMatchObject({ tentativas: 3, erro: null, resultado: 'sem_mudanca' });
    // Em lote, com reconfirmação.
    const lote = await t.chamar('superWebhooksReprocessarLote', { cookie: sup.cookie, corpo: { ids: ['evt_falhou_1'], motivo: 'Reprocessar fila', confirmacao: conf() } });
    expect(lote.json()).toMatchObject({ total: 1, ok: 1, falhas: 0 });
  });

  it('reembolso com reconfirmação; cancelar Pix pendente; reenviar e-mail', async () => {
    const [p] = await pedidoDe(aluno.id);
    const reemb = await t.chamar('superPagamentoReembolso', { cookie: sup.cookie, params: { id: p!.id }, corpo: { motivo: 'Desistência em 7 dias', confirmacao: conf() } });
    expect(reemb.json()).toEqual({ ok: true, status: 'aguardando_webhook' });
    expect(t.asaas.estornos).toContain(p!.asaasPaymentId);
    const env = await t.chamar('superPagamentoReenviarEmail', { cookie: sup.cookie, params: { id: p!.id } });
    expect(env.json()).toEqual({ ok: true, para: aluno.email });

    const { pedido } = await alunoComPix();
    const can = await t.chamar('superPagamentoCancelarPix', { cookie: sup.cookie, params: { id: pedido.id }, corpo: { motivo: 'Aluno pediu' } });
    expect(can.statusCode, can.body).toBe(200);
    expect(can.json()).toMatchObject({ status: 'vencido', canceladoEm: expect.any(String) });
    expect(t.asaas.removidas).toContain(pedido.asaasPaymentId);
    const de2 = await t.chamar('superPagamentoCancelarPix', { cookie: sup.cookie, params: { id: pedido.id }, corpo: { motivo: 'De novo' } });
    expect(de2.statusCode).toBe(409);
  });
});

describe('aprovação manual de pagamento (D13)', () => {
  const corpoManual = (extra: Record<string, unknown> = {}) => ({
    recebidoEm: '2026-10-19',
    forma: 'transferencia',
    observacao: 'TED recebida no Itaú',
    referencia: 'TED 123',
    confirmacao: conf(),
    ...extra,
  });

  it('aluno e admin recebem 403', async () => {
    const { aluno: a } = await alunoComPix();
    for (const c of [aluno.cookie, adm.cookie]) {
      const r = await t.chamar('superAprovarManual', { cookie: c, params: { id: a.id }, corpo: corpoManual() });
      expect(r.statusCode).toBe(403);
    }
  });

  it('aprova (aproveitando o Pix pendente), confirma no Asaas, é idempotente e o webhook atrasado não duplica', async () => {
    const { aluno: a, pedido } = await alunoComPix();
    const emails = t.mailer.enviados.length;
    const r = await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: a.id }, corpo: corpoManual() });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ pedidoId: pedido.id, jaAprovado: false, asaas: { acao: 'receber_em_dinheiro', ok: true } });
    expect(t.asaas.recebidasEmDinheiro).toContainEqual({ id: pedido.asaasPaymentId, paymentDate: '2026-10-19', value: 397 });
    const [p] = await pedidoDe(a.id);
    expect(p).toMatchObject({ status: 'pago', metodo: 'manual', valorCentavos: 39700, manualForma: 'transferencia', manualRecebidoEm: '2026-10-19', aprovadoPor: sup.id });
    expect((await usuario(t, a.id)).acesso).toBe(true);
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.slice(emails).map((m) => m.assunto)).toEqual(['Pagamento confirmado: seu acesso ao Fuse Aprova']);

    const de2 = (await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: a.id }, corpo: corpoManual() })).json();
    expect(de2).toMatchObject({ pedidoId: pedido.id, jaAprovado: true });
    // O receiveInCash gera um PAYMENT_RECEIVED no Asaas: chega depois e não muda nada.
    expect((await t.webhook('PAYMENT_RECEIVED', pedido.asaasPaymentId!)).statusCode).toBe(200);
    await t.app.deps.aguardarTarefas();
    expect(await pedidoDe(a.id)).toHaveLength(1);
    expect((await pedidoDe(a.id))[0]).toMatchObject({ status: 'pago', metodo: 'manual' });
    expect(t.mailer.enviados.length).toBe(emails + 1);

    // O financeiro separa Asaas × manual.
    const f = (await t.chamar('superFinanceiro', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-12-31', metodo: 'manual' } })).json();
    expect(f.totais.manual.quantidade).toBeGreaterThanOrEqual(1);
    expect(f.totais.asaas.quantidade).toBe(0);
    const csv = (await t.chamar('superPagamentosCsv', { cookie: sup.cookie, query: { metodo: 'manual' } })).json();
    expect(csv.conteudo.split('\r\n')[0]).toContain('metodo');
    expect(csv.conteudo).toContain(';manual;');

    // Desfazer: revoga o acesso, com reconfirmação.
    const des = await t.chamar('superPagamentoDesfazerManual', { cookie: sup.cookie, params: { id: pedido.id }, corpo: { motivo: 'TED devolvida pelo banco', confirmacao: conf() } });
    expect(des.statusCode, des.body).toBe(200);
    expect(des.json()).toMatchObject({ status: 'estornado', metodo: 'manual' });
    expect((await usuario(t, a.id)).acesso).toBe(false);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(401);
    // Um webhook atrasado depois do desfazer também não reverte nada.
    await t.webhook('PAYMENT_CONFIRMED', pedido.asaasPaymentId!);
    expect((await pedidoDe(a.id))[0]!.status).toBe('estornado');
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { alvo: `pedido:${pedido.id}` } })).json();
    expect(aud.itens.map((i: { acao: string }) => i.acao)).toEqual(expect.arrayContaining(['pedido.aprovar_manual', 'pedido.desfazer_manual']));
  });

  it('sem Pix pendente cria um pedido manual; data futura é recusada; "cancelar" remove a cobrança', async () => {
    const a = await t.cadastrar();
    const fut = await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: a.id }, corpo: corpoManual({ recebidoEm: '2027-01-01' }) });
    expect(fut.statusCode).toBe(400);
    const r = (await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: a.id }, corpo: corpoManual({ forma: 'dinheiro' }) })).json();
    expect(r.asaas.mensagem).toMatch(/Não havia cobrança/);
    expect((await pedidoDe(a.id))[0]).toMatchObject({ metodo: 'manual', asaasPaymentId: null, status: 'pago' });

    const { aluno: b, pedido } = await alunoComPix();
    const rc = (await t.chamar('superAprovarManual', { cookie: sup.cookie, params: { id: b.id }, corpo: corpoManual({ acaoAsaas: 'cancelar' }) })).json();
    expect(rc.asaas).toMatchObject({ acao: 'cancelar', ok: true });
    expect(t.asaas.removidas).toContain(pedido.asaasPaymentId);
    // Reembolso pelo Asaas não vale para o manual.
    const re = await t.chamar('superPagamentoReembolso', { cookie: sup.cookie, params: { id: pedido.id }, corpo: { motivo: 'teste', confirmacao: conf() } });
    expect(re.statusCode).toBe(409);
  });

  it('comprovante: só imagem ou PDF de verdade, servido só ao superadmin', async () => {
    const envio = (conteudo: Buffer, tipo: string, cookie = sup.cookie) => {
      const fronteira = '----fuse';
      const corpo = Buffer.concat([
        Buffer.from(`--${fronteira}\r\nContent-Disposition: form-data; name="arquivo"; filename="c"\r\nContent-Type: ${tipo}\r\n\r\n`),
        conteudo,
        Buffer.from(`\r\n--${fronteira}--\r\n`),
      ]);
      return t.app.inject({ method: 'POST', url: '/api/super/comprovantes', headers: { cookie, 'content-type': `multipart/form-data; boundary=${fronteira}` }, payload: corpo });
    };
    expect((await envio(Buffer.from('não é pdf'), 'application/pdf')).statusCode).toBe(400);
    const ok = await envio(Buffer.from('%PDF-1.4 comprovante'), 'application/pdf');
    expect(ok.statusCode, ok.body).toBe(200);
    const { url } = ok.json();
    expect((await t.app.inject({ method: 'GET', url, headers: { cookie: sup.cookie } })).headers['content-type']).toMatch(/pdf/);
    expect((await t.app.inject({ method: 'GET', url, headers: { cookie: adm.cookie } })).statusCode).toBe(403);
    expect((await envio(Buffer.from('%PDF-1.4'), 'application/pdf', adm.cookie)).statusCode).toBe(403);
  });
});

describe('usuários, equipe e LGPD', () => {
  it('ficha completa, edição, bloqueio e desbloqueio', async () => {
    const a = await t.alunoPago();
    const f = (await t.chamar('superUsuarioObter', { cookie: sup.cookie, params: { id: a.id } })).json();
    expect(f.usuario).toMatchObject({ id: a.id, pago: true, acesso: true, bloqueado: false });
    expect(f.pedidos).toHaveLength(1);
    expect(f.sessoes.length).toBeGreaterThan(0);
    const ed = await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: a.id }, corpo: { nome: 'Marina Editada Souza', motivo: 'Aluna pediu correção' } });
    expect(ed.json().usuario.nome).toBe('Marina Editada Souza');
    const dup = await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: a.id }, corpo: { email: aluno.email, motivo: 'Teste duplicado' } });
    expect(dup.statusCode).toBe(409);
    const bl = await t.chamar('superUsuarioBloquear', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Compartilhando a conta' } });
    expect(bl.statusCode).toBe(200);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(401);
    const login = await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } });
    expect(login.statusCode).toBe(403);
    expect(login.json().codigo).toBe('conta_bloqueada');
    const lista = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { bloqueado: 'true' } })).json();
    expect(lista.itens.map((x: { id: string }) => x.id)).toContain(a.id);
    await t.chamar('superUsuarioDesbloquear', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Resolvido com a aluna' } });
    expect((await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } })).statusCode).toBe(200);
    const fs = await t.chamar('superUsuarioForcarSenha', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Suspeita de vazamento' } });
    expect(fs.statusCode).toBe(200);
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.at(-1)).toMatchObject({ para: a.email, assunto: 'Fuse Aprova: crie uma nova senha' });
  });

  it('filtros e CSV de usuários', async () => {
    const pagos = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { pago: 'true', papel: 'aluno', porPagina: 100 } })).json();
    expect(pagos.itens.every((u: { pago: boolean }) => u.pago)).toBe(true);
    const sem = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { pago: 'false', papel: 'aluno', porPagina: 100 } })).json();
    expect(sem.itens.every((u: { pago: boolean }) => !u.pago)).toBe(true);
    const csv = (await t.chamar('superUsuariosCsv', { cookie: sup.cookie, query: { papel: 'aluno' } })).json();
    expect(csv.nomeArquivo).toMatch(/^usuarios-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.conteudo.startsWith('﻿id;nome;email;cpf')).toBe(true);
    expect(csv.conteudo).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });

  it('mudar papel sem rebaixar o último superadmin', async () => {
    const [{ n }] = (await t.db.select({ n: count() }).from(schema.usuarios).where(eq(schema.usuarios.papel, 'superadmin'))) as [{ n: number }];
    expect(n).toBeGreaterThan(1);
    // Deixa só o `sup` como superadmin ativo.
    await t.db.update(schema.usuarios).set({ papel: 'admin' }).where(and(eq(schema.usuarios.papel, 'superadmin')));
    await t.db.update(schema.usuarios).set({ papel: 'superadmin' }).where(eq(schema.usuarios.id, sup.id));
    const r = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: sup.id }, corpo: { papel: 'admin', motivo: 'Rebaixar a mim mesmo', confirmacao: conf() } });
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('ultimo_superadmin');
    const outro = await t.cadastrar();
    const pr = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: outro.id }, corpo: { papel: 'superadmin', motivo: 'Sócio novo', confirmacao: conf() } });
    expect(pr.statusCode, pr.body).toBe(200);
    // A sessão do promovido cai: o novo papel exige login com 2FA.
    expect((await t.chamar('meObter', { cookie: outro.cookie })).statusCode).toBe(401);
    const login = await t.chamar('authLogin', { corpo: { email: outro.email, senha: outro.senha } });
    expect(login.json()).toMatchObject({ proximo: 'dois_fatores', usuario: { papel: 'superadmin' } });
    const eq2 = (await t.chamar('superEquipe', { cookie: sup.cookie })).json();
    expect(eq2.itens.find((m: { id: string }) => m.id === outro.id)).toMatchObject({ papel: 'superadmin', doisFatores: false });
    const reb = await t.chamar('superUsuarioPapel', { cookie: sup.cookie, params: { id: outro.id }, corpo: { papel: 'aluno', motivo: 'Saiu da sociedade', confirmacao: conf() } });
    expect(reb.statusCode).toBe(200);
  });

  it('convite da equipe: conta sem senha e link de 72 h', async () => {
    const r = await t.chamar('superEquipeConvidar', { cookie: sup.cookie, corpo: { nome: 'Ana Revisora Lima', email: 'ana.revisora@teste.com', papel: 'admin', motivo: 'Revisão de questões', confirmacao: conf() } });
    expect(r.statusCode, r.body).toBe(200);
    await t.app.deps.aguardarTarefas();
    const email = t.mailer.enviados.at(-1)!;
    expect(email).toMatchObject({ para: 'ana.revisora@teste.com', assunto: 'Fuse Aprova: convite para a equipe' });
    const token = /\/recuperar\/([\w-]+)/.exec(email.texto)![1]!;
    const eq1 = (await t.chamar('superEquipe', { cookie: sup.cookie })).json();
    expect(eq1.itens.find((m: { email: string }) => m.email === 'ana.revisora@teste.com')).toMatchObject({ convitePendente: true });
    t.relogio.avancar(48 * 3_600_000);
    sup = await t.superadmin();
    const def = await t.chamar('authRedefinir', { corpo: { token, senha: 'senha-nova-ana-123' } });
    expect(def.statusCode, def.body).toBe(200);
    expect(def.json().proximo).toBe('admin');
    const dup = await t.chamar('superEquipeConvidar', { cookie: sup.cookie, corpo: { nome: 'Ana Revisora Lima', email: 'ana.revisora@teste.com', papel: 'admin', motivo: 'De novo', confirmacao: conf() } });
    expect(dup.statusCode).toBe(409);
  });

  it('LGPD: exportar sem segredos; anonimizar exige reconfirmação e o e-mail', async () => {
    const a = await t.alunoPago();
    const ex = (await t.chamar('superUsuarioExportar', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Pedido do titular', confirmacao: conf() } })).json();
    expect(ex.perfil.email).toBe(a.email);
    expect(Object.keys(ex.perfil)).not.toEqual(expect.arrayContaining(['senhaHash']));
    expect(JSON.stringify(ex)).not.toMatch(/senhaHash|totpSegredo|argon2/);
    const errado = await t.chamar('superUsuarioAnonimizar', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Pedido do titular', confirmacao: conf(), emailConfirmado: 'outro@x.com' } });
    expect(errado.statusCode).toBe(400);
    const ok = await t.chamar('superUsuarioAnonimizar', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Pedido do titular', confirmacao: conf(), emailConfirmado: a.email.toUpperCase() } });
    expect(ok.statusCode, ok.body).toBe(200);
    const u = await usuario(t, a.id);
    expect(u).toMatchObject({ nome: 'Conta excluída', cpf: null, acesso: false });
    expect(u.excluidoEm).not.toBeNull();
    expect(await pedidoDe(a.id)).toHaveLength(1);
    const self = await t.chamar('superUsuarioAnonimizar', { cookie: sup.cookie, params: { id: sup.id }, corpo: { motivo: 'Eu mesmo', confirmacao: conf(), emailConfirmado: sup.email } });
    expect(self.statusCode).toBe(409);
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'usuario.anonimizar' } })).json();
    expect(aud.itens[0]).toMatchObject({ motivo: 'Pedido do titular', alvo: `usuario:${a.id}` });
    expect(JSON.stringify(aud.itens[0])).not.toContain(a.email);
  });
});

describe('conta Asaas, comunicação e sistema', () => {
  it('status sem expor a chave; saldo com aviso; webhook só o do app', async () => {
    const st = await t.chamar('superAsaasStatus', { cookie: sup.cookie });
    expect(st.json()).toMatchObject({ ambiente: 'sandbox', chaveConfigurada: true, urlWebhookEsperada: 'http://localhost:5173/api/webhooks/asaas', conta: { nome: 'Conta Sandbox Fuse' } });
    expect(st.body).not.toContain('chave-teste');
    expect(st.body).not.toContain(TOKEN_LONGO);
    const saldo = (await t.chamar('superAsaasSaldo', { cookie: sup.cookie })).json();
    expect(saldo).toMatchObject({ saldoCentavos: 123456, aviso: expect.stringMatching(/compartilhada/) });
    // Um webhook de outra aplicação da mesma conta nunca é mostrado nem alterado.
    await t.asaas.criarWebhook({ name: 'Outro app', url: 'https://outroapp.com/hook', email: 'x@x.com', enabled: true, interrupted: true, authToken: 'y'.repeat(32), sendType: 'SEQUENTIALLY', events: [] });
    const w0 = (await t.chamar('superAsaasWebhook', { cookie: sup.cookie })).json();
    expect(w0).toMatchObject({ doApp: null, todos: [] });
    const cria = await t.chamar('superAsaasWebhookSalvar', { cookie: sup.cookie, corpo: { email: 'dono@fuseaprova.com.br', motivo: 'Configurar webhook', confirmacao: conf() } });
    expect(cria.statusCode, cria.body).toBe(200);
    expect(cria.json().doApp).toMatchObject({ url: 'http://localhost:5173/api/webhooks/asaas', ativo: true, filaInterrompida: false, temToken: true, ehDoApp: true });
    expect(cria.body).not.toContain(TOKEN_LONGO);
    t.asaas.webhooks.find((w) => w.url.includes('localhost'))!.interrupted = true;
    const re = (await t.chamar('superAsaasWebhookReativar', { cookie: sup.cookie, corpo: { motivo: 'Fila parada', confirmacao: conf() } })).json();
    expect(re.doApp.filaInterrompida).toBe(false);
    expect(t.asaas.webhooks.find((w) => w.url.includes('outroapp'))!.interrupted).toBe(true);
    expect(t.asaas.webhooks.filter((w) => w.url.includes('localhost'))).toHaveLength(1);
  });

  it('extrato só com os lançamentos das cobranças do Fuse Aprova', async () => {
    const [p] = await t.db.select().from(schema.pedidos).limit(1);
    t.asaas.transacoes.push(
      { id: 'ft_1', value: 395.01, type: 'PAYMENT_RECEIVED', date: '2026-10-20', paymentId: p!.asaasPaymentId, description: 'Fuse' },
      { id: 'ft_2', value: 50, type: 'PAYMENT_RECEIVED', date: '2026-10-20', paymentId: 'pay_de_outro_app', description: 'Outro app' },
      { id: 'ft_3', value: -10, type: 'TRANSFER', date: '2026-10-21', paymentId: null },
    );
    const ex = (await t.chamar('superAsaasExtrato', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-10-31' } })).json();
    expect(ex.itens.map((i: { id: string }) => i.id)).toEqual(['ft_1']);
    expect(ex).toMatchObject({ examinados: 3, total: 1 });
    const est = (await t.chamar('superAsaasEstatisticas', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-12-31' } })).json();
    expect(est.porStatus.length).toBeGreaterThan(0);
  });

  it('comunicação: prévia só com opt-in, fila e cancelamento', async () => {
    const a = await t.alunoPago();
    await t.chamar('meAtualizar', { cookie: a.cookie, corpo: { marketing: true } });
    expect((await t.chamar('meObter', { cookie: a.cookie })).json().marketing).toBe(true);
    const corpo = { canal: 'email', segmento: 'pagos', assunto: 'Novidade no Fuse', mensagem: 'Chegaram questões novas de Português.', link: '/aprender' };
    const prev = (await t.chamar('superComunicacaoPrevia', { cookie: sup.cookie, corpo })).json();
    expect(prev.destinatarios).toBe(1);
    expect(prev.semOptIn).toBeGreaterThan(0);
    expect(prev.html).toContain('Chegaram questões novas');
    const semSmtp = await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Novidade', confirmacao: conf() } });
    expect(semSmtp.statusCode).toBe(409);
    t.config.smtp.host = 'smtp.teste.local';
    const cr = await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Novidade', confirmacao: conf() } });
    expect(cr.statusCode, cr.body).toBe(200);
    expect(cr.json()).toMatchObject({ status: 'na_fila', total: 1, pendentes: 1 });
    const can = (await t.chamar('superComunicacaoCancelar', { cookie: sup.cookie, params: { id: cr.json().id } })).json();
    expect(can).toMatchObject({ status: 'cancelada', pendentes: 0, ignorados: 1 });
    const inat = await t.chamar('superComunicacaoPrevia', { cookie: sup.cookie, corpo: { ...corpo, segmento: 'inativos' } });
    expect(inat.statusCode).toBe(400);
    t.config.smtp.host = '';
  });

  it('sistema: jobs do worker, banco, versão e SMTP', async () => {
    await t.db.insert(schema.jobsExecucoes).values([
      { job: 'backup', iniciadoEm: new Date(t.relogio.agora().getTime() - 60_000), terminadoEm: t.relogio.agora(), ok: true },
      { job: 'expirar-pix', iniciadoEm: t.relogio.agora(), terminadoEm: t.relogio.agora(), ok: false, erro: 'falhou' },
    ]);
    const s = (await t.chamar('superSistema', { cookie: sup.cookie })).json();
    expect(s.api.versao).toBe('desenvolvimento');
    expect(s.banco.ok).toBe(true);
    expect(s.smtp.configurado).toBe(false);
    expect(s.worker.jobs.find((j: { job: string }) => j.job === 'backup')).toMatchObject({ ultima: { ok: true }, cron: '30 3 * * *' });
    expect(s.worker.jobs.find((j: { job: string }) => j.job === 'expirar-pix')).toMatchObject({ falhas24h: 1 });
    expect(s.backup.ultimoJobOk).toBe(true);
    const f = (await t.chamar('superFinanceiro', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-12-31', agrupamento: 'mes' } })).json();
    expect(f.serie.map((p: { periodo: string }) => p.periodo)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
    expect(f.totais.brutoCentavos).toBe(f.totais.asaas.centavos + f.totais.manual.centavos);
    expect(f.totais.liquidoCentavos).toBe(f.totais.brutoCentavos - f.totais.taxasCentavos - f.totais.reembolsos.centavos);
    const csv = (await t.chamar('superFinanceiroCsv', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-10-31' } })).json();
    expect(csv.conteudo.split('\r\n')).toHaveLength(33);
  });
});
