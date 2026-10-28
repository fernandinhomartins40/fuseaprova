/**
 * Métricas da seção 13 do PRD, calculadas por SQL nas tabelas próprias. D24: as de negócio
 * (conversão, retenção dos pagantes, ofensiva dos pagantes, reembolso) ficam só no /super; o painel
 * de conteúdo do /admin mostra só as de aprendizagem.
 */
import { sql } from 'drizzle-orm';
import { MS_DIA } from '@fuse/shared';
import type { MetricasProduto } from '@fuse/shared/api';
import { consultar, contar, dataSql, type Db } from '../util.js';

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export async function metricasProduto(db: Db, agora: Date): Promise<MetricasProduto> {
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

