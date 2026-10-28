/**
 * /super/auditoria (D13): tudo o que admins e superadmins fizeram (quem, o quê, alvo, motivo,
 * IP, antes e depois), com filtros de ação, quem fez, alvo e período. No celular, os filtros vão
 * para uma folha, com o período também (S-25, R2-15).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ACOES_AUDITORIA, type AuditoriaSuperItem, type SuperAuditoriaQuery } from '@fuse/shared/api';
import { api } from '../../admin/api';
import { Botao, CampoSelecao, CampoTexto, Consulta, Paginacao, estilos as a } from '../../admin/componentes/ui';
import { dataHora, NOMES_ACAO_AUDITORIA } from '../../admin/util';
import { BotaoAtualizar, CartaoLinha, Cartoes, Folha, Pagina, estilosSuper as s, useCelular } from '../componentes';
import { Icone } from '../icones';
import { caminho } from '../util';

type Filtros = { acao: string; adminId: string; alvo: string; de: string; ate: string };
const VAZIOS: Filtros = { acao: '', adminId: '', alvo: '', de: '', ate: '' };

function CamposFiltro({ f, mudar }: { f: Filtros; mudar: (p: Partial<Filtros>) => void }) {
  const equipe = useQuery({ queryKey: ['super', 'equipe'], queryFn: () => api('superEquipe'), staleTime: 5 * 60_000 });
  return (
    <>
      <CampoSelecao rotulo="Ação" value={f.acao} vazio="Todas" opcoes={ACOES_AUDITORIA.map((v) => ({ valor: v, rotulo: nomeAcao(v) }))} onChange={(e) => mudar({ acao: e.target.value })} />
      <CampoSelecao
        rotulo="Quem fez"
        value={f.adminId}
        vazio="Todos"
        opcoes={(equipe.data?.itens ?? []).map((m) => ({ valor: m.id, rotulo: m.nome }))}
        onChange={(e) => mudar({ adminId: e.target.value })}
        erro={equipe.isError ? 'Não foi possível carregar a equipe.' : undefined}
      />
      <CampoTexto rotulo="Alvo" placeholder="usuario:…, pedido:…" value={f.alvo} onChange={(e) => mudar({ alvo: e.target.value })} />
      <CampoTexto rotulo="De" type="date" value={f.de} onChange={(e) => mudar({ de: e.target.value })} />
      <CampoTexto rotulo="Até" type="date" value={f.ate} onChange={(e) => mudar({ ate: e.target.value })} />
    </>
  );
}

const nomeAcao = (acao: string) => NOMES_ACAO_AUDITORIA[acao] ?? acao;

function Detalhe({ item, aoFechar }: { item: AuditoriaSuperItem; aoFechar: () => void }) {
  return (
    <Folha titulo={nomeAcao(item.acao)} aberta aoFechar={aoFechar} larga>
      <dl className={a.dl}>
        <dt>Quando</dt>
        <dd>{dataHora(item.criadoEm)}</dd>
        <dt>Quem</dt>
        <dd>{item.admin?.nome ?? 'Sistema'}</dd>
        <dt>Ação</dt>
        <dd className={a.mono}>{item.acao}</dd>
        <dt>Alvo</dt>
        <dd className={a.mono}>{item.alvo ?? '—'}</dd>
        <dt>Motivo</dt>
        <dd>{item.motivo ?? '—'}</dd>
        <dt>IP</dt>
        <dd className={a.mono}>{item.ip ?? '—'}</dd>
      </dl>
      {item.antes ? (
        <>
          <h3 className={a.secaoTitulo}>Antes</h3>
          <pre className={s.json}>{JSON.stringify(item.antes, null, 2)}</pre>
        </>
      ) : null}
      {item.depois ? (
        <>
          <h3 className={a.secaoTitulo}>Depois</h3>
          <pre className={s.json}>{JSON.stringify(item.depois, null, 2)}</pre>
        </>
      ) : null}
      {item.detalhes ? (
        <>
          <h3 className={a.secaoTitulo}>Detalhes</h3>
          <pre className={s.json}>{JSON.stringify(item.detalhes, null, 2)}</pre>
        </>
      ) : null}
    </Folha>
  );
}

export default function Auditoria() {
  const celular = useCelular();
  const [f, setF] = useState<Filtros>(VAZIOS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<AuditoriaSuperItem | null>(null);
  const mudar = (p: Partial<Filtros>) => {
    setF((x) => ({ ...x, ...p }));
    setPagina(1);
  };
  const q: SuperAuditoriaQuery = {
    pagina,
    porPagina: 25,
    ...(f.acao ? { acao: f.acao } : {}),
    ...(f.adminId ? { adminId: f.adminId } : {}),
    ...(f.alvo.trim() ? { alvo: f.alvo.trim() } : {}),
    ...(f.de ? { de: f.de } : {}),
    ...(f.ate ? { ate: f.ate } : {}),
  };
  const ativos = Object.values(f).filter((v) => v.trim()).length;
  const consulta = useQuery({ queryKey: ['super', 'auditoria', q], queryFn: () => api('superAuditoria', { query: q }), placeholderData: keepPreviousData });

  return (
    <Pagina
      titulo="Auditoria"
      trilha={[{ rotulo: 'Superadmin', para: caminho() }, { rotulo: 'Sistema', para: caminho('sistema') }, { rotulo: 'Auditoria' }]}
      acoes={
        <>
          {celular ? (
            <Botao onClick={() => setFiltrosAbertos(true)} aria-label={`Filtros${ativos ? ` (${ativos} ativo(s))` : ''}`}>
              <Icone nome="filtro" tamanho={18} /> Filtros{ativos ? ` (${ativos})` : ''}
            </Botao>
          ) : null}
          <BotaoAtualizar aoClicar={() => void consulta.refetch()} carregando={consulta.isFetching} />
        </>
      }
    >
      {celular ? (
        <Folha
          titulo="Filtros"
          aberta={filtrosAbertos}
          aoFechar={() => setFiltrosAbertos(false)}
          rodape={
            <>
              <Botao onClick={() => mudar(VAZIOS)}>Limpar</Botao>
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
      ) : (
        <form role="search" aria-label="Filtrar a auditoria" className={a.filtros} onSubmit={(e) => e.preventDefault()}>
          <CamposFiltro f={f} mudar={mudar} />
        </form>
      )}
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nada registrado com esses filtros.">
        {(d) => (
          <>
            {celular ? (
              <Cartoes rotulo="Registros de auditoria">
                {d.itens.map((x) => (
                  <CartaoLinha key={x.id} aoTocar={() => setAberto(x)} titulo={nomeAcao(x.acao)} sub={`${dataHora(x.criadoEm)} · ${x.admin?.nome ?? 'Sistema'}`} />
                ))}
              </Cartoes>
            ) : (
              <div className={a.tabelaCaixa}>
                <table className={a.tabela} aria-label="Registros de auditoria">
                  <thead>
                    <tr>
                      <th>Quando</th>
                      <th>Quem</th>
                      <th>Ação</th>
                      <th>Alvo</th>
                      <th>Motivo</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.itens.map((x) => (
                      <tr key={x.id} onClick={() => setAberto(x)} style={{ cursor: 'pointer' }}>
                        <td>{dataHora(x.criadoEm)}</td>
                        <td>{x.admin?.nome ?? 'Sistema'}</td>
                        <td>
                          <button type="button" className={a.link} style={{ background: 'none', border: 0, padding: 0, font: 'inherit' }} onClick={() => setAberto(x)}>
                            {nomeAcao(x.acao)}
                          </button>
                        </td>
                        <td className={a.mono}>{x.alvo ?? '—'}</td>
                        <td>{x.motivo ?? '—'}</td>
                        <td className={a.mono}>{x.ip ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={setPagina} />
          </>
        )}
      </Consulta>
      {aberto ? <Detalhe item={aberto} aoFechar={() => setAberto(null)} /> : null}
    </Pagina>
  );
}
