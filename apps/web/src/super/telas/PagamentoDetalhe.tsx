/**
 * /super/pagamentos/:id (D13): dados do pedido, linha do tempo (pedido, webhooks, auditoria),
 * webhooks recebidos e as ações: conciliar, reenviar o e-mail, cancelar o Pix pendente,
 * reembolso (Asaas), aprovação manual e desfazer a aprovação manual.
 * No celular é uma tela empilhada com "voltar"; as ações sensíveis abrem em folha.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatarReais } from '@fuse/shared';
import type { PagamentoSuper } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Cartao, Consulta, Marcar, Selo, estilos as a } from '../../admin/componentes/ui';
import { cpfMascarado, dataHora, dia, NOMES_STATUS_PEDIDO, TOM_STATUS_PEDIDO } from '../../admin/util';
import { AcaoConfirmada, AprovarManual } from '../acoes';
import { AcoesFicha, Pagina, estilosSuper as s } from '../componentes';
import { caminho, NOMES_FORMA_PAGAMENTO_MANUAL, NOMES_METODO } from '../util';

type Aberta = null | 'reembolso' | 'cancelar' | 'manual' | 'desfazer';

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
      <dt>Acesso do aluno</dt>
      <dd>{p.usuario.acesso ? 'Liberado' : 'Sem acesso'}</dd>
      <dt>Status</dt>
      <dd>
        <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
      </dd>
      <dt>Método</dt>
      <dd>{NOMES_METODO[p.metodo]}</dd>
      <dt>Valor</dt>
      <dd>{formatarReais(p.valorCentavos)}</dd>
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
  const conciliar = useMutation({
    mutationFn: () => api('superPagamentoConciliar', { params: { id }, corpo: {} }),
    onSuccess: () => void consulta.refetch(),
  });
  const reenviar = useMutation({ mutationFn: () => api('superPagamentoReenviarEmail', { params: { id } }) });
  const fechar = () => {
    setAberta(null);
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
                  p.status !== 'pago' && !p.usuario.acesso && { rotulo: 'Aprovar pagamento manual', variante: 'primario', principal: true, aoClicar: () => setAberta('manual') },
                  asaas && !!p.asaasPaymentId && { rotulo: 'Conciliar com o Asaas', principal: true, carregando: conciliar.isPending, aoClicar: () => conciliar.mutate() },
                  p.status === 'pago' && { rotulo: 'Reenviar e-mail', carregando: reenviar.isPending, aoClicar: () => reenviar.mutate() },
                  p.status === 'pendente' && asaas && { rotulo: 'Cancelar Pix', aoClicar: () => setAberta('cancelar') },
                  p.status === 'pago' && asaas && !p.reembolsoSolicitadoEm && { rotulo: 'Reembolsar', variante: 'perigo', aoClicar: () => setAberta('reembolso') },
                  p.status === 'pago' && !asaas && { rotulo: 'Desfazer aprovação manual', variante: 'perigo', aoClicar: () => setAberta('desfazer') },
                ]}
              />
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
                titulo="Reembolsar pagamento?"
                aberta={aberta === 'reembolso'}
                aoFechar={fechar}
                rotuloConfirmar="Confirmar reembolso"
                perigo
                reconfirmar
                podeConfirmar={p.dentroDoArrependimento || foraDoPrazo}
                executar={(motivo, confirmacao) =>
                  api('superPagamentoReembolso', { params: { id }, corpo: { motivo, foraDoPrazo, confirmacao: confirmacao ?? {} } })
                }
                sucesso="Estorno pedido ao Asaas. O acesso cai quando o webhook de estorno chegar."
              >
                <p>
                  Estorno total de {formatarReais(p.valorCentavos)} para {p.usuario.nome}.
                </p>
                {p.dentroDoArrependimento ? (
                  <Alerta tom="info">Dentro dos 7 dias de arrependimento.</Alerta>
                ) : (
                  <Marcar rotulo="Fora dos 7 dias de arrependimento: reembolsar mesmo assim" checked={foraDoPrazo} onChange={(e) => setForaDoPrazo(e.target.checked)} />
                )}
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
              <AcaoConfirmada
                titulo="Desfazer a aprovação manual?"
                aberta={aberta === 'desfazer'}
                aoFechar={fechar}
                rotuloConfirmar="Desfazer e revogar acesso"
                perigo
                reconfirmar
                executar={(motivo, confirmacao) =>
                  api('superPagamentoDesfazerManual', { params: { id }, corpo: { motivo, confirmacao: confirmacao ?? {} } })
                }
                sucesso="Aprovação desfeita e acesso revogado."
              >
                <p>O pedido vira estornado e o acesso de {p.usuario.nome} é revogado.</p>
              </AcaoConfirmada>
              <AprovarManual
                aluno={{ id: p.usuario.id, nome: p.usuario.nome, email: p.usuario.email, pixPendente: p.status === 'pendente' && asaas }}
                alvo={{ pedidoId: p.id }}
                precoCentavos={p.valorCentavos}
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
