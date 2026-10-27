/**
 * Admin de gestão (PRD 5.17 e 13): painel, pedidos, reembolso, liberação manual, reports,
 * usuários e auditoria. CPF sempre mascarado.
 */
import { and, count, desc, eq, gte, ilike, isNotNull, lt, or, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  dentroDoArrependimento,
  diaSP,
  inicioDoDiaSP,
  MS_DIA,
  ocultarCpf,
  somarDias,
  STATUS_QUESTAO,
  somenteDigitos,
} from '@fuse/shared';
import type { PedidoAdmin } from '@fuse/shared/api';
import type { Registrador } from '../../http/registrar.js';
import { existe, falha } from '../../http/erros.js';
import { dominioPorDisciplina } from '../../servicos/dominio.js';
import { encerrarSessoesDoUsuario } from '../../servicos/sessoes.js';
import { cargoDoUsuario, revisoesPendentes } from '../../servicos/usuario.js';
import { consultar, contar, dataSql, iso, isoOuNull, type Db } from '../../util.js';
import { auditar, paginacao } from './comum.js';

const { pedidos, usuarios, reports, questoes, tentativas, sessoes, simulados, progressoLicoes, auditoria } = schema;

type Pedido = typeof pedidos.$inferSelect;
type Usuario = typeof usuarios.$inferSelect;

function mapPedido(p: Pedido, agora: Date): Omit<PedidoAdmin, 'usuario'> {
  return {
    id: p.id,
    valorCentavos: p.valorCentavos,
    status: p.status,
    asaasPaymentId: p.asaasPaymentId,
    asaasCustomerId: p.asaasCustomerId,
    criadoEm: iso(p.criadoEm),
    pagoEm: isoOuNull(p.pagoEm),
    pixExpiraEm: isoOuNull(p.pixExpiraEm),
    reembolsoSolicitadoEm: isoOuNull(p.reembolsoSolicitadoEm),
    dentroDoArrependimento: p.status === 'pago' && p.pagoEm !== null && dentroDoArrependimento(p.pagoEm, agora),
  };
}

function mapUsuario(u: Usuario) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cpfOculto: ocultarCpf(u.cpf ?? ''),
    celular: u.celular ? `(${u.celular.slice(0, 2)}) *****-${u.celular.slice(-4)}` : '',
    papel: u.papel,
    acesso: u.acesso,
    area: u.area,
    xpTotal: u.xpTotal,
    ofensiva: u.ofensiva,
    criadoEm: iso(u.criadoEm),
    excluidoEm: isoOuNull(u.excluidoEm),
  };
}

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

/** Métricas da seção 13, calculadas por SQL nas tabelas próprias. */
async function metricas(db: Db, agora: Date) {
  const n = async (q: ReturnType<typeof sql>) => contar((await consultar<{ n: number }>(db, q))[0]?.n);
  const alunos = await n(sql`select count(*)::int n from usuarios where papel = 'aluno'`);
  const pagantes = await n(sql`select count(distinct usuario_id)::int n from pedidos where status in ('pago','estornado')`);
  const d7 = new Date(agora.getTime() - 7 * MS_DIA);
  const coorte = await n(sql`select count(distinct usuario_id)::int n from pedidos where status = 'pago' and pago_em <= ${dataSql(d7)}`);
  // Retenção D7: pagou há 7+ dias e respondeu alguma questão 7 dias ou mais depois do pagamento.
  const retidos = await n(sql`select count(distinct p.usuario_id)::int n from pedidos p
      where p.status = 'pago' and p.pago_em <= ${dataSql(d7)}
      and exists (select 1 from tentativas t where t.usuario_id = p.usuario_id and t.respondida_em >= p.pago_em + interval '7 days')`);
  const licoes7 = await n(sql`select count(*)::int n from sessoes_estudo where tipo in ('licao','desafio') and concluida_em >= ${dataSql(d7)}`);
  const comAcesso = await n(sql`select count(*)::int n from usuarios where acesso = true and papel = 'aluno'`);
  const of7 = await n(sql`select count(*)::int n from usuarios where acesso = true and papel = 'aluno' and ofensiva >= 7`);
  const estornados = await n(sql`select count(*)::int n from pedidos where status = 'estornado' or reembolso_solicitado_em is not null`);
  const pagos = await n(sql`select count(*)::int n from pedidos where status in ('pago','estornado')`);
  const [melhora] = await consultar<{ p1: number | null; p5: number | null }>(
    db,
    sql`select avg(case when rn = 1 then a end)::float p1, avg(case when rn = 5 then a end)::float p5 from (
          select t.usuario_id, q.assunto_id, case when t.acertou then 1.0 else 0.0 end a,
                 row_number() over (partition by t.usuario_id, q.assunto_id order by t.respondida_em) rn,
                 count(*) over (partition by t.usuario_id, q.assunto_id) total
          from tentativas t join questoes q on q.id = t.questao_id) x
        where total >= 5 and rn in (1, 5)`,
  );
  return {
    conversaoCadastroPago: pct(pagantes, alunos),
    retencaoD7: pct(retidos, coorte),
    licoesPorAlunoSemana: comAcesso > 0 ? Math.round((licoes7 / comAcesso) * 10) / 10 : null,
    pagantesOfensiva7: pct(of7, comAcesso),
    pedidosReembolso: pct(estornados, pagos),
    melhoraAcertoPp:
      melhora && melhora.p1 !== null && melhora.p5 !== null ? Math.round((melhora.p5 - melhora.p1) * 1000) / 10 : null,
  };
}

export function rotasAdminGestao(r: Registrador): void {
  r.rota('adminPainel', async ({ deps, agora }) => {
    const { db } = deps;
    const hoje = diaSP(agora);
    const iniHoje = inicioDoDiaSP(hoje);
    const iniMes = inicioDoDiaSP(`${hoje.slice(0, 8)}01`);
    const vendas = async (desde: Date) => {
      const [v] = await db
        .select({ n: count(), c: sql<number>`coalesce(sum(${pedidos.valorCentavos}), 0)::int` })
        .from(pedidos)
        .where(and(isNotNull(pedidos.pagoEm), gte(pedidos.pagoEm, desde), sql`${pedidos.status} in ('pago','estornado')`));
      return { quantidade: contar(v?.n), centavos: contar(v?.c) };
    };
    const [ativos] = await db
      .select({ n: sql<number>`count(distinct ${tentativas.usuarioId})::int` })
      .from(tentativas)
      .where(gte(tentativas.respondidaEm, new Date(agora.getTime() - 7 * MS_DIA)));
    const [abertos] = await db.select({ n: count() }).from(reports).where(eq(reports.status, 'aberto'));
    const porStatus = await db.select({ s: questoes.status, n: count() }).from(questoes).groupBy(questoes.status);
    const questoesPorStatus = Object.fromEntries(STATUS_QUESTAO.map((s) => [s, contar(porStatus.find((x) => x.s === s)?.n)]));
    return {
      vendasHoje: await vendas(iniHoje),
      vendasMes: await vendas(iniMes),
      usuariosAtivos7d: contar(ativos?.n),
      reportsAbertos: contar(abertos?.n),
      questoesRascunho: questoesPorStatus.rascunho ?? 0,
      questoesPorStatus,
      metricas: await metricas(db, agora),
      geradoEm: iso(agora),
    };
  });

  /* ---------------------------------------------------------- pedidos */
  r.rota('adminPedidosListar', async ({ query, deps, agora }) => {
    const onde = and(
      query.status ? eq(pedidos.status, query.status) : undefined,
      query.q ? or(ilike(usuarios.nome, `%${query.q}%`), ilike(usuarios.email, `%${query.q}%`)) : undefined,
      query.de ? gte(pedidos.criadoEm, inicioDoDiaSP(query.de)) : undefined,
      query.ate ? lt(pedidos.criadoEm, inicioDoDiaSP(somarDias(query.ate, 1))) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(pedidos).innerJoin(usuarios, eq(usuarios.id, pedidos.usuarioId)).where(onde);
    const lista = await deps.db
      .select({ p: pedidos, u: usuarios })
      .from(pedidos)
      .innerJoin(usuarios, eq(usuarios.id, pedidos.usuarioId))
      .where(onde)
      .orderBy(desc(pedidos.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return {
      itens: lista.map((x) => ({
        ...mapPedido(x.p, agora),
        usuario: { id: x.u.id, nome: x.u.nome, email: x.u.email, cpfOculto: ocultarCpf(x.u.cpf ?? '') },
      })),
      total: contar(t?.n),
      pagina: query.pagina,
      porPagina: query.porPagina,
    };
  });

  r.rota('adminPedidoReembolso', async ({ params, corpo, deps, usuario, agora }) => {
    const [p] = await deps.db.select().from(pedidos).where(eq(pedidos.id, params.id));
    const pedido = existe(p, 'Pedido não encontrado.');
    if (pedido.status !== 'pago' || !pedido.asaasPaymentId) throw falha('conflito', 'Só é possível reembolsar um pedido pago.');
    if (!corpo.foraDoPrazo && !(pedido.pagoEm && dentroDoArrependimento(pedido.pagoEm, agora))) {
      throw falha('fora_do_prazo', 'Passaram mais de 7 dias do pagamento. Marque "fora do prazo" para reembolsar mesmo assim.');
    }
    try {
      await deps.asaas.estornar(pedido.asaasPaymentId, { description: 'Reembolso Fuse Aprova' });
    } catch (e) {
      deps.log.error({ pedidoId: pedido.id, erro: (e as Error).message }, 'falha no estorno do Asaas');
      throw falha('pix_indisponivel', 'O Asaas não aceitou o estorno agora. Tente de novo em alguns minutos.');
    }
    await deps.db.update(pedidos).set({ reembolsoSolicitadoEm: agora }).where(eq(pedidos.id, pedido.id));
    await auditar(deps.db, usuario.id, 'pedido.reembolso', `pedido:${pedido.id}`, { motivo: corpo.motivo, foraDoPrazo: corpo.foraDoPrazo }, agora);
    // O acesso é revogado quando o webhook PAYMENT_REFUNDED chegar.
    return { ok: true as const, status: 'aguardando_webhook' as const };
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

  /* ---------------------------------------------------------- usuários */
  r.rota('adminUsuariosListar', async ({ query, deps }) => {
    const dig = query.q ? somenteDigitos(query.q) : '';
    const onde = and(
      query.q
        ? or(
            ilike(usuarios.nome, `%${query.q}%`),
            ilike(usuarios.email, `%${query.q}%`),
            dig.length >= 3 ? sql`${usuarios.cpf} like ${`%${dig}%`}` : undefined,
          )
        : undefined,
      query.acesso !== undefined ? eq(usuarios.acesso, query.acesso) : undefined,
      query.papel ? eq(usuarios.papel, query.papel) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(usuarios).where(onde);
    const lista = await deps.db
      .select()
      .from(usuarios)
      .where(onde)
      .orderBy(desc(usuarios.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map(mapUsuario), total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });

  r.rota('adminUsuarioObter', async ({ params, deps, agora, usuario }) => {
    const { db } = deps;
    const [u] = await db.select().from(usuarios).where(eq(usuarios.id, params.id));
    const usu = existe(u, 'Usuário não encontrado.');
    const [lic] = await db.select({ n: count() }).from(progressoLicoes).where(and(eq(progressoLicoes.usuarioId, usu.id), isNotNull(progressoLicoes.concluidaEm)));
    const [tent] = await db
      .select({ n: count(), a: sql<number>`count(*) filter (where ${tentativas.acertou})::int` })
      .from(tentativas)
      .where(eq(tentativas.usuarioId, usu.id));
    const [sims] = await db.select({ n: count() }).from(simulados).where(and(eq(simulados.usuarioId, usu.id), isNotNull(simulados.entregueEm)));
    const ped = await db.select().from(pedidos).where(eq(pedidos.usuarioId, usu.id)).orderBy(desc(pedidos.criadoEm));
    // IP e aparelho das sessões de outro admin ou do superadmin só o superadmin vê (V1-11).
    const verSessoes = usu.papel === 'aluno' || usuario.papel === 'superadmin';
    const sess = verSessoes
      ? await db.select().from(sessoes).where(eq(sessoes.usuarioId, usu.id)).orderBy(desc(sessoes.criadoEm))
      : [];
    const cargo = await cargoDoUsuario(db, usu);
    const feitas = contar(tent?.n);
    return {
      usuario: {
        ...mapUsuario(usu),
        cargo: cargo?.nome ?? null,
        metaDiaria: usu.metaDiaria,
        gemas: usu.gemas,
        vidas: usu.vidas,
        divisao: usu.divisao,
        ofensivaRecorde: usu.ofensivaRecorde,
        ultimoDiaEstudo: usu.ultimoDiaEstudo,
        aceiteTermosEm: isoOuNull(usu.aceiteTermosEm),
        versaoTermos: usu.versaoTermos,
      },
      progresso: {
        licoesConcluidas: contar(lic?.n),
        questoesFeitas: feitas,
        precisao: feitas ? Math.round((contar(tent?.a) / feitas) * 100) : null,
        simuladosEntregues: contar(sims?.n),
        revisoesPendentes: await revisoesPendentes(db, usu.id, agora),
        dominio: (await dominioPorDisciplina(db, usu.id)).map((d) => ({ slug: d.slug, nome: d.nome, valor: d.valor })),
      },
      pedidos: ped.map((p) => mapPedido(p, agora)),
      sessoes: sess.map((s) => ({ id: s.id, userAgent: s.userAgent, ip: s.ip, criadoEm: iso(s.criadoEm), expiraEm: iso(s.expiraEm) })),
    };
  });

  r.rota('adminUsuarioRevogarSessoes', async ({ params, deps, usuario, agora }) => {
    await exigirAlvoAluno(deps.db, usuario, params.id);
    const revogadas = await encerrarSessoesDoUsuario(deps.db, params.id);
    await auditar(deps.db, usuario.id, 'usuario.revogar_sessoes', `usuario:${params.id}`, { revogadas }, agora);
    return { revogadas };
  });
  r.rota('adminUsuarioLiberarAcesso', async ({ params, corpo, deps, usuario, agora }) => {
    await exigirAlvoAluno(deps.db, usuario, params.id);
    await deps.db.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, params.id));
    await auditar(deps.db, usuario.id, 'acesso.liberar', `usuario:${params.id}`, { motivo: corpo.motivo }, agora);
    return { ok: true as const };
  });
  r.rota('adminUsuarioRevogarAcesso', async ({ params, corpo, deps, usuario, agora }) => {
    await exigirAlvoAluno(deps.db, usuario, params.id);
    // Sem acesso, as sessões abertas também caem (como no estorno).
    await deps.db.transaction(async (tx) => {
      await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, params.id));
      await encerrarSessoesDoUsuario(tx, params.id);
    });
    await auditar(deps.db, usuario.id, 'acesso.revogar', `usuario:${params.id}`, { motivo: corpo.motivo }, agora);
    return { ok: true as const };
  });

  r.rota('adminAuditoria', async ({ query, deps }) => {
    const onde = and(
      query.acao ? eq(auditoria.acao, query.acao) : undefined,
      query.adminId ? eq(auditoria.adminId, query.adminId) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(auditoria).where(onde);
    const lista = await deps.db
      .select({ a: auditoria, u: { id: usuarios.id, nome: usuarios.nome } })
      .from(auditoria)
      .leftJoin(usuarios, eq(usuarios.id, auditoria.adminId))
      .where(onde)
      .orderBy(desc(auditoria.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return {
      itens: lista.map((x) => ({
        id: x.a.id,
        admin: x.u && x.u.id ? { id: x.u.id, nome: x.u.nome } : null,
        acao: x.a.acao,
        alvo: x.a.alvo,
        detalhes: x.a.detalhes ?? null,
        criadoEm: iso(x.a.criadoEm),
      })),
      total: contar(t?.n),
      pagina: query.pagina,
      porPagina: query.porPagina,
    };
  });
}

/**
 * O admin só age sobre alunos: derrubar sessões ou mexer no acesso de outro admin ou do
 * superadmin é coisa do painel do superadmin (com 2FA). Auditoria PIE R1-05.
 */
async function exigirAlvoAluno(db: Db, quem: { papel: string }, alvoId: string): Promise<void> {
  const [alvo] = await db.select({ papel: usuarios.papel }).from(usuarios).where(eq(usuarios.id, alvoId));
  if (existe(alvo, 'Usuário não encontrado.').papel !== 'aluno' && quem.papel !== 'superadmin') throw falha('proibido');
}
