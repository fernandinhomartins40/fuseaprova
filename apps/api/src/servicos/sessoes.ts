/**
 * Sessões (PRD 8.2): token aleatório de 32 bytes no cookie httpOnly; o banco guarda só o
 * HMAC-SHA256 do token (com SESSION_SECRET). Expira em 60 dias, renovados no uso.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, lt, ne } from 'drizzle-orm';
import { schema, type BancoDados } from '@fuse/db';
import { MS_DIA, MS_MINUTO } from '@fuse/shared';
import { DIAS_SESSAO } from '@fuse/shared/api';
import type { UsuarioSessao } from '../contexto.js';
import type { Db } from '../util.js';

const { sessoes, usuarios } = schema;

export const VALIDADE_SESSAO_MS = DIAS_SESSAO * MS_DIA;
/** Renova a sessão no máximo uma vez por este intervalo (evita escrita a cada requisição). */
const RENOVAR_A_CADA_MS = 10 * MS_MINUTO;

export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(segredo: string, token: string): string {
  return createHmac('sha256', segredo).update(token).digest('hex');
}

export async function abrirSessao(
  db: BancoDados,
  segredo: string,
  usuarioId: string,
  meta: { userAgent?: string | undefined; ip?: string | undefined },
  agora: Date,
): Promise<{ token: string; expiraEm: Date }> {
  const token = gerarToken();
  const expiraEm = new Date(agora.getTime() + VALIDADE_SESSAO_MS);
  await db.insert(sessoes).values({
    usuarioId,
    tokenHash: hashToken(segredo, token),
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ip: meta.ip ?? null,
    expiraEm,
    criadoEm: agora,
    ultimoUsoEm: agora,
  });
  return { token, expiraEm };
}

/** Carrega o usuário da sessão e renova o prazo. `renovada` indica se o cookie deve ser reenviado. */
export async function carregarSessao(
  db: BancoDados,
  segredo: string,
  token: string,
  agora: Date,
): Promise<{ usuario: UsuarioSessao; renovada: boolean; expiraEm: Date } | null> {
  const [linha] = await db
    .select({ sessao: sessoes, usuario: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(
      and(
        eq(sessoes.tokenHash, hashToken(segredo, token)),
        gt(sessoes.expiraEm, agora),
        isNull(usuarios.excluidoEm),
      ),
    )
    .limit(1);
  if (!linha) return null;
  let expiraEm = linha.sessao.expiraEm;
  let renovada = false;
  if (agora.getTime() - linha.sessao.ultimoUsoEm.getTime() >= RENOVAR_A_CADA_MS) {
    expiraEm = new Date(agora.getTime() + VALIDADE_SESSAO_MS);
    renovada = true;
    await db
      .update(sessoes)
      .set({ expiraEm, ultimoUsoEm: agora })
      .where(eq(sessoes.id, linha.sessao.id));
  }
  return { usuario: { ...linha.usuario, sessaoId: linha.sessao.id }, renovada, expiraEm };
}

export async function encerrarSessao(db: BancoDados, sessaoId: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.id, sessaoId));
}

/** Encerra todas as sessões do usuário (exceto `manter`, se informado). Devolve quantas. */
export async function encerrarSessoesDoUsuario(
  db: Db,
  usuarioId: string,
  manter?: string,
): Promise<number> {
  const r = await db
    .delete(sessoes)
    .where(
      manter
        ? and(eq(sessoes.usuarioId, usuarioId), ne(sessoes.id, manter))
        : eq(sessoes.usuarioId, usuarioId),
    )
    .returning({ id: sessoes.id });
  return r.length;
}

export async function limparSessoesExpiradas(db: BancoDados, agora: Date): Promise<number> {
  const r = await db.delete(sessoes).where(lt(sessoes.expiraEm, agora)).returning({ id: sessoes.id });
  return r.length;
}
