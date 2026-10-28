/**
 * /super/financeiro (D13): receita bruta e líquida (taxas do Asaas), reembolsos, pedidos por
 * status, Pix gerados × pagos × expirados, conversão e alunos ativos (DAU/WAU/MAU).
 *
 * Os pedidos do período são poucos (centenas a milhares), então a agregação por dia, semana
 * ou mês acontece aqui, com o dia de São Paulo de `@fuse/shared` (a mesma regra do app todo).
 */
import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { MS_DIA, segundaDaSemana, somarDias, STATUS_PEDIDO } from '@fuse/shared';
import { gerarCsv, type FinanceiroResposta, type PontoFinanceiro } from '@fuse/shared/api';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { consultar, contar, dataSql, iso } from '../../util.js';
import { auditarSuper, nomeArquivoCsv, periodo, reais } from './comum.js';
import { lerPrecos } from '../../servicos/precos.js';

const { usuarios } = schema;

type Agrupamento = 'dia' | 'semana' | 'mes';

export function chavePeriodo(dia: string, a: Agrupamento): string {
  if (a === 'semana') return segundaDaSemana(dia);
  if (a === 'mes') return `${dia.slice(0, 8)}01`;
  return dia;
}

function chavesDoPeriodo(de: string, ate: string, a: Agrupamento): string[] {
  const out: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    const k = chavePeriodo(d, a);
    if (out[out.length - 1] !== k) out.push(k);
  }
  return out;
}

/** Unidade do `date_trunc` de cada agrupamento (lista fechada: vai como SQL literal). */
const UNIDADE: Record<Agrupamento, string> = { dia: 'day', semana: 'week', mes: 'month' };

/** Início do dia/semana (segunda)/mês da data em São Paulo, como 'AAAA-MM-DD', no SQL. */
function chaveSql(coluna: SQL, a: Agrupamento): SQL {
  return sql`to_char(date_trunc(${sql.raw(`'${UNIDADE[a]}'`)}, ${coluna} at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD')`;
}

/**
 * S-08 (R5-01): tudo é agregado no Postgres (soma, contagem e o período em São Paulo). Nenhuma
 * linha de `pedidos` vem para a memória da API — em especial o QR do Pix (`pix_imagem`, ~4 KB por
 * pedido), que levava o heap a centenas de MB num período de 2 anos.
 */
export async function calcularFinanceiro(
  deps: Deps,
  q: { de?: string | undefined; ate?: string | undefined; agrupamento: Agrupamento; metodo: 'todos' | 'asaas' | 'manual' },
  agora: Date,
): Promise<FinanceiroResposta> {
  const { db } = deps;
  const { de, ate, inicio, fim } = periodo(q, agora);
  const ini = dataSql(inicio);
  const fi = dataSql(fim);
  const fMetodo = q.metodo === 'todos' ? sql`true` : sql`p.metodo = ${q.metodo}`;

  // Pagos no período (inclui os estornados depois: a receita bruta é do dia do pagamento).
  const pagos = await consultar<{ k: string; metodo: string; n: number; bruto: string | number; taxas: string | number; sem_liquido: number }>(
    db,
    sql`select ${chaveSql(sql`p.pago_em`, q.agrupamento)} k, p.metodo::text metodo, count(*)::int n,
          coalesce(sum(p.valor_centavos), 0)::bigint bruto,
          coalesce(sum(case when p.metodo = 'asaas' and p.valor_liquido_centavos is not null
                            then greatest(0, p.valor_centavos - p.valor_liquido_centavos) else 0 end), 0)::bigint taxas,
          (count(*) filter (where p.metodo = 'asaas' and p.valor_liquido_centavos is null))::int sem_liquido
        from pedidos p
        where p.pago_em >= ${ini} and p.pago_em < ${fi} and p.status in ('pago', 'estornado') and ${fMetodo}
        group by 1, 2`,
  );
  const estornados = await consultar<{ k: string; n: number; total: string | number }>(
    db,
    sql`select ${chaveSql(sql`p.estornado_em`, q.agrupamento)} k, count(*)::int n, coalesce(sum(p.valor_centavos), 0)::bigint total
        from pedidos p
        where p.estornado_em >= ${ini} and p.estornado_em < ${fi} and p.status = 'estornado' and ${fMetodo}
        group by 1`,
  );
  const [criados] = await consultar<Record<string, number>>(
    db,
    sql`select
          (count(*) filter (where p.status = 'pendente'))::int pendente,
          (count(*) filter (where p.status = 'pago'))::int pago,
          (count(*) filter (where p.status = 'vencido'))::int vencido,
          (count(*) filter (where p.status = 'estornado'))::int estornado,
          (count(*) filter (where p.metodo = 'asaas'))::int pix_gerados,
          (count(*) filter (where p.metodo = 'asaas' and p.status in ('pago', 'estornado')))::int pix_pagos,
          (count(*) filter (where p.metodo = 'asaas' and p.status = 'vencido' and p.cancelado_em is null))::int pix_expirados,
          (count(*) filter (where p.metodo = 'asaas' and p.cancelado_em is not null))::int pix_cancelados,
          (count(*) filter (where p.metodo = 'asaas' and p.status = 'pendente'))::int pix_pendentes
        from pedidos p
        where p.criado_em >= ${ini} and p.criado_em < ${fi} and ${fMetodo}`,
  );
  const novos = await consultar<{ k: string; n: number }>(
    db,
    sql`select ${chaveSql(sql`u.criado_em`, q.agrupamento)} k, count(*)::int n
        from usuarios u
        where u.papel = 'aluno' and u.criado_em >= ${ini} and u.criado_em < ${fi}
        group by 1`,
  );
  const totalNovos = novos.reduce((s, x) => s + contar(x.n), 0);

  const serie = new Map<string, PontoFinanceiro>();
  for (const k of chavesDoPeriodo(de, ate, q.agrupamento)) {
    serie.set(k, {
      periodo: k,
      pagos: 0,
      brutoCentavos: 0,
      taxasCentavos: 0,
      reembolsosCentavos: 0,
      liquidoCentavos: 0,
      asaasCentavos: 0,
      manualCentavos: 0,
      novosAlunos: 0,
    });
  }
  const ponto = (k: string) => serie.get(k);

  const totais = {
    brutoCentavos: 0,
    taxasCentavos: 0,
    reembolsos: { quantidade: 0, centavos: 0 },
    liquidoCentavos: 0,
    pagos: 0,
    asaas: { quantidade: 0, centavos: 0 },
    manual: { quantidade: 0, centavos: 0 },
    semValorLiquido: 0,
  };
  for (const p of pagos) {
    const n = contar(p.n);
    const bruto = contar(p.bruto);
    const taxas = contar(p.taxas);
    totais.semValorLiquido += contar(p.sem_liquido);
    totais.pagos += n;
    totais.brutoCentavos += bruto;
    totais.taxasCentavos += taxas;
    const grupo = p.metodo === 'manual' ? totais.manual : totais.asaas;
    grupo.quantidade += n;
    grupo.centavos += bruto;
    const pt = ponto(p.k);
    if (pt) {
      pt.pagos += n;
      pt.brutoCentavos += bruto;
      pt.taxasCentavos += taxas;
      if (p.metodo === 'manual') pt.manualCentavos += bruto;
      else pt.asaasCentavos += bruto;
    }
  }
  for (const p of estornados) {
    totais.reembolsos.quantidade += contar(p.n);
    totais.reembolsos.centavos += contar(p.total);
    const pt = ponto(p.k);
    if (pt) pt.reembolsosCentavos += contar(p.total);
  }
  for (const u of novos) {
    const pt = ponto(u.k);
    if (pt) pt.novosAlunos += contar(u.n);
  }
  for (const pt of serie.values()) pt.liquidoCentavos = pt.brutoCentavos - pt.taxasCentavos - pt.reembolsosCentavos;
  totais.liquidoCentavos = totais.brutoCentavos - totais.taxasCentavos - totais.reembolsos.centavos;

  const pedidosPorStatus = Object.fromEntries(STATUS_PEDIDO.map((s) => [s, contar(criados?.[s])])) as FinanceiroResposta['pedidosPorStatus'];

  // Conversão: dos cadastrados no período, quantos têm pagamento (em qualquer data).
  let convertidos = 0;
  if (totalNovos) {
    const [c] = await consultar<{ n: number }>(
      db,
      sql`select count(distinct p.usuario_id)::int n from pedidos p join usuarios u on u.id = p.usuario_id
          where u.papel = 'aluno' and u.criado_em >= ${dataSql(inicio)} and u.criado_em < ${dataSql(fim)} and p.status in ('pago','estornado')`,
    );
    convertidos = contar(c?.n);
  }
  // Ativos: responderam questão no último dia, 7 e 30 dias até o fim do período (ou agora).
  // S-22: uma varredura só (a dos 30 dias), com o índice (respondida_em, usuario_id).
  const ref = new Date(Math.min(fim.getTime(), agora.getTime()));
  const desde = (dias: number) => dataSql(new Date(ref.getTime() - dias * MS_DIA));
  const [ativos] = await consultar<{ dau: number; wau: number; mau: number }>(
    db,
    sql`select (count(distinct usuario_id) filter (where respondida_em >= ${desde(1)}))::int dau,
               (count(distinct usuario_id) filter (where respondida_em >= ${desde(7)}))::int wau,
               count(distinct usuario_id)::int mau
        from tentativas where respondida_em >= ${desde(30)} and respondida_em < ${dataSql(ref)}`,
  );
  const [comAcesso] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'aluno'), eq(usuarios.acesso, true), isNull(usuarios.excluidoEm)));

  return {
    de,
    ate,
    agrupamento: q.agrupamento,
    metodo: q.metodo,
    precoCentavos: (await lerPrecos(deps.db, deps.config)).valores.precoCentavos,
    serie: [...serie.values()],
    totais,
    pedidosPorStatus,
    pix: {
      gerados: contar(criados?.pix_gerados),
      pagos: contar(criados?.pix_pagos),
      expirados: contar(criados?.pix_expirados),
      cancelados: contar(criados?.pix_cancelados),
      pendentes: contar(criados?.pix_pendentes),
    },
    alunos: {
      novos: totalNovos,
      conversaoCadastroPago: totalNovos ? Math.round((convertidos / totalNovos) * 1000) / 10 : null,
      dau: contar(ativos?.dau),
      wau: contar(ativos?.wau),
      mau: contar(ativos?.mau),
      comAcesso: contar(comAcesso?.n),
    },
    geradoEm: iso(agora),
  };
}

export function rotasSuperFinanceiro(r: Registrador): void {
  r.rota('superFinanceiro', async ({ query, deps, agora }) => calcularFinanceiro(deps, query, agora));

  r.rota('superFinanceiroCsv', async (ctx) => {
    const f = await calcularFinanceiro(ctx.deps, ctx.query, ctx.agora);
    await auditarSuper(ctx, 'exportar.csv', 'financeiro', { detalhes: { de: f.de, ate: f.ate, metodo: f.metodo } });
    const conteudo = gerarCsv(
      ['periodo', 'metodo', 'pagos', 'bruto_reais', 'asaas_reais', 'manual_reais', 'taxas_reais', 'reembolsos_reais', 'liquido_reais', 'novos_alunos'],
      f.serie.map((p) => [
        p.periodo,
        f.metodo,
        p.pagos,
        reais(p.brutoCentavos),
        reais(p.asaasCentavos),
        reais(p.manualCentavos),
        reais(p.taxasCentavos),
        reais(p.reembolsosCentavos),
        reais(p.liquidoCentavos),
        p.novosAlunos,
      ]),
    );
    return { nomeArquivo: nomeArquivoCsv(`financeiro-${f.agrupamento}`, ctx.agora), conteudo, linhas: f.serie.length, aviso: null };
  });
}

