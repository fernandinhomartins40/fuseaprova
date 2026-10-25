/**
 * /super/usuarios (D13): busca por nome, e-mail ou CPF, filtros (papel, acesso, pago,
 * bloqueado, atividade) e exportação CSV. No celular, cartões e filtros numa folha.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PAPEIS, type Papel } from '@fuse/shared';
import type { SuperUsuariosQuery, UsuarioSuperResumo } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../../admin/api';
import { Alerta, Botao, CampoSelecao, CampoTexto, Consulta, Marcar, Paginacao, Selo, Tabela, estilos as a } from '../../admin/componentes/ui';
import { cpfMascarado, dataHora, numero } from '../../admin/util';
import { BotaoAtualizar, CartaoLinha, Cartoes, Folha, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { Icone } from '../icones';
import { baixarCsv, caminho, NOMES_PAPEL, tomPapel } from '../util';

type SimNao = '' | 'true' | 'false';
interface Filtros {
  q: string;
  papel: Papel | '';
  acesso: SimNao;
  pago: SimNao;
  bloqueado: SimNao;
  inativoDias: string;
  incluirExcluidos: boolean;
}
const VAZIO: Filtros = { q: '', papel: '', acesso: '', pago: '', bloqueado: '', inativoDias: '', incluirExcluidos: false };
const SIM_NAO = [
  { valor: 'true', rotulo: 'Sim' },
  { valor: 'false', rotulo: 'Não' },
];
const OPCOES_PAPEL = PAPEIS.map((p) => ({ valor: p, rotulo: NOMES_PAPEL[p] }));

function consultaDe(f: Filtros, pagina: number): SuperUsuariosQuery {
  return {
    pagina,
    porPagina: 20,
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
    ...(f.papel ? { papel: f.papel } : {}),
    ...(f.acesso ? { acesso: f.acesso } : {}),
    ...(f.pago ? { pago: f.pago } : {}),
    ...(f.bloqueado ? { bloqueado: f.bloqueado } : {}),
    ...(Number(f.inativoDias) > 0 ? { inativoDias: Number(f.inativoDias) } : {}),
    ...(f.incluirExcluidos ? { incluirExcluidos: 'true' } : {}),
  } as SuperUsuariosQuery;
}

function CamposFiltro({ f, mudar }: { f: Filtros; mudar: (p: Partial<Filtros>) => void }) {
  return (
    <>
      <CampoSelecao rotulo="Papel" value={f.papel} vazio="Todos" opcoes={OPCOES_PAPEL} onChange={(e) => mudar({ papel: e.target.value as Filtros['papel'] })} />
      <CampoSelecao rotulo="Com acesso" value={f.acesso} vazio="Tanto faz" opcoes={SIM_NAO} onChange={(e) => mudar({ acesso: e.target.value as SimNao })} />
      <CampoSelecao rotulo="Pagou" value={f.pago} vazio="Tanto faz" opcoes={SIM_NAO} onChange={(e) => mudar({ pago: e.target.value as SimNao })} />
      <CampoSelecao rotulo="Bloqueado" value={f.bloqueado} vazio="Tanto faz" opcoes={SIM_NAO} onChange={(e) => mudar({ bloqueado: e.target.value as SimNao })} />
      <CampoTexto rotulo="Inativo há (dias)" type="number" min={1} max={365} inputMode="numeric" value={f.inativoDias} onChange={(e) => mudar({ inativoDias: e.target.value })} />
      <Marcar rotulo="Incluir excluídos (LGPD)" checked={f.incluirExcluidos} onChange={(e) => mudar({ incluirExcluidos: e.target.checked })} />
    </>
  );
}

function Selos({ u }: { u: UsuarioSuperResumo }) {
  return (
    <span className={a.acoes} style={{ gap: 4 }}>
      <Selo tom={tomPapel(u.papel)}>{NOMES_PAPEL[u.papel]}</Selo>
      {u.excluidoEm ? <Selo tom="neutro">Excluído</Selo> : u.acesso ? <Selo tom="sucesso">Com acesso</Selo> : <Selo tom="aviso">Sem acesso</Selo>}
      {u.bloqueado ? <Selo tom="erro">Bloqueado</Selo> : null}
    </span>
  );
}

export default function Usuarios() {
  const celular = useCelular();
  const [f, setF] = useState<Filtros>(VAZIO);
  const [pagina, setPagina] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const mudar = (p: Partial<Filtros>) => {
    setF((x) => ({ ...x, ...p }));
    setPagina(1);
  };
  const q = consultaDe(f, pagina);
  const consulta = useQuery({ queryKey: ['super', 'usuarios', q], queryFn: () => api('superUsuariosListar', { query: q }), placeholderData: keepPreviousData });
  const csv = useMutation({ mutationFn: () => api('superUsuariosCsv', { query: q }), onSuccess: baixarCsv });
  const ativos = [f.papel, f.acesso, f.pago, f.bloqueado, f.inativoDias, f.incluirExcluidos].filter(Boolean).length;

  return (
    <Pagina
      titulo="Usuários"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Usuários' }]}
      acoes={
        <>
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
          <Botao onClick={() => csv.mutate()} carregando={csv.isPending}>
            <Icone nome="baixar" tamanho={18} /> Exportar CSV
          </Botao>
        </>
      }
    >
      <form role="search" aria-label="Buscar usuários" className={celular ? s.barraFiltros : a.filtros} onSubmit={(e) => e.preventDefault()}>
        {celular ? (
          <>
            <input
              className={a.entrada}
              type="search"
              aria-label="Buscar por nome, e-mail ou CPF"
              placeholder="Nome, e-mail ou CPF"
              value={f.q}
              onChange={(e) => mudar({ q: e.target.value })}
            />
            <Botao onClick={() => setFiltrosAbertos(true)} aria-label={`Filtros${ativos ? ` (${ativos} ativo(s))` : ''}`}>
              <Icone nome="filtro" tamanho={18} />
              {ativos ? ` ${ativos}` : ''}
            </Botao>
          </>
        ) : (
          <>
            <CampoTexto rotulo="Buscar" type="search" placeholder="Nome, e-mail ou CPF" value={f.q} onChange={(e) => mudar({ q: e.target.value })} />
            <CamposFiltro f={f} mudar={mudar} />
          </>
        )}
      </form>
      <Folha
        titulo="Filtros"
        aberta={filtrosAbertos}
        aoFechar={() => setFiltrosAbertos(false)}
        rodape={
          <>
            <Botao onClick={() => mudar({ ...VAZIO, q: f.q })}>Limpar</Botao>
            <Botao variante="primario" onClick={() => setFiltrosAbertos(false)}>
              Aplicar
            </Botao>
          </>
        }
      >
        <div className={a.formulario}>
          <CamposFiltro f={f} mudar={mudar} />
        </div>
      </Folha>
      {csv.isError ? <Alerta tom="erro">{mensagemDeErro(csv.error)}</Alerta> : null}
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum usuário com esses filtros.">
        {(d) => (
          <>
            {celular ? (
              <Cartoes rotulo="Usuários">
                {d.itens.map((u) => (
                  <CartaoLinha
                    key={u.id}
                    para={caminho(`usuarios/${u.id}`)}
                    titulo={u.nome}
                    sub={u.email}
                    extra={
                      <div style={{ marginTop: 4 }}>
                        <Selos u={u} />
                      </div>
                    }
                  />
                ))}
              </Cartoes>
            ) : (
              <Tabela rotulo="Usuários">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Situação</th>
                    <th className={a.direita}>XP</th>
                    <th className={a.direita}>Ofensiva</th>
                    <th>Última atividade</th>
                    <th>Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {d.itens.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link className={a.link} to={caminho(`usuarios/${u.id}`)}>
                          {u.nome}
                        </Link>
                        <div className={a.suave}>{u.email}</div>
                      </td>
                      <td className={a.mono}>{cpfMascarado(u.cpfOculto)}</td>
                      <td>
                        <Selos u={u} />
                      </td>
                      <td className={a.direita}>{numero(u.xpTotal)}</td>
                      <td className={a.direita}>{numero(u.ofensiva)}</td>
                      <td>{dataHora(u.ultimaAtividadeEm)}</td>
                      <td>{dataHora(u.criadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={setPagina} />
          </>
        )}
      </Consulta>
    </Pagina>
  );
}
