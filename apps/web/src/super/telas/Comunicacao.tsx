/**
 * /super/comunicacao (D13): e-mail ou push em massa para um segmento (fila do worker, com
 * prévia e limites), o histórico com cancelamento, e a recuperação do que se perdeu:
 * reenvio do e-mail de confirmação de um pagamento e reprocessamento dos webhooks com erro.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CANAIS_COMUNICACAO, SEGMENTOS_COMUNICACAO, type CanalComunicacao, type SegmentoComunicacao } from '@fuse/shared';
import { LIMITE_COMUNICACAO, type ComunicacaoSuper } from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoArea, CampoSelecao, CampoTexto, Consulta, Paginacao, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora, numero } from '../../admin/util';
import { AcaoConfirmada } from '../acoes';
import { CartaoLinha, Cartoes, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { caminho, NOMES_SEGMENTO_COMUNICACAO } from '../util';

const NOMES_CANAL: Record<CanalComunicacao, string> = { email: 'E-mail', push: 'Push' };
const NOMES_STATUS: Record<ComunicacaoSuper['status'], string> = {
  na_fila: 'Na fila',
  enviando: 'Enviando',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};
interface Rascunho {
  canal: CanalComunicacao;
  segmento: SegmentoComunicacao;
  diasInativo?: number | undefined;
  assunto: string;
  mensagem: string;
}

const TOM_STATUS = { na_fila: 'aviso', enviando: 'info', concluida: 'sucesso', cancelada: 'neutro' } as const;

function Nova({ aoCriar }: { aoCriar: () => void }) {
  const [c, setC] = useState<Rascunho>({ canal: 'email', segmento: 'pagos', assunto: '', mensagem: '' });
  const [link, setLink] = useState('');
  const [enviar, setEnviar] = useState(false);
  const corpo = {
    canal: c.canal,
    segmento: c.segmento,
    assunto: c.assunto,
    mensagem: c.mensagem,
    ...(c.segmento === 'inativos' && c.diasInativo ? { diasInativo: c.diasInativo } : {}),
    ...(link.trim() ? { link: link.trim() } : {}),
  };
  const previa = useMutation({ mutationFn: () => api('superComunicacaoPrevia', { corpo }) });
  const campos = camposDoErro(previa.error);
  const mudar = (p: Partial<Rascunho>) => {
    setC((x) => ({ ...x, ...p }));
    previa.reset();
  };
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Nova comunicação</h2>
      <form
        className={a.formulario}
        aria-label="Nova comunicação"
        onSubmit={(e) => {
          e.preventDefault();
          previa.mutate();
        }}
      >
        <CampoSelecao
          rotulo="Canal"
          value={c.canal}
          opcoes={CANAIS_COMUNICACAO.map((v) => ({ valor: v, rotulo: NOMES_CANAL[v] }))}
          onChange={(e) => mudar({ canal: e.target.value as CanalComunicacao })}
        />
        <CampoSelecao
          rotulo="Para quem"
          value={c.segmento}
          opcoes={SEGMENTOS_COMUNICACAO.map((v) => ({ valor: v, rotulo: NOMES_SEGMENTO_COMUNICACAO[v] }))}
          onChange={(e) => mudar({ segmento: e.target.value as SegmentoComunicacao })}
        />
        {c.segmento === 'inativos' ? (
          <CampoTexto
            rotulo="Inativos há quantos dias"
            type="number"
            min={1}
            max={365}
            value={c.diasInativo ?? ''}
            onChange={(e) => mudar({ diasInativo: e.target.value ? Number(e.target.value) : undefined })}
            erro={campos.diasInativo}
          />
        ) : null}
        <CampoTexto rotulo={c.canal === 'push' ? 'Título do push' : 'Assunto'} maxLength={120} value={c.assunto} onChange={(e) => mudar({ assunto: e.target.value })} erro={campos.assunto} />
        <CampoArea rotulo="Mensagem" rows={6} maxLength={4000} value={c.mensagem} onChange={(e) => mudar({ mensagem: e.target.value })} erro={campos.mensagem} />
        <CampoTexto rotulo="Link do botão (opcional)" placeholder="/aprender" value={link} onChange={(e) => setLink(e.target.value)} erro={campos.link} />
        <p className={a.suave}>
          Só recebe quem aceitou comunicações. No máximo {LIMITE_COMUNICACAO.porDia} comunicações por dia, uma por aluno a cada 24 h,{' '}
          {LIMITE_COMUNICACAO.emailPorMinuto} e-mails e {LIMITE_COMUNICACAO.pushPorMinuto} pushes por minuto.
        </p>
        <div className={a.acoes}>
          <Botao type="submit" carregando={previa.isPending}>
            Ver prévia
          </Botao>
          <Botao variante="primario" disabled={!previa.data} onClick={() => setEnviar(true)}>
            Enviar
          </Botao>
        </div>
        {previa.isError && !Object.keys(campos).length ? <Alerta tom="erro">{mensagemDeErro(previa.error)}</Alerta> : null}
      </form>
      {previa.data ? (
        <div style={{ marginTop: 14 }}>
          <Alerta tom="info">
            {numero(previa.data.destinatarios)} destinatário(s) · {numero(previa.data.semOptIn)} sem opt-in (não recebem) · cerca de{' '}
            {previa.data.minutosEstimados} min para enviar.
          </Alerta>
          {previa.data.amostra.length ? <p className={a.suave}>Exemplos: {previa.data.amostra.join(', ')}</p> : null}
          {previa.data.html ? (
            <iframe title="Prévia do e-mail" className={s.previa} sandbox="" srcDoc={previa.data.html} />
          ) : (
            <pre className={s.json}>{previa.data.texto}</pre>
          )}
        </div>
      ) : null}
      <AcaoConfirmada
        titulo="Enviar a comunicação?"
        aberta={enviar}
        aoFechar={() => {
          setEnviar(false);
          aoCriar();
        }}
        rotuloConfirmar="Colocar na fila"
        rotuloMotivo="Motivo (opcional, fica na auditoria)"
        pedirMotivo={false}
        executar={() => api('superComunicacaoCriar', { corpo })}
        sucesso="Comunicação na fila. O worker envia aos poucos, respeitando os limites."
      >
        <p>
          {NOMES_CANAL[c.canal]} para {numero(previa.data?.destinatarios ?? 0)} aluno(s): “{c.assunto}”.
        </p>
      </AcaoConfirmada>
    </Cartao>
  );
}

function Historico({ versao }: { versao: number }) {
  const celular = useCelular();
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ['super', 'comunicacoes', pagina, versao],
    queryFn: () => api('superComunicacoesListar', { query: { pagina, porPagina: 10 } }),
    placeholderData: keepPreviousData,
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => api('superComunicacaoCancelar', { params: { id } }),
    onSuccess: () => void consulta.refetch(),
  });
  const podeCancelar = (c: ComunicacaoSuper) => c.status === 'na_fila' || c.status === 'enviando';
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Histórico</h2>
      {cancelar.isError ? <Alerta tom="erro">{mensagemDeErro(cancelar.error)}</Alerta> : null}
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhuma comunicação enviada.">
        {(d) => (
          <>
            {celular ? (
              <Cartoes rotulo="Comunicações">
                {d.itens.map((c) => (
                  <CartaoLinha
                    key={c.id}
                    titulo={c.assunto}
                    sub={`${NOMES_CANAL[c.canal]} · ${dataHora(c.criadoEm)} · ${c.enviados}/${c.total}`}
                    extra={
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Selo tom={TOM_STATUS[c.status]}>{NOMES_STATUS[c.status]}</Selo>
                        {podeCancelar(c) ? (
                          <Botao pequeno onClick={() => cancelar.mutate(c.id)}>
                            Cancelar
                          </Botao>
                        ) : null}
                      </div>
                    }
                  />
                ))}
              </Cartoes>
            ) : (
              <Tabela rotulo="Comunicações">
                <thead>
                  <tr>
                    <th>Assunto</th>
                    <th>Canal</th>
                    <th>Segmento</th>
                    <th>Status</th>
                    <th className={a.direita}>Enviados</th>
                    <th className={a.direita}>Falhas</th>
                    <th>Criada</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((c) => (
                    <tr key={c.id}>
                      <td>{c.assunto}</td>
                      <td>{NOMES_CANAL[c.canal]}</td>
                      <td>{NOMES_SEGMENTO_COMUNICACAO[c.segmento]}</td>
                      <td>
                        <Selo tom={TOM_STATUS[c.status]}>{NOMES_STATUS[c.status]}</Selo>
                      </td>
                      <td className={a.direita}>
                        {numero(c.enviados)}/{numero(c.total)}
                      </td>
                      <td className={a.direita}>{numero(c.falhas)}</td>
                      <td>
                        {dataHora(c.criadoEm)}
                        <div className={a.suave}>{c.criadoPor?.nome ?? ''}</div>
                      </td>
                      <td>
                        {podeCancelar(c) ? (
                          <Botao pequeno onClick={() => cancelar.mutate(c.id)} carregando={cancelar.isPending && cancelar.variables === c.id}>
                            Cancelar
                          </Botao>
                        ) : null}
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
    </Cartao>
  );
}

function ReenviarEmail() {
  const [q, setQ] = useState('');
  const termo = q.trim();
  const busca = useQuery({
    queryKey: ['super', 'pagamentos', 'reenvio', termo],
    queryFn: () => api('superPagamentosListar', { query: { q: termo, status: 'pago', pagina: 1, porPagina: 5 } }),
    enabled: termo.length >= 3,
  });
  const reenviar = useMutation({ mutationFn: (id: string) => api('superPagamentoReenviarEmail', { params: { id } }) });
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Reenviar e-mail de confirmação</h2>
      <CampoTexto rotulo="Aluno" type="search" placeholder="Nome, e-mail ou CPF (3 letras ou mais)" value={q} onChange={(e) => setQ(e.target.value)} />
      {reenviar.data ? <Alerta tom="sucesso">E-mail reenviado para {reenviar.data.para}.</Alerta> : null}
      {reenviar.isError ? <Alerta tom="erro">{mensagemDeErro(reenviar.error)}</Alerta> : null}
      {termo.length >= 3 ? (
        <Consulta consulta={busca} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum pagamento aprovado encontrado.">
          {(d) => (
            <ul className={a.lista}>
              {d.itens.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span>
                    {p.usuario.nome}
                    <br />
                    <span className={a.suave}>
                      {p.usuario.email} · pago {dataHora(p.pagoEm)}
                    </span>
                  </span>
                  <Botao pequeno onClick={() => reenviar.mutate(p.id)} carregando={reenviar.isPending && reenviar.variables === p.id}>
                    Reenviar
                  </Botao>
                </li>
              ))}
            </ul>
          )}
        </Consulta>
      ) : null}
    </Cartao>
  );
}

function WebhooksPerdidos() {
  const erros = useQuery({ queryKey: ['super', 'webhooks', 'erros'], queryFn: () => api('superWebhooksListar', { query: { situacao: 'erro', pagina: 1, porPagina: 1 } }) });
  const [lote, setLote] = useState(false);
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Webhooks perdidos</h2>
      <p>
        {erros.data ? `${numero(erros.data.total)} evento(s) do Asaas com erro.` : erros.isError ? mensagemDeErro(erros.error) : 'Carregando…'}{' '}
        <Link className={a.link} to={caminho('webhooks')}>
          Ver todos
        </Link>
      </p>
      <Botao variante="primario" disabled={!erros.data?.total} onClick={() => setLote(true)}>
        Reprocessar os com erro
      </Botao>
      <AcaoConfirmada
        titulo="Reprocessar os eventos com erro?"
        aberta={lote}
        aoFechar={() => {
          setLote(false);
          void erros.refetch();
        }}
        rotuloConfirmar="Reprocessar"
        reconfirmar
        executar={(motivo, confirmacao) => api('superWebhooksReprocessarLote', { corpo: { motivo, confirmacao: confirmacao ?? {} } })}
        sucesso={(r) => {
          const x = r as { total: number; ok: number; falhas: number };
          return `${x.total} evento(s) reprocessado(s): ${x.ok} ok, ${x.falhas} com falha.`;
        }}
      />
    </Cartao>
  );
}

export default function Comunicacao() {
  const [versao, setVersao] = useState(0);
  return (
    <Pagina titulo="Comunicação" trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Comunicação' }]}>
      <div className={s.par}>
        <ReenviarEmail />
        <WebhooksPerdidos />
      </div>
      <Nova aoCriar={() => setVersao((v) => v + 1)} />
      <Historico versao={versao} />
    </Pagina>
  );
}
