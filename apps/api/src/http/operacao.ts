/**
 * Lote 2 da auditoria do painel: ganchos de operação da API.
 *
 * - S-09/A-07: cada resposta 5xx (menos o 503 de manutenção/banco fora) vira uma linha em
 *   `erros_api` (rota do registro, método, código e hora; sem dados pessoais), para o
 *   /super/sistema e o alerta de rajada do worker.
 * - S-16: as rotas /super com limite "por usuário" (D13) contam também num balde persistente POR
 *   USUÁRIO (não por rota): 120/min no geral e 20 a cada 15 min nas sensíveis, somando todas as
 *   rotas. Sobrevive a deploy e reinício. O limite em memória por rota continua como primeira linha.
 * - Banco fora do ar: erro de conexão vira 503 `banco_indisponivel` (e não um 500 genérico).
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { schema } from '@fuse/db';
import { MS_MINUTO } from '@fuse/shared';
import { PREFIXO_API, ROTAS, type DefinicaoRota } from '@fuse/shared/api';
import type { Deps } from '../contexto.js';
import { exigirLimite } from '../servicos/limitador.js';

/** Limites persistentes por usuário das rotas /super (D13). */
export const LIMITES_SUPER_POR_USUARIO = {
  geral: { max: 120, janelaMs: MS_MINUTO },
  sensivel: { max: 20, janelaMs: 15 * MS_MINUTO },
} as const;

const PREFIXO_SUPER = `${PREFIXO_API}/super`;

function mapaDeRotas(): Map<string, DefinicaoRota> {
  const m = new Map<string, DefinicaoRota>();
  for (const def of Object.values(ROTAS) as DefinicaoRota[]) m.set(`${def.metodo} ${PREFIXO_API}${def.caminho}`, def);
  return m;
}

/** É uma ação sensível do D13 (o limite de 20 a cada 15 min por usuário). */
function ehSensivel(def: DefinicaoRota): boolean {
  const l = def.limite;
  return !!l && l.por === 'usuario' && l.max === LIMITES_SUPER_POR_USUARIO.sensivel.max && l.janelaMs === LIMITES_SUPER_POR_USUARIO.sensivel.janelaMs;
}

const CODIGOS_CONEXAO = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  'CONNECT_TIMEOUT',
  '57P01',
  '57P02',
  '57P03',
]);

/** Erro de conexão com o Postgres (postgres.js, PGlite fechado ou classe 08 do SQLSTATE). */
export function ehErroDeBanco(e: unknown): boolean {
  for (let x: unknown = e, i = 0; x && i < 4; x = (x as { cause?: unknown }).cause, i++) {
    const o = x as { code?: unknown; message?: unknown };
    const codigo = typeof o.code === 'string' ? o.code : '';
    if (CODIGOS_CONEXAO.has(codigo) || /^08/.test(codigo)) return true;
    if (typeof o.message === 'string' && /PGlite is closed|connection terminated|Connection terminated/i.test(o.message)) return true;
  }
  return false;
}

export function instalarOperacao(app: FastifyInstance, deps: Deps, opcoes: { rateLimit: boolean }): void {
  const rotas = mapaDeRotas();
  const defDe = (req: FastifyRequest) => rotas.get(`${req.method} ${req.routeOptions.url ?? ''}`);

  if (opcoes.rateLimit) {
    app.addHook('preHandler', async (req) => {
      const u = req.usuario;
      const url = req.routeOptions.url ?? '';
      if (!u || !url.startsWith(PREFIXO_SUPER)) return;
      const def = defDe(req);
      if (!def?.limite || def.limite.por !== 'usuario') return;
      const agora = deps.relogio.agora();
      const g = LIMITES_SUPER_POR_USUARIO.geral;
      await exigirLimite(deps.db, `super:u:${u.id}`, g.max, g.janelaMs, agora);
      if (ehSensivel(def)) {
        const s = LIMITES_SUPER_POR_USUARIO.sensivel;
        await exigirLimite(
          deps.db,
          `super-sensivel:u:${u.id}`,
          s.max,
          s.janelaMs,
          agora,
          'Muitas ações sensíveis em pouco tempo. Espere alguns minutos e tente de novo.',
        );
      }
    });
  }

  app.addHook('onResponse', async (req, reply) => {
    const status = reply.statusCode;
    if (status < 500 || status === 503) return;
    try {
      await deps.db.insert(schema.errosApi).values({
        rota: (req.routeOptions.url ?? 'desconhecida').slice(0, 200),
        metodo: req.method.slice(0, 10),
        status,
        criadoEm: deps.relogio.agora(),
      });
    } catch (e) {
      req.log.warn({ erro: (e as Error).message }, 'não foi possível registrar o 5xx');
    }
  });
}
