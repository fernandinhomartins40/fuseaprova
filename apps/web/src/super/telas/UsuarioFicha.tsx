/**
 * /super/usuarios/:id (D13 + D21/D24): ficha completa do usuário (dados, progresso, concursos,
 * pedidos, sessões, auditoria) e as ações: editar dados, forçar troca de senha,
 * bloquear/desbloquear, mudar o papel, exportar e excluir (LGPD). Por concurso (só aluno e
 * nunca a própria conta): liberar, revogar e aprovar pagamento manual.
 * No celular é uma tela empilhada; as ações abrem em folha.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatarReais, PAPEIS, type Papel } from '@fuse/shared';
import type { ConcursoDoUsuario, FichaUsuarioResposta, UsuarioConcursoAcaoResposta } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, Cartao, CampoSelecao, CampoTexto, Consulta, Marcar, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { cpfMascarado, dataHora, dia, numero, NOMES_STATUS_PEDIDO, TOM_STATUS_PEDIDO } from '../../admin/util';
import { AcaoConfirmada, AprovarManual } from '../acoes';
import { AcoesFicha, CartaoLinha, Cartoes, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { baixarJson, caminho, NOMES_METODO, NOMES_PAPEL, tomPapel } from '../util';

type Aberta = null | 'editar' | 'senha' | 'bloquear' | 'desbloquear' | 'papel' | 'liberar' | 'revogar' | 'manual' | 'excluir';

const nomeConcurso = (p: { concurso: { nome: string } | null }) => p.concurso?.nome ?? 'Sem concurso';
const cupom = (p: { cupomCodigo: string | null }) => p.cupomCodigo ?? '—';

function Pedidos({ f }: { f: FichaUsuarioResposta }) {
  const celular = useCelular();
  if (!f.pedidos.length) return <p className={a.suave}>Nenhum pedido.</p>;
  return celular ? (
    <Cartoes rotulo="Pedidos do usuário">
      {f.pedidos.map((p) => (
        <CartaoLinha
          key={p.id}
          para={caminho(`pagamentos/${p.id}`)}
          titulo={`${NOMES_STATUS_PEDIDO[p.status]} · ${nomeConcurso(p)}`}
          sub={`${NOMES_METODO[p.metodo]} · ${dataHora(p.criadoEm)}${p.cupomCodigo ? ` · cupom ${p.cupomCodigo}` : ''}`}
          valor={formatarReais(p.valorCentavos)}
        />
      ))}
    </Cartoes>
  ) : (
    <Tabela rotulo="Pedidos do usuário">
      <thead>
        <tr>
          <th>Status</th>
          <th>Concurso</th>
          <th>Método</th>
          <th className={a.direita}>Valor</th>
          <th>Cupom</th>
          <th>Criado</th>
          <th>Pago</th>
        </tr>
      </thead>
      <tbody>
        {f.pedidos.map((p) => (
          <tr key={p.id}>
            <td>
              <Link className={a.link} to={caminho(`pagamentos/${p.id}`)}>
                <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
              </Link>
            </td>
            <td>{nomeConcurso(p)}</td>
            <td>{NOMES_METODO[p.metodo]}</td>
            <td className={a.direita}>{formatarReais(p.valorCentavos)}</td>
            <td className={a.mono}>{cupom(p)}</td>
            <td>{dataHora(p.criadoEm)}</td>
            <td>{dataHora(p.pagoEm)}</td>
          </tr>
        ))}
      </tbody>
    </Tabela>
  );
}

/**
 * D21/D24: os concursos do aluno, cada um com o acesso e o pedido pago que o libera. Liberar,
 * revogar e aprovar pagamento manual são por concurso e só aparecem para aluno (nunca para a
 * equipe nem para a própria conta, S-25).
 */
function Concursos({
  f,
  podeAgir,
  aoAgir,
}: {
  f: FichaUsuarioResposta;
  podeAgir: boolean;
  aoAgir: (acao: 'liberar' | 'revogar' | 'manual', c: ConcursoDoUsuario) => void;
}) {
  if (!f.concursos.length) {
    return <p className={a.suave}>{f.usuario.papel === 'aluno' ? 'O aluno ainda não escolheu nenhum concurso.' : 'Conta da equipe: não estuda.'}</p>;
  }
  return (
    <ul className={a.lista} aria-label="Concursos do usuário">
      {f.concursos.map((c) => (
        <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>
            <strong>{c.nome}</strong> {c.ativo ? <Selo tom="info">Ativo</Selo> : null}{' '}
            {c.acesso ? <Selo tom="sucesso">Liberado</Selo> : <Selo tom="aviso">Não liberado</Selo>}
            <br />
            <span className={a.suave}>
              {c.cargo ?? 'Sem cargo'}
              {c.acessoEm ? ` · liberado em ${dataHora(c.acessoEm)}` : ''}
              {c.pedidoPagoId ? (
                <>
                  {' · '}
                  <Link className={a.link} to={caminho(`pagamentos/${c.pedidoPagoId}`)}>
                    pedido pago
                  </Link>
                </>
              ) : (
                ' · sem pedido pago'
              )}
            </span>
          </span>
          {podeAgir ? (
            <span className={a.acoes}>
              {!c.pedidoPagoId ? (
                <Botao pequeno variante="primario" onClick={() => aoAgir('manual', c)} aria-label={`Aprovar pagamento manual de ${c.nome}`}>
                  Aprovar pagamento manual
                </Botao>
              ) : null}
              {c.acesso ? (
                <Botao pequeno variante="perigo" onClick={() => aoAgir('revogar', c)} aria-label={`Revogar ${c.nome}`}>
                  Revogar
                </Botao>
              ) : (
                <Botao pequeno onClick={() => aoAgir('liberar', c)} aria-label={`Liberar ${c.nome}`}>
                  Liberar
                </Botao>
              )}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Sessoes({ f, aoMudar }: { f: FichaUsuarioResposta; aoMudar: () => void }) {
  const revogar = useMutation({
    mutationFn: (sessaoId: string) => api('superUsuarioRevogarSessao', { params: { id: f.usuario.id, sessaoId } }),
    onSuccess: aoMudar,
  });
  if (!f.sessoes.length) return <p className={a.suave}>Nenhuma sessão aberta.</p>;
  return (
    <>
      {revogar.isError ? <Alerta tom="erro">{mensagemDeErro(revogar.error)}</Alerta> : null}
      <ul className={a.lista}>
        {f.sessoes.map((x) => (
          <li key={x.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>
              {x.userAgent ?? 'Navegador desconhecido'}
              <br />
              <span className={a.suave}>
                {x.ip ?? '—'} · último uso {dataHora(x.ultimoUsoEm)}
                {x.doisFatores ? ' · 2FA' : ''}
              </span>
            </span>
            <Botao pequeno onClick={() => revogar.mutate(x.id)} carregando={revogar.isPending && revogar.variables === x.id}>
              Encerrar
            </Botao>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function UsuarioFicha() {
  const { id = '' } = useParams();
  const [aberta, setAberta] = useState<Aberta>(null);
  const [edicao, setEdicao] = useState({ nome: '', email: '', celular: '' });
  const [revogarSessoes, setRevogarSessoes] = useState(true);
  const [papel, setPapel] = useState<Papel>('aluno');
  const [emailConfirmado, setEmailConfirmado] = useState('');
  const [concursoAlvo, setConcursoAlvo] = useState<ConcursoDoUsuario | null>(null);
  const me = useQuery({ queryKey: ['super', 'me'], queryFn: () => api('meObter'), staleTime: 60_000 });
  const consulta = useQuery({ queryKey: ['super', 'usuario', id], queryFn: () => api('superUsuarioObter', { params: { id } }) });
  const exportar = useMutation({
    mutationFn: () => api('superUsuarioExportar', { params: { id } }),
    onSuccess: (d) => baixarJson(`fuse-aprova-dados-${id}.json`, d),
  });
  const fechar = () => {
    setAberta(null);
    void consulta.refetch();
  };

  return (
    <Pagina
      titulo={consulta.data?.usuario.nome ?? 'Usuário'}
      voltar={caminho('usuarios')}
      trilha={[
        { rotulo: 'Superadmin', para: caminho() },
        { rotulo: 'Usuários', para: caminho('usuarios') },
        { rotulo: 'Ficha' },
      ]}
    >
      <Consulta consulta={consulta}>
        {(f) => {
          const u = f.usuario;
          const excluido = !!u.excluidoEm;
          const ehAluno = u.papel === 'aluno';
          // RQ4/D24: ações de acesso só para aluno e nunca para a própria conta.
          const podeAgir = ehAluno && !excluido && !!me.data && me.data.id !== u.id;
          const comAcesso = f.concursos.some((c) => c.acesso);
          const pixDoConcurso = (c: ConcursoDoUsuario | null) =>
            !!c && f.pedidos.some((p) => p.concurso?.id === c.id && p.metodo === 'asaas' && !!p.asaasPaymentId && (p.status === 'pendente' || p.status === 'vencido'));
          const agir = (acao: 'liberar' | 'revogar' | 'manual', c: ConcursoDoUsuario) => {
            setConcursoAlvo(c);
            setAberta(acao);
          };
          return (
            <>
              <div className={a.acoes}>
                <Selo tom={tomPapel(u.papel)}>{NOMES_PAPEL[u.papel]}</Selo>
                {excluido ? (
                  <Selo tom="neutro">Excluído (LGPD)</Selo>
                ) : ehAluno ? (
                  comAcesso ? (
                    <Selo tom="sucesso">Com concurso liberado</Selo>
                  ) : (
                    <Selo tom="aviso">Sem concurso liberado</Selo>
                  )
                ) : null}
                {u.bloqueado ? <Selo tom="erro">Bloqueado</Selo> : null}
                {u.doisFatores ? <Selo tom="info">2FA ativo</Selo> : null}
              </div>
              {!excluido ? (
                <AcoesFicha
                  rotulo="Ações do usuário"
                  itens={[
                    {
                      rotulo: 'Editar dados',
                      principal: true,
                      aoClicar: () => {
                        setEdicao({ nome: u.nome, email: u.email, celular: u.celular ?? '' });
                        setAberta('editar');
                      },
                    },
                    {
                      rotulo: 'Mudar papel',
                      aoClicar: () => {
                        setPapel(u.papel);
                        setAberta('papel');
                      },
                    },
                    { rotulo: 'Forçar troca de senha', aoClicar: () => setAberta('senha') },
                    u.bloqueado ? { rotulo: 'Desbloquear', aoClicar: () => setAberta('desbloquear') } : { rotulo: 'Bloquear', aoClicar: () => setAberta('bloquear') },
                    { rotulo: 'Exportar dados (LGPD)', carregando: exportar.isPending, aoClicar: () => exportar.mutate() },
                    {
                      rotulo: 'Excluir (LGPD)',
                      variante: 'perigo',
                      aoClicar: () => {
                        setEmailConfirmado('');
                        setAberta('excluir');
                      },
                    },
                  ]}
                />
              ) : null}
              {exportar.isError ? <Alerta tom="erro">{mensagemDeErro(exportar.error)}</Alerta> : null}
              {exportar.isSuccess ? <Alerta tom="sucesso">Arquivo JSON com os dados do usuário gerado.</Alerta> : null}

              <div className={s.par}>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Dados</h2>
                  <dl className={a.dl}>
                    <dt>E-mail</dt>
                    <dd>{u.email}</dd>
                    <dt>Celular</dt>
                    <dd>{u.celular ?? '—'}</dd>
                    <dt>CPF</dt>
                    <dd className={a.mono}>{cpfMascarado(u.cpfOculto)}</dd>
                    <dt>Cargo</dt>
                    <dd>{u.cargo ?? '—'}</dd>
                    <dt>Cadastro</dt>
                    <dd>{dataHora(u.criadoEm)}</dd>
                    <dt>Aceite dos termos</dt>
                    <dd>
                      {dataHora(u.aceiteTermosEm)}
                      {u.versaoTermos ? ` (versão ${u.versaoTermos})` : ''}
                    </dd>
                    <dt>Marketing</dt>
                    <dd>{u.marketing ? 'Aceita' : 'Não aceita'}</dd>
                    <dt>Notificações</dt>
                    <dd>
                      {u.notificacoes ? 'Ativas' : 'Desligadas'}
                      {u.lembreteHora ? ` · lembrete às ${u.lembreteHora}` : ''}
                    </dd>
                    {u.bloqueado ? (
                      <>
                        <dt>Bloqueado em</dt>
                        <dd>
                          {dataHora(u.bloqueadoEm)} · {u.bloqueioMotivo ?? '—'}
                        </dd>
                      </>
                    ) : null}
                    <dt>Última atividade</dt>
                    <dd>{dataHora(u.ultimaAtividadeEm)}</dd>
                  </dl>
                </Cartao>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Progresso</h2>
                  <dl className={a.dl}>
                    <dt>XP</dt>
                    <dd>{numero(f.progresso.xpTotal)}</dd>
                    <dt>Ofensiva</dt>
                    <dd>
                      {f.progresso.ofensiva} (recorde {f.progresso.ofensivaRecorde})
                    </dd>
                    <dt>Gemas e vidas</dt>
                    <dd>
                      {numero(f.progresso.gemas)} gemas · {f.progresso.vidas} vidas
                    </dd>
                    <dt>Liga</dt>
                    <dd>{f.progresso.divisao}</dd>
                    <dt>Lições concluídas</dt>
                    <dd>{numero(f.progresso.licoesConcluidas)}</dd>
                    <dt>Questões feitas</dt>
                    <dd>
                      {numero(f.progresso.questoesFeitas)}
                      {f.progresso.precisao !== null ? ` · ${f.progresso.precisao}% de acerto` : ''}
                    </dd>
                    <dt>Simulados</dt>
                    <dd>{numero(f.progresso.simuladosEntregues)}</dd>
                    <dt>Revisões pendentes</dt>
                    <dd>{numero(f.progresso.revisoesPendentes)}</dd>
                    <dt>Último dia de estudo</dt>
                    <dd>{dia(f.progresso.ultimoDiaEstudo)}</dd>
                  </dl>
                </Cartao>
              </div>
              <Cartao>
                <h2 className={a.secaoTitulo}>Concursos</h2>
                <Concursos f={f} podeAgir={podeAgir} aoAgir={agir} />
              </Cartao>
              <Cartao>
                <h2 className={a.secaoTitulo}>Pedidos</h2>
                <Pedidos f={f} />
              </Cartao>
              <div className={s.par}>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Sessões abertas</h2>
                  <Sessoes f={f} aoMudar={() => void consulta.refetch()} />
                </Cartao>
                <Cartao>
                  <h2 className={a.secaoTitulo}>Auditoria</h2>
                  {f.auditoria.length ? (
                    <ol className={s.linhaTempo}>
                      {f.auditoria.map((x) => (
                        <li key={x.id}>
                          <strong>{x.acao}</strong>
                          <div className={a.suave}>
                            {dataHora(x.criadoEm)} · {x.admin?.nome ?? 'sistema'}
                          </div>
                          {x.motivo ? <div>{x.motivo}</div> : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={a.suave}>Nada registrado.</p>
                  )}
                </Cartao>
              </div>

              <AprovarManual
                aluno={{ id: u.id, nome: u.nome, email: u.email, pixPendente: pixDoConcurso(concursoAlvo) }}
                alvo={concursoAlvo ? { concursoId: concursoAlvo.id } : null}
                concursoNome={concursoAlvo?.nome}
                aberta={aberta === 'manual' && podeAgir}
                aoFechar={fechar}
              />
              <AcaoConfirmada
                titulo="Editar dados"
                aberta={aberta === 'editar'}
                aoFechar={fechar}
                rotuloConfirmar="Salvar"
                podeConfirmar={edicao.nome.trim().length > 0 && edicao.email.trim().length > 0}
                executar={(motivo) =>
                  api('superUsuarioEditar', {
                    params: { id },
                    corpo: {
                      motivo,
                      ...(edicao.nome !== u.nome ? { nome: edicao.nome } : {}),
                      ...(edicao.email !== u.email ? { email: edicao.email } : {}),
                      ...(edicao.celular !== (u.celular ?? '') ? { celular: edicao.celular } : {}),
                    },
                  })
                }
                sucesso="Dados atualizados."
              >
                <CampoTexto rotulo="Nome" value={edicao.nome} onChange={(e) => setEdicao((x) => ({ ...x, nome: e.target.value }))} />
                <CampoTexto rotulo="E-mail" type="email" value={edicao.email} onChange={(e) => setEdicao((x) => ({ ...x, email: e.target.value }))} />
                <CampoTexto rotulo="Celular" inputMode="tel" value={edicao.celular} onChange={(e) => setEdicao((x) => ({ ...x, celular: e.target.value }))} />
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Forçar troca de senha"
                aberta={aberta === 'senha'}
                aoFechar={fechar}
                rotuloConfirmar="Enviar link"
                executar={(motivo) => api('superUsuarioForcarSenha', { params: { id }, corpo: { motivo, revogarSessoes } })}
                sucesso="Link de redefinição enviado por e-mail."
              >
                <p>O usuário recebe um link para criar uma senha nova.</p>
                <Marcar rotulo="Encerrar também as sessões abertas" checked={revogarSessoes} onChange={(e) => setRevogarSessoes(e.target.checked)} />
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Bloquear a conta?"
                aberta={aberta === 'bloquear'}
                aoFechar={fechar}
                rotuloConfirmar="Bloquear"
                perigo
                executar={(motivo) => api('superUsuarioBloquear', { params: { id }, corpo: { motivo } })}
                sucesso="Conta bloqueada e sessões encerradas."
              />
              <AcaoConfirmada
                titulo="Desbloquear a conta?"
                aberta={aberta === 'desbloquear'}
                aoFechar={fechar}
                rotuloConfirmar="Desbloquear"
                executar={(motivo) => api('superUsuarioDesbloquear', { params: { id }, corpo: { motivo } })}
                sucesso="Conta desbloqueada."
              />
              <AcaoConfirmada
                titulo="Mudar o papel"
                aberta={aberta === 'papel'}
                aoFechar={fechar}
                rotuloConfirmar="Mudar papel"
                reconfirmar
                podeConfirmar={papel !== u.papel}
                executar={(motivo, confirmacao) => api('superUsuarioPapel', { params: { id }, corpo: { papel, motivo, confirmacao: confirmacao ?? {} } })}
                sucesso="Papel alterado. As sessões do usuário foram encerradas."
              >
                <CampoSelecao rotulo="Novo papel" value={papel} opcoes={PAPEIS.map((p) => ({ valor: p, rotulo: NOMES_PAPEL[p] }))} onChange={(e) => setPapel(e.target.value as Papel)} />
                {papel === 'superadmin' ? <Alerta tom="aviso">Superadmin vê o financeiro e tudo da conta Asaas. Ele vai precisar configurar o 2FA.</Alerta> : null}
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Liberar o concurso?"
                aberta={aberta === 'liberar' && podeAgir}
                aoFechar={fechar}
                rotuloConfirmar="Liberar"
                reconfirmar
                podeConfirmar={!!concursoAlvo}
                executar={(motivo, confirmacao) =>
                  api('superUsuarioConcursoLiberar', { params: { id, concursoId: concursoAlvo?.id ?? '' }, corpo: { motivo, confirmacao: confirmacao ?? {} } })
                }
                sucesso={(r) => (r as UsuarioConcursoAcaoResposta).mensagem}
              >
                {concursoAlvo ? (
                  <p>
                    Libera <strong>{concursoAlvo.nome}</strong> para {u.nome}.
                  </p>
                ) : null}
                <Alerta tom="info">
                  Para pagamento recebido por fora, use “Aprovar pagamento manual”: ele registra o valor no financeiro. Liberar não gera receita.
                </Alerta>
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Revogar o concurso?"
                aberta={aberta === 'revogar' && podeAgir}
                aoFechar={fechar}
                rotuloConfirmar="Revogar"
                perigo
                reconfirmar
                podeConfirmar={!!concursoAlvo}
                executar={(motivo, confirmacao) =>
                  api('superUsuarioConcursoRevogar', { params: { id, concursoId: concursoAlvo?.id ?? '' }, corpo: { motivo, confirmacao: confirmacao ?? {} } })
                }
                sucesso={(r) => (r as UsuarioConcursoAcaoResposta).mensagem}
              >
                {concursoAlvo ? (
                  <p>
                    Revoga só <strong>{concursoAlvo.nome}</strong>. Os outros concursos de {u.nome} continuam.
                  </p>
                ) : null}
                {concursoAlvo?.pedidoPagoId ? (
                  <Alerta tom="aviso">Este concurso tem um pedido pago. Se o dinheiro vai ser devolvido, use “Estornar” na tela do pagamento.</Alerta>
                ) : null}
              </AcaoConfirmada>
              <AcaoConfirmada
                titulo="Excluir a conta (LGPD)?"
                aberta={aberta === 'excluir'}
                aoFechar={fechar}
                rotuloConfirmar="Excluir definitivamente"
                perigo
                reconfirmar
                podeConfirmar={emailConfirmado.trim().toLowerCase() === u.email.toLowerCase()}
                executar={(motivo, confirmacao) =>
                  api('superUsuarioAnonimizar', { params: { id }, corpo: { motivo, emailConfirmado, confirmacao: confirmacao ?? {} } })
                }
                sucesso="Conta anonimizada. Os pedidos ficam para a contabilidade, sem dados pessoais."
              >
                <Alerta tom="aviso">
                  Os dados pessoais são apagados (anonimizados) e não dá para desfazer. Os pedidos continuam no financeiro.
                </Alerta>
                <CampoTexto rotulo={`Digite ${u.email} para confirmar`} type="email" value={emailConfirmado} onChange={(e) => setEmailConfirmado(e.target.value)} />
              </AcaoConfirmada>
            </>
          );
        }}
      </Consulta>
    </Pagina>
  );
}
