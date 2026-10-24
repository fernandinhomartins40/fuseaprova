import type { FastifyReply } from 'fastify';
import { NOME_COOKIE_SESSAO } from '@fuse/shared/api';
import type { Config } from '../config.js';

/** Cookie da sessão: httpOnly; Secure; SameSite=Lax (PRD 8.2). */
export function definirCookieSessao(reply: FastifyReply, config: Config, token: string, expiraEm: Date): void {
  reply.setCookie(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: config.cookieSeguro,
    sameSite: 'lax',
    path: '/',
    domain: config.cookieDominio,
    expires: expiraEm,
  });
}

export function limparCookieSessao(reply: FastifyReply, config: Config): void {
  reply.clearCookie(NOME_COOKIE_SESSAO, {
    httpOnly: true,
    secure: config.cookieSeguro,
    sameSite: 'lax',
    path: '/',
    domain: config.cookieDominio,
  });
}
