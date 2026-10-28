import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { criarOuPromoverSuperadmin, gerarSenhaForte } from '../src/servicos/superadminCli.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 90_000);
afterAll(() => t.fechar());

const usuarioPorEmail = async (email: string) =>
  (await t.db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email)))[0]!;

describe('CLI superadmin:criar (D13)', () => {
  it('gera senhas fortes e diferentes', () => {
    const a = gerarSenhaForte();
    const b = gerarSenhaForte();
    expect(a).toHaveLength(20);
    expect(a).not.toBe(b);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/[2-9]/);
    expect(a).toMatch(/[-_.!@#]/);
  });

  it('conta nova sem senha: cria com senha gerada, mostrada uma vez, e ela funciona no login', async () => {
    const r = await criarOuPromoverSuperadmin(t.db, { email: 'Dona.Nova@Teste.com', nome: 'Dona Nova Fuse' });
    expect(r.promovido).toBe(false);
    expect(r.email).toBe('dona.nova@teste.com');
    expect(r.senhaGerada).toHaveLength(20);
    const u = await usuarioPorEmail('dona.nova@teste.com');
    expect(u.papel).toBe('superadmin');
    expect(u.senhaHash).not.toContain(r.senhaGerada!);
    const login = await t.chamar('authLoginSuper', { corpo: { email: r.email, senha: r.senhaGerada! } });
    expect(login.statusCode, login.body).toBe(200);
    expect(login.json()).toMatchObject({ proximo: 'dois_fatores', area: 'super' });
    // D24 (A1.6): a CLI não liga o acesso de estudo da equipe.
    expect(u.acesso).toBe(false);
    expect(u.concursoId).toBeNull();
    const ucs = await t.db.select().from(schema.usuariosConcursos).where(eq(schema.usuariosConcursos.usuarioId, r.id));
    expect(ucs).toHaveLength(0);
    // O portal do aluno não aceita a conta do superadmin (mesma resposta de senha errada).
    const errado = await t.chamar('authLogin', { corpo: { email: r.email, senha: r.senhaGerada! } });
    expect(errado.statusCode).toBe(401);
    expect(errado.json().codigo).toBe('credenciais_invalidas');
    const aud = await t.db.select().from(schema.auditoria).where(eq(schema.auditoria.alvo, `usuario:${r.id}`));
    expect(aud.map((x) => x.acao)).toContain('superadmin.criar');
  });

  it('conta nova com --senha: usa a senha informada e não gera outra', async () => {
    const r = await criarOuPromoverSuperadmin(t.db, { email: 'com.senha@teste.com', nome: 'Com Senha Fuse', senha: 'senha-escolhida-123' });
    expect(r.senhaGerada).toBeNull();
    const login = await t.chamar('authLoginSuper', { corpo: { email: r.email, senha: 'senha-escolhida-123' } });
    expect(login.statusCode).toBe(200);
  });

  it('conta que já existe: só promove o papel, não troca a senha e encerra as sessões', async () => {
    const aluno = await t.cadastrar();
    const antes = await usuarioPorEmail(aluno.email);
    const r = await criarOuPromoverSuperadmin(t.db, { email: aluno.email, nome: 'Outro Nome Qualquer', senha: 'senha-que-nao-vale-1' });
    expect(r).toMatchObject({ id: antes.id, promovido: true, senhaGerada: null });
    const depois = await usuarioPorEmail(aluno.email);
    expect(depois.papel).toBe('superadmin');
    // D24: a promoção não mexe no acesso (o aluno sem pagamento continua sem).
    expect(depois.acesso).toBe(antes.acesso);
    expect(depois.senhaHash).toBe(antes.senhaHash);
    expect(depois.nome).toBe(antes.nome);
    const sessoes = await t.db.select().from(schema.sessoes).where(eq(schema.sessoes.usuarioId, antes.id));
    expect(sessoes).toHaveLength(0);
    expect((await t.chamar('meObter', { cookie: aluno.cookie })).statusCode).toBe(401);
  });

  it('valida e-mail e, para conta nova, nome completo', async () => {
    await expect(criarOuPromoverSuperadmin(t.db, { email: 'invalido' })).rejects.toThrow(/e-mail válido/);
    await expect(criarOuPromoverSuperadmin(t.db, { email: 'sem.nome@teste.com' })).rejects.toThrow(/nome e sobrenome/);
  });
});
