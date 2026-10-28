/**
 * 2FA obrigatório do superadmin e reconfirmação das ações sensíveis (D13).
 */
import { and, count, eq, isNull } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { horaMinutoSP, MS_MINUTO } from '@fuse/shared';
import type { Reconfirmacao } from '@fuse/shared/api';
import type { Deps, Usuario, UsuarioSessao } from '../contexto.js';
import { falha } from '../http/erros.js';
import { emailAlertaSeguranca } from '../integracoes/email.js';
import { auditar } from '../rotas/admin/comum.js';
import type { Db } from '../util.js';
import { consumirLimite, lerLimite, minutosAte } from './limitador.js';
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

/* ------------------------------------------- S-16: falhas do 2FA persistidas */

/**
 * Códigos (e senhas de reconfirmação) errados aceitos por conta antes do bloqueio temporário. O
 * contador fica no banco (`limites_contagem`): deploy e reinício não devolvem as tentativas.
 */
export const LIMITE_FALHAS_2FA = { max: 10, janelaMs: 15 * MS_MINUTO } as const;
const chaveFalhas = (usuarioId: string) => `2fa-falhas:u:${usuarioId}`;

/** 429 `dois_fatores_bloqueado` enquanto a conta estiver bloqueada por códigos errados. */
export async function exigirSemBloqueio2fa(deps: Deps, usuarioId: string, agora: Date): Promise<void> {
  const l = await lerLimite(deps.db, chaveFalhas(usuarioId), agora);
  if (l && l.n >= LIMITE_FALHAS_2FA.max) {
    throw falha(
      'dois_fatores_bloqueado',
      `Muitos códigos ou senhas errados nesta conta. Por segurança, tente de novo ${minutosAte(l.janelaFim, agora)}.`,
    );
  }
}

/**
 * Conta a falha, audita (`2fa.falha`, sem o código) e, na falha que atinge o limite, audita o
 * bloqueio e avisa o dono da conta por e-mail.
 */
export async function registrarFalha2fa(
  deps: Deps,
  u: Pick<Usuario, 'id' | 'nome' | 'email'>,
  origem: 'verificar' | 'reconfirmar_codigo' | 'reconfirmar_senha',
  agora: Date,
  ip?: string,
): Promise<void> {
  const r = await consumirLimite(deps.db, chaveFalhas(u.id), LIMITE_FALHAS_2FA.max, LIMITE_FALHAS_2FA.janelaMs, agora);
  const alvo = `usuario:${u.id}`;
  await auditar(deps.db, u.id, '2fa.falha', alvo, { origem, falhasNaJanela: r.n }, agora, { ip: ip ?? null });
  if (r.n === LIMITE_FALHAS_2FA.max) {
    await auditar(deps.db, u.id, '2fa.bloqueio', alvo, { ate: r.janelaFim.toISOString() }, agora, { ip: ip ?? null });
    deps.enviarEmail(
      emailAlertaSeguranca({
        nome: u.nome,
        email: u.email,
        titulo: 'Muitos códigos errados na sua conta',
        texto: `Houve ${r.n} tentativas erradas de código do app autenticador (ou de senha de confirmação) na sua conta do painel do Fuse Aprova. A verificação ficou bloqueada até ${horaMinutoSP(r.janelaFim)} (Brasília). Se não foi você, troque a senha e encerre as sessões abertas.`,
      }),
    );
  }
}

/**
 * Reconfirmação das ações sensíveis: senha da conta ou código TOTP novo. 403
 * `reconfirmacao_invalida` se não conferir. S-16: cada erro conta no mesmo limite persistente
 * do 2FA (e fica na auditoria); com a conta bloqueada, responde 429 antes de conferir.
 */
export async function reconfirmar(deps: Deps, u: UsuarioSessao, c: Reconfirmacao, agora: Date): Promise<'senha' | 'totp'> {
  await exigirSemBloqueio2fa(deps, u.id, agora);
  if (c.codigo) {
    const codigo = c.codigo.replace(/\s+/g, '');
    if (u.totpAtivadoEm && (await conferirCodigoTotp(deps, u, codigo, agora))) return 'totp';
    await registrarFalha2fa(deps, u, 'reconfirmar_codigo', agora);
    throw falha('reconfirmacao_invalida', 'O código do app autenticador não confere. Use um código novo.');
  }
  if (c.senha && (await conferirSenha(u.senhaHash, c.senha))) return 'senha';
  await registrarFalha2fa(deps, u, 'reconfirmar_senha', agora);
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
  ip?: string,
): Promise<'totp' | 'recuperacao'> {
  if (!u.totpAtivadoEm) throw falha('dois_fatores_necessario');
  await exigirSemBloqueio2fa(deps, u.id, agora);
  if (entrada.codigo) {
    if (!(await conferirCodigoTotp(deps, u, entrada.codigo, agora))) {
      await registrarFalha2fa(deps, u, 'verificar', agora, ip);
      throw falha('codigo_invalido');
    }
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
  if (!usado.length) {
    await registrarFalha2fa(deps, u, 'verificar', agora, ip);
    throw falha('codigo_invalido', 'Código de recuperação inválido ou já usado.');
  }
  await marcarSessaoVerificada(deps.db, u.sessaoId, agora);
  return 'recuperacao';
}
