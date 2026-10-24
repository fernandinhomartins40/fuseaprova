import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatarReais, NOMES_AREA, NOMES_DIVISAO } from '@fuse/shared';
import type { UsuariosQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../api';
import { ModalAcessoManual, ModalReembolso } from '../componentes/AcoesAcesso';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoSelecao,
  CampoTexto,
  Cartao,
  Consulta,
  estilos as s,
  Modal,
  Paginacao,
  Selo,
  Tabela,
  TituloSecao,
} from '../componentes/ui';
import {
  BASE_ADMIN,
  cpfMascarado,
  dataHora,
  dia,
  NOMES_STATUS_PEDIDO,
  nomeArea,
  numero,
  TOM_STATUS_PEDIDO,
} from '../util';

export default function Usuarios() {
  const { id } = useParams();
  return id ? <DetalheUsuario id={id} /> : <ListaUsuarios />;
}

function ListaUsuarios() {
  const [filtros, setFiltros] = useState<UsuariosQuery>({ pagina: 1, porPagina: 25 });
  const [busca, setBusca] = useState('');
  const consulta = useQuery({
    queryKey: ['admin', 'usuarios', 'lista', filtros],
    queryFn: () => api('adminUsuariosListar', { query: filtros }),
    placeholderData: keepPreviousData,
  });
  const mudar = (k: keyof UsuariosQuery, v: string) => setFiltros((f) => ({ ...f, pagina: 1, [k]: v || undefined }));
  return (
    <>
      <Cabecalho titulo="Usuários" subtitulo="Busque por nome, e-mail ou celular." />
      <form
        className={s.filtros}
        role="search"
        aria-label="Busca de usuários"
        onSubmit={(e) => {
          e.preventDefault();
          mudar('q', busca.trim());
        }}
      >
        <CampoTexto rotulo="Buscar" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <CampoSelecao
          rotulo="Acesso"
          vazio="Todos"
          value={filtros.acesso ?? ''}
          opcoes={[
            { valor: 'true', rotulo: 'Com acesso' },
            { valor: 'false', rotulo: 'Sem acesso' },
          ]}
          onChange={(e) => mudar('acesso', e.target.value)}
        />
        <CampoSelecao
          rotulo="Papel"
          vazio="Todos"
          value={filtros.papel ?? ''}
          opcoes={[
            { valor: 'aluno', rotulo: 'Aluno' },
            { valor: 'admin', rotulo: 'Admin' },
          ]}
          onChange={(e) => mudar('papel', e.target.value)}
        />
        <Botao type="submit">Buscar</Botao>
      </form>
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum usuário encontrado.">
        {(d) => (
          <>
            <Tabela rotulo="Usuários">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Celular</th>
                  <th>Área</th>
                  <th>Acesso</th>
                  <th className={s.direita}>XP</th>
                  <th className={s.direita}>Ofensiva</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link className={s.link} to={`${BASE_ADMIN}/usuarios/${u.id}`}>
                        {u.nome}
                      </Link>
                      <div className={s.suave}>{u.email}</div>
                      {u.papel === 'admin' ? <Selo tom="destaque">Admin</Selo> : null}
                      {u.excluidoEm ? <Selo tom="erro">Conta excluída</Selo> : null}
                    </td>
                    <td className={s.mono}>{cpfMascarado(u.cpfOculto)}</td>
                    <td>{u.celular}</td>
                    <td>{nomeArea(u.area, NOMES_AREA)}</td>
                    <td>{u.acesso ? <Selo tom="sucesso">Liberado</Selo> : <Selo>Sem acesso</Selo>}</td>
                    <td className={s.direita}>{numero(u.xpTotal)}</td>
                    <td className={s.direita}>{u.ofensiva}</td>
                    <td className={s.suave}>{dataHora(u.criadoEm)}</td>
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
    </>
  );
}

function DetalheUsuario({ id }: { id: string }) {
  const qc = useQueryClient();
  const [acesso, setAcesso] = useState<'liberar' | 'revogar' | null>(null);
  const [revogar, setRevogar] = useState(false);
  const [reembolso, setReembolso] = useState<string | null>(null);
  const consulta = useQuery({
    queryKey: ['admin', 'usuarios', 'item', id],
    queryFn: () => api('adminUsuarioObter', { params: { id } }),
  });
  const revogarSessoes = useMutation({
    mutationFn: () => api('adminUsuarioRevogarSessoes', { params: { id } }),
    onSuccess: () => {
      setRevogar(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'usuarios', 'item', id] });
    },
  });

  return (
    <Consulta consulta={consulta}>
      {(d) => {
        const u = d.usuario;
        const pedidoReembolso = d.pedidos.find((p) => p.id === reembolso);
        return (
          <>
            <Cabecalho
              titulo={u.nome}
              subtitulo={
                <>
                  {u.email} · {u.celular} · CPF <span className={s.mono}>{cpfMascarado(u.cpfOculto)}</span>
                </>
              }
              acoes={
                <>
                  <Link className={`${s.botao} ${s.secundario}`} to={`${BASE_ADMIN}/usuarios`}>
                    Voltar
                  </Link>
                  <Botao onClick={() => setRevogar(true)} disabled={d.sessoes.length === 0}>
                    Revogar sessões
                  </Botao>
                  {u.acesso ? (
                    <Botao variante="perigo" onClick={() => setAcesso('revogar')}>
                      Revogar acesso
                    </Botao>
                  ) : (
                    <Botao variante="primario" onClick={() => setAcesso('liberar')}>
                      Liberar acesso
                    </Botao>
                  )}
                </>
              }
            />
            {revogarSessoes.isSuccess ? (
              <Alerta tom="sucesso">{revogarSessoes.data.revogadas} sessões encerradas.</Alerta>
            ) : null}

            <div className={s.grade}>
              <div className={s.estat}>
                <div className={s.estatRotulo}>Acesso</div>
                <div className={s.estatValor}>{u.acesso ? 'Liberado' : 'Sem acesso'}</div>
              </div>
              <div className={s.estat}>
                <div className={s.estatRotulo}>XP total</div>
                <div className={s.estatValor}>{numero(u.xpTotal)}</div>
                <div className={s.estatDetalhe}>Liga {NOMES_DIVISAO[u.divisao]}</div>
              </div>
              <div className={s.estat}>
                <div className={s.estatRotulo}>Ofensiva</div>
                <div className={s.estatValor}>{u.ofensiva} dias</div>
                <div className={s.estatDetalhe}>recorde {u.ofensivaRecorde} · último dia {dia(u.ultimoDiaEstudo)}</div>
              </div>
              <div className={s.estat}>
                <div className={s.estatRotulo}>Lições concluídas</div>
                <div className={s.estatValor}>{numero(d.progresso.licoesConcluidas)}</div>
                <div className={s.estatDetalhe}>{numero(d.progresso.questoesFeitas)} questões feitas</div>
              </div>
              <div className={s.estat}>
                <div className={s.estatRotulo}>Precisão</div>
                <div className={s.estatValor}>
                  {d.progresso.precisao === null ? '—' : `${d.progresso.precisao}%`}
                </div>
                <div className={s.estatDetalhe}>
                  {d.progresso.simuladosEntregues} simulados · {d.progresso.revisoesPendentes} revisões pendentes
                </div>
              </div>
            </div>

            <div className={s.grade2}>
              <div>
                <TituloSecao>Perfil</TituloSecao>
                <Cartao>
                  <dl className={s.dl}>
                    <dt>Papel</dt>
                    <dd>{u.papel === 'admin' ? 'Admin' : 'Aluno'}</dd>
                    <dt>Área</dt>
                    <dd>{nomeArea(u.area, NOMES_AREA)}</dd>
                    <dt>Cargo</dt>
                    <dd>{u.cargo ?? '—'}</dd>
                    <dt>Meta diária</dt>
                    <dd>{u.metaDiaria} lições</dd>
                    <dt>Gemas / vidas</dt>
                    <dd>
                      {u.gemas} gemas · {u.vidas} vidas
                    </dd>
                    <dt>Termos</dt>
                    <dd>
                      {u.versaoTermos ?? '—'} · aceito em {dataHora(u.aceiteTermosEm)}
                    </dd>
                    <dt>Cadastro</dt>
                    <dd>{dataHora(u.criadoEm)}</dd>
                    {u.excluidoEm ? (
                      <>
                        <dt>Excluída em</dt>
                        <dd>{dataHora(u.excluidoEm)}</dd>
                      </>
                    ) : null}
                  </dl>
                </Cartao>
              </div>
              <div>
                <TituloSecao>Domínio por disciplina</TituloSecao>
                <Cartao>
                  {d.progresso.dominio.length === 0 ? (
                    <p className={s.suave}>Sem dados ainda.</p>
                  ) : (
                    <dl className={s.dl}>
                      {d.progresso.dominio.map((x) => (
                        <Fragment key={x.slug}>
                          <dt>{x.nome}</dt>
                          <dd>
                            {x.valor === null ? (
                              'pouca prática (menos de 5 respostas)'
                            ) : (
                              <>
                                <meter min={0} max={100} value={x.valor} aria-label={`Domínio em ${x.nome}`} />{' '}
                                {numero(x.valor)}%
                              </>
                            )}
                          </dd>
                        </Fragment>
                      ))}
                    </dl>
                  )}
                </Cartao>
              </div>
            </div>

            <TituloSecao>Pedidos</TituloSecao>
            {d.pedidos.length === 0 ? (
              <p className={s.suave}>Nenhum pedido.</p>
            ) : (
              <Tabela rotulo="Pedidos do usuário">
                <thead>
                  <tr>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Criado</th>
                    <th>Pago</th>
                    <th>Cobrança</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {d.pedidos.map((p) => (
                    <tr key={p.id}>
                      <td>{formatarReais(p.valorCentavos)}</td>
                      <td>
                        <Selo tom={TOM_STATUS_PEDIDO[p.status]}>{NOMES_STATUS_PEDIDO[p.status]}</Selo>
                        {p.reembolsoSolicitadoEm && p.status === 'pago' ? (
                          <Selo tom="aviso">Estorno aguardando webhook</Selo>
                        ) : null}
                      </td>
                      <td>{dataHora(p.criadoEm)}</td>
                      <td>{dataHora(p.pagoEm)}</td>
                      <td className={s.mono}>{p.asaasPaymentId ?? '—'}</td>
                      <td>
                        {p.status === 'pago' && !p.reembolsoSolicitadoEm ? (
                          <Botao pequeno variante="perigo" onClick={() => setReembolso(p.id)}>
                            Reembolsar
                          </Botao>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}

            <TituloSecao>Sessões ativas</TituloSecao>
            {d.sessoes.length === 0 ? (
              <p className={s.suave}>Nenhuma sessão ativa.</p>
            ) : (
              <Tabela rotulo="Sessões">
                <thead>
                  <tr>
                    <th>Dispositivo</th>
                    <th>IP</th>
                    <th>Criada</th>
                    <th>Expira</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sessoes.map((x) => (
                    <tr key={x.id}>
                      <td>{x.userAgent ?? '—'}</td>
                      <td className={s.mono}>{x.ip ?? '—'}</td>
                      <td>{dataHora(x.criadoEm)}</td>
                      <td>{dataHora(x.expiraEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}

            <Modal
              titulo="Revogar todas as sessões?"
              aberto={revogar}
              aoFechar={() => setRevogar(false)}
              rodape={
                <>
                  <Botao data-fechar onClick={() => setRevogar(false)}>
                    Cancelar
                  </Botao>
                  <Botao variante="perigo" carregando={revogarSessoes.isPending} onClick={() => revogarSessoes.mutate()}>
                    Revogar sessões
                  </Botao>
                </>
              }
            >
              <p>O aluno sai de todos os dispositivos e precisa entrar de novo. O acesso pago não muda.</p>
              {revogarSessoes.isError ? <Alerta tom="erro">{mensagemDeErro(revogarSessoes.error)}</Alerta> : null}
            </Modal>
            {acesso ? <ModalAcessoManual usuario={u} modo={acesso} aoFechar={() => setAcesso(null)} /> : null}
            {pedidoReembolso ? (
              <ModalReembolso pedido={{ ...pedidoReembolso, usuario: u }} aoFechar={() => setReembolso(null)} />
            ) : null}
          </>
        );
      }}
    </Consulta>
  );
}
