/**
 * LGPD: exportar os dados e excluir a conta (anonimização), usados pelo próprio aluno
 * (GET /me/exportar, DELETE /me) e pelo superadmin (D13).
 */
import { desc, eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { ExportarResposta } from '@fuse/shared/api';
import type { Usuario } from '../contexto.js';
import { iso, type Db } from '../util.js';
import { encerrarSessoesDoUsuario } from './sessoes.js';

const {
  usuarios,
  pedidos,
  tentativas,
  sessoesEstudo,
  simulados,
  conquistasUsuario,
  revisoes,
  pushInscricoes,
  redefinicoesSenha,
  ligasMembros,
  codigosRecuperacao,
} = schema;

/** JSON com perfil, pedidos e progresso. Sem hash de senha, segredo do 2FA nem a imagem do QR. */
export async function exportarDadosUsuario(db: Db, usuario: Usuario, agora: Date): Promise<ExportarResposta> {
  const {
    senhaHash: _s,
    totpSegredo: _t,
    totpUltimoPasso: _p,
    ...perfil
  } = usuario as Usuario & { sessaoId?: string; sessaoDoisFatoresEm?: Date | null };
  delete (perfil as { sessaoId?: string }).sessaoId;
  delete (perfil as { sessaoDoisFatoresEm?: unknown }).sessaoDoisFatoresEm;
  const [ped, tent, sess, sims, conq, revs] = await Promise.all([
    db.select().from(pedidos).where(eq(pedidos.usuarioId, usuario.id)).orderBy(desc(pedidos.criadoEm)),
    db.select().from(tentativas).where(eq(tentativas.usuarioId, usuario.id)).orderBy(tentativas.respondidaEm),
    db.select().from(sessoesEstudo).where(eq(sessoesEstudo.usuarioId, usuario.id)).orderBy(sessoesEstudo.iniciadaEm),
    db.select().from(simulados).where(eq(simulados.usuarioId, usuario.id)).orderBy(simulados.iniciadoEm),
    db.select().from(conquistasUsuario).where(eq(conquistasUsuario.usuarioId, usuario.id)),
    db.select().from(revisoes).where(eq(revisoes.usuarioId, usuario.id)),
  ]);
  // Datas viram ISO na serialização JSON. A imagem do QR (base64) é omitida.
  return JSON.parse(
    JSON.stringify({
      geradoEm: iso(agora),
      perfil,
      pedidos: ped.map(({ pixImagem: _i, ...p }) => p),
      tentativas: tent,
      sessoesEstudo: sess,
      simulados: sims,
      conquistas: conq,
      revisoes: revs,
    }),
  ) as ExportarResposta;
}

/** Anonimiza o perfil e mantém os pedidos (obrigação fiscal). Rode dentro de uma transação. */
export async function anonimizarUsuario(tx: Db, usuarioId: string, agora: Date): Promise<void> {
  await tx
    .update(usuarios)
    .set({
      nome: 'Conta excluída',
      email: `excluido+${usuarioId}@fuse.invalid`,
      cpf: null,
      celular: null,
      senhaHash: null,
      apelidoLiga: null,
      lembreteHora: null,
      notificacoes: false,
      marketing: false,
      acesso: false,
      asaasCustomerId: null,
      totpSegredo: null,
      totpAtivadoEm: null,
      totpUltimoPasso: null,
      excluidoEm: agora,
    })
    .where(eq(usuarios.id, usuarioId));
  await tx.delete(pushInscricoes).where(eq(pushInscricoes.usuarioId, usuarioId));
  await tx.delete(redefinicoesSenha).where(eq(redefinicoesSenha.usuarioId, usuarioId));
  await tx.delete(ligasMembros).where(eq(ligasMembros.usuarioId, usuarioId));
  await tx.delete(codigosRecuperacao).where(eq(codigosRecuperacao.usuarioId, usuarioId));
  await encerrarSessoesDoUsuario(tx, usuarioId);
}
