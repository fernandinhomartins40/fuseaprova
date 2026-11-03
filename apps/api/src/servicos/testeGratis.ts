/**
 * D33: quem pode começar o teste grátis. Sem verificar a identidade não há bloqueio perfeito, então
 * as travas somam: CPF ou caixa de e-mail já usados (mesmo em conta excluída), navegador que já
 * testou e limite por IP. Quem cai numa delas cria a conta normalmente, só que sem o teste.
 */
import { createHmac } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { schema } from '@fuse/db';
import { emailCanonico, MS_DIA } from '@fuse/shared';
import type { Config } from '../config.js';
import { ErroHttp } from '../http/erros.js';
import type { Db } from '../util.js';

const { testesUsados } = schema;

const COOKIE_TESTE_USADO = 'fuse_teste_usado';
const DIAS_COOKIE = 400;
/** Generoso de propósito: numa cidade pequena, várias pessoas saem pelo mesmo IP da operadora. */
const LIMITE_TESTES_POR_IP = { max: 5, janelaMs: MS_DIA };

interface Dados {
  cpf: string;
  email: string;
}

function hashes(segredo: string, d: Dados): string[] {
  const hmac = (v: string) => createHmac('sha256', segredo).update(`teste:${v}`).digest('hex');
  return [hmac(`cpf:${d.cpf.replace(/\D/g, '')}`), hmac(`email:${emailCanonico(d.email)}`)];
}

export async function podeComecarTeste(
  db: Db,
  segredo: string,
  req: FastifyRequest,
  limitar: (chave: string, max: number, janelaMs: number) => Promise<void>,
  d: Dados,
): Promise<boolean> {
  if (req.cookies[COOKIE_TESTE_USADO]) return false;
  const usados = await db.select({ hash: testesUsados.hash }).from(testesUsados).where(inArray(testesUsados.hash, hashes(segredo, d)));
  if (usados.length) return false;
  try {
    await limitar(`teste:ip:${req.ip}`, LIMITE_TESTES_POR_IP.max, LIMITE_TESTES_POR_IP.janelaMs);
    return true;
  } catch (e) {
    if (e instanceof ErroHttp && e.codigo === 'limite_requisicoes') return false;
    throw e;
  }
}

/** Grava o CPF e o e-mail como já usados. Na exclusão, cobre também as contas anteriores a D33. */
export async function marcarTesteUsado(db: Db, segredo: string, d: Dados, agora: Date): Promise<void> {
  await db
    .insert(testesUsados)
    .values(hashes(segredo, d).map((hash) => ({ hash, criadoEm: agora })))
    .onConflictDoNothing();
}

export function marcarNavegador(reply: FastifyReply, config: Config, agora: Date): void {
  reply.setCookie(COOKIE_TESTE_USADO, '1', {
    httpOnly: true,
    secure: config.cookieSeguro,
    sameSite: 'lax',
    path: '/',
    domain: config.cookieDominio,
    expires: new Date(agora.getTime() + DIAS_COOKIE * MS_DIA),
  });
}
