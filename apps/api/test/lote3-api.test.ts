/**
 * Lote 3 (pedidos de API da web do /super): o papel do dono no pagamento, reenviar e cancelar
 * o convite da equipe (S-19) e a lista leve de concursos para os filtros (D21).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { UUID_X } from './ajuda.js';

let t: AmbienteTeste;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let supSem2fa: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let adm: Aluno;
let aluno: Aluno;

beforeAll(async () => {
  t = await criarAmbienteTeste();
  sup = await t.superadmin();
  supSem2fa = await t.superadmin({ doisFatores: false });
  adm = await t.admin();
  aluno = await t.alunoPago();
}, 90_000);
afterAll(() => t.fechar());

const conf = () => ({ senha: sup.senha });

async function convidar(email: string) {
  const r = await t.chamar('superEquipeConvidar', {
    cookie: sup.cookie,
    corpo: { nome: 'Bia Convidada Souza', email, papel: 'admin', motivo: 'Equipe de conteúdo', confirmacao: conf() },
  });
  expect(r.statusCode, r.body).toBe(200);
  await t.app.deps.aguardarTarefas();
  const token = /\/convite\/([\w-]+)/.exec(t.mailer.enviados.at(-1)!.texto)![1]!;
  return { id: r.json().id as string, token };
}

describe('pagamento traz o papel do dono (Lote 3)', () => {
  it('lista e detalhe trazem usuario.papel', async () => {
    const lista = (await t.chamar('superPagamentosListar', { cookie: sup.cookie, query: { q: aluno.email } })).json();
    expect(lista.itens[0].usuario).toMatchObject({ id: aluno.id, papel: 'aluno' });
    const det = (await t.chamar('superPagamentoObter', { cookie: sup.cookie, params: { id: lista.itens[0].id } })).json();
    expect(det.pagamento.usuario.papel).toBe('aluno');
  });
});

describe('GET /super/concursos (D21)', () => {
  it('superadmin recebe a lista leve (id e nome)', async () => {
    const r = await t.chamar('superConcursos', { cookie: sup.cookie });
    expect(r.statusCode, r.body).toBe(200);
    const itens = r.json().itens as { id: string; nome: string }[];
    expect(itens.length).toBeGreaterThan(0);
    expect(Object.keys(itens[0]!).sort()).toEqual(['id', 'nome']);
  });

  it('admin, aluno e superadmin sem 2FA não acessam', async () => {
    expect((await t.chamar('superConcursos', { cookie: adm.cookie })).statusCode).toBe(403);
    expect((await t.chamar('superConcursos', { cookie: aluno.cookie })).statusCode).toBe(403);
    expect((await t.chamar('superConcursos', { cookie: supSem2fa.cookie })).statusCode).toBe(403);
    expect((await t.chamar('superConcursos')).statusCode).toBe(401);
  });
});

describe('convite da equipe: reenviar e cancelar (S-19)', () => {
  it('reenviar gera um link novo, invalida o anterior e fica na auditoria', async () => {
    const { id, token: antigo } = await convidar('bia.reenvio@teste.com');
    const r = await t.chamar('superEquipeConviteReenviar', { cookie: sup.cookie, params: { id }, corpo: { motivo: 'Não recebeu o e-mail' } });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ id, email: 'bia.reenvio@teste.com' });
    await t.app.deps.aguardarTarefas();
    const email = t.mailer.enviados.at(-1)!;
    expect(email.para).toBe('bia.reenvio@teste.com');
    const novo = /\/convite\/([\w-]+)/.exec(email.texto)![1]!;
    expect(novo).not.toBe(antigo);

    const velho = await t.chamar('authRedefinir', { corpo: { token: antigo, senha: 'senha-nova-bia-123' } });
    expect(velho.statusCode).toBe(400);
    const ok = await t.chamar('authRedefinir', { corpo: { token: novo, senha: 'senha-nova-bia-123' } });
    expect(ok.statusCode, ok.body).toBe(200);

    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'equipe.convite_reenviar' } })).json();
    expect(aud.itens[0]).toMatchObject({ motivo: 'Não recebeu o e-mail', alvo: `usuario:${id}` });

    // Depois de aceito, não há convite para reenviar nem cancelar.
    const de_novo = await t.chamar('superEquipeConviteReenviar', { cookie: sup.cookie, params: { id }, corpo: { motivo: 'Mais uma vez' } });
    expect(de_novo.statusCode).toBe(409);
    const cancelar = await t.chamar('superEquipeConviteCancelar', { cookie: sup.cookie, params: { id }, corpo: { motivo: 'Mais uma vez' } });
    expect(cancelar.statusCode).toBe(409);
  });

  it('cancelar invalida o link, remove a conta convidada e libera o e-mail', async () => {
    const { id, token } = await convidar('bia.cancela@teste.com');
    const r = await t.chamar('superEquipeConviteCancelar', { cookie: sup.cookie, params: { id }, corpo: { motivo: 'Convite errado' } });
    expect(r.statusCode, r.body).toBe(200);
    const usado = await t.chamar('authRedefinir', { corpo: { token, senha: 'senha-nova-bia-123' } });
    expect(usado.statusCode).toBe(400);
    expect(await t.db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id))).toHaveLength(0);
    const equipe = (await t.chamar('superEquipe', { cookie: sup.cookie })).json();
    expect(equipe.itens.some((m: { email: string }) => m.email === 'bia.cancela@teste.com')).toBe(false);
    const aud = (await t.chamar('superAuditoria', { cookie: sup.cookie, query: { acao: 'equipe.convite_cancelar' } })).json();
    expect(aud.itens[0]).toMatchObject({ motivo: 'Convite errado', alvo: `usuario:${id}` });
    // O e-mail pode ser convidado de novo.
    await convidar('bia.cancela@teste.com');
  });

  it('pede motivo, só vale para convite pendente da equipe e exige superadmin com 2FA', async () => {
    const { id } = await convidar('bia.regras@teste.com');
    const semMotivo = await t.chamar('superEquipeConviteReenviar', { cookie: sup.cookie, params: { id }, corpo: { motivo: '' } });
    expect(semMotivo.statusCode).toBe(400);
    const deAluno = await t.chamar('superEquipeConviteCancelar', { cookie: sup.cookie, params: { id: aluno.id }, corpo: { motivo: 'Teste de regra' } });
    expect(deAluno.statusCode).toBe(404);
    const inexistente = await t.chamar('superEquipeConviteReenviar', { cookie: sup.cookie, params: { id: UUID_X }, corpo: { motivo: 'Teste de regra' } });
    expect(inexistente.statusCode).toBe(404);
    const sem2fa = await t.chamar('superEquipeConviteCancelar', { cookie: supSem2fa.cookie, params: { id }, corpo: { motivo: 'Teste de regra' } });
    expect(sem2fa.statusCode).toBe(403);
    const admin = await t.chamar('superEquipeConviteReenviar', { cookie: adm.cookie, params: { id }, corpo: { motivo: 'Teste de regra' } });
    expect(admin.statusCode).toBe(403);
  });
});
