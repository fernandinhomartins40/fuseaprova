/**
 * /me: perfil, preferências, senha, LGPD (exportar/excluir) e loja de protetores.
 */
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { comprarProtetor } from '@fuse/shared';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { limparCookieSessao } from '../http/cookies.js';
import { conferirSenha, gerarHashSenha } from '../servicos/senhas.js';
import { encerrarSessoesDoUsuario } from '../servicos/sessoes.js';
import { travarUsuario } from '../servicos/progresso.js';
import { concursoDoUsuario, montarMe, modoEdital } from '../servicos/usuario.js';
import { iso } from '../util.js';

const {
  usuarios,
  cargos,
  pedidos,
  tentativas,
  sessoesEstudo,
  simulados,
  conquistasUsuario,
  revisoes,
  pushInscricoes,
  redefinicoesSenha,
  ligasMembros,
} = schema;

export function rotasMe(r: Registrador): void {
  r.rota('meObter', async ({ usuario, deps, agora }) => montarMe(deps.db, usuario, agora));

  r.rota('meAtualizar', async ({ usuario, corpo, deps, agora }) => {
    const set: Partial<typeof usuarios.$inferInsert> = {};
    if (corpo.cargoId !== undefined) {
      const concurso = await concursoDoUsuario(deps.db, usuario);
      const [cargo] = await deps.db
        .select()
        .from(cargos)
        .where(and(eq(cargos.id, corpo.cargoId), eq(cargos.ativo, true)));
      if (!cargo || (concurso && cargo.concursoId !== concurso.id)) {
        throw falha('validacao', 'Escolha um cargo da lista.', { cargoId: 'Escolha um cargo da lista.' });
      }
      if (concurso && modoEdital(concurso) && cargo.generico) {
        throw falha('validacao', 'O edital saiu: escolha um cargo do edital.', {
          cargoId: 'Escolha um cargo do edital.',
        });
      }
      set.cargoId = cargo.id;
      set.area = cargo.area;
      if (concurso) set.concursoId = concurso.id;
    }
    if (corpo.metaDiaria !== undefined) set.metaDiaria = corpo.metaDiaria;
    if (corpo.lembreteHora !== undefined) set.lembreteHora = corpo.lembreteHora;
    if (corpo.notificacoes !== undefined) set.notificacoes = corpo.notificacoes;
    if (corpo.apelidoLiga !== undefined) set.apelidoLiga = corpo.apelidoLiga;
    if (corpo.sons !== undefined) set.sons = corpo.sons;
    if (corpo.onboardingConcluido && !usuario.onboardingConcluidoEm) set.onboardingConcluidoEm = agora;
    const [u] = await deps.db.update(usuarios).set(set).where(eq(usuarios.id, usuario.id)).returning();
    return montarMe(deps.db, u!, agora);
  });

  r.rota('meSenha', async ({ usuario, corpo, deps }) => {
    if (!(await conferirSenha(usuario.senhaHash, corpo.senhaAtual))) {
      throw falha('validacao', 'A senha atual não confere.', { senhaAtual: 'A senha atual não confere.' });
    }
    await deps.db
      .update(usuarios)
      .set({ senhaHash: await gerarHashSenha(corpo.novaSenha) })
      .where(eq(usuarios.id, usuario.id));
    await encerrarSessoesDoUsuario(deps.db, usuario.id, usuario.sessaoId);
    return { ok: true as const };
  });

  r.rota('meExportar', async ({ usuario, deps, agora }) => {
    const { db } = deps;
    const { senhaHash: _s, sessaoId: _ss, ...perfil } = usuario;
    const [ped, tent, sess, sims, conq, revs] = await Promise.all([
      db.select().from(pedidos).where(eq(pedidos.usuarioId, usuario.id)).orderBy(desc(pedidos.criadoEm)),
      db.select().from(tentativas).where(eq(tentativas.usuarioId, usuario.id)).orderBy(tentativas.respondidaEm),
      db.select().from(sessoesEstudo).where(eq(sessoesEstudo.usuarioId, usuario.id)).orderBy(sessoesEstudo.iniciadaEm),
      db.select().from(simulados).where(eq(simulados.usuarioId, usuario.id)).orderBy(simulados.iniciadoEm),
      db.select().from(conquistasUsuario).where(eq(conquistasUsuario.usuarioId, usuario.id)),
      db.select().from(revisoes).where(eq(revisoes.usuarioId, usuario.id)),
    ]);
    // Datas viram ISO na serialização JSON. A imagem do QR (base64) é omitida.
    return {
      geradoEm: iso(agora),
      perfil,
      pedidos: ped.map(({ pixImagem: _i, ...p }) => p),
      tentativas: tent,
      sessoesEstudo: sess,
      simulados: sims,
      conquistas: conq,
      revisoes: revs,
    };
  });

  r.rota('meExcluir', async ({ usuario, corpo, deps, reply, agora }) => {
    if (!(await conferirSenha(usuario.senhaHash, corpo.senha))) {
      throw falha('validacao', 'A senha não confere.', { senha: 'A senha não confere.' });
    }
    // LGPD: anonimiza o perfil e mantém os pedidos (obrigação fiscal).
    await deps.db.transaction(async (tx) => {
      await tx
        .update(usuarios)
        .set({
          nome: 'Conta excluída',
          email: `excluido+${usuario.id}@fuse.invalid`,
          cpf: null,
          celular: null,
          senhaHash: null,
          apelidoLiga: null,
          lembreteHora: null,
          notificacoes: false,
          acesso: false,
          asaasCustomerId: null,
          excluidoEm: agora,
        })
        .where(eq(usuarios.id, usuario.id));
      await tx.delete(pushInscricoes).where(eq(pushInscricoes.usuarioId, usuario.id));
      await tx.delete(redefinicoesSenha).where(eq(redefinicoesSenha.usuarioId, usuario.id));
      await tx.delete(ligasMembros).where(eq(ligasMembros.usuarioId, usuario.id));
      await encerrarSessoesDoUsuario(tx, usuario.id);
    });
    limparCookieSessao(reply, deps.config);
    return { ok: true as const };
  });

  r.rota('meComprarProtetor', async ({ usuario, deps }) =>
    deps.db.transaction(async (tx) => {
      const u = await travarUsuario(tx, usuario.id);
      const r = comprarProtetor(u.gemas, u.protetores);
      if (!r.ok) throw falha(r.codigo, r.erro);
      await tx.update(usuarios).set({ gemas: r.gemas, protetores: r.protetores }).where(eq(usuarios.id, u.id));
      return { gemas: r.gemas, protetores: r.protetores };
    }),
  );
}
