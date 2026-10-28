/**
 * /super/sistema (D13): saúde da API, do banco, do worker (jobs), do backup e das integrações;
 * configurações do produto (suporte, manutenção, aviso, aviso do edital) e os códigos de
 * recuperação do 2FA da própria conta.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarReais } from '@fuse/shared';
import type { ConfiguracoesProduto } from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoArea, CampoSelecao, CampoTexto, Consulta, Marcar, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { dataHora, numero } from '../../admin/util';
import { AcaoConfirmada } from '../acoes';
import { BotaoAtualizar, CartaoLinha, Cartoes, Kpi, Pagina, estilosSuper as s, useCelular, useReconfirmacao } from '../componentes';
import { caminho } from '../util';

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

function Saude() {
  const celular = useCelular();
  const consulta = useQuery({ queryKey: ['super', 'sistema'], queryFn: () => api('superSistema'), refetchInterval: 60_000 });
  return (
    <Consulta consulta={consulta}>
      {(d) => (
        <>
          <section className={s.kpis} aria-label="Saúde do sistema">
            <Kpi rotulo="API" valor={d.api.versao} detalhe={`${d.api.ambiente} · no ar há ${duracao(d.api.uptimeS)} · ${d.api.memoriaMb} MB`} />
            <Kpi rotulo="Banco" valor={d.banco.ok ? 'OK' : 'Falhou'} detalhe={`${bytes(d.banco.tamanhoBytes)} · ${numero(d.banco.conexoes)}/${numero(d.banco.maxConexoes)} conexões`} />
            <Kpi rotulo="Backup" valor={d.backup.ultimoJobOk === false ? 'Falhou' : d.backup.ultimo ? 'OK' : '—'} detalhe={d.backup.ultimo ?? d.backup.aviso ?? d.backup.fonte} />
            <Kpi rotulo="E-mail (SMTP)" valor={d.smtp.configurado ? 'Configurado' : 'Ausente'} detalhe={d.smtp.host ?? undefined} />
            <Kpi rotulo="Asaas" valor={d.asaas.chaveConfigurada ? 'Configurado' : 'Sem chave'} detalhe={d.asaas.ambiente} />
            <Kpi rotulo="Push" valor={d.push.configurado ? 'Configurado' : 'Ausente'} detalhe={`Preço: ${formatarReais(d.precoCentavos)}`} />
          </section>
          {d.backup.aviso ? <Alerta tom="aviso">{d.backup.aviso}</Alerta> : null}
          <Cartao>
            <h2 className={a.secaoTitulo}>Jobs do worker</h2>
            {celular ? (
              <Cartoes rotulo="Jobs do worker">
                {d.worker.jobs.map((j) => (
                  <CartaoLinha
                    key={j.job}
                    titulo={j.job}
                    sub={`último sucesso ${dataHora(j.ultimoSucessoEm)}${j.falhas24h ? ` · ${j.falhas24h} falha(s) em 24 h` : ''}`}
                    extra={j.ultima?.erro ? <div style={{ color: 'var(--adm-erro)' }}>{j.ultima.erro}</div> : undefined}
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
                    <th>Último sucesso</th>
                    <th className={a.direita}>Falhas 24 h</th>
                  </tr>
                </thead>
                <tbody>
                  {d.worker.jobs.map((j) => (
                    <tr key={j.job}>
                      <td>{j.job}</td>
                      <td className={a.mono}>{j.cron ?? '—'}</td>
                      <td>{dataHora(j.ultima?.iniciadoEm)}</td>
                      <td>
                        {!j.ultima ? (
                          <Selo tom="neutro">Nunca rodou</Selo>
                        ) : j.ultima.ok === null ? (
                          <Selo tom="info">Rodando</Selo>
                        ) : j.ultima.ok ? (
                          <Selo tom="sucesso">OK</Selo>
                        ) : (
                          <Selo tom="erro">{j.ultima.erro ?? 'Falhou'}</Selo>
                        )}
                      </td>
                      <td>{dataHora(j.ultimoSucessoEm)}</td>
                      <td className={a.direita}>{j.falhas24h}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
            <p className={a.suave}>Atualizado em {dataHora(d.geradoEm)}. Node {d.api.node}{d.api.imagem ? ` · imagem ${d.api.imagem}` : ''}.</p>
          </Cartao>
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
              {salvar.isError && !Object.keys(campos).length ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
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
  const qc = useQueryClient();
  return (
    <Pagina
      titulo="Sistema"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Sistema' }]}
      acoes={<BotaoAtualizar aoClicar={() => void qc.invalidateQueries({ queryKey: ['super', 'sistema'] })} />}
    >
      <Saude />
      <div className={s.par}>
        <Configuracoes />
        <Seguranca />
      </div>
    </Pagina>
  );
}
