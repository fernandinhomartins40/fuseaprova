/**
 * /super/sistema (D13): saúde da API, do banco, do worker (jobs), do backup e das integrações;
 * configurações do produto (suporte, manutenção, aviso, aviso do edital) e os códigos de
 * recuperação do 2FA da própria conta.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarReais } from '@fuse/shared';
import type { ConfiguracoesProduto, EstadoIndicador, ExecucaoJob, SistemaResposta } from '@fuse/shared/api';
import { api, camposDoErro, ErroAdminApi, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoArea, CampoSelecao, CampoTexto, Consulta, Marcar, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora, numero } from '../../admin/util';
import { AcaoConfirmada, textoDoErro } from '../acoes';
import { BotaoAtualizar, CartaoLinha, Cartoes, Kpi, Pagina, estilosSuper as s, useCelular, useReconfirmacao } from '../componentes';
import { useSegundoPlano } from '../segundoPlano';
import { caminho, nomeJob, porcentagem } from '../util';

const CHAVE_SISTEMA = ['super', 'sistema'] as const;

function duracao(segundos: number): string {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

function bytes(n: number | null): string {
  if (n === null) return '—';
  return n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`;
}

const ROTULO_ESTADO: Record<EstadoIndicador, string> = {
  ok: 'OK',
  atencao: 'Atenção',
  falhou: 'Falhou',
  nao_testado: 'Não testado',
  nao_configurado: 'Não configurado',
};
const TOM_ESTADO: Record<EstadoIndicador, 'sucesso' | 'aviso' | 'erro' | 'neutro'> = {
  ok: 'sucesso',
  atencao: 'aviso',
  falhou: 'erro',
  nao_testado: 'neutro',
  nao_configurado: 'neutro',
};
const ROTULO_JOB: Record<ExecucaoJob['estado'], string> = { ok: 'OK', atrasado: 'Atrasado', falhou: 'Falhou', nunca_rodou: 'Nunca rodou' };
const TOM_JOB: Record<ExecucaoJob['estado'], 'sucesso' | 'aviso' | 'erro' | 'neutro'> = { ok: 'sucesso', atrasado: 'aviso', falhou: 'erro', nunca_rodou: 'neutro' };

/** O estado vem sempre da API: "OK" só aparece quando ela diz `ok`. */
function Estado({ e }: { e: EstadoIndicador }) {
  return <Selo tom={TOM_ESTADO[e]}>{ROTULO_ESTADO[e]}</Selo>;
}

function testado(em: string | null | undefined): string {
  return em ? `testado ${dataHora(em)}` : 'ainda não testado';
}

function Resumo({ r }: { r: SistemaResposta['resumo'] }) {
  if (r.estado === 'ok' && !r.problemas.length) return <Alerta tom="sucesso">Tudo certo: nenhum problema encontrado.</Alerta>;
  return (
    <Alerta tom={r.estado === 'falhou' ? 'erro' : 'aviso'}>
      <strong>{r.estado === 'falhou' ? 'Há falhas no sistema' : 'Atenção'}</strong>
      {r.problemas.length ? (
        <ul className={a.lista} aria-label="Problemas">
          {r.problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </Alerta>
  );
}

function SituacaoJob({ j }: { j: ExecucaoJob }) {
  return (
    <>
      <Selo tom={TOM_JOB[j.estado]}>{ROTULO_JOB[j.estado]}</Selo>
      {j.ultima && j.ultima.ok === null ? <div className={a.suave}>Rodando agora</div> : null}
      {j.ultima?.erro ? <div style={{ color: 'var(--adm-erro)' }}>{j.ultima.erro}</div> : null}
    </>
  );
}

const nomeDoJob = (j: ExecucaoJob) => j.nome || nomeJob(j.job);

/** 503 `banco_indisponivel`: a tela diz qual peça caiu, em vez do erro genérico. */
function BancoFora({ erro, tentar }: { erro: unknown; tentar: () => void }) {
  return (
    <>
      <Alerta tom="erro">
        <strong>Há falhas no sistema</strong>
        <div>{mensagemDeErro(erro)}</div>
      </Alerta>
      <section className={s.kpis} aria-label="Saúde do sistema">
        <Kpi rotulo="Banco" valor={<Estado e="falhou" />} detalhe="O banco de dados não está respondendo." testId="kpi-banco" />
      </section>
      <div className={a.acoes}>
        <Botao onClick={tentar}>Tentar de novo</Botao>
      </div>
    </>
  );
}

function Saude({ origem }: { origem: ReturnType<typeof useSegundoPlano> }) {
  const celular = useCelular();
  const consulta = useQuery({
    queryKey: CHAVE_SISTEMA,
    queryFn: () => api('superSistema', { segundoPlano: origem.automatica() }),
    refetchInterval: 60_000,
  });
  const erro = consulta.error;
  if (erro instanceof ErroAdminApi && erro.codigo === 'banco_indisponivel') {
    return <BancoFora erro={erro} tentar={() => void origem.atualizar()} />;
  }
  return (
    <Consulta consulta={consulta}>
      {(d) => (
        <>
          {consulta.isError ? (
            <Alerta tom="aviso">
              Não foi possível atualizar agora ({mensagemDeErro(consulta.error)}). Os dados abaixo são de {dataHora(d.geradoEm)}.
            </Alerta>
          ) : null}
          <Resumo r={d.resumo} />
          <section className={s.kpis} aria-label="Saúde do sistema">
            <Kpi rotulo="API" valor={d.api.versao} detalhe={`${d.api.ambiente} · no ar há ${duracao(d.api.uptimeS)} · ${d.api.memoriaMb} MB`} />
            <Kpi
              rotulo="Banco"
              testId="kpi-banco"
              valor={<Estado e={d.banco.ok ? 'ok' : 'falhou'} />}
              detalhe={
                d.banco.ok
                  ? `${bytes(d.banco.tamanhoBytes)} · ${numero(d.banco.conexoes)}/${numero(d.banco.maxConexoes)} conexões`
                  : (d.banco.erro ?? 'O banco não respondeu.')
              }
            />
            <Kpi
              rotulo="Worker"
              testId="kpi-worker"
              valor={
                d.worker.parado ? <Selo tom="erro">Parado</Selo> : d.worker.ultimoSinalEm ? <Selo tom="sucesso">Ativo</Selo> : <Selo tom="neutro">Sem sinal</Selo>
              }
              detalhe={`último sinal ${dataHora(d.worker.ultimoSinalEm)}${d.worker.versao ? ` · versão ${d.worker.versao}` : ''}`}
            />
            <Kpi
              rotulo="Backup"
              testId="kpi-backup"
              valor={<Estado e={d.backup.estado} />}
              detalhe={
                d.backup.idadeHoras !== null
                  ? `há ${d.backup.idadeHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h${d.backup.atrasado ? ' · atrasado' : ''} · ${dataHora(d.backup.ultimoEm)}`
                  : (d.backup.aviso ?? 'Nenhum backup registrado.')
              }
            />
            <Kpi rotulo="E-mail (SMTP)" testId="kpi-smtp" valor={<Estado e={d.smtp.estado} />} detalhe={`${d.smtp.mensagem} · ${testado(d.smtp.testadoEm)}`} />
            <Kpi
              rotulo={`Asaas (${d.asaas.ambiente})`}
              testId="kpi-asaas"
              valor={<Estado e={d.asaas.estado} />}
              detalhe={`${d.asaas.mensagem} · ${testado(d.asaas.testadoEm)}`}
            />
            <Kpi rotulo="Push" testId="kpi-push" valor={<Estado e={d.push.estado} />} detalhe={d.push.mensagem} />
            <Kpi
              rotulo="Disco"
              testId="kpi-disco"
              valor={d.disco ? <Estado e={d.disco.estado} /> : <Selo tom="neutro">Sem medida</Selo>}
              detalhe={
                d.disco
                  ? `${bytes(d.disco.livreBytes)} livres de ${bytes(d.disco.totalBytes)} (${porcentagem(d.disco.percentualLivre)})`
                  : 'Não foi possível medir o espaço livre.'
              }
            />
          </section>
          {d.backup.aviso && d.backup.idadeHoras !== null ? <Alerta tom="aviso">{d.backup.aviso}</Alerta> : null}
          <Cartao>
            <h2 className={a.secaoTitulo}>Jobs do worker</h2>
            {celular ? (
              <Cartoes rotulo="Jobs do worker">
                {d.worker.jobs.map((j) => (
                  <CartaoLinha
                    key={j.job}
                    titulo={nomeDoJob(j)}
                    sub={`último sucesso ${dataHora(j.ultimoSucessoEm)}${j.esperadaAte ? ` · esperado até ${dataHora(j.esperadaAte)}` : ''}${j.falhas24h ? ` · ${j.falhas24h} falha(s) em 24 h` : ''}`}
                    extra={
                      <div style={{ marginTop: 4 }}>
                        <SituacaoJob j={j} />
                      </div>
                    }
                  />
                ))}
              </Cartoes>
            ) : (
              <Tabela rotulo="Jobs do worker">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Agenda</th>
                    <th>Última execução</th>
                    <th>Situação</th>
                    <th>Esperado até</th>
                    <th>Último sucesso</th>
                    <th className={a.direita}>Falhas 24 h</th>
                  </tr>
                </thead>
                <tbody>
                  {d.worker.jobs.map((j) => (
                    <tr key={j.job}>
                      <td>
                        {nomeDoJob(j)}
                        {j.descricao ? <div className={a.suave}>{j.descricao}</div> : null}
                      </td>
                      <td className={a.mono}>{j.cron ?? '—'}</td>
                      <td>{dataHora(j.ultima?.iniciadoEm)}</td>
                      <td>
                        <SituacaoJob j={j} />
                      </td>
                      <td>{dataHora(j.esperadaAte)}</td>
                      <td>{dataHora(j.ultimoSucessoEm)}</td>
                      <td className={a.direita}>{j.falhas24h}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
          </Cartao>
          <Cartao>
            <h2 className={a.secaoTitulo}>Erros do servidor (5xx)</h2>
            <p>
              {numero(d.erros5xx.ultimas24h)} erro(s) nas últimas 24 h
              {d.erros5xx.ultimaEm ? ` · o último em ${dataHora(d.erros5xx.ultimaEm)}` : ''}.
            </p>
            {d.erros5xx.porRota.length ? (
              <Tabela rotulo="Erros por rota">
                <thead>
                  <tr>
                    <th>Rota</th>
                    <th>Status</th>
                    <th className={a.direita}>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {d.erros5xx.porRota.map((e) => (
                    <tr key={`${e.rota} ${e.status}`}>
                      <td className={a.mono}>{e.rota}</td>
                      <td>{e.status}</td>
                      <td className={a.direita}>{numero(e.quantidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            ) : null}
          </Cartao>
          <p className={a.suave}>
            Atualizado em {dataHora(d.geradoEm)}. Node {d.api.node}
            {d.api.imagem ? ` · imagem ${d.api.imagem}` : ''}. Preço do 1º concurso: {formatarReais(d.precoCentavos)}.
          </p>
        </>
      )}
    </Consulta>
  );
}

function Configuracoes() {
  const consulta = useQuery({ queryKey: ['super', 'configuracoes'], queryFn: () => api('superConfiguracoes') });
  const [v, setV] = useState<ConfiguracoesProduto | null>(null);
  const [motivo, setMotivo] = useState('');
  const recon = useReconfirmacao();
  useEffect(() => {
    if (consulta.data && !v) setV(consulta.data.valores);
  }, [consulta.data, v]);
  const salvar = useMutation({
    mutationFn: () => api('superConfiguracoesSalvar', { corpo: { ...v!, motivo: motivo.trim(), confirmacao: recon.confirmacao ?? {} } }),
    onSuccess: (r) => {
      setV(r.valores);
      setMotivo('');
      recon.limpar();
      void consulta.refetch();
    },
  });
  const campos = camposDoErro(salvar.error);
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Configurações do produto</h2>
      <Consulta consulta={consulta}>
        {(c) =>
          v ? (
            <form
              className={a.formulario}
              aria-label="Configurações do produto"
              onSubmit={(e) => {
                e.preventDefault();
                salvar.mutate();
              }}
            >
              <p className={a.suave}>
                Preço do 1º concurso: {formatarReais(c.precoCentavos)} (muda em <Link to={caminho('precos')}>Preços e cupons</Link>).
                {c.atualizadoEm ? ` Última alteração ${dataHora(c.atualizadoEm)} por ${c.atualizadoPor?.nome ?? '—'}.` : ''}
              </p>
              <CampoTexto
                rotulo="WhatsApp do suporte"
                inputMode="tel"
                placeholder="5542999999999"
                value={v.suporteWhatsapp}
                onChange={(e) => setV({ ...v, suporteWhatsapp: e.target.value })}
                erro={campos.suporteWhatsapp}
              />
              <CampoTexto rotulo="E-mail do suporte" type="email" value={v.suporteEmail} onChange={(e) => setV({ ...v, suporteEmail: e.target.value })} erro={campos.suporteEmail} />
              <Marcar rotulo="Modo manutenção (o app mostra o aviso e bloqueia o estudo)" checked={v.manutencao.ativa} onChange={(e) => setV({ ...v, manutencao: { ...v.manutencao, ativa: e.target.checked } })} />
              <CampoArea rotulo="Mensagem da manutenção" rows={2} maxLength={300} value={v.manutencao.mensagem} onChange={(e) => setV({ ...v, manutencao: { ...v.manutencao, mensagem: e.target.value } })} />
              <Marcar rotulo="Mostrar aviso no app" checked={v.aviso.ativo} onChange={(e) => setV({ ...v, aviso: { ...v.aviso, ativo: e.target.checked } })} />
              <CampoArea rotulo="Texto do aviso" rows={2} maxLength={300} value={v.aviso.texto} onChange={(e) => setV({ ...v, aviso: { ...v.aviso, texto: e.target.value } })} />
              <CampoSelecao
                rotulo="Tom do aviso"
                value={v.aviso.tom}
                opcoes={[
                  { valor: 'info', rotulo: 'Informação' },
                  { valor: 'aviso', rotulo: 'Atenção' },
                  { valor: 'sucesso', rotulo: 'Boa notícia' },
                ]}
                onChange={(e) => setV({ ...v, aviso: { ...v.aviso, tom: e.target.value as ConfiguracoesProduto['aviso']['tom'] } })}
              />
              <CampoArea rotulo="Aviso do edital" rows={3} maxLength={600} value={v.avisoEdital} onChange={(e) => setV({ ...v, avisoEdital: e.target.value })} />
              <CampoArea rotulo="Motivo da alteração (fica na auditoria)" rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} erro={campos.motivo} />
              {recon.campo}
              {salvar.isError && !Object.keys(campos).length ? <Alerta tom="erro">{textoDoErro(salvar.error)}</Alerta> : null}
              {salvar.isSuccess ? <Alerta tom="sucesso">Configurações salvas.</Alerta> : null}
              <div className={a.acoes}>
                <Botao type="submit" variante="primario" disabled={motivo.trim().length < 5 || !recon.confirmacao} carregando={salvar.isPending}>
                  Salvar configurações
                </Botao>
              </div>
            </form>
          ) : null
        }
      </Consulta>
    </Cartao>
  );
}

function Seguranca() {
  const status = useQuery({ queryKey: ['super', '2fa'], queryFn: () => api('super2faStatus') });
  const [aberta, setAberta] = useState(false);
  return (
    <Cartao>
      <h2 className={a.secaoTitulo}>Minha verificação em duas etapas</h2>
      <Consulta consulta={status}>
        {(st) => (
          <p>
            {st.configurado ? `Ativa desde ${dataHora(st.ativadoEm)}.` : 'Não configurada.'} Códigos de recuperação restantes: {st.codigosRecuperacaoRestantes}.
          </p>
        )}
      </Consulta>
      <Botao onClick={() => setAberta(true)}>Gerar novos códigos de recuperação</Botao>
      <AcaoConfirmada
        titulo="Gerar novos códigos?"
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        rotuloConfirmar="Gerar códigos"
        reconfirmar
        pedirMotivo={false}
        executar={(_m, confirmacao) => api('super2faCodigos', { corpo: { confirmacao: confirmacao ?? {} } })}
        sucesso={(r) => (
          <>
            Guarde os códigos abaixo. Os anteriores deixaram de valer.
            <div className={s.codigos}>
              {(r as { codigos: string[] }).codigos.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </>
        )}
      >
        <p>Os códigos antigos param de funcionar.</p>
      </AcaoConfirmada>
    </Cartao>
  );
}

export default function Sistema() {
  const origem = useSegundoPlano(CHAVE_SISTEMA);
  return (
    <Pagina
      titulo="Sistema"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Sistema' }]}
      acoes={<BotaoAtualizar aoClicar={() => void origem.atualizar()} />}
    >
      <Saude origem={origem} />
      <div className={s.par}>
        <Configuracoes />
        <Seguranca />
      </div>
    </Pagina>
  );
}
