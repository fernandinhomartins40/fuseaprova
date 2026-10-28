/**
 * LGPD: exportar os dados e excluir a conta (anonimização), usados pelo próprio aluno
 * (GET /me/exportar, DELETE /me) e pelo superadmin (D13).
 */
import { desc, eq, sql } from 'drizzle-orm';
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
  usuariosConcursos,
  registrosAcesso,
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
  const [ped, tent, sess, sims, conq, revs, acessos] = await Promise.all([
    db.select().from(pedidos).where(eq(pedidos.usuarioId, usuario.id)).orderBy(desc(pedidos.criadoEm)),
    db.select().from(tentativas).where(eq(tentativas.usuarioId, usuario.id)).orderBy(tentativas.respondidaEm),
    db.select().from(sessoesEstudo).where(eq(sessoesEstudo.usuarioId, usuario.id)).orderBy(sessoesEstudo.iniciadaEm),
    db.select().from(simulados).where(eq(simulados.usuarioId, usuario.id)).orderBy(simulados.iniciadoEm),
    db.select().from(conquistasUsuario).where(eq(conquistasUsuario.usuarioId, usuario.id)),
    db.select().from(revisoes).where(eq(revisoes.usuarioId, usuario.id)),
    // D26: os registros de acesso (Marco Civil) também são dados do titular (LGPD, art. 18, II).
    db
      .select({ evento: registrosAcesso.evento, ip: registrosAcesso.ip, porta: registrosAcesso.porta, criadoEm: registrosAcesso.criadoEm })
      .from(registrosAcesso)
      .where(eq(registrosAcesso.usuarioId, usuario.id))
      .orderBy(desc(registrosAcesso.criadoEm)),
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
      registrosAcesso: acessos,
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
  await tx.delete(usuariosConcursos).where(eq(usuariosConcursos.usuarioId, usuarioId));
  await encerrarSessoesDoUsuario(tx, usuarioId);
  // S-21: a auditoria sobre a conta e os pedidos dela perde nome, e-mail, celular e CPF (o que
  // foi feito, quando e por quem continua). O Pix (copia-e-cola e QR) também sai dos pedidos;
  // valor, datas e status ficam para a contabilidade.
  const campos = sql.raw(`array[${CAMPOS_PESSOAIS.map((c) => `'${c}'`).join(',')}]::text[]`);
  await tx.execute(sql`
    update auditoria set
      antes = case when antes is null then null else antes - ${campos} end,
      depois = case when depois is null then null else depois - ${campos} end,
      detalhes = case when detalhes is null then null else detalhes - ${campos} end
    where alvo = ${`usuario:${usuarioId}`}
       or alvo in (select 'pedido:' || p.id::text from pedidos p where p.usuario_id = ${usuarioId}::uuid)`);
  await tx.update(pedidos).set({ pixPayload: null, pixImagem: null }).where(eq(pedidos.usuarioId, usuarioId));
}

/** S-21: chaves com dados pessoais na auditoria (as mesmas que a ficha esconde). */
export const CAMPOS_PESSOAIS = ['nome', 'email', 'celular', 'cpf', 'para', 'emailAntigo', 'emailNovo'] as const;
