/**
 * /super/financeiro (D13): receita bruta e líquida (taxas do Asaas), reembolsos, pedidos por
 * status, Pix gerados × pagos × expirados, conversão e alunos ativos (DAU/WAU/MAU).
 *
 * Os pedidos do período são poucos (centenas a milhares), então a agregação por dia, semana
 * ou mês acontece aqui, com o dia de São Paulo de `@fuse/shared` (a mesma regra do app todo).
 */
import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { diaSP, MS_DIA, segundaDaSemana, somarDias, STATUS_PEDIDO } from '@fuse/shared';
import { gerarCsv, type FinanceiroResposta, type PontoFinanceiro } from '@fuse/shared/api';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { consultar, contar, iso } from '../../util.js';
import { auditarSuper, nomeArquivoCsv, periodo, reais } from './comum.js';

const { pedidos, usuarios } = schema;

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

export async function calcularFinanceiro(
  deps: Deps,
  q: { de?: string | undefined; ate?: string | undefined; agrupamento: Agrupamento; metodo: 'todos' | 'asaas' | 'manual' },
  agora: Date,
): Promise<FinanceiroResposta> {
  const { db } = deps;
  const { de, ate, inicio, fim } = periodo(q, agora);
  const filtroMetodo = q.metodo === 'todos' ? undefined : eq(pedidos.metodo, q.metodo);

  // Pagos no período (inclui os estornados depois: a receita bruta é do dia do pagamento).
  const pagos = await db
    .select()
    .from(pedidos)
    .where(and(gte(pedidos.pagoEm, inicio), lt(pedidos.pagoEm, fim), inArray(pedidos.status, ['pago', 'estornado']), filtroMetodo));
  const estornados = await db
    .select()
    .from(pedidos)
    .where(and(gte(pedidos.estornadoEm, inicio), lt(pedidos.estornadoEm, fim), eq(pedidos.status, 'estornado'), filtroMetodo));
  const criados = await db
    .select()
    .from(pedidos)
    .where(and(gte(pedidos.criadoEm, inicio), lt(pedidos.criadoEm, fim), filtroMetodo));
  const novos = await db
    .select({ id: usuarios.id, criadoEm: usuarios.criadoEm })
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'aluno'), gte(usuarios.criadoEm, inicio), lt(usuarios.criadoEm, fim)));

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
  const ponto = (d: Date) => serie.get(chavePeriodo(diaSP(d), q.agrupamento));

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
    const pt = ponto(p.pagoEm!);
    const taxa = p.metodo === 'asaas' && p.valorLiquidoCentavos !== null ? Math.max(0, p.valorCentavos - p.valorLiquidoCentavos) : 0;
    if (p.metodo === 'asaas' && p.valorLiquidoCentavos === null) totais.semValorLiquido++;
    totais.pagos++;
    totais.brutoCentavos += p.valorCentavos;
    totais.taxasCentavos += taxa;
    const grupo = p.metodo === 'manual' ? totais.manual : totais.asaas;
    grupo.quantidade++;
    grupo.centavos += p.valorCentavos;
    if (pt) {
      pt.pagos++;
      pt.brutoCentavos += p.valorCentavos;
      pt.taxasCentavos += taxa;
      if (p.metodo === 'manual') pt.manualCentavos += p.valorCentavos;
      else pt.asaasCentavos += p.valorCentavos;
    }
  }
  for (const p of estornados) {
    totais.reembolsos.quantidade++;
    totais.reembolsos.centavos += p.valorCentavos;
    const pt = ponto(p.estornadoEm!);
    if (pt) pt.reembolsosCentavos += p.valorCentavos;
  }
  for (const u of novos) {
    const pt = ponto(u.criadoEm);
    if (pt) pt.novosAlunos++;
  }
  for (const pt of serie.values()) pt.liquidoCentavos = pt.brutoCentavos - pt.taxasCentavos - pt.reembolsosCentavos;
  totais.liquidoCentavos = totais.brutoCentavos - totais.taxasCentavos - totais.reembolsos.centavos;

  const pedidosPorStatus = Object.fromEntries(STATUS_PEDIDO.map((s) => [s, criados.filter((p) => p.status === s).length])) as FinanceiroResposta['pedidosPorStatus'];
  const pix = criados.filter((p) => p.metodo === 'asaas');

  // Conversão: dos cadastrados no período, quantos têm pagamento (em qualquer data).
  let convertidos = 0;
  if (novos.length) {
    const [c] = await consultar<{ n: number }>(
      db,
      sql`select count(distinct p.usuario_id)::int n from pedidos p join usuarios u on u.id = p.usuario_id
          where u.papel = 'aluno' and u.criado_em >= ${inicio} and u.criado_em < ${fim} and p.status in ('pago','estornado')`,
    );
    convertidos = contar(c?.n);
  }
  // Ativos: responderam questão no último dia, 7 e 30 dias até o fim do período (ou agora).
  const ref = new Date(Math.min(fim.getTime(), agora.getTime()));
  const ativos = async (dias: number) => {
    const [r] = await consultar<{ n: number }>(
      db,
      sql`select count(distinct usuario_id)::int n from tentativas where respondida_em >= ${new Date(ref.getTime() - dias * MS_DIA)} and respondida_em < ${ref}`,
    );
    return contar(r?.n);
  };
  const [comAcesso] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'aluno'), eq(usuarios.acesso, true), isNull(usuarios.excluidoEm)));

  return {
    de,
    ate,
    agrupamento: q.agrupamento,
    metodo: q.metodo,
    precoCentavos: deps.config.precoCentavos,
    serie: [...serie.values()],
    totais,
    pedidosPorStatus,
    pix: {
      gerados: pix.length,
      pagos: pix.filter((p) => p.status === 'pago' || p.status === 'estornado').length,
      expirados: pix.filter((p) => p.status === 'vencido' && !p.canceladoEm).length,
      cancelados: pix.filter((p) => p.canceladoEm !== null).length,
      pendentes: pix.filter((p) => p.status === 'pendente').length,
    },
    alunos: {
      novos: novos.length,
      conversaoCadastroPago: novos.length ? Math.round((convertidos / novos.length) * 1000) / 10 : null,
      dau: await ativos(1),
      wau: await ativos(7),
      mau: await ativos(30),
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
    return { nomeArquivo: nomeArquivoCsv(`financeiro-${f.agrupamento}`, ctx.agora), conteudo };
  });
}

