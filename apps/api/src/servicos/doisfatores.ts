/**
 * 2FA obrigatório do superadmin e reconfirmação das ações sensíveis (D13).
 */
import { and, count, eq, isNull } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { Reconfirmacao } from '@fuse/shared/api';
import type { Deps, Usuario, UsuarioSessao } from '../contexto.js';
import { falha } from '../http/erros.js';
import type { Db } from '../util.js';
import { conferirSenha } from './senhas.js';
import {
  cifrarSegredo,
  decifrarSegredo,
  EMISSOR_TOTP,
  gerarCodigoRecuperacao,
  gerarSegredoTotp,
  hashCodigoRecuperacao,
  qrSvg,
  QTD_CODIGOS_RECUPERACAO,
  uriTotp,
  verificarTotp,
} from './totp.js';

const { usuarios, sessoes, codigosRecuperacao } = schema;

export function segredoDe(deps: Deps, u: Pick<Usuario, 'totpSegredo'>): string | null {
  return u.totpSegredo ? decifrarSegredo(deps.config.segredoSessao, u.totpSegredo) : null;
}

/** Confere um código TOTP e grava o passo (o mesmo código não vale duas vezes). */
export async function conferirCodigoTotp(deps: Deps, u: Usuario, codigo: string, agora: Date): Promise<boolean> {
  const segredo = segredoDe(deps, u);
  if (!segredo) return false;
  const [atual] = await deps.db
    .select({ ultimo: usuarios.totpUltimoPasso })
    .from(usuarios)
    .where(eq(usuarios.id, u.id));
  const passo = verificarTotp(segredo, codigo, agora, atual?.ultimo ?? null);
  if (passo === null) return false;
  // Condicional: duas requisições com o mesmo código não passam juntas.
  const r = await deps.db
    .update(usuarios)
    .set({ totpUltimoPasso: passo })
    .where(
      and(
        eq(usuarios.id, u.id),
        atual?.ultimo === null || atual?.ultimo === undefined
          ? isNull(usuarios.totpUltimoPasso)
          : eq(usuarios.totpUltimoPasso, atual.ultimo),
      ),
    )
    .returning({ id: usuarios.id });
  return r.length === 1;
}

/**
 * Reconfirmação das ações sensíveis: senha da conta ou código TOTP novo. 403
 * `reconfirmacao_invalida` se não conferir.
 */
export async function reconfirmar(deps: Deps, u: UsuarioSessao, c: Reconfirmacao, agora: Date): Promise<'senha' | 'totp'> {
  if (c.codigo) {
    const codigo = c.codigo.replace(/\s+/g, '');
    if (u.totpAtivadoEm && (await conferirCodigoTotp(deps, u, codigo, agora))) return 'totp';
    throw falha('reconfirmacao_invalida', 'O código do app autenticador não confere. Use um código novo.');
  }
  if (c.senha && (await conferirSenha(u.senhaHash, c.senha))) return 'senha';
  throw falha('reconfirmacao_invalida', 'A senha não confere. Confirme de novo para continuar.');
}

export async function codigosRestantes(db: Db, usuarioId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(codigosRecuperacao)
    .where(and(eq(codigosRecuperacao.usuarioId, usuarioId), isNull(codigosRecuperacao.usadoEm)));
  return Number(r?.n ?? 0);
}

export async function statusDoisFatores(db: Db, u: UsuarioSessao) {
  return {
    configurado: !!u.totpAtivadoEm,
    verificadoNestaSessao: !!u.totpAtivadoEm && !!u.sessaoDoisFatoresEm,
    ativadoEm: u.totpAtivadoEm ? u.totpAtivadoEm.toISOString() : null,
    codigosRecuperacaoRestantes: u.totpAtivadoEm ? await codigosRestantes(db, u.id) : 0,
  };
}

/** Novo segredo pendente (só enquanto o 2FA não está ativo). */
export async function iniciarDoisFatores(deps: Deps, u: UsuarioSessao) {
  if (u.totpAtivadoEm) {
    throw falha('conflito', 'A verificação em duas etapas já está ativa nesta conta.');
  }
  const segredo = gerarSegredoTotp();
  await deps.db
    .update(usuarios)
    .set({ totpSegredo: cifrarSegredo(deps.config.segredoSessao, segredo), totpUltimoPasso: null })
    .where(eq(usuarios.id, u.id));
  const svg = await qrSvg(uriTotp(segredo, u.email));
  return {
    qrSvg: svg,
    chaveManual: segredo.replace(/(.{4})/g, '$1 ').trim(),
    emissor: EMISSOR_TOTP,
    conta: u.email,
  };
}

export async function gerarCodigosRecuperacao(db: Db, usuarioId: string, agora: Date): Promise<string[]> {
  const codigos = Array.from({ length: QTD_CODIGOS_RECUPERACAO }, gerarCodigoRecuperacao);
  await db.delete(codigosRecuperacao).where(eq(codigosRecuperacao.usuarioId, usuarioId));
  await db
    .insert(codigosRecuperacao)
    .values(codigos.map((c) => ({ usuarioId, hash: hashCodigoRecuperacao(c), criadoEm: agora })));
  return codigos;
}

export async function marcarSessaoVerificada(db: Db, sessaoId: string, agora: Date): Promise<void> {
  await db.update(sessoes).set({ doisFatoresEm: agora }).where(eq(sessoes.id, sessaoId));
}

/** Ativa com o primeiro código; a sessão atual já fica verificada. */
export async function ativarDoisFatores(deps: Deps, u: UsuarioSessao, codigo: string, agora: Date): Promise<string[]> {
  if (u.totpAtivadoEm) throw falha('conflito', 'A verificação em duas etapas já está ativa nesta conta.');
  if (!u.totpSegredo) throw falha('conflito', 'Comece pela leitura do QR code.');
  if (!(await conferirCodigoTotp(deps, u, codigo, agora))) throw falha('codigo_invalido');
  await deps.db.update(usuarios).set({ totpAtivadoEm: agora }).where(eq(usuarios.id, u.id));
  await marcarSessaoVerificada(deps.db, u.sessaoId, agora);
  return gerarCodigosRecuperacao(deps.db, u.id, agora);
}

/** Confirma a sessão com o código do app ou com um código de recuperação (gasta o código). */
export async function verificarDoisFatores(
  deps: Deps,
  u: UsuarioSessao,
  entrada: { codigo?: string | undefined; codigoRecuperacao?: string | undefined },
  agora: Date,
): Promise<'totp' | 'recuperacao'> {
  if (!u.totpAtivadoEm) throw falha('dois_fatores_necessario');
  if (entrada.codigo) {
    if (!(await conferirCodigoTotp(deps, u, entrada.codigo, agora))) throw falha('codigo_invalido');
    await marcarSessaoVerificada(deps.db, u.sessaoId, agora);
    return 'totp';
  }
  const hash = hashCodigoRecuperacao(entrada.codigoRecuperacao ?? '');
  const usado = await deps.db
    .update(codigosRecuperacao)
    .set({ usadoEm: agora })
    .where(
      and(
        eq(codigosRecuperacao.usuarioId, u.id),
        eq(codigosRecuperacao.hash, hash),
        isNull(codigosRecuperacao.usadoEm),
      ),
    )
    .returning({ id: codigosRecuperacao.id });
  if (!usado.length) throw falha('codigo_invalido', 'Código de recuperação inválido ou já usado.');
  await marcarSessaoVerificada(deps.db, u.sessaoId, agora);
  return 'recuperacao';
}
