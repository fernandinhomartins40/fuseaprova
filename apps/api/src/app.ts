/**
 * @fuse/api — `criarApp(opcoes)` monta o Fastify com dependências injetáveis
 * (banco, cliente Asaas, mailer, relógio), para produção, testes e E2E.
 *
 *   const app = await criarApp({ db, asaas: criarAsaasFalso(), mailer: criarMailerMemoria(), relogio });
 *   await app.inject({ method: 'GET', url: '/api/saude' });
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { podeEstudar, podeGerirConteudo, rngPadrao, type Rng } from '@fuse/shared';
import { NOME_COOKIE_SESSAO, erroApi, instalarMensagensPtBr } from '@fuse/shared/api';
import { lerConfig, type Config } from './config.js';
import { relogioSistema, type Deps, type Relogio, type UsuarioSessao } from './contexto.js';
import { definirCookieSessao } from './http/cookies.js';
import { ErroHttp } from './http/erros.js';
import { conferirRegistro, criarRegistrador, exigirConteudo, exigirSuperadmin } from './http/registrar.js';
import { criarClienteAsaasHttp, type ClienteAsaas } from './integracoes/asaas.js';
import { criarMailerPadrao, type Mailer, type MensagemEmail } from './integracoes/email.js';
import { rotasAdminConteudo } from './rotas/admin/conteudo.js';
import { rotasAdminGestao } from './rotas/admin/gestao.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasConteudo } from './rotas/conteudo.js';
import { rotasEstudo } from './rotas/estudo.js';
import { rotasMe } from './rotas/me.js';
import { rotasOffline } from './rotas/offline.js';
import { rotasPagamento } from './rotas/pagamento.js';
import { rotasSimulados } from './rotas/simulados.js';
import { rotasSocial } from './rotas/social.js';
import { rotasSuper } from './rotas/super/index.js';
import { carregarSessao } from './servicos/sessoes.js';

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioSessao | null;
  }
  interface FastifyInstance {
    deps: Deps;
  }
}

export interface OpcoesApp {
  db: BancoDados;
  config?: Config;
  asaas?: ClienteAsaas;
  mailer?: Mailer;
  relogio?: Relogio;
  rng?: Rng;
  /** Rate limit do PRD 8.2 (padrão: ligado). Os testes de integração desligam. */
  rateLimit?: boolean;
  logger?: FastifyServerOptions['logger'];
}

/** Logs sem senha, token, cookie, CPF ou payload Pix (PRD 8.8). */
export function opcoesLogger(nivel: string): FastifyServerOptions['logger'] {
  return {
    level: nivel,
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.headers["asaas-access-token"]',
        'res.headers["set-cookie"]',
        '*.senha',
        '*.token',
        '*.cpf',
        '*.pixPayload',
        '*.payload',
      ],
      censor: '[oculto]',
    },
  };
}

export async function criarApp(opcoes: OpcoesApp): Promise<FastifyInstance> {
  const config = opcoes.config ?? lerConfig();
  // Mensagens padrão do Zod em português (as próprias dos schemas continuam valendo).
  instalarMensagensPtBr();
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    logger: opcoes.logger ?? opcoesLogger(config.nivelLog),
    disableRequestLogging: config.ambiente === 'test',
  });

  const tarefas = new Set<Promise<unknown>>();
  const deps: Deps = {
    db: opcoes.db,
    config,
    asaas: opcoes.asaas ?? criarClienteAsaasHttp({ baseUrl: config.asaas.baseUrl, apiKey: config.asaas.apiKey }),
    mailer: opcoes.mailer ?? criarMailerPadrao(config),
    relogio: opcoes.relogio ?? relogioSistema,
    rng: opcoes.rng ?? rngPadrao,
    log: app.log,
    enviarEmail(m: MensagemEmail) {
      const p = deps.mailer
        .enviar(m)
        .catch((e: Error) => app.log.error({ assunto: m.assunto, erro: e.message }, 'falha ao enviar e-mail'))
        .finally(() => tarefas.delete(p));
      tarefas.add(p);
    },
    async aguardarTarefas() {
      while (tarefas.size) await Promise.all([...tarefas]);
    },
  };
  app.decorate('deps', deps);
  app.decorateRequest('usuario', null);

  await app.register(helmet, {
    // A API só responde JSON (e imagens de upload); a CSP da PWA fica no Caddy.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], imgSrc: ["'self'", 'data:'], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    hook: 'preHandler',
    errorResponseBuilder: () => ({ statusCode: 429, ...erroApi('limite_requisicoes') }),
  });
  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

  // Corpo JSON vazio é aceito (POST sem corpo com Content-Type: application/json).
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, corpo, feito) => {
    const texto = String(corpo ?? '');
    if (!texto.trim()) return feito(null, undefined);
    try {
      feito(null, JSON.parse(texto));
    } catch {
      feito(new ErroHttp('validacao', 'O corpo da requisição não é um JSON válido.'), undefined);
    }
  });

  // Sessão: carrega o usuário pelo cookie em toda requisição e renova o prazo.
  app.addHook('onRequest', async (req, reply) => {
    const token = req.cookies[NOME_COOKIE_SESSAO];
    if (!token) return;
    const s = await carregarSessao(deps.db, config.segredoSessao, token, deps.relogio.agora());
    if (!s) return;
    req.usuario = s.usuario;
    if (s.renovada) definirCookieSessao(reply, config, token, s.expiraEm);
  });

  app.setErrorHandler((erro, req, reply) => {
    if (erro instanceof ErroHttp) return reply.status(erro.status).send(erro.corpo());
    const e = erro as { statusCode?: number; code?: string; message: string };
    if (e.statusCode === 429) return reply.status(429).send(erroApi('limite_requisicoes'));
    if (e.code === 'FST_REQ_FILE_TOO_LARGE') return reply.status(400).send(erroApi('validacao', 'A imagem pode ter no máximo 2 MB.'));
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.status(e.statusCode).send(erroApi('validacao', 'Requisição inválida.'));
    }
    req.log.error({ err: erro }, 'erro interno');
    return reply.status(500).send(erroApi('interno'));
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send(erroApi('nao_encontrado')));

  /* ---------------------------------------------- rotas fora do registro */
  app.get('/api/saude', async (_req, reply) => {
    try {
      await deps.db.execute(sql`select 1`);
      return { ok: true, banco: 'ok' };
    } catch {
      return reply.status(503).send({ ok: false, banco: 'indisponivel' });
    }
  });

  // Imagens dos enunciados (upload do admin). D24: para o aluno com acesso e para a equipe de
  // conteúdo (admin, ou superadmin com 2FA), que precisa vê-las na curadoria.
  app.get<{ Params: { nome: string } }>('/api/arquivos/uploads/:nome', async (req, reply) => {
    const u = req.usuario;
    if (!u) throw new ErroHttp('nao_autenticado');
    if (podeGerirConteudo(u.papel)) exigirConteudo(u);
    else if (!podeEstudar(u.papel)) throw new ErroHttp('proibido');
    else if (!u.acesso) throw new ErroHttp('sem_acesso');
    const nome = req.params.nome;
    if (!/^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(nome)) throw new ErroHttp('nao_encontrado');
    try {
      const dados = await readFile(join(config.arquivosDir, 'uploads', nome));
      const tipo = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[nome.split('.').pop()!]!;
      return reply.header('Cache-Control', 'private, max-age=86400').type(tipo).send(dados);
    } catch {
      throw new ErroHttp('nao_encontrado');
    }
  });

  // D13: comprovantes da aprovação manual, só para o superadmin (com 2FA).
  app.get<{ Params: { nome: string } }>('/api/super/comprovantes/:nome', async (req, reply) => {
    exigirSuperadmin(req.usuario);
    const nome = req.params.nome;
    if (!/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/.test(nome)) throw new ErroHttp('nao_encontrado');
    try {
      const dados = await readFile(join(config.arquivosDir, 'comprovantes', nome));
      const ext = nome.split('.').pop()!;
      const tipo = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' }[ext]!;
      return reply
        .header('Cache-Control', 'private, no-store')
        .header('Content-Disposition', `inline; filename="${nome}"`)
        .type(tipo)
        .send(dados);
    } catch {
      throw new ErroHttp('nao_encontrado');
    }
  });

  /* ------------------------------------------------- rotas do registro */
  const r = criarRegistrador(app, deps, { rateLimit: opcoes.rateLimit ?? true });
  rotasAuth(r);
  rotasMe(r);
  rotasPagamento(r);
  rotasConteudo(r);
  rotasEstudo(r);
  rotasOffline(r);
  rotasSimulados(r);
  rotasSocial(r);
  rotasAdminConteudo(r);
  rotasAdminGestao(r);
  rotasSuper(r);
  conferirRegistro(r.registradas);

  app.addHook('onClose', async () => {
    await deps.aguardarTarefas();
  });
  return app;
}

export { lerConfig, configTeste, type Config } from './config.js';
export { criarRelogioTeste, relogioSistema, type Relogio, type RelogioTeste, type Deps } from './contexto.js';
export { criarAsaasFalso, criarClienteAsaasHttp, type AsaasFalso, type ClienteAsaas } from './integracoes/asaas.js';
export { criarMailerMemoria, criarMailerSmtp, type Mailer, type MailerMemoria, type MensagemEmail } from './integracoes/email.js';
export { entregarExpirados } from './servicos/simulado.js';
export { gerarHashSenha } from './servicos/senhas.js';
export { gerarCodigoTotp } from './servicos/totp.js';
