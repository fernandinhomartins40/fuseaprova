import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROTAS, rotasComGuarda } from '@fuse/shared/api';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { UUID_X } from './ajuda.js';

let t: AmbienteTeste;
let semPagar: Aluno;
let pago: Aluno;
beforeAll(async () => {
  t = await criarAmbienteTeste();
  semPagar = await t.cadastrar();
  pago = await t.alunoPago();
}, 60_000);
afterAll(() => t.fechar());

const params = (caminho: string) => Object.fromEntries([...caminho.matchAll(/:([A-Za-z]+)/g)].map((m) => [m[1]!, UUID_X]));

describe('guardas (PRD 8.2, critério 12: 402 em toda rota de conteúdo)', () => {
  const conteudo = rotasComGuarda('acesso');

  it('há rotas de conteúdo e todas exigem acesso', () => {
    expect(conteudo.length).toBeGreaterThan(20);
    for (const n of ['trilha', 'licaoIniciar', 'revisao', 'simuladoCriar', 'offlinePacote', 'syncTentativas', 'liga'] as const) {
      expect(conteudo).toContain(n);
    }
  });

  it.each(conteudo)('%s responde 402 sem pagamento confirmado', async (nome) => {
    const r = await t.chamar(nome, { cookie: semPagar.cookie, params: params(ROTAS[nome].caminho), corpo: {} });
    expect(r.statusCode).toBe(402);
    expect(r.json()).toMatchObject({ codigo: 'sem_acesso', erro: expect.any(String) });
  });

  it.each(conteudo)('%s responde 401 sem login', async (nome) => {
    const r = await t.chamar(nome, { params: params(ROTAS[nome].caminho), corpo: {} });
    expect(r.statusCode).toBe(401);
  });

  it.each(rotasComGuarda('conteudo'))('%s responde 403 para aluno', async (nome) => {
    const r = await t.chamar(nome, { cookie: pago.cookie, params: params(ROTAS[nome].caminho), corpo: {} });
    expect(r.statusCode).toBe(403);
    expect(r.json().codigo).toBe('proibido');
  });

  it('rotas de login funcionam sem pagamento', async () => {
    expect((await t.chamar('meObter', { cookie: semPagar.cookie })).statusCode).toBe(200);
    expect((await t.chamar('pagamentoStatus', { cookie: semPagar.cookie })).statusCode).toBe(200);
  });

  it('erro de validação em português com campos', async () => {
    const r = await t.chamar('authCadastro', { corpo: { nome: 'Ana', email: 'x', cpf: '111', celular: '1', senha: '1', aceiteTermos: true } });
    expect(r.statusCode).toBe(400);
    const j = r.json();
    expect(j.codigo).toBe('validacao');
    expect(j.campos.cpf).toBe('Esse CPF não é válido.');
    const r2 = await t.chamar('authLogin', { corpo: {} });
    expect(r2.json().campos.email).toMatch(/e-mail/i);
    const r3 = await t.chamar('sessaoResponder', { cookie: pago.cookie, params: { id: UUID_X }, corpo: { questaoId: 'x' } });
    expect(r3.statusCode).toBe(400);
    expect(Object.values(r3.json().campos).join(' ')).not.toMatch(/Required|Invalid|Expected/);
  });

  it('404 em português', async () => {
    const r = await t.app.inject({ method: 'GET', url: '/api/nao-existe' });
    expect(r.statusCode).toBe(404);
    expect(r.json().erro).toMatch(/Não encontramos/);
  });
});
