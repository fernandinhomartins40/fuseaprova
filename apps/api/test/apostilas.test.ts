import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { arquivoApostila, descricaoCobrancaApostilas, PRECO_APOSTILAS_CENTAVOS } from '@fuse/shared/api';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import { LIMITE_DOWNLOADS_DIA } from '../src/servicos/apostilas.js';
import { usuario } from './ajuda.js';

/** D34: as 4 apostilas em PDF por R$ 47, produto à parte do preparatório. */
let t: AmbienteTeste;
const arquivos = mkdtempSync(join(tmpdir(), 'fuse-apostilas-'));
const PDF_FALSO = Buffer.from('%PDF-1.4\n% apostila de teste\n%%EOF\n');

beforeAll(async () => {
  mkdirSync(join(arquivos, 'apostilas'), { recursive: true });
  for (const v of [1, 2, 3]) writeFileSync(join(arquivos, 'apostilas', arquivoApostila(v)), PDF_FALSO);
  t = await criarAmbienteTeste({ config: { arquivosDir: arquivos } });
}, 60_000);
afterAll(() => t.fechar());

const pedido = async (id: string) => (await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id)))[0]!;
const status = async (a: Aluno) => (await t.chamar('apostilasStatus', { cookie: a.cookie })).json();
const baixar = (volume: number | string, cookie?: string) =>
  t.app.inject({ method: 'GET', url: `/api/apostilas/${volume}/pdf`, headers: cookie ? { cookie } : {} });

/** Gera o Pix das apostilas e confirma pelo webhook. */
async function comprar(a: Aluno) {
  const pix = await t.chamar('apostilasPix', { cookie: a.cookie });
  expect(pix.statusCode, pix.body).toBe(200);
  const p = await pedido(pix.json().pedidoId);
  expect((await t.webhook('PAYMENT_CONFIRMED', p.asaasPaymentId!)).statusCode).toBe(200);
  await t.app.deps.aguardarTarefas();
  return p;
}

describe('Pix das apostilas (D34)', () => {
  it('gera o Pix de R$ 47 sem concurso e reaproveita o pendente', async () => {
    const a = await t.cadastrar();
    const r1 = await t.chamar('apostilasPix', { cookie: a.cookie });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json()).toMatchObject({ valorCentavos: PRECO_APOSTILAS_CENTAVOS, status: 'pendente' });
    expect(r1.json().payload).toContain('br.gov.bcb.pix');
    const r2 = await t.chamar('apostilasPix', { cookie: a.cookie });
    expect(r2.json().pedidoId).toBe(r1.json().pedidoId);
    const p = await pedido(r1.json().pedidoId);
    expect(p).toMatchObject({ produto: 'apostilas', concursoId: null, valorCentavos: 4700 });
    const cob = t.asaas.cobrancas.get(p.asaasPaymentId!)!;
    expect(cob.dados).toMatchObject({ billingType: 'PIX', value: 47, description: descricaoCobrancaApostilas(), externalReference: `fuseaprova:usuario:${a.id}` });
    expect(await status(a)).toMatchObject({ comprado: false, status: 'pendente', pedidoId: p.id, expirado: false });
  });

  it('o Pix vencido é trocado por um novo', async () => {
    const a = await t.cadastrar();
    const r1 = (await t.chamar('apostilasPix', { cookie: a.cookie })).json();
    t.relogio.avancar(2 * 24 * 3600_000);
    expect((await status(a)).expirado).toBe(true);
    const r2 = (await t.chamar('apostilasPix', { cookie: a.cookie })).json();
    expect(r2.pedidoId).not.toBe(r1.pedidoId);
    expect((await pedido(r1.pedidoId)).status).toBe('vencido');
  });

  it('pago: libera as apostilas e NÃO libera o app', async () => {
    const a = await t.cadastrar();
    await comprar(a);
    expect(await status(a)).toMatchObject({ comprado: true, status: 'pago' });
    expect(t.mailer.enviados.at(-1)!.assunto).toMatch(/apostilas/i);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(402);
    expect((await usuario(t, a.id)).acesso).toBe(false);
    expect((await t.chamar('meObter', { cookie: a.cookie })).json().acessoPago).toBe(false);
    // Já comprado: não gera outro Pix.
    const de2 = await t.chamar('apostilasPix', { cookie: a.cookie });
    expect(de2.statusCode).toBe(409);
    expect(de2.json().erro).toBe('Suas apostilas já estão liberadas.');
  });

  it('estorno fecha as apostilas e não mexe no concurso pago', async () => {
    const a = await t.alunoPago();
    const p = await comprar(a);
    expect((await baixar(1, a.cookie)).statusCode).toBe(200);
    await t.webhook('PAYMENT_REFUNDED', p.asaasPaymentId!);
    await t.app.deps.aguardarTarefas();
    expect(await status(a)).toMatchObject({ comprado: false, status: 'estornado' });
    expect(t.mailer.enviados.at(-1)!.texto).toContain('download das apostilas');
    expect((await baixar(1, a.cookie)).statusCode).toBe(403);
    expect((await usuario(t, a.id)).acesso).toBe(true);
    expect((await t.chamar('trilha', { cookie: a.cookie })).statusCode).toBe(200);
  });

  it('as apostilas não dão desconto de concurso adicional nem entram no status do concurso', async () => {
    const a = await t.cadastrar();
    await comprar(a);
    const st = (await t.chamar('pagamentoStatus', { cookie: a.cookie })).json();
    expect(st).toMatchObject({ status: 'nenhum', acesso: false, pedidoId: null });
    const pix = await t.chamar('pagamentoPix', { cookie: a.cookie });
    expect(pix.statusCode, pix.body).toBe(200);
    expect(pix.json().valorCentavos).toBe(39700);
    // O status das apostilas não enxerga o pedido do concurso.
    expect(await status(a)).toMatchObject({ comprado: true, status: 'pago' });
    const outro = await t.cadastrar();
    await t.chamar('pagamentoPix', { cookie: outro.cookie });
    expect(await status(outro)).toMatchObject({ comprado: false, status: 'nenhum', pedidoId: null });
  });
});

describe('download das apostilas (D34)', () => {
  it('sem sessão 401; sem compra 403; aluno pago do concurso sem apostilas não baixa', async () => {
    expect((await baixar(1)).statusCode).toBe(401);
    const a = await t.cadastrar();
    const r = await baixar(1, a.cookie);
    expect(r.statusCode).toBe(403);
    expect(r.json().erro).toMatch(/ainda não foram compradas/);
    const pago = await t.alunoPago();
    expect((await baixar(2, pago.cookie)).statusCode).toBe(403);
  });

  it('com a compra: entrega o PDF, registra o download, recusa volume inválido e respeita o limite diário', async () => {
    const a = await t.cadastrar();
    await comprar(a);
    const r = await baixar(1, a.cookie);
    expect(r.statusCode, r.body).toBe(200);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toMatch(/^attachment; filename="Apostila Fuse Aprova - Volume 1 - Base comum.pdf"; filename\*=UTF-8''/);
    expect(r.headers['cache-control']).toBe('private, no-store');
    expect(Number(r.headers['content-length'])).toBe(PDF_FALSO.length);
    expect(r.rawPayload.equals(PDF_FALSO)).toBe(true);
    const registros = await t.db.select().from(schema.apostilasDownloads).where(eq(schema.apostilasDownloads.usuarioId, a.id));
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ volume: 1 });

    expect((await baixar(5, a.cookie)).statusCode).toBe(404);
    expect((await baixar('x', a.cookie)).statusCode).toBe(404);
    // Volume 4 sem arquivo no disco: 404 e não conta no limite.
    expect((await baixar(4, a.cookie)).statusCode).toBe(404);

    for (let i = 1; i < LIMITE_DOWNLOADS_DIA; i++) expect((await baixar(2, a.cookie)).statusCode).toBe(200);
    const bloqueado = await baixar(3, a.cookie);
    expect(bloqueado.statusCode).toBe(429);
    expect(bloqueado.json().erro).toMatch(/limite de downloads/);
    t.relogio.avancar(24 * 3600_000 + 1000);
    expect((await baixar(3, a.cookie)).statusCode).toBe(200);
  });

  it('a equipe não baixa pela conta de aluno', async () => {
    const adm = await t.admin();
    expect((await baixar(1, adm.cookie)).statusCode).toBe(403);
  });

  it('LGPD: a exportação leva os downloads e a exclusão apaga', async () => {
    const a = await t.cadastrar();
    await comprar(a);
    await baixar(1, a.cookie);
    const exp = (await t.chamar('meExportar', { cookie: a.cookie })).json();
    expect(exp.downloadsApostilas).toHaveLength(1);
    expect(exp.pedidos.some((p: { produto: string }) => p.produto === 'apostilas')).toBe(true);
    expect((await t.chamar('meExcluir', { cookie: a.cookie, corpo: { senha: a.senha, confirmacao: 'EXCLUIR' } })).statusCode).toBe(200);
    const restantes = await t.db.select().from(schema.apostilasDownloads).where(eq(schema.apostilasDownloads.usuarioId, a.id));
    expect(restantes).toHaveLength(0);
  });
});

describe('superadmin e as apostilas (D34)', () => {
  it('a lista mostra o produto; a aprovação manual das apostilas não libera o app', async () => {
    const sup = await t.superadmin();
    const a = await t.cadastrar();
    const pix = (await t.chamar('apostilasPix', { cookie: a.cookie })).json();
    const lista = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { produto: 'apostilas' } })).json();
    expect(lista.itens.length).toBeGreaterThan(0);
    expect(lista.itens.every((x: { produto: string }) => x.produto === 'apostilas')).toBe(true);
    expect(lista.itens.find((x: { id: string }) => x.id === pix.pedidoId)).toMatchObject({ produto: 'apostilas', concurso: null, concursoLiberado: false });

    const r = await t.chamar('superPagamentoAprovarManual', {
      cookie: sup.cookie,
      params: { id: pix.pedidoId },
      corpo: { recebidoEm: '2026-10-19', forma: 'pix_direto', observacao: 'Pix direto na conta, comprovante no WhatsApp', confirmacao: { senha: sup.senha } },
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().mensagem).toMatch(/apostilas/);
    expect(await pedido(pix.pedidoId)).toMatchObject({ status: 'pago', metodo: 'manual', concursoId: null, produto: 'apostilas' });
    expect((await usuario(t, a.id)).acesso).toBe(false);
    expect(await status(a)).toMatchObject({ comprado: true });
    const det = (await t.chamar('superPagamentoObter', { cookie: sup.cookie, params: { id: pix.pedidoId } })).json();
    expect(det.pagamento).toMatchObject({ produto: 'apostilas', concursoLiberado: true });
    const lib = await t.chamar('superPagamentoLiberar', { cookie: sup.cookie, params: { id: pix.pedidoId }, corpo: { motivo: 'Teste de liberação', confirmacao: { senha: sup.senha } } });
    expect(lib.statusCode).toBe(409);
  });
});
