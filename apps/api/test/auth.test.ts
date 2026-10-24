import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { completarCpf } from '@fuse/shared';
import { MENSAGEM_RECUPERAR } from '@fuse/shared/api';
import { cookieDe, criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { usuario } from './ajuda.js';

let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste();
}, 60_000);
afterAll(() => t.fechar());

describe('autenticação (PRD 8.2)', () => {
  it('cadastro abre sessão com cookie httpOnly/Secure/Lax, guarda hash e aceite dos termos', async () => {
    const r = await t.chamar('authCadastro', {
      corpo: { nome: 'Carlos da Silva', email: 'Carlos@Teste.com', cpf: '529.982.247-25', celular: '(42) 99876-5432', senha: '12345678', aceiteTermos: true },
    });
    expect(r.statusCode, r.body).toBe(201);
    expect(r.json().proximo).toBe('pagamento');
    const c = r.cookies.find((x) => x.name === 'fuse_sessao')!;
    expect(c.httpOnly).toBe(true);
    expect(c.secure).toBe(true);
    expect(c.sameSite).toBe('Lax');
    expect(Buffer.from(c.value, 'base64url')).toHaveLength(32);
    const u = await usuario(t, r.json().usuario.id);
    expect(u.email).toBe('carlos@teste.com');
    expect(u.cpf).toBe('52998224725');
    expect(u.senhaHash).toMatch(/^\$argon2id\$/);
    expect(u.versaoTermos).toBeTruthy();
    expect(u.aceiteTermosEm).toBeInstanceOf(Date);
    const [s] = await t.db.select().from(schema.sessoes).where(eq(schema.sessoes.usuarioId, u.id));
    expect(s!.tokenHash).not.toContain(c.value);
    expect(s!.expiraEm.getTime() - t.relogio.agora().getTime()).toBe(60 * 24 * 3600_000);
  });

  it('conta repetida (e-mail ou CPF) responde 409 com a mensagem do PRD', async () => {
    const r = await t.chamar('authCadastro', {
      corpo: { nome: 'Outro Nome', email: 'novo@teste.com', cpf: '52998224725', celular: '42998765432', senha: '12345678', aceiteTermos: true },
    });
    expect(r.statusCode).toBe(409);
    expect(r.json().erro).toBe('Já existe uma conta com este e-mail ou CPF. Entre com sua senha.');
  });

  it('login, senha errada e sair', async () => {
    const ruim = await t.chamar('authLogin', { corpo: { email: 'carlos@teste.com', senha: 'errada!!' } });
    expect(ruim.statusCode).toBe(401);
    expect(ruim.json().erro).toBe('E-mail ou senha incorretos.');
    const ok = await t.chamar('authLogin', { corpo: { email: 'CARLOS@teste.com', senha: '12345678' } });
    expect(ok.statusCode).toBe(200);
    const cookie = cookieDe(ok)!;
    expect((await t.chamar('meObter', { cookie })).statusCode).toBe(200);
    expect((await t.chamar('authSair', { cookie })).statusCode).toBe(200);
    expect((await t.chamar('meObter', { cookie })).statusCode).toBe(401);
  });

  it('sessão renovada no uso e expira em 60 dias sem uso', async () => {
    const a = await t.cadastrar();
    t.relogio.avancar(59 * 24 * 3600_000);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(200);
    t.relogio.avancar(59 * 24 * 3600_000);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(200);
    t.relogio.avancar(61 * 24 * 3600_000);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(401);
  });

  it('recuperar responde igual sempre; redefinir troca a senha e encerra as outras sessões', async () => {
    const a = await t.cadastrar();
    const outra = cookieDe(await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } }))!;
    const nada = await t.chamar('authRecuperar', { corpo: { email: 'naoexiste@teste.com' } });
    const r = await t.chamar('authRecuperar', { corpo: { email: a.email } });
    expect(nada.json()).toEqual(r.json());
    expect(r.json().mensagem).toBe(MENSAGEM_RECUPERAR);
    await t.app.deps.aguardarTarefas();
    const email = t.mailer.enviados.at(-1)!;
    expect(email.para).toBe(a.email);
    const token = /\/recuperar\/([\w-]+)/.exec(email.texto)![1]!;
    const red = await t.chamar('authRedefinir', { corpo: { token, senha: 'nova-senha-123' } });
    expect(red.statusCode, red.body).toBe(200);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(401);
    expect((await t.chamar('meObter', { cookie: outra })).statusCode).toBe(401);
    expect((await t.chamar('meObter', { cookie: cookieDe(red) })).statusCode).toBe(200);
    expect((await t.chamar('authRedefinir', { corpo: { token, senha: 'outra-senha-123' } })).statusCode).toBe(400);
    expect((await t.chamar('authLogin', { corpo: { email: a.email, senha: 'nova-senha-123' } })).statusCode).toBe(200);
  });

  it('link de redefinição vale 1 hora', async () => {
    const a = await t.cadastrar();
    await t.chamar('authRecuperar', { corpo: { email: a.email } });
    await t.app.deps.aguardarTarefas();
    const token = /\/recuperar\/([\w-]+)/.exec(t.mailer.enviados.at(-1)!.texto)![1]!;
    t.relogio.avancar(61 * 60_000);
    const r = await t.chamar('authRedefinir', { corpo: { token, senha: 'nova-senha-123' } });
    expect(r.statusCode).toBe(400);
    expect(r.json().codigo).toBe('token_invalido');
  });

  it('alterar senha encerra as outras sessões; excluir conta anonimiza e mantém o pedido', async () => {
    const a = await t.alunoPago();
    const outra = cookieDe(await t.chamar('authLogin', { corpo: { email: a.email, senha: a.senha } }))!;
    const r = await t.chamar('meSenha', { cookie: a.cookie, corpo: { senhaAtual: a.senha, novaSenha: 'trocada-123' } });
    expect(r.statusCode).toBe(200);
    expect((await t.chamar('meObter', { cookie: outra })).statusCode).toBe(401);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(200);
    const exp = await t.chamar('meExportar', { cookie: a.cookie });
    expect(exp.statusCode).toBe(200);
    expect(exp.json().perfil.senhaHash).toBeUndefined();
    expect(exp.json().pedidos).toHaveLength(1);
    const del = await t.chamar('meExcluir', { cookie: a.cookie, corpo: { senha: 'trocada-123', confirmacao: 'EXCLUIR' } });
    expect(del.statusCode).toBe(200);
    const u = await usuario(t, a.id);
    expect(u.cpf).toBeNull();
    expect(u.nome).toBe('Conta excluída');
    expect(u.excluidoEm).toBeInstanceOf(Date);
    const [p] = await t.db.select({ n: count() }).from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    expect(Number(p!.n)).toBe(1);
    expect((await t.chamar('meObter', { cookie: a.cookie })).statusCode).toBe(401);
  });
});

describe('rate limit (PRD 8.2)', () => {
  it('login: 20 por 15 min por IP; cadastro: 10 por hora', async () => {
    const t2 = await criarAmbienteTeste({ rateLimit: true, seed: false });
    try {
      const codigos: number[] = [];
      for (let i = 0; i < 21; i++) {
        codigos.push((await t2.chamar('authLogin', { corpo: { email: 'x@teste.com', senha: 'y' } })).statusCode);
      }
      expect(codigos.slice(0, 20).every((c) => c === 401)).toBe(true);
      expect(codigos[20]).toBe(429);
      const corpo = (i: number) => ({
        nome: 'Ana Souza',
        email: `rl${i}@teste.com`,
        cpf: completarCpf(String(200000000 + i)),
        celular: '42998765432',
        senha: '12345678',
        aceiteTermos: true,
      });
      const cad: number[] = [];
      for (let i = 0; i < 11; i++) cad.push((await t2.chamar('authCadastro', { corpo: corpo(i) })).statusCode);
      expect(cad.slice(0, 10).every((c) => c === 201)).toBe(true);
      const ultimo = await t2.chamar('authCadastro', { corpo: corpo(99) });
      expect(ultimo.statusCode).toBe(429);
      expect(ultimo.json().codigo).toBe('limite_requisicoes');
    } finally {
      await t2.fechar();
    }
  }, 60_000);
});
