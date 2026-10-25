/**
 * Ambiente de teste da API: PGlite migrado + seed, Asaas falso, mailer em memória e relógio
 * controlável. Usado nos testes Vitest e disponível para o E2E (`@fuse/api/teste`).
 *
 *   const t = await criarAmbienteTeste();
 *   const aluno = await t.alunoPago();
 *   const r = await t.chamar('trilha', { cookie: aluno.cookie });
 */
import { eq } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { schema } from '@fuse/db';
import { criarBancoTeste, type BancoTeste } from '@fuse/db/teste';
import type { OpcoesSeed } from '@fuse/db/seed';
import { completarCpf, criarRng } from '@fuse/shared';
import { NOME_COOKIE_SESSAO, PREFIXO_API, ROTAS, montarCaminho, type NomeRota } from '@fuse/shared/api';
import { criarApp } from '../app.js';
import { configTeste, type Config } from '../config.js';
import { criarRelogioTeste, type RelogioTeste } from '../contexto.js';
import { criarAsaasFalso, type AsaasFalso } from '../integracoes/asaas.js';
import { criarMailerMemoria, type MailerMemoria } from '../integracoes/email.js';
import { gerarHashSenha } from '../servicos/senhas.js';
import { gerarCodigoTotp } from '../servicos/totp.js';

export interface OpcoesAmbienteTeste {
  /** Opções do seed (padrão: sem catálogo FAU e com as autorais publicadas). */
  seed?: OpcoesSeed | false;
  inicio?: string | Date;
  rateLimit?: boolean;
  config?: Partial<Config>;
}

export interface Chamada {
  cookie?: string | undefined;
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  corpo?: unknown;
  headers?: Record<string, string>;
}

export interface Aluno {
  id: string;
  email: string;
  senha: string;
  cookie: string;
}

let contador = 0;

export function cookieDe(r: LightMyRequestResponse): string | undefined {
  const c = r.cookies.find((x) => x.name === NOME_COOKIE_SESSAO);
  return c ? `${NOME_COOKIE_SESSAO}=${c.value}` : undefined;
}

export async function criarAmbienteTeste(o: OpcoesAmbienteTeste = {}) {
  const banco: BancoTeste = await criarBancoTeste({
    seed: o.seed === false ? false : (o.seed ?? { semCatalogo: true, publicarAutorais: true }),
  });
  const relogio: RelogioTeste = criarRelogioTeste(o.inicio);
  const asaas: AsaasFalso = criarAsaasFalso({ relogio: relogio.agora });
  const mailer: MailerMemoria = criarMailerMemoria();
  const config = configTeste(o.config);
  const app: FastifyInstance = await criarApp({
    db: banco.db,
    config,
    asaas,
    mailer,
    relogio,
    rng: criarRng('teste'),
    rateLimit: o.rateLimit ?? false,
    logger: false,
  });

  async function chamar(nome: NomeRota, c: Chamada = {}) {
    const def = ROTAS[nome];
    const qs = c.query
      ? '?' + new URLSearchParams(Object.entries(c.query).map(([k, v]) => [k, String(v)] as [string, string])).toString()
      : '';
    const corpo = c.corpo ?? (def.metodo === 'GET' ? undefined : undefined);
    return app.inject({
      method: def.metodo,
      url: PREFIXO_API + montarCaminho(def.caminho, c.params) + qs,
      headers: { ...(c.cookie ? { cookie: c.cookie } : {}), ...(c.headers ?? {}) },
      ...(corpo !== undefined ? { payload: corpo as object } : {}),
    });
  }

  async function cadastrar(dados: Partial<{ nome: string; email: string; senha: string; cpf: string }> = {}): Promise<Aluno> {
    const n = ++contador;
    const email = dados.email ?? `aluno${n}.${Date.now()}@teste.com`;
    const senha = dados.senha ?? 'senha-forte-123';
    const r = await chamar('authCadastro', {
      corpo: {
        nome: dados.nome ?? `Marina Teste${n} Souza`,
        email,
        cpf: dados.cpf ?? completarCpf(String(100000000 + n * 7919 + (Date.now() % 1000) * 97).slice(-9)),
        celular: '42998765432',
        senha,
        aceiteTermos: true,
      },
    });
    if (r.statusCode !== 201) throw new Error(`cadastro falhou: ${r.statusCode} ${r.body}`);
    return { id: r.json().usuario.id, email, senha, cookie: cookieDe(r)! };
  }

  /** Simula o webhook PAYMENT_CONFIRMED do Asaas. */
  async function webhook(evento: string, paymentId: string, id = `evt_${++contador}`, token = config.asaas.webhookToken) {
    return chamar('webhookAsaas', {
      headers: { 'asaas-access-token': token },
      corpo: { id, event: evento, payment: { id: paymentId, status: 'CONFIRMED', billingType: 'PIX' } },
    });
  }

  /** Cadastra, gera o Pix, confirma por webhook e escolhe o cargo (área administrativo). */
  async function alunoPago(dados: Parameters<typeof cadastrar>[0] = {}, cargo = 'Agente Administrativo'): Promise<Aluno> {
    const a = await cadastrar(dados);
    const pix = await chamar('pagamentoPix', { cookie: a.cookie });
    if (pix.statusCode !== 200) throw new Error(`pix falhou: ${pix.body}`);
    const [p] = await banco.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pix.json().pedidoId));
    await webhook('PAYMENT_CONFIRMED', p!.asaasPaymentId!);
    const [c] = await banco.db.select().from(schema.cargos).where(eq(schema.cargos.nome, cargo));
    await chamar('meAtualizar', { cookie: a.cookie, corpo: { cargoId: c!.id, onboardingConcluido: true } });
    return a;
  }

  async function admin(): Promise<Aluno> {
    const email = `admin${++contador}@teste.com`;
    const senha = 'senha-admin-123';
    await banco.db.insert(schema.usuarios).values({
      nome: 'Dono Admin',
      email,
      senhaHash: await gerarHashSenha(senha),
      papel: 'admin',
      acesso: true,
    });
    const r = await chamar('authLogin', { corpo: { email, senha } });
    const [u] = await banco.db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email));
    return { id: u!.id, email, senha, cookie: cookieDe(r)! };
  }

  /**
   * D13: superadmin logado. Com `doisFatores` (padrão), configura o TOTP e confirma a sessão.
   * `codigo()` gera o código do instante do relógio de teste (avance 30 s entre dois usos).
   */
  async function superadmin(o: { doisFatores?: boolean; email?: string } = {}) {
    const email = o.email ?? `super${++contador}@teste.com`;
    const senha = 'senha-super-forte-123';
    const [u] = await banco.db
      .insert(schema.usuarios)
      .values({ nome: 'Dono Superadmin', email, senhaHash: await gerarHashSenha(senha), papel: 'superadmin', acesso: true })
      .returning();
    const r = await chamar('authLogin', { corpo: { email, senha } });
    const cookie = cookieDe(r)!;
    let segredo = '';
    const codigo = () => gerarCodigoTotp(segredo, relogio.agora());
    if (o.doisFatores !== false) {
      const ini = await chamar('super2faIniciar', { cookie });
      if (ini.statusCode !== 200) throw new Error(`2fa iniciar: ${ini.body}`);
      segredo = (ini.json().chaveManual as string).replace(/\s+/g, '');
      const at = await chamar('super2faAtivar', { cookie, corpo: { codigo: codigo() } });
      if (at.statusCode !== 200) throw new Error(`2fa ativar: ${at.body}`);
      relogio.avancar(30_000);
    }
    return { id: u!.id, email, senha, cookie, segredo: () => segredo, codigo };
  }

  return {
    app,
    banco,
    db: banco.db,
    relogio,
    asaas,
    mailer,
    config,
    chamar,
    cadastrar,
    webhook,
    alunoPago,
    admin,
    superadmin,
    async fechar() {
      await app.close();
      await banco.fechar();
    },
  };
}

export type AmbienteTeste = Awaited<ReturnType<typeof criarAmbienteTeste>>;
