/**
 * /me: perfil, preferências, senha, LGPD (exportar/excluir) e loja de protetores.
 */
import { and, eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { comprarProtetor } from '@fuse/shared';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { limparCookieSessao } from '../http/cookies.js';
import { conferirSenha, gerarHashSenha } from '../servicos/senhas.js';
import { anonimizarUsuario, exportarDadosUsuario } from '../servicos/lgpd.js';
import { encerrarSessoesDoUsuario } from '../servicos/sessoes.js';
import { travarUsuario } from '../servicos/progresso.js';
import {
  ativarConcurso,
  deixarConcurso,
  guardarCargoNoConcurso,
  montarMeusConcursos,
  seguirConcurso,
} from '../servicos/concursos.js';
import { concursoDoUsuario, montarMe, modoEdital } from '../servicos/usuario.js';

const { usuarios, cargos } = schema;

export function rotasMe(r: Registrador): void {
  r.rota('meObter', async ({ usuario, deps, agora }) => montarMe(deps.db, usuario, agora));

  // D21: vários concursos por aluno, um acesso por concurso.
  r.rota('meusConcursos', async ({ usuario, deps, agora }) => montarMeusConcursos(deps, usuario, agora));
  r.rota('meuConcursoSeguir', async ({ usuario, corpo, deps, agora }) =>
    seguirConcurso(deps, usuario, corpo.concursoId, corpo.cargoId, agora),
  );
  r.rota('meuConcursoAtivar', async ({ usuario, params, deps, agora }) =>
    ativarConcurso(deps, usuario, params.id, agora),
  );
  r.rota('meuConcursoDeixar', async ({ usuario, params, deps, agora }) =>
    deixarConcurso(deps, usuario, params.id, agora),
  );

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
      if (concurso) {
        set.concursoId = concurso.id;
        await guardarCargoNoConcurso(deps.db, usuario, concurso.id, cargo, agora);
      }
    }
    if (corpo.metaDiaria !== undefined) set.metaDiaria = corpo.metaDiaria;
    if (corpo.lembreteHora !== undefined) set.lembreteHora = corpo.lembreteHora;
    if (corpo.notificacoes !== undefined) set.notificacoes = corpo.notificacoes;
    if (corpo.marketing !== undefined) set.marketing = corpo.marketing;
    if (corpo.apelidoLiga !== undefined) set.apelidoLiga = corpo.apelidoLiga;
    if (corpo.sons !== undefined) set.sons = corpo.sons;
    if (corpo.onboardingConcluido && !usuario.onboardingConcluidoEm) set.onboardingConcluidoEm = agora;
    const [u] = await deps.db.update(usuarios).set(set).where(eq(usuarios.id, usuario.id)).returning();
    return montarMe(deps.db, { ...u!, sessaoDoisFatoresEm: usuario.sessaoDoisFatoresEm }, agora);
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

  r.rota('meExportar', async ({ usuario, deps, agora }) => exportarDadosUsuario(deps.db, usuario, agora));

  r.rota('meExcluir', async ({ usuario, corpo, deps, reply, agora }) => {
    if (!(await conferirSenha(usuario.senhaHash, corpo.senha))) {
      throw falha('validacao', 'A senha não confere.', { senha: 'A senha não confere.' });
    }
    // LGPD: anonimiza o perfil e mantém os pedidos (obrigação fiscal).
    await deps.db.transaction((tx) => anonimizarUsuario(tx, usuario.id, agora));
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
