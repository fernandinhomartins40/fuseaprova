/**
 * /super/pagamentos/:id (D13 + RQ4/D24): dados do pedido (concurso, se ele está liberado,
 * cupom e desconto), linha do tempo, webhooks recebidos e as ações. As três do RQ4 valem para
 * ESTE pedido, só para aluno e nunca para a própria conta:
 * - Liberar acesso: pedido pago e o concurso dele não liberado;
 * - Aprovar pagamento manual: pedido pendente ou vencido (recebe em dinheiro ou cancela no Asaas);
 * - Estornar: pedido pago (Asaas = estorno lá, uma vez só; manual = desfaz).
 * Mais: conciliar com o Asaas, reenviar o e-mail e cancelar o Pix pendente.
 * No celular é uma tela empilhada com "voltar"; as ações sensíveis abrem em folha.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatarReais } from '@fuse/shared';
import type { EstornarResposta, LiberarPedidoResposta, PagamentoSuper } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Cartao, Consulta, Marcar, Selo, estilos as a } from '../../admin/componentes/ui';
import { cpfMascarado, dataHora, dia, NOMES_STATUS_PEDIDO, TOM_STATUS_PEDIDO } from '../../admin/util';
import { AcaoConfirmada, AprovarManual } from '../acoes';
import { AcoesFicha, Pagina, estilosSuper as s } from '../componentes';
import { caminho, NOMES_FORMA_PAGAMENTO_MANUAL, NOMES_METODO } from '../util';

type Aberta = null | 'estornar' | 'cancelar' | 'manual' | 'liberar';

/** Valor do pedido, com o cupom e o preço antes dele (D23). */
export function textoValor(p: Pick<PagamentoSuper, 'valorCentavos' | 'cupomCodigo' | 'valorOriginalCentavos'>): string {
  const base = formatarReais(p.valorCentavos);
  if (!p.cupomCodigo) return base;
  const de = p.valorOriginalCentavos !== null ? `, de ${formatarReais(p.valorOriginalCentavos)}` : '';
  return `${base} (cupom ${p.cupomCodigo}${de})`;
}

function Dados({ p }: { p: PagamentoSuper }) {
  return (
    <dl className={a.dl}>
      <dt>Aluno</dt>
      <dd>
        <Link className={a.link} to={caminho(`usuarios/${p.usuario.id}`)}>
          {p.usuario.nome}
        </Link>{' '}
        · {p.usuario.email}
      </dd>
      <dt>CPF</dt>
      <dd className={a.mono}>{cpfMascarado(p.usuario.cpfOculto)}</dd>
      <dt>Concurso</dt>
      <dd>{p.concurso?.nome ?? 'Pedido antigo, sem concurso (vale o acesso geral)'}</dd>
      <dt>Concurso deste pedido</dt>
      <dd>{p.concursoLiberado ? <Selo tom="sucesso">Liberado</Selo> : <Selo tom="aviso">Não liberado</Selo>}</dd>
      <dt>Status</dt>
      <dd>
        <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
      </dd>
      <dt>Método</dt>
      <dd>{NOMES_METODO[p.metodo]}</dd>
      <dt>Valor</dt>
      <dd>{formatarReais(p.valorCentavos)}</dd>
      <dt>Cupom</dt>
      <dd>
        {p.cupomCodigo ? (
          <>
            <span className={a.mono}>{p.cupomCodigo}</span>
            {p.valorOriginalCentavos !== null ? ` · de ${formatarReais(p.valorOriginalCentavos)}` : ''}
            {p.descontoCentavos ? ` · desconto de ${formatarReais(p.descontoCentavos)}` : ''}
          </>
        ) : (
          '—'
        )}
      </dd>
      <dt>Valor líquido</dt>
      <dd>{p.valorLiquidoCentavos === null ? '—' : formatarReais(p.valorLiquidoCentavos)}</dd>
      <dt>Criado em</dt>
      <dd>{dataHora(p.criadoEm)}</dd>
      <dt>Pago em</dt>
      <dd>{dataHora(p.pagoEm)}</dd>
      {p.pixExpiraEm ? (
        <>
          <dt>Pix expira em</dt>
          <dd>{dataHora(p.pixExpiraEm)}</dd>
        </>
      ) : null}
      {p.estornadoEm ? (
        <>
          <dt>Estornado em</dt>
          <dd>{dataHora(p.estornadoEm)}</dd>
        </>
      ) : null}
      {p.reembolsoSolicitadoEm ? (
        <>
          <dt>Reembolso pedido em</dt>
          <dd>{dataHora(p.reembolsoSolicitadoEm)}</dd>
        </>
      ) : null}
      <dt>Id no Asaas</dt>
      <dd className={a.mono}>{p.asaasPaymentId ?? '—'}</dd>
      <dt>Conciliado em</dt>
      <dd>{dataHora(p.conciliadoEm)}</dd>
      {p.manual ? (
        <>
          <dt>Forma (manual)</dt>
          <dd>{NOMES_FORMA_PAGAMENTO_MANUAL[p.manual.forma]}</dd>
          <dt>Recebido em</dt>
          <dd>{dia(p.manual.recebidoEm)}</dd>
          <dt>Observação</dt>
          <dd>{p.manual.observacao}</dd>
          <dt>Referência</dt>
          <dd>{p.manual.referencia ?? '—'}</dd>
          <dt>Comprovante</dt>
          <dd>
            {p.manual.comprovante ? (
              <a className={a.link} href={`/api/super/comprovantes/${p.manual.comprovante}`} target="_blank" rel="noreferrer">
                Abrir comprovante
              </a>
            ) : (
              '—'
            )}
          </dd>
          <dt>Aprovado por</dt>
          <dd>{p.manual.aprovadoPor?.nome ?? '—'}</dd>
        </>
      ) : null}
    </dl>
  );
}

export default function PagamentoDetalhe() {
  const { id = '' } = useParams();
  const [aberta, setAberta] = useState<Aberta>(null);
  const [foraDoPrazo, setForaDoPrazo] = useState(false);
  const consulta = useQuery({ queryKey: ['super', 'pagamento', id], queryFn: () => api('superPagamentoObter', { params: { id } }) });
  // As ações do RQ4 só aparecem quando o dono do pedido é aluno (o papel vem no próprio pedido)
  // e não é a própria conta. A API recusa de qualquer jeito.
  const dono = consulta.data?.pagamento.usuario;
  const me = useQuery({ queryKey: ['super', 'me'], queryFn: () => api('meObter'), staleTime: 60_000 });
  const ehAluno = dono?.papel === 'aluno' && !!me.data && me.data.id !== dono.id;
  const abrir = (qual: Aberta) => {
    // S-25: a marcação "fora do prazo" volta ao padrão a cada abertura.
    setForaDoPrazo(false);
    setAberta(qual);
  };
  const conciliar = useMutation({
    mutationFn: () => api('superPagamentoConciliar', { params: { id }, corpo: {} }),
    onSuccess: () => void consulta.refetch(),
  });
  const reenviar = useMutation({ mutationFn: () => api('superPagamentoReenviarEmail', { params: { id } }) });
  const fechar = () => {
    setAberta(null);
    setForaDoPrazo(false);
    void consulta.refetch();
  };

  return (
    <Pagina
      titulo="Detalhe do pagamento"
      voltar={caminho('pagamentos')}
      trilha={[
        { rotulo: 'Superadmin', para: caminho() },
        { rotulo: 'Pagamentos', para: caminho('pagamentos') },
        { rotulo: 'Detalhe' },
      ]}
    >
      <Consulta consulta={consulta}>
        {({ pagamento: p, linhaDoTempo, webhooks }) => {
          const asaas = p.metodo === 'asaas';
          return (
            <>
              <AcoesFicha
                rotulo="Ações do pagamento"
                itens={[
                  ehAluno && p.status === 'pago' && !p.concursoLiberado && { rotulo: 'Liberar acesso', variante: 'primario', principal: true, aoClicar: () => abrir('liberar') },
                  ehAluno && (p.status === 'pendente' || p.status === 'vencido') && { rotulo: 'Aprovar pagamento manual', variante: 'primario', principal: true, aoClicar: () => abrir('manual') },
                  asaas && !!p.asaasPaymentId && { rotulo: 'Conciliar com o Asaas', principal: true, carregando: conciliar.isPending, aoClicar: () => conciliar.mutate() },
                  p.status === 'pago' && { rotulo: 'Reenviar e-mail', carregando: reenviar.isPending, aoClicar: () => reenviar.mutate() },
                  p.status === 'pendente' && asaas && { rotulo: 'Cancelar Pix', aoClicar: () => abrir('cancelar') },
                  ehAluno && p.status === 'pago' && !p.reembolsoSolicitadoEm && { rotulo: 'Estornar', variante: 'perigo', aoClicar: () => abrir('estornar') },
                ]}
              />
              {p.status === 'pago' && p.reembolsoSolicitadoEm ? (
                <Alerta tom="info">Estorno pedido ao Asaas em {dataHora(p.reembolsoSolicitadoEm)}. O acesso deste concurso cai quando o Asaas confirmar.</Alerta>
              ) : null}
              {conciliar.data ? (
                <Alerta tom={conciliar.data.divergente ? 'aviso' : 'sucesso'}>{conciliar.data.mensagem}</Alerta>
              ) : null}
              {conciliar.isError ? <Alerta tom="erro">{mensagemDeErro(conciliar.error)}</Alerta> : null}
              {reenviar.data ? <Alerta tom="sucesso">E-mail reenviado para {reenviar.data.para}.</Alerta> : null}
              {reenviar.isError ? <Alerta tom="erro">{mensagemDeErro(reenviar.error)}</Alerta> : null}

              <div className={s.par}>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Dados</h2>
                  <Dados p={p} />
                </Cartao>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Linha do tempo</h2>
                  {linhaDoTempo.length ? (
                    <ol className={s.linhaTempo}>
                      {linhaDoTempo.map((ev, i) => (
                        <li key={`${ev.em}-${i}`} className={ev.erro ? s.erroEvento : undefined}>
                          <strong>{ev.titulo}</strong>
                          <div className={a.suave}>{dataHora(ev.em)}</div>
                          {ev.detalhe ? <div>{ev.detalhe}</div> : null}
                          {ev.erro ? <div style={{ color: 'var(--adm-erro)' }}>{ev.erro}</div> : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={a.suave}>Nenhum evento.</p>
                  )}
                </Cartao>
              </div>
              <Cartao>
                <h2 className={a.secaoTitulo}>Webhooks recebidos ({webhooks.length})</h2>
                {webhooks.length ? (
                  <ul className={a.lista}>
                    {webhooks.map((w) => (
                      <li key={w.id}>
                        <details>
                          <summary>
                            <strong>{w.evento}</strong> · {dataHora(w.recebidoEm)} ·{' '}
                            {w.erro ? <Selo tom="erro">Erro</Selo> : w.processadoEm ? <Selo tom="sucesso">Processado</Selo> : <Selo tom="aviso">Pendente</Selo>}
                          </summary>
                          {w.erro ? <Alerta tom="erro">{w.erro}</Alerta> : null}
                          <pre className={s.json}>{JSON.stringify(w.corpo, null, 2)}</pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={a.suave}>Nenhum webhook para este pagamento.</p>
                )}
              </Cartao>

              <AcaoConfirmada
                titulo="Liberar o acesso deste concurso?"
                aberta={aberta === 'liberar'}
                aoFechar={fechar}
                rotuloConfirmar="Liberar acesso"
                reconfirmar
                executar={(motivo, confirmacao) => api('superPagamentoLiberar', { params: { id }, corpo: { motivo, confirmacao: confirmacao ?? {} } })}
                sucesso={(r) => (r as LiberarPedidoResposta).mensagem}
              >
                <p>
                  O pedido está pago, mas {p.concurso ? <strong>{p.concurso.nome}</strong> : 'o concurso dele'} não está liberado para {p.usuario.nome}. Liberar não
                  cria pedido nem receita: só libera o concurso deste pedido.
                </p>
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Estornar o pagamento?"
                aberta={aberta === 'estornar'}
                aoFechar={fechar}
                rotuloConfirmar="Confirmar estorno"
                perigo
                reconfirmar
                podeConfirmar={!asaas || p.dentroDoArrependimento || foraDoPrazo}
                executar={(motivo, confirmacao) =>
                  api('superPagamentoEstornar', { params: { id }, corpo: { motivo, foraDoPrazo: asaas && foraDoPrazo, confirmacao: confirmacao ?? {} } })
                }
                sucesso={(r) => (r as EstornarResposta).mensagem}
              >
                <p>
                  {asaas
                    ? `Estorno total de ${formatarReais(p.valorCentavos)} pelo Asaas, uma vez só. O acesso cai quando o Asaas confirmar o estorno.`
                    : `Desfaz a aprovação manual de ${formatarReais(p.valorCentavos)} e revoga o acesso agora. Devolva o dinheiro pelo mesmo meio em que ele foi recebido.`}
                </p>
                <p>
                  Só {p.concurso ? <strong>{p.concurso.nome}</strong> : 'o concurso deste pedido'} é revogado. Os outros concursos de {p.usuario.nome} continuam.
                </p>
                {asaas ? (
                  p.dentroDoArrependimento ? (
                    <Alerta tom="info">Dentro dos 7 dias de arrependimento.</Alerta>
                  ) : (
                    <Marcar rotulo="Fora dos 7 dias de arrependimento: estornar mesmo assim" checked={foraDoPrazo} onChange={(e) => setForaDoPrazo(e.target.checked)} />
                  )
                ) : null}
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Cancelar a cobrança Pix?"
                aberta={aberta === 'cancelar'}
                aoFechar={fechar}
                rotuloConfirmar="Cancelar Pix"
                perigo
                executar={(motivo) => api('superPagamentoCancelarPix', { params: { id }, corpo: { motivo } })}
                sucesso="Cobrança removida no Asaas."
              >
                <p>O QR code deixa de valer. O aluno pode gerar outro Pix depois.</p>
              </AcaoConfirmada>
              <AprovarManual
                aluno={{ id: p.usuario.id, nome: p.usuario.nome, email: p.usuario.email, pixPendente: asaas && !!p.asaasPaymentId }}
                alvo={{ pedidoId: p.id }}
                valorTexto={textoValor(p)}
                concursoNome={p.concurso?.nome}
                aberta={aberta === 'manual'}
                aoFechar={fechar}
              />
            </>
          );
        }}
      </Consulta>
    </Pagina>
  );
}
