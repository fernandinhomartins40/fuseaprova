/**
 * /super/pagamentos (D13 + D21): lista com busca (nome, e-mail, CPF ou id do Asaas), filtros de
 * status, método, concurso e período, concurso e cupom de cada pedido (S-14), exportação CSV e
 * conciliação em lote com o Asaas.
 * No celular a tabela vira cartões e os filtros vão para uma folha.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarReais, METODOS_PEDIDO, STATUS_PEDIDO, type MetodoPedido, type StatusPedido } from '@fuse/shared';
import type { ConciliarLoteResposta, PagamentosQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, CampoSelecao, CampoTexto, Consulta, Marcar, Paginacao, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora, NOMES_STATUS_PEDIDO, TOM_STATUS_PEDIDO } from '../../admin/util';
import { BotaoAtualizar, CartaoLinha, Cartoes, Folha, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { FiltroConcurso } from '../concursos';
import { Icone } from '../icones';
import { baixarCsv, caminho, NOMES_METODO, periodoPadrao } from '../util';

type Filtros = { q: string; status: StatusPedido | ''; metodo: MetodoPedido | ''; concursoId: string; de: string; ate: string };
const FILTROS_VAZIOS: Filtros = { q: '', status: '', metodo: '', concursoId: '', de: '', ate: '' };

const OPCOES_STATUS = STATUS_PEDIDO.map((v) => ({ valor: v, rotulo: NOMES_STATUS_PEDIDO[v] }));
const OPCOES_METODO = METODOS_PEDIDO.map((v) => ({ valor: v, rotulo: NOMES_METODO[v] }));

function consultaDe(f: Filtros, pagina: number): PagamentosQuery {
  return {
    pagina,
    porPagina: 20,
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.metodo ? { metodo: f.metodo } : {}),
    ...(f.concursoId ? { concursoId: f.concursoId } : {}),
    ...(f.de ? { de: f.de } : {}),
    ...(f.ate ? { ate: f.ate } : {}),
  };
}

function CamposFiltro({ f, mudar }: { f: Filtros; mudar: (p: Partial<Filtros>) => void }) {
  return (
    <>
      <CampoSelecao rotulo="Status" value={f.status} vazio="Todos" opcoes={OPCOES_STATUS} onChange={(e) => mudar({ status: e.target.value as Filtros['status'] })} />
      <CampoSelecao rotulo="Método" value={f.metodo} vazio="Todos" opcoes={OPCOES_METODO} onChange={(e) => mudar({ metodo: e.target.value as Filtros['metodo'] })} />
      <FiltroConcurso valor={f.concursoId} aoMudar={(concursoId) => mudar({ concursoId })} />
      <CampoTexto rotulo="De" type="date" value={f.de} onChange={(e) => mudar({ de: e.target.value })} />
      <CampoTexto rotulo="Até" type="date" value={f.ate} onChange={(e) => mudar({ ate: e.target.value })} />
    </>
  );
}

function ConciliarLote({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [p, setP] = useState(() => periodoPadrao(7));
  const [corrigir, setCorrigir] = useState(false);
  const lote = useMutation({ mutationFn: () => api('superConciliarLote', { corpo: { ...p, corrigir } }) });
  const r: ConciliarLoteResposta | undefined = lote.data;
  const fechar = () => {
    lote.reset();
    aoFechar();
  };
  return (
    <Folha
      titulo="Conciliar com o Asaas"
      aberta={aberta}
      aoFechar={fechar}
      larga
      rodape={
        <>
          <Botao data-fechar onClick={fechar}>
            Fechar
          </Botao>
          <Botao variante="primario" carregando={lote.isPending} onClick={() => lote.mutate()}>
            {corrigir ? 'Conciliar e corrigir' : 'Só conferir'}
          </Botao>
        </>
      }
    >
      <div className={a.formulario}>
        <p className={a.suave}>
          Consulta no Asaas as cobranças Pix do Fuse Aprova (até 200) criadas no período. Os pagamentos manuais ficam de fora.
        </p>
        <CampoTexto rotulo="De" type="date" value={p.de} onChange={(e) => e.target.value && setP((x) => ({ ...x, de: e.target.value }))} />
        <CampoTexto rotulo="Até" type="date" value={p.ate} onChange={(e) => e.target.value && setP((x) => ({ ...x, ate: e.target.value }))} />
        <Marcar rotulo="Corrigir as divergências (sem marcar, só gera o relatório)" checked={corrigir} onChange={(e) => setCorrigir(e.target.checked)} />
        {lote.isError ? <Alerta tom="erro">{mensagemDeErro(lote.error)}</Alerta> : null}
        {r ? (
          <>
            <Alerta tom={r.divergentes ? 'aviso' : 'sucesso'}>
              {r.verificados} verificado(s), {r.divergentes} divergente(s), {r.corrigidos} corrigido(s), {r.erros} erro(s).
              {r.ignoradosManuais ? ` ${r.ignoradosManuais} manual(is) ignorado(s).` : ''}
              {r.limiteAtingido ? ' Limite de 200 atingido: rode de novo com um período menor.' : ''}
            </Alerta>
            {r.itens.filter((i) => i.divergente || !i.statusAsaas).length ? (
              <ul className={a.lista}>
                {r.itens
                  .filter((i) => i.divergente || !i.statusAsaas)
                  .map((i) => (
                    <li key={i.pedidoId}>
                      <Link to={caminho(`pagamentos/${i.pedidoId}`)}>{i.usuario}</Link>: {i.mensagem}
                    </li>
                  ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </Folha>
  );
}

export default function Pagamentos() {
  const celular = useCelular();
  const [f, setF] = useState<Filtros>(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [conciliar, setConciliar] = useState(false);
  const mudar = (p: Partial<Filtros>) => {
    setF((x) => ({ ...x, ...p }));
    setPagina(1);
  };
  const q = consultaDe(f, pagina);
  const consulta = useQuery({ queryKey: ['super', 'pagamentos', q], queryFn: () => api('superPagamentosListar', { query: q }), placeholderData: keepPreviousData });
  const csv = useMutation({ mutationFn: () => api('superPagamentosCsv', { query: q }), onSuccess: baixarCsv });
  const ativos = [f.status, f.metodo, f.concursoId, f.de, f.ate].filter(Boolean).length;

  return (
    <Pagina
      titulo="Pagamentos"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Pagamentos' }]}
      acoes={
        <>
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
          <Botao onClick={() => setConciliar(true)}>Conciliar com o Asaas</Botao>
          <Botao onClick={() => csv.mutate()} carregando={csv.isPending}>
            <Icone nome="baixar" tamanho={18} /> Exportar CSV
          </Botao>
        </>
      }
    >
      <form role="search" aria-label="Buscar pagamentos" className={celular ? s.barraFiltros : a.filtros} onSubmit={(e) => e.preventDefault()}>
        {celular ? (
          <>
            <input
              className={a.entrada}
              type="search"
              aria-label="Buscar por nome, e-mail, CPF ou id do Asaas"
              placeholder="Nome, e-mail, CPF ou id"
              value={f.q}
              onChange={(e) => mudar({ q: e.target.value })}
            />
            <Botao onClick={() => setFiltrosAbertos(true)} aria-label={`Filtros${ativos ? ` (${ativos} ativo(s))` : ''}`}>
              <Icone nome="filtro" tamanho={18} />
              {ativos ? ` ${ativos}` : ''}
            </Botao>
          </>
        ) : (
          <>
            <CampoTexto rotulo="Buscar" type="search" placeholder="Nome, e-mail, CPF ou id do Asaas" value={f.q} onChange={(e) => mudar({ q: e.target.value })} />
            <CamposFiltro f={f} mudar={mudar} />
          </>
        )}
      </form>
      <Folha
        titulo="Filtros"
        aberta={filtrosAbertos}
        aoFechar={() => setFiltrosAbertos(false)}
        rodape={
          <>
            <Botao onClick={() => mudar({ ...FILTROS_VAZIOS, q: f.q })}>Limpar</Botao>
            <Botao variante="primario" onClick={() => setFiltrosAbertos(false)}>
              Aplicar
            </Botao>
          </>
        }
      >
        <div className={a.formulario}>
          <CamposFiltro f={f} mudar={mudar} />
        </div>
      </Folha>
      <ConciliarLote aberta={conciliar} aoFechar={() => setConciliar(false)} />
      {csv.isError ? <Alerta tom="erro">{mensagemDeErro(csv.error)}</Alerta> : null}
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum pagamento com esses filtros.">
        {(d) => (
          <>
            {celular ? (
              <Cartoes rotulo="Pagamentos">
                {d.itens.map((p) => (
                  <CartaoLinha
                    key={p.id}
                    para={caminho(`pagamentos/${p.id}`)}
                    titulo={p.usuario.nome}
                    sub={`${p.concurso?.nome ?? 'Sem concurso'} · ${NOMES_METODO[p.metodo]} · ${dataHora(p.pagoEm ?? p.criadoEm)}${p.cupomCodigo ? ` · cupom ${p.cupomCodigo}` : ''}`}
                    valor={formatarReais(p.valorCentavos)}
                    extra={
                      <div style={{ marginTop: 4 }}>
                        <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
                      </div>
                    }
                  />
                ))}
              </Cartoes>
            ) : (
              <Tabela rotulo="Pagamentos">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Status</th>
                    <th>Concurso</th>
                    <th>Método</th>
                    <th className={a.direita}>Valor</th>
                    <th>Cupom</th>
                    <th>Criado</th>
                    <th>Pago</th>
                    <th>Id no Asaas</th>
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link className={a.link} to={caminho(`pagamentos/${p.id}`)}>
                          {p.usuario.nome}
                        </Link>
                        <div className={a.suave}>{p.usuario.email}</div>
                      </td>
                      <td>
                        <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
                      </td>
                      <td>{p.concurso?.nome ?? '—'}</td>
                      <td>{NOMES_METODO[p.metodo]}</td>
                      <td className={a.direita}>{formatarReais(p.valorCentavos)}</td>
                      <td className={a.mono}>
                        {p.cupomCodigo ?? '—'}
                        {p.descontoCentavos ? <div className={a.suave}>−{formatarReais(p.descontoCentavos)}</div> : null}
                      </td>
                      <td>{dataHora(p.criadoEm)}</td>
                      <td>{dataHora(p.pagoEm)}</td>
                      <td className={a.mono}>{p.asaasPaymentId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={setPagina} />
          </>
        )}
      </Consulta>
    </Pagina>
  );
}
