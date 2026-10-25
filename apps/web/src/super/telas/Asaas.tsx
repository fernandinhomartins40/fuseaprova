/**
 * /super/asaas (D13 + D14): integração com o Asaas. A conta é compartilhada com outros apps,
 * então o extrato, as estatísticas e a conciliação mostram só as cobranças do Fuse Aprova
 * (referência `fuseaprova:usuario:<id>`); o saldo é o da conta inteira (com aviso).
 * A chave da API nunca aparece: ela fica só no .env da VPS.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatarReais } from '@fuse/shared';
import type { ExtratoQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoTexto, Consulta, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora, dia, numero } from '../../admin/util';
import { AcaoConfirmada } from '../acoes';
import { BotaoAtualizar, CartaoLinha, Cartoes, Kpi, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { caminho, periodoPadrao } from '../util';

const NOMES_AMBIENTE = { sandbox: 'Sandbox', producao: 'Produção', outro: 'Outro' } as const;
const POR_PAGINA = 20;

function Status() {
  const status = useQuery({ queryKey: ['super', 'asaas', 'status'], queryFn: () => api('superAsaasStatus') });
  const saldo = useQuery({ queryKey: ['super', 'asaas', 'saldo'], queryFn: () => api('superAsaasSaldo'), retry: false });
  const testar = useMutation({ mutationFn: () => api('superAsaasTestar') });
  return (
    <Consulta consulta={status}>
      {(st) => (
        <>
          <section className={s.kpis} aria-label="Conta Asaas">
            <Kpi rotulo="Ambiente" valor={NOMES_AMBIENTE[st.ambiente]} detalhe={st.baseUrl} />
            <Kpi
              testId="kpi-saldo"
              rotulo="Saldo da conta"
              valor={saldo.data ? formatarReais(saldo.data.saldoCentavos) : saldo.isError ? '—' : '…'}
              detalhe={saldo.data ? `consultado ${dataHora(saldo.data.consultadoEm)}` : saldo.isError ? mensagemDeErro(saldo.error) : undefined}
            />
            <Kpi rotulo="Chave da API" valor={st.chaveConfigurada ? 'Configurada' : 'Ausente'} detalhe="fica só no .env da VPS" />
            <Kpi rotulo="Token do webhook" valor={st.tokenWebhookConfigurado ? 'Configurado' : 'Ausente'} />
          </section>
          {saldo.data ? <Alerta tom="info">{saldo.data.aviso}</Alerta> : null}
          {st.erro ? <Alerta tom="erro">{st.erro}</Alerta> : null}
          <div className={s.par}>
            <Cartao>
              <h2 className={a.secaoTitulo}>Conta</h2>
              {st.conta ? (
                <dl className={a.dl}>
                  <dt>Nome</dt>
                  <dd>{st.conta.nome ?? '—'}</dd>
                  <dt>E-mail</dt>
                  <dd>{st.conta.email ?? '—'}</dd>
                  <dt>CPF/CNPJ</dt>
                  <dd className={a.mono}>{st.conta.cpfCnpjOculto ?? '—'}</dd>
                  <dt>Situação</dt>
                  <dd>{st.conta.status ?? '—'}</dd>
                  <dt>Cidade</dt>
                  <dd>{st.conta.cidade ?? '—'}</dd>
                </dl>
              ) : (
                <p className={a.suave}>Sem dados da conta.</p>
              )}
              <div className={a.acoes} style={{ marginTop: 10 }}>
                <Botao carregando={testar.isPending} onClick={() => testar.mutate()}>
                  Testar conexão
                </Botao>
              </div>
              {testar.data ? (
                <Alerta tom={testar.data.ok ? 'sucesso' : 'erro'}>
                  {testar.data.mensagem} ({testar.data.ms} ms)
                </Alerta>
              ) : null}
              {testar.isError ? <Alerta tom="erro">{mensagemDeErro(testar.error)}</Alerta> : null}
            </Cartao>
            <Cartao>
              <h2 className={a.secaoTitulo}>Trocar a chave</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{st.comoTrocarChave}</p>
            </Cartao>
          </div>
        </>
      )}
    </Consulta>
  );
}

function Webhook() {
  const consulta = useQuery({ queryKey: ['super', 'asaas', 'webhook'], queryFn: () => api('superAsaasWebhook'), retry: false });
  const [aberta, setAberta] = useState<null | 'salvar' | 'reativar'>(null);
  const [email, setEmail] = useState('');
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Webhook no Asaas</h2>
      <Consulta consulta={consulta}>
        {(w) => (
          <>
            <dl className={a.dl}>
              <dt>URL esperada</dt>
              <dd className={a.mono}>{w.urlEsperada}</dd>
              <dt>Situação</dt>
              <dd>
                {w.doApp ? (
                  w.doApp.filaInterrompida ? (
                    <Selo tom="erro">Fila interrompida</Selo>
                  ) : w.doApp.ativo ? (
                    <Selo tom="sucesso">Ativo</Selo>
                  ) : (
                    <Selo tom="aviso">Inativo</Selo>
                  )
                ) : (
                  <Selo tom="erro">Não cadastrado</Selo>
                )}
              </dd>
              {w.doApp ? (
                <>
                  <dt>Eventos</dt>
                  <dd>{w.doApp.eventos.length ? w.doApp.eventos.join(', ') : '—'}</dd>
                  <dt>Penalizadas</dt>
                  <dd>{numero(w.doApp.penalizadas)}</dd>
                </>
              ) : null}
              <dt>Outros webhooks da conta</dt>
              <dd>{w.todos.filter((x) => !x.ehDoApp).length} (de outras aplicações, não mexemos)</dd>
            </dl>
            {!w.tokenLocalConfigurado ? <Alerta tom="aviso">ASAAS_WEBHOOK_TOKEN não está no .env: o webhook não pode ser salvo.</Alerta> : null}
            <div className={a.acoes} style={{ marginTop: 10 }}>
              <Botao
                onClick={() => {
                  setEmail(w.doApp?.email ?? '');
                  setAberta('salvar');
                }}
                disabled={!w.tokenLocalConfigurado}
              >
                {w.doApp ? 'Atualizar webhook' : 'Cadastrar webhook'}
              </Botao>
              {w.doApp?.filaInterrompida ? (
                <Botao variante="primario" onClick={() => setAberta('reativar')}>
                  Reativar a fila
                </Botao>
              ) : null}
            </div>
            <AcaoConfirmada
              titulo={w.doApp ? 'Atualizar o webhook no Asaas' : 'Cadastrar o webhook no Asaas'}
              aberta={aberta === 'salvar'}
              aoFechar={() => setAberta(null)}
              rotuloConfirmar="Salvar no Asaas"
              reconfirmar
              podeConfirmar={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              executar={(motivo, confirmacao) => api('superAsaasWebhookSalvar', { corpo: { email, motivo, confirmacao: confirmacao ?? {} } })}
              sucesso="Webhook salvo no Asaas com os eventos recomendados e o token do .env."
            >
              <p>
                URL: <code>{w.urlEsperada}</code>
                <br />
                Eventos: {w.eventosRecomendados.join(', ')}
              </p>
              <CampoTexto rotulo="E-mail para avisos de falha" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </AcaoConfirmada>
            <AcaoConfirmada
              titulo="Reativar a fila do webhook?"
              aberta={aberta === 'reativar'}
              aoFechar={() => setAberta(null)}
              rotuloConfirmar="Reativar"
              reconfirmar
              executar={(motivo, confirmacao) => api('superAsaasWebhookReativar', { corpo: { motivo, confirmacao: confirmacao ?? {} } })}
              sucesso="Fila reativada. O Asaas volta a mandar os eventos pendentes."
            />
          </>
        )}
      </Consulta>
    </Cartao>
  );
}

function Extrato() {
  const celular = useCelular();
  const [p, setP] = useState(() => periodoPadrao(30));
  const [offset, setOffset] = useState(0);
  const q: ExtratoQuery = { ...p, offset, limit: POR_PAGINA };
  const extrato = useQuery({ queryKey: ['super', 'asaas', 'extrato', q], queryFn: () => api('superAsaasExtrato', { query: q }), placeholderData: keepPreviousData, retry: false });
  const estat = useQuery({ queryKey: ['super', 'asaas', 'estatisticas', p], queryFn: () => api('superAsaasEstatisticas', { query: p }), placeholderData: keepPreviousData });
  const [conciliar, setConciliar] = useState(false);
  const mudar = (x: Partial<typeof p>) => {
    setP((v) => ({ ...v, ...x }));
    setOffset(0);
  };
  return (
    <>
      <form className={a.filtros} aria-label="Período do extrato" onSubmit={(e) => e.preventDefault()}>
        <CampoTexto rotulo="De" type="date" value={p.de} onChange={(e) => e.target.value && mudar({ de: e.target.value })} />
        <CampoTexto rotulo="Até" type="date" value={p.ate} onChange={(e) => e.target.value && mudar({ ate: e.target.value })} />
      </form>
      <Cartao>
        <h2 className={a.secaoTitulo}>Cobranças do Fuse Aprova no período</h2>
        <Consulta consulta={estat} vazio={(d) => d.porStatus.length === 0} textoVazio="Nenhuma cobrança no período.">
          {(d) => (
            <div className={s.kpis} style={{ marginBottom: 0 }}>
              {d.porStatus.map((x) => (
                <Kpi key={x.status} rotulo={x.status} valor={numero(x.quantidade)} detalhe={`${formatarReais(x.valorCentavos)} · líquido ${formatarReais(x.liquidoCentavos)}`} />
              ))}
            </div>
          )}
        </Consulta>
        <div className={a.acoes} style={{ marginTop: 10 }}>
          <Botao onClick={() => setConciliar(true)}>Conciliar o período</Botao>
        </div>
      </Cartao>
      <AcaoConfirmada
        titulo="Conciliar as cobranças do período"
        aberta={conciliar}
        aoFechar={() => setConciliar(false)}
        rotuloConfirmar="Conciliar e corrigir"
        rotuloMotivo="Motivo (opcional, fica na auditoria)"
        pedirMotivo={false}
        executar={() => api('superConciliarLote', { corpo: { de: p.de, ate: p.ate, corrigir: true } })}
        sucesso={(r) => {
          const x = r as { verificados: number; divergentes: number; corrigidos: number; erros: number };
          return `${x.verificados} verificado(s), ${x.divergentes} divergente(s), ${x.corrigidos} corrigido(s), ${x.erros} erro(s).`;
        }}
      >
        <p>
          De {dia(p.de)} a {dia(p.ate)}. Só as cobranças do Fuse Aprova; os pagamentos manuais ficam de fora.
        </p>
      </AcaoConfirmada>
      <Cartao>
        <h2 className={a.secaoTitulo}>Extrato (só lançamentos do Fuse Aprova)</h2>
        <Consulta consulta={extrato} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum lançamento do Fuse Aprova no período.">
          {(d) => (
            <>
              <p className={a.suave}>
                {d.total} lançamento(s) nossos entre {d.examinados} lidos na conta.
              </p>
              {d.incompleto ? <Alerta tom="aviso">A leitura parou no limite: reduza o período para ver tudo.</Alerta> : null}
              {celular ? (
                <Cartoes rotulo="Extrato">
                  {d.itens.map((i) => (
                    <CartaoLinha key={i.id} titulo={i.descricao ?? i.tipo} sub={`${dia(i.data)} · ${i.tipo}`} valor={formatarReais(i.valorCentavos)} />
                  ))}
                </Cartoes>
              ) : (
                <Tabela rotulo="Extrato">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Descrição</th>
                      <th className={a.direita}>Valor</th>
                      <th>Cobrança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.itens.map((i) => (
                      <tr key={i.id}>
                        <td>{dia(i.data)}</td>
                        <td>{i.tipo}</td>
                        <td>{i.descricao ?? '—'}</td>
                        <td className={a.direita}>{formatarReais(i.valorCentavos)}</td>
                        <td className={a.mono}>{i.paymentId ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              )}
              <nav className={a.paginacao} aria-label="Paginação do extrato">
                <span>
                  {d.offset + 1}–{d.offset + d.itens.length} de {d.total}
                </span>
                <span className={a.acoes}>
                  <Botao pequeno disabled={d.offset === 0} onClick={() => setOffset(Math.max(0, d.offset - POR_PAGINA))}>
                    Anterior
                  </Botao>
                  <Botao pequeno disabled={!d.temMais} onClick={() => setOffset(d.offset + POR_PAGINA)}>
                    Próxima
                  </Botao>
                </span>
              </nav>
            </>
          )}
        </Consulta>
      </Cartao>
    </>
  );
}

export default function Asaas() {
  const [aba, setAba] = useState<'conta' | 'extrato' | 'webhook'>('conta');
  const qc = useQueryClient();
  return (
    <Pagina
      titulo="Conta Asaas"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Conta Asaas' }]}
      acoes={<BotaoAtualizar aoClicar={() => void qc.invalidateQueries({ queryKey: ['super', 'asaas'] })} />}
    >
      <div className={s.abas} role="tablist" aria-label="Seções da conta Asaas">
        {(
          [
            ['conta', 'Conta e saldo'],
            ['extrato', 'Extrato e conciliação'],
            ['webhook', 'Webhook'],
          ] as const
        ).map(([v, r]) => (
          <button key={v} type="button" role="tab" aria-selected={aba === v} className={aba === v ? `${s.aba} ${s.abaAtiva}` : s.aba} onClick={() => setAba(v)}>
            {r}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {aba === 'conta' ? <Status /> : aba === 'extrato' ? <Extrato /> : <Webhook />}
      </div>
    </Pagina>
  );
}
