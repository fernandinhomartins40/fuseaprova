import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ACOES_AUDITORIA } from '@fuse/shared/api';
import { api } from '../api';
import { Cabecalho, CampoSelecao, Consulta, estilos as s, Paginacao, Tabela } from '../componentes/ui';
import { dataHora, NOMES_ACAO_AUDITORIA } from '../util';

export default function Auditoria() {
  const [acao, setAcao] = useState('');
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ['admin', 'auditoria', acao, pagina],
    queryFn: () => api('adminAuditoria', { query: { pagina, porPagina: 50, acao: acao || undefined } }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <Cabecalho titulo="Auditoria" subtitulo="Todas as ações administrativas, com quem fez e quando." />
      <div className={s.filtros}>
        <CampoSelecao
          rotulo="Ação"
          vazio="Todas"
          value={acao}
          opcoes={ACOES_AUDITORIA.map((a) => ({ valor: a, rotulo: NOMES_ACAO_AUDITORIA[a] ?? a }))}
          onChange={(e) => {
            setAcao(e.target.value);
            setPagina(1);
          }}
        />
      </div>
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhuma ação registrada.">
        {(d) => (
          <>
            <Tabela rotulo="Ações administrativas">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Ação</th>
                  <th>Alvo</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((i) => (
                  <tr key={i.id}>
                    <td className={s.suave}>{dataHora(i.criadoEm)}</td>
                    <td>{i.admin?.nome ?? 'Sistema'}</td>
                    <td>
                      {NOMES_ACAO_AUDITORIA[i.acao] ?? i.acao}
                      <div className={`${s.mono} ${s.suave}`}>{i.acao}</div>
                    </td>
                    <td className={s.mono}>{i.alvo ?? '—'}</td>
                    <td>
                      {i.detalhes && Object.keys(i.detalhes).length ? (
                        <details className={s.detalhes}>
                          <summary>Ver</summary>
                          <pre className={s.pre}>{JSON.stringify(i.detalhes, null, 2)}</pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={setPagina} />
          </>
        )}
      </Consulta>
    </>
  );
}
