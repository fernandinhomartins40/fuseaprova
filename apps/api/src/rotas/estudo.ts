/**
 * Lições, baú, sessões (responder, dica, concluir), revisão e reports (exigirAcesso).
 */
import { and, asc, count, countDistinct, eq, lte } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { deveAutoRetirar, TEXTO_REGRA_REVISAO } from '@fuse/shared';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { dominioPorDisciplina } from '../servicos/dominio.js';
import { abrirBau, concluir, iniciarLicao, iniciarRevisao, responder, usarDica } from '../servicos/estudo.js';
import { questaoVisivel } from '../servicos/questoes.js';
import { subirVersaoConteudo } from '../servicos/usuario.js';
import { contar } from '../util.js';

const { revisoes, questoes, disciplinas, reports, auditoria } = schema;

export function rotasEstudo(r: Registrador): void {
  r.rota('licaoIniciar', async ({ usuario, params, deps, agora }) => iniciarLicao(deps, usuario, params.id, agora));
  r.rota('licaoAbrirBau', async ({ usuario, params, deps, agora }) => abrirBau(deps, usuario, params.id, agora));
  r.rota('sessaoResponder', async ({ usuario, params, corpo, deps, agora }) =>
    responder(deps, usuario, params.id, corpo, agora),
  );
  r.rota('sessaoDica', async ({ usuario, params, corpo, deps }) => usarDica(deps, usuario, params.id, corpo.questaoId));
  r.rota('sessaoConcluir', async ({ usuario, params, deps, agora }) => concluir(deps, usuario, params.id, agora));

  r.rota('revisao', async ({ usuario, deps, agora }) => {
    const pend = await deps.db
      .select({ disciplinaId: questoes.disciplinaId, n: count() })
      .from(revisoes)
      .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
      .where(
        and(eq(revisoes.usuarioId, usuario.id), eq(revisoes.status, 'ativa'), lte(revisoes.venceEm, agora), questaoVisivel()),
      )
      .groupBy(questoes.disciplinaId);
    const ds = await deps.db.select().from(disciplinas).orderBy(asc(disciplinas.ordem));
    const dom = new Map((await dominioPorDisciplina(deps.db, usuario.id)).map((d) => [d.slug, d.valor]));
    const porId = new Map(pend.map((p) => [p.disciplinaId, contar(p.n)]));
    const porDisciplina = ds.map((d) => ({
      slug: d.slug,
      nome: d.nome,
      cor: d.cor,
      pendentes: porId.get(d.id) ?? 0,
      dominio: dom.get(d.slug) ?? null,
    }));
    return {
      pendentes: porDisciplina.reduce((s, d) => s + d.pendentes, 0),
      porDisciplina,
      regra: TEXTO_REGRA_REVISAO,
    };
  });

  r.rota('revisaoIniciar', async ({ usuario, corpo, deps, agora }) => iniciarRevisao(deps, usuario, corpo, agora));

  r.rota('questaoReport', async ({ usuario, params, corpo, deps, agora }) =>
    deps.db.transaction(async (tx) => {
      const [q] = await tx.select().from(questoes).where(eq(questoes.id, params.id)).for('update');
      if (!q) throw falha('nao_encontrado', 'Questão não encontrada.');
      const [rep] = await tx
        .insert(reports)
        .values({ usuarioId: usuario.id, questaoId: q.id, tipo: corpo.tipo, texto: corpo.texto || null, criadoEm: agora })
        .returning({ id: reports.id });
      // 3 reports abertos (de alunos diferentes) tiram a questão do ar para revisão (PRD 7.4).
      const [n] = await tx
        .select({ n: countDistinct(reports.usuarioId) })
        .from(reports)
        .where(and(eq(reports.questaoId, q.id), eq(reports.status, 'aberto')));
      if (q.status === 'publicada' && deveAutoRetirar(contar(n?.n))) {
        await tx
          .update(questoes)
          .set({ status: 'retirada', versao: q.versao + 1 })
          .where(eq(questoes.id, q.id));
        await subirVersaoConteudo(tx);
        await tx.insert(auditoria).values({
          adminId: null,
          acao: 'questao.auto_retirada',
          alvo: `questao:${q.id}`,
          detalhes: { reportsAbertos: contar(n?.n) },
          criadoEm: agora,
        });
      }
      return { ok: true as const, id: rep!.id };
    }),
  );
}
