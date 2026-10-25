/**
 * /super — visão geral e financeiro (D13): receita bruta e líquida (taxas do Asaas), Asaas ×
 * manual, reembolsos, pedidos por status, Pix gerados × pagos × expirados, conversão e
 * alunos ativos (DAU/WAU/MAU), com filtros de período e exportação CSV.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatarDiaMes, formatarReais } from '@fuse/shared';
import type { FinanceiroQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoSelecao, CampoTexto, Consulta, estilos as a } from '../../admin/componentes/ui';
import { NOMES_STATUS_PEDIDO, numero } from '../../admin/util';
import { BotaoAtualizar, Folha, Kpi, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { GraficoBarras } from '../Grafico';
import { Icone } from '../icones';
import { baixarCsv, periodoPadrao, porcentagem, reaisCurto } from '../util';

const AGRUPAMENTOS = [
  { valor: 'dia', rotulo: 'Por dia' },
  { valor: 'semana', rotulo: 'Por semana' },
  { valor: 'mes', rotulo: 'Por mês' },
];
const METODOS = [
  { valor: 'todos', rotulo: 'Asaas e manual' },
  { valor: 'asaas', rotulo: 'Só Pix (Asaas)' },
  { valor: 'manual', rotulo: 'Só manual' },
];

type Filtros = Required<Pick<FinanceiroQuery, 'de' | 'ate'>> & { agrupamento: 'dia' | 'semana' | 'mes'; metodo: 'todos' | 'asaas' | 'manual' };

function CamposFiltro({ f, mudar }: { f: Filtros; mudar: (p: Partial<Filtros>) => void }) {
  return (
    <>
      <CampoTexto rotulo="De" type="date" value={f.de} onChange={(e) => e.target.value && mudar({ de: e.target.value })} />
      <CampoTexto rotulo="Até" type="date" value={f.ate} onChange={(e) => e.target.value && mudar({ ate: e.target.value })} />
      <CampoSelecao rotulo="Agrupar" value={f.agrupamento} opcoes={AGRUPAMENTOS} onChange={(e) => mudar({ agrupamento: e.target.value as Filtros['agrupamento'] })} />
      <CampoSelecao rotulo="Método" value={f.metodo} opcoes={METODOS} onChange={(e) => mudar({ metodo: e.target.value as Filtros['metodo'] })} />
    </>
  );
}

export default function VisaoGeral() {
  const celular = useCelular();
  const [f, setF] = useState<Filtros>({ ...periodoPadrao(30), agrupamento: 'dia', metodo: 'todos' });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const mudar = (p: Partial<Filtros>) => setF((x) => ({ ...x, ...p }));
  const consulta = useQuery({ queryKey: ['super', 'financeiro', f], queryFn: () => api('superFinanceiro', { query: f }), placeholderData: keepPreviousData });
  const csv = useMutation({ mutationFn: () => api('superFinanceiroCsv', { query: f }), onSuccess: baixarCsv });

  return (
    <Pagina
      titulo="Visão geral"
      trilha={[{ rotulo: 'Superadmin' }, { rotulo: 'Visão geral' }]}
      acoes={
        <>
          {celular ? (
            <Botao onClick={() => setFiltrosAbertos(true)}>
              <Icone nome="filtro" tamanho={18} /> Filtros
            </Botao>
          ) : null}
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
          <Botao onClick={() => csv.mutate()} carregando={csv.isPending}>
            <Icone nome="baixar" tamanho={18} /> Exportar CSV
          </Botao>
        </>
      }
    >
      {!celular ? (
        <form className={a.filtros} aria-label="Filtros do financeiro" onSubmit={(e) => e.preventDefault()}>
          <CamposFiltro f={f} mudar={mudar} />
        </form>
      ) : null}
      <Folha titulo="Filtros" aberta={filtrosAbertos} aoFechar={() => setFiltrosAbertos(false)} rodape={<Botao variante="primario" onClick={() => setFiltrosAbertos(false)}>Aplicar</Botao>}>
        <div className={a.formulario}>
          <CamposFiltro f={f} mudar={mudar} />
        </div>
      </Folha>
      {csv.isError ? <Alerta tom="erro">{mensagemDeErro(csv.error)}</Alerta> : null}
      <Consulta consulta={consulta}>
        {(d) => {
          const pontos = d.serie.map((p) => ({
            rotulo: d.agrupamento === 'mes' ? p.periodo.slice(5, 7) + '/' + p.periodo.slice(2, 4) : formatarDiaMes(p.periodo),
            detalhe: d.agrupamento === 'dia' ? formatarDiaMes(p.periodo) : `${d.agrupamento === 'semana' ? 'Semana de' : 'Mês de'} ${formatarDiaMes(p.periodo)}`,
            valores: [p.asaasCentavos, p.manualCentavos],
          }));
          const alunos = d.serie.map((p) => ({ rotulo: formatarDiaMes(p.periodo), detalhe: formatarDiaMes(p.periodo), valores: [p.novosAlunos] }));
          return (
            <>
              <section aria-label="Receita" className={s.kpis}>
                <Kpi testId="kpi-bruta" rotulo="Receita bruta" valor={formatarReais(d.totais.brutoCentavos)} detalhe={`${d.totais.pagos} pagamento(s)`} />
                <Kpi testId="kpi-liquida" rotulo="Receita líquida" valor={formatarReais(d.totais.liquidoCentavos)} detalhe={`taxas ${formatarReais(d.totais.taxasCentavos)} · reembolsos ${formatarReais(d.totais.reembolsos.centavos)}`} />
                <Kpi rotulo="Pix (Asaas)" valor={formatarReais(d.totais.asaas.centavos)} detalhe={`${d.totais.asaas.quantidade} pagamento(s)`} />
                <Kpi testId="kpi-manual" rotulo="Manual" valor={formatarReais(d.totais.manual.centavos)} detalhe={`${d.totais.manual.quantidade} aprovação(ões)`} />
                <Kpi rotulo="Reembolsos" valor={numero(d.totais.reembolsos.quantidade)} detalhe={formatarReais(d.totais.reembolsos.centavos)} />
                <Kpi rotulo="Conversão cadastro → pago" valor={porcentagem(d.alunos.conversaoCadastroPago)} detalhe={`${d.alunos.novos} cadastro(s) no período`} />
              </section>
              {d.totais.semValorLiquido > 0 ? (
                <Alerta tom="info">
                  {d.totais.semValorLiquido} pagamento(s) do Asaas ainda sem o valor líquido: a taxa deles conta como zero até a conciliação.
                </Alerta>
              ) : null}
              <Cartao>
                <GraficoBarras
                  titulo="Receita bruta por período"
                  series={[
                    { nome: 'Pix (Asaas)', cor: 'var(--super-serie-asaas)' },
                    { nome: 'Manual', cor: 'var(--super-serie-manual)' },
                  ]}
                  pontos={pontos}
                  formatar={reaisCurto}
                />
              </Cartao>
              <div className={s.par}>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Pix no período</h2>
                  <div className={s.kpis} style={{ marginBottom: 0 }}>
                    <Kpi rotulo="Gerados" valor={numero(d.pix.gerados)} />
                    <Kpi rotulo="Pagos" valor={numero(d.pix.pagos)} />
                    <Kpi rotulo="Expirados" valor={numero(d.pix.expirados)} />
                    <Kpi rotulo="Cancelados" valor={numero(d.pix.cancelados)} />
                    <Kpi rotulo="Pendentes" valor={numero(d.pix.pendentes)} />
                  </div>
                </Cartao>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Alunos</h2>
                  <div className={s.kpis} style={{ marginBottom: 0 }}>
                    <Kpi rotulo="Novos" valor={numero(d.alunos.novos)} />
                    <Kpi rotulo="Ativos hoje (DAU)" valor={numero(d.alunos.dau)} />
                    <Kpi rotulo="Ativos 7 dias (WAU)" valor={numero(d.alunos.wau)} />
                    <Kpi rotulo="Ativos 30 dias (MAU)" valor={numero(d.alunos.mau)} />
                    <Kpi rotulo="Com acesso" valor={numero(d.alunos.comAcesso)} />
                  </div>
                </Cartao>
              </div>
              <div className={s.par}>
                <Cartao>
                  <GraficoBarras titulo="Novos alunos por período" series={[{ nome: 'Novos alunos', cor: 'var(--super-serie-asaas)' }]} pontos={alunos} formatar={(v) => numero(v)} altura={180} />
                </Cartao>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Pedidos criados no período, por status</h2>
                  <dl className={a.dl}>
                    {Object.entries(d.pedidosPorStatus).map(([st, n]) => (
                      <div key={st} style={{ display: 'contents' }}>
                        <dt>{NOMES_STATUS_PEDIDO[st as keyof typeof NOMES_STATUS_PEDIDO]}</dt>
                        <dd>{numero(n)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={a.suave}>Preço fixo: {formatarReais(d.precoCentavos)} (PRICE_CENTS do .env).</p>
                </Cartao>
              </div>
            </>
          );
        }}
      </Consulta>
    </Pagina>
  );
}
