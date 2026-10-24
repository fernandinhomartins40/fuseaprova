import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarReais } from '@fuse/shared';
import type { PedidoAdmin, PedidosQuery } from '@fuse/shared/api';
import { api } from '../api';
import { ModalAcessoManual, ModalReembolso } from '../componentes/AcoesAcesso';
import {
  Botao,
  Cabecalho,
  CampoSelecao,
  CampoTexto,
  Consulta,
  estilos as s,
  opcoesDe,
  Paginacao,
  Selo,
  Tabela,
} from '../componentes/ui';
import { BASE_ADMIN, cpfMascarado, dataHora, NOMES_STATUS_PEDIDO, TOM_STATUS_PEDIDO } from '../util';

export default function Pedidos() {
  const [filtros, setFiltros] = useState<PedidosQuery>({ pagina: 1, porPagina: 25 });
  const [busca, setBusca] = useState('');
  const [reembolso, setReembolso] = useState<PedidoAdmin | null>(null);
  const [liberar, setLiberar] = useState<PedidoAdmin | null>(null);
  const consulta = useQuery({
    queryKey: ['admin', 'pedidos', filtros],
    queryFn: () => api('adminPedidosListar', { query: filtros }),
    placeholderData: keepPreviousData,
  });
  const mudar = (k: keyof PedidosQuery, v: string) => setFiltros((f) => ({ ...f, pagina: 1, [k]: v || undefined }));

  return (
    <>
      <Cabecalho titulo="Pedidos" subtitulo="Pagamentos via Pix (Asaas). O CPF aparece sempre mascarado." />
      <form
        className={s.filtros}
        role="search"
        aria-label="Filtros de pedidos"
        onSubmit={(e) => {
          e.preventDefault();
          mudar('q', busca.trim());
        }}
      >
        <CampoTexto
          rotulo="Buscar (nome, e-mail ou id da cobrança)"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <CampoSelecao
          rotulo="Status"
          vazio="Todos"
          value={filtros.status ?? ''}
          opcoes={opcoesDe(NOMES_STATUS_PEDIDO)}
          onChange={(e) => mudar('status', e.target.value)}
        />
        <CampoTexto rotulo="De" type="date" value={filtros.de ?? ''} onChange={(e) => mudar('de', e.target.value)} />
        <CampoTexto rotulo="Até" type="date" value={filtros.ate ?? ''} onChange={(e) => mudar('ate', e.target.value)} />
        <Botao type="submit">Buscar</Botao>
      </form>
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum pedido com esses filtros.">
        {(d) => (
          <>
            <Tabela rotulo="Pedidos">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>CPF</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Criado</th>
                  <th>Pago</th>
                  <th>Cobrança Asaas</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className={s.link} to={`${BASE_ADMIN}/usuarios/${p.usuario.id}`}>
                        {p.usuario.nome}
                      </Link>
                      <div className={s.suave}>{p.usuario.email}</div>
                    </td>
                    <td className={s.mono} data-testid="cpf">
                      {cpfMascarado(p.usuario.cpfOculto)}
                    </td>
                    <td>{formatarReais(p.valorCentavos)}</td>
                    <td>
                      <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
                      {p.reembolsoSolicitadoEm && p.status === 'pago' ? (
                        <div>
                          <Selo tom="aviso">Estorno pedido, aguardando webhook</Selo>
                        </div>
                      ) : null}
                    </td>
                    <td className={s.suave}>{dataHora(p.criadoEm)}</td>
                    <td className={s.suave}>
                      {dataHora(p.pagoEm)}
                      {p.status === 'pago' ? (
                        <div>{p.dentroDoArrependimento ? 'dentro dos 7 dias' : 'fora dos 7 dias'}</div>
                      ) : null}
                    </td>
                    <td className={s.mono}>{p.asaasPaymentId ?? '—'}</td>
                    <td>
                      <div className={s.acoes}>
                        {p.status === 'pago' && !p.reembolsoSolicitadoEm ? (
                          <Botao pequeno variante="perigo" onClick={() => setReembolso(p)}>
                            Reembolsar
                          </Botao>
                        ) : null}
                        {p.status === 'pendente' || p.status === 'vencido' ? (
                          <Botao pequeno onClick={() => setLiberar(p)}>
                            Liberar acesso
                          </Botao>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            <Paginacao
              pagina={d.pagina}
              porPagina={d.porPagina}
              total={d.total}
              aoMudar={(pagina) => setFiltros((f) => ({ ...f, pagina }))}
            />
          </>
        )}
      </Consulta>
      {reembolso ? <ModalReembolso pedido={reembolso} aoFechar={() => setReembolso(null)} /> : null}
      {liberar ? <ModalAcessoManual usuario={liberar.usuario} modo="liberar" aoFechar={() => setLiberar(null)} /> : null}
    </>
  );
}
