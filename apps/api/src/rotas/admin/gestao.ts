/**
 * Admin de conteúdo (PRD 5.17 e 13): painel de conteúdo e reports. D24: pedidos, reembolso,
 * usuários, liberar/revogar acesso, sessões e auditoria são negócio e ficam só no /super.
 */
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { STATUS_QUESTAO } from '@fuse/shared';
import type { Registrador } from '../../http/registrar.js';
import { existe } from '../../http/erros.js';
import { metricasProduto } from '../../servicos/metricas.js';
import { contar, iso, type Db } from '../../util.js';
import { auditar, paginacao } from './comum.js';

const { usuarios, reports, questoes } = schema;

export function rotasAdminGestao(r: Registrador): void {
  // D24: só números de conteúdo (sem vendas, receita nem conversão).
  r.rota('adminPainel', async ({ deps, agora }) => {
    const { db } = deps;
    const [abertos] = await db.select({ n: count() }).from(reports).where(eq(reports.status, 'aberto'));
    const porStatus = await db.select({ s: questoes.status, n: count() }).from(questoes).groupBy(questoes.status);
    const questoesPorStatus = Object.fromEntries(STATUS_QUESTAO.map((s) => [s, contar(porStatus.find((x) => x.s === s)?.n)]));
    const m = await metricasProduto(db, agora);
    return {
      reportsAbertos: contar(abertos?.n),
      questoesRascunho: questoesPorStatus.rascunho ?? 0,
      questoesPorStatus,
      metricas: { licoesPorAlunoSemana: m.licoesPorAlunoSemana, melhoraAcertoPp: m.melhoraAcertoPp },
      geradoEm: iso(agora),
    };
  });

  /* ---------------------------------------------------------- reports */
  const selReports = (db: Db) =>
    db
      .select({
        r: reports,
        q: { id: questoes.id, enunciado: questoes.enunciado, status: questoes.status },
        u: { id: usuarios.id, nome: usuarios.nome },
        abertos: sql<number>`(select count(*)::int from ${reports} r2 where r2.questao_id = ${reports.questaoId} and r2.status = 'aberto')`,
      })
      .from(reports)
      .innerJoin(questoes, eq(questoes.id, reports.questaoId))
      .leftJoin(usuarios, eq(usuarios.id, reports.usuarioId));
  type LinhaReport = Awaited<ReturnType<ReturnType<typeof selReports>['where']>>[number];
  const mapReport = (x: LinhaReport) => ({
    id: x.r.id,
    questao: {
      id: x.q.id,
      trecho: x.q.enunciado.slice(0, 140),
      status: x.q.status,
      reportsAbertos: contar(x.abertos),
    },
    usuario: x.u && x.u.id ? { id: x.u.id, nome: x.u.nome } : null,
    tipo: x.r.tipo,
    texto: x.r.texto,
    status: x.r.status,
    resolvidoPor: x.r.resolvidoPor,
    criadoEm: iso(x.r.criadoEm),
  });
  r.rota('adminReportsListar', async ({ query, deps }) => {
    const onde = and(
      query.status ? eq(reports.status, query.status) : undefined,
      query.tipo ? eq(reports.tipo, query.tipo) : undefined,
      query.questaoId ? eq(reports.questaoId, query.questaoId) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(reports).where(onde);
    const lista = await selReports(deps.db)
      .where(onde)
      .orderBy(desc(reports.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map(mapReport), total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });
  r.rota('adminReportAtualizar', async ({ params, corpo, deps, usuario, agora }) => {
    const [up] = await deps.db
      .update(reports)
      .set({ status: corpo.status, nota: corpo.nota ?? null, resolvidoPor: usuario.id, resolvidoEm: agora })
      .where(eq(reports.id, params.id))
      .returning({ id: reports.id });
    existe(up, 'Report não encontrado.');
    await auditar(deps.db, usuario.id, 'report.atualizar', `report:${params.id}`, corpo, agora);
    const [x] = await selReports(deps.db).where(eq(reports.id, params.id));
    return mapReport(x!);
  });
}
