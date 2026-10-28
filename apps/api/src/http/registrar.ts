/**
 * Registra no Fastify as rotas do registro `ROTAS` (@fuse/shared/api): aplica a guarda,
 * o rate limit, valida params/query/corpo com Zod e valida também a resposta antes de enviar
 * (o que remove qualquer campo fora do contrato, como um gabarito por engano).
 */
import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import {
  NOME_HEADER_WEBHOOK_ASAAS,
  PREFIXO_API,
  ROTAS,
  erroDeValidacao,
  type DefinicaoRota,
  type NomeRota,
} from '@fuse/shared/api';
import { podeEstudar, podeGerirConteudo } from '@fuse/shared';
import type { Deps, UsuarioSessao } from '../contexto.js';
import { lerConfiguracoes } from '../servicos/configuracoes.js';
import { exigirLimite } from '../servicos/limitador.js';
import { falha } from './erros.js';

type Def<N extends NomeRota> = (typeof ROTAS)[N];
type Saida<D, K extends string> = D extends { [P in K]: infer S }
  ? S extends z.ZodTypeAny
    ? z.output<S>
    : undefined
  : undefined;
type SaidaHandler<N extends NomeRota> = Def<N>['resposta'] extends z.ZodTypeAny
  ? z.input<Def<N>['resposta']>
  : void;
type UsuarioDa<N extends NomeRota> = Def<N>['guarda'] extends 'nenhuma' | 'webhook'
  ? UsuarioSessao | null
  : UsuarioSessao;

export interface Contexto<N extends NomeRota> {
  req: FastifyRequest;
  reply: FastifyReply;
  usuario: UsuarioDa<N>;
  params: Saida<Def<N>, 'params'>;
  query: Saida<Def<N>, 'query'>;
  corpo: Saida<Def<N>, 'corpo'>;
  deps: Deps;
  agora: Date;
  /**
   * Conta uma tentativa no balde `chave` (em memória, por instância) e responde 429 acima de
   * `max` na janela. Não faz nada quando o rate limit está desligado (testes).
   */
  /** S-16: balde persistente (`limites_contagem`), compartilhável entre rotas (os três logins, D24). */
  limitar: (chave: string, max: number, janelaMs: number) => Promise<void>;
}

export type Handler<N extends NomeRota> = (ctx: Contexto<N>) => Promise<SaidaHandler<N>>;

export interface Registrador {
  rota<N extends NomeRota>(nome: N, handler: Handler<N>): void;
}

function comparaSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function validar<S extends z.ZodTypeAny>(schema: S | undefined, valor: unknown): unknown {
  if (!schema) return undefined;
  const r = schema.safeParse(valor);
  if (!r.success) {
    const e = erroDeValidacao(r.error);
    throw falha('validacao', e.erro, e.campos);
  }
  return r.data;
}

/**
 * D13: o superadmin só usa os poderes de admin/superadmin com o 2FA ativo e confirmado
 * nesta sessão. Sem 2FA configurado: 403 `dois_fatores_necessario`; sem o código nesta
 * sessão: 403 `dois_fatores_pendente`.
 */
export function exigirDoisFatores(u: UsuarioSessao): void {
  if (!u.totpAtivadoEm) throw falha('dois_fatores_necessario');
  if (!u.sessaoDoisFatoresEm) throw falha('dois_fatores_pendente');
}

/** exigirSuperadmin: papel superadmin + 2FA (403). */
export function exigirSuperadmin(u: UsuarioSessao | null): asserts u is UsuarioSessao {
  if (!u) throw falha('nao_autenticado');
  if (u.papel !== 'superadmin') throw falha('proibido');
  exigirDoisFatores(u);
}

/** D24: gestão de conteúdo — admin, ou superadmin com o 2FA verificado nesta sessão (403). */
export function exigirConteudo(u: UsuarioSessao | null): asserts u is UsuarioSessao {
  if (!u) throw falha('nao_autenticado');
  if (!podeGerirConteudo(u.papel)) throw falha('proibido');
  if (u.papel === 'superadmin') exigirDoisFatores(u);
}

export function exigirGuarda(def: DefinicaoRota, req: FastifyRequest, deps: Deps): void {
  const u = req.usuario;
  switch (def.guarda) {
    case 'nenhuma':
      return;
    case 'webhook': {
      const recebido = req.headers[NOME_HEADER_WEBHOOK_ASAAS];
      const esperado = deps.config.asaas.webhookToken;
      if (!esperado || typeof recebido !== 'string' || !comparaSeguro(recebido, esperado)) {
        throw falha('webhook_token_invalido');
      }
      return;
    }
    case 'login':
      if (!u) throw falha('nao_autenticado');
      return;
    case 'aluno': // D24: só o papel aluno (pagamento, concursos, LGPD), sem exigir pagamento
      if (!u) throw falha('nao_autenticado');
      if (!podeEstudar(u.papel)) throw falha('proibido');
      return;
    case 'acesso': // exigirAcesso: só o aluno (a equipe recebe 403) e 402 sem pagamento confirmado
      if (!u) throw falha('nao_autenticado');
      if (!podeEstudar(u.papel)) throw falha('proibido');
      if (!u.acesso) throw falha('sem_acesso');
      return;
    case 'conteudo': // D24: admin, ou superadmin com 2FA
      exigirConteudo(u);
      return;
    case 'superadmin':
      exigirSuperadmin(u);
      return;
    case 'superadmin_2fa': // só o papel: configurar ou confirmar o 2FA
      if (!u) throw falha('nao_autenticado');
      if (u.papel !== 'superadmin') throw falha('proibido');
      return;
  }
}

/**
 * D13: modo manutenção — as rotas de estudo respondem 503. Elas só servem ao aluno (D24): a
 * equipe já recebeu 403 da guarda, então não há exceção por papel aqui.
 */
async function exigirForaDeManutencao(def: DefinicaoRota, deps: Deps): Promise<void> {
  if (def.guarda !== 'acesso') return;
  const { valores } = await lerConfiguracoes(deps.db, deps.config);
  if (valores.manutencao.ativa) {
    throw falha('manutencao', valores.manutencao.mensagem || undefined);
  }
}

export function criarRegistrador(
  app: FastifyInstance,
  deps: Deps,
  opcoes: { rateLimit: boolean },
): Registrador & { registradas: Set<NomeRota> } {
  const registradas = new Set<NomeRota>();
  // S-16: o balde comum fica no banco: sobrevive a deploy e reinício (antes era memória).
  const limitar = async (chave: string, max: number, janelaMs: number) => {
    if (opcoes.rateLimit) await exigirLimite(deps.db, chave, max, janelaMs, deps.relogio.agora());
  };
  return {
    registradas,
    rota(nome, handler) {
      const def = ROTAS[nome] as DefinicaoRota;
      registradas.add(nome);
      const limite = def.limite;
      app.route({
        method: def.metodo,
        url: PREFIXO_API + def.caminho,
        config:
          opcoes.rateLimit && limite && !limite.balde
            ? {
                rateLimit: {
                  max: limite.max,
                  timeWindow: limite.janelaMs,
                  keyGenerator: (req: FastifyRequest) =>
                    limite.por === 'usuario' && req.usuario
                      ? `${nome}:u:${req.usuario.id}`
                      : `${nome}:ip:${req.ip}`,
                },
              }
            : {},
        handler: async (req, reply) => {
          // Balde compartilhado (D24): conta antes de qualquer coisa, como o rate limit da rota.
          if (limite?.balde) {
            const quem = limite.por === 'usuario' && req.usuario ? `u:${req.usuario.id}` : `ip:${req.ip}`;
            await limitar(`${limite.balde}:${quem}`, limite.max, limite.janelaMs);
          }
          exigirGuarda(def, req, deps);
          await exigirForaDeManutencao(def, deps);
          const ctx = {
            req,
            reply,
            usuario: req.usuario,
            params: validar(def.params, req.params),
            query: validar(def.query, req.query),
            corpo: validar(def.corpo, req.body ?? (def.corpo ? {} : undefined)),
            deps,
            agora: deps.relogio.agora(),
            limitar,
          } as unknown as Contexto<typeof nome>;
          const resultado = await handler(ctx);
          if (def.resposta === null) {
            return reply.status(204).send();
          }
          const r = def.resposta.safeParse(resultado);
          if (!r.success) {
            req.log.error({ rota: nome, issues: r.error.issues.slice(0, 5) }, 'resposta fora do contrato');
            throw falha('interno');
          }
          return reply.send(r.data);
        },
      });
    },
  };
}

/** Garante que toda rota do registro foi implementada. */
export function conferirRegistro(registradas: Set<NomeRota>): void {
  const faltando = (Object.keys(ROTAS) as NomeRota[]).filter((n) => !registradas.has(n));
  if (faltando.length) throw new Error(`Rotas sem implementação: ${faltando.join(', ')}`);
}
