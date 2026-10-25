/**
 * /super/webhooks (D13): eventos do Asaas recebidos (só os do Fuse Aprova, D14), com filtro
 * por situação, reprocessamento de um evento e reprocessamento em lote dos com erro.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WebhookEventoSuper, WebhooksQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, CampoSelecao, CampoTexto, Consulta, Paginacao, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora } from '../../admin/util';
import { AcaoConfirmada } from '../acoes';
import { BotaoAtualizar, CartaoLinha, Cartoes, Folha, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { caminho } from '../util';

type Situacao = NonNullable<WebhooksQuery['situacao']>;
const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'erro', rotulo: 'Com erro' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'processado', rotulo: 'Processados' },
];

function SeloSituacao({ w }: { w: WebhookEventoSuper }) {
  if (w.erro) return <Selo tom="erro">Erro</Selo>;
  if (w.processadoEm) return <Selo tom="sucesso">Processado</Selo>;
  return <Selo tom="aviso">Pendente</Selo>;
}

function DetalheEvento({ w, aoFechar }: { w: WebhookEventoSuper; aoFechar: () => void }) {
  const reprocessar = useMutation({ mutationFn: () => api('superWebhookReprocessar', { params: { id: w.id } }) });
  return (
    <Folha
      titulo={w.evento}
      aberta
      aoFechar={aoFechar}
      larga
      rodape={
        <>
          <Botao data-fechar onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao variante="primario" carregando={reprocessar.isPending} onClick={() => reprocessar.mutate()}>
            Reprocessar
          </Botao>
        </>
      }
    >
      <dl className={a.dl}>
        <dt>Id do evento</dt>
        <dd className={a.mono}>{w.id}</dd>
        <dt>Cobrança</dt>
        <dd className={a.mono}>{w.paymentId ?? '—'}</dd>
        <dt>Pedido</dt>
        <dd>
          {w.pedidoId ? (
            <Link className={a.link} to={caminho(`pagamentos/${w.pedidoId}`)} onClick={aoFechar}>
              Abrir pagamento
            </Link>
          ) : (
            '—'
          )}
        </dd>
        <dt>Recebido</dt>
        <dd>{dataHora(w.recebidoEm)}</dd>
        <dt>Processado</dt>
        <dd>{dataHora(w.processadoEm)}</dd>
        <dt>Tentativas</dt>
        <dd>{w.tentativas}</dd>
        <dt>Resultado</dt>
        <dd>{w.resultado ?? '—'}</dd>
      </dl>
      {w.erro ? <Alerta tom="erro">{w.erro}</Alerta> : null}
      {reprocessar.data ? (
        <Alerta tom={reprocessar.data.ok ? 'sucesso' : 'erro'}>{reprocessar.data.erro ?? reprocessar.data.resultado}</Alerta>
      ) : null}
      {reprocessar.isError ? <Alerta tom="erro">{mensagemDeErro(reprocessar.error)}</Alerta> : null}
      <pre className={s.json}>{JSON.stringify(w.corpo, null, 2)}</pre>
    </Folha>
  );
}

export default function Webhooks() {
  const celular = useCelular();
  const [situacao, setSituacao] = useState<Situacao>('todos');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<WebhookEventoSuper | null>(null);
  const [lote, setLote] = useState(false);
  const q: WebhooksQuery = { pagina, porPagina: 20, situacao, ...(busca.trim() ? { q: busca.trim() } : {}) };
  const consulta = useQuery({ queryKey: ['super', 'webhooks', q], queryFn: () => api('superWebhooksListar', { query: q }), placeholderData: keepPreviousData });

  return (
    <Pagina
      titulo="Webhooks"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Pagamentos', para: caminho('pagamentos') }, { rotulo: 'Webhooks' }]}
      subtitulo="Eventos do Asaas recebidos pelo Fuse Aprova. Reprocessar é idempotente: um evento nunca libera acesso duas vezes."
      acoes={
        <>
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
          <Botao variante="primario" onClick={() => setLote(true)}>
            Reprocessar os com erro
          </Botao>
        </>
      }
    >
      <form role="search" aria-label="Filtrar webhooks" className={a.filtros} onSubmit={(e) => e.preventDefault()}>
        <CampoSelecao
          rotulo="Situação"
          value={situacao}
          opcoes={SITUACOES}
          onChange={(e) => {
            setSituacao(e.target.value as Situacao);
            setPagina(1);
          }}
        />
        <CampoTexto
          rotulo="Buscar"
          type="search"
          placeholder="Id do evento ou da cobrança"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
        />
      </form>
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum evento.">
        {(d) => (
          <>
            {celular ? (
              <Cartoes rotulo="Eventos de webhook">
                {d.itens.map((w) => (
                  <CartaoLinha
                    key={w.id}
                    aoTocar={() => setAberto(w)}
                    titulo={w.evento}
                    sub={`${dataHora(w.recebidoEm)} · ${w.paymentId ?? 'sem cobrança'}`}
                    extra={
                      <div style={{ marginTop: 4 }}>
                        <SeloSituacao w={w} />
                      </div>
                    }
                  />
                ))}
              </Cartoes>
            ) : (
              <Tabela rotulo="Eventos de webhook">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Situação</th>
                    <th>Cobrança</th>
                    <th>Recebido</th>
                    <th>Tentativas</th>
                    <th>Erro</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((w) => (
                    <tr key={w.id}>
                      <td>{w.evento}</td>
                      <td>
                        <SeloSituacao w={w} />
                      </td>
                      <td className={a.mono}>{w.paymentId ?? '—'}</td>
                      <td>{dataHora(w.recebidoEm)}</td>
                      <td>{w.tentativas}</td>
                      <td>{w.erro ?? '—'}</td>
                      <td>
                        <Botao pequeno onClick={() => setAberto(w)}>
                          Detalhes
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={setPagina} />
          </>
        )}
      </Consulta>
      {aberto ? (
        <DetalheEvento
          w={aberto}
          aoFechar={() => {
            setAberto(null);
            void consulta.refetch();
          }}
        />
      ) : null}
      <AcaoConfirmada
        titulo="Reprocessar os eventos com erro?"
        aberta={lote}
        aoFechar={() => setLote(false)}
        rotuloConfirmar="Reprocessar"
        reconfirmar
        executar={(motivo, confirmacao) => api('superWebhooksReprocessarLote', { corpo: { motivo, confirmacao: confirmacao ?? {} } })}
        sucesso={(r) => {
          const x = r as { total: number; ok: number; falhas: number };
          return `${x.total} evento(s) reprocessado(s): ${x.ok} ok, ${x.falhas} com falha.`;
        }}
      >
        <p>Até 200 eventos com erro são reprocessados agora. Cada um é idempotente.</p>
      </AcaoConfirmada>
    </Pagina>
  );
}
