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
import type { Deps, UsuarioSessao } from '../contexto.js';
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
    case 'acesso': // exigirAcesso: 402 sem pagamento confirmado
      if (!u) throw falha('nao_autenticado');
      if (!u.acesso) throw falha('sem_acesso');
      return;
    case 'admin':
      if (!u) throw falha('nao_autenticado');
      if (u.papel !== 'admin') throw falha('proibido');
      return;
  }
}

export function criarRegistrador(
  app: FastifyInstance,
  deps: Deps,
  opcoes: { rateLimit: boolean },
): Registrador & { registradas: Set<NomeRota> } {
  const registradas = new Set<NomeRota>();
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
          opcoes.rateLimit && limite
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
          exigirGuarda(def, req, deps);
          const ctx = {
            req,
            reply,
            usuario: req.usuario,
            params: validar(def.params, req.params),
            query: validar(def.query, req.query),
            corpo: validar(def.corpo, req.body ?? (def.corpo ? {} : undefined)),
            deps,
            agora: deps.relogio.agora(),
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
