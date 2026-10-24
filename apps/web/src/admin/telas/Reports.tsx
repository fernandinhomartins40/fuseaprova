import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NOMES_TIPO_REPORT, type StatusReport, type TipoReport } from '@fuse/shared';
import type { ReportAdmin, ReportAtualizarEntrada } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../api';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  Consulta,
  estilos as s,
  Modal,
  opcoesDe,
  Paginacao,
  Selo,
  Tabela,
} from '../componentes/ui';
import {
  BASE_ADMIN,
  dataHora,
  NOMES_STATUS_QUESTAO,
  NOMES_STATUS_REPORT,
  TOM_STATUS_QUESTAO,
} from '../util';

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? 'aberto') as StatusReport | '';
  const tipo = (params.get('tipo') ?? '') as TipoReport | '';
  const questaoId = params.get('questaoId') ?? '';
  const pagina = Number(params.get('pagina') ?? 1) || 1;
  const [acao, setAcao] = useState<{ report: ReportAdmin; status: ReportAtualizarEntrada['status'] } | null>(null);
  const [nota, setNota] = useState('');
  const qc = useQueryClient();

  const consulta = useQuery({
    queryKey: ['admin', 'reports', status, tipo, questaoId, pagina],
    queryFn: () =>
      api('adminReportsListar', {
        query: {
          pagina,
          porPagina: 25,
          status: status || undefined,
          tipo: tipo || undefined,
          questaoId: questaoId || undefined,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const atualizar = useMutation({
    mutationFn: (v: { id: string; corpo: ReportAtualizarEntrada }) =>
      api('adminReportAtualizar', { params: { id: v.id }, corpo: v.corpo }),
    onSuccess: () => {
      setAcao(null);
      setNota('');
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'painel'] });
    },
  });

  function mudar(nome: string, valor: string) {
    const n = new URLSearchParams(params);
    n.set(nome, valor);
    if (!valor && nome !== 'status') n.delete(nome);
    n.delete('pagina');
    setParams(n);
  }

  return (
    <>
      <Cabecalho
        titulo="Reports"
        subtitulo="Problemas reportados pelos alunos. Três reports abertos na mesma questão tiram a questão do ar."
      />
      <div className={s.filtros}>
        <CampoSelecao
          rotulo="Status"
          vazio="Todos"
          value={status}
          opcoes={opcoesDe(NOMES_STATUS_REPORT)}
          onChange={(e) => mudar('status', e.target.value)}
        />
        <CampoSelecao
          rotulo="Tipo"
          vazio="Todos"
          value={tipo}
          opcoes={opcoesDe(NOMES_TIPO_REPORT)}
          onChange={(e) => mudar('tipo', e.target.value)}
        />
        {questaoId ? (
          <Botao variante="fantasma" onClick={() => mudar('questaoId', '')}>
            Ver de todas as questões
          </Botao>
        ) : null}
      </div>
      {atualizar.isSuccess ? <Alerta tom="sucesso">Report atualizado.</Alerta> : null}
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="Nenhum report nesta fila.">
        {(d) => (
          <>
            <Tabela rotulo="Fila de reports">
              <thead>
                <tr>
                  <th>Questão</th>
                  <th>Tipo</th>
                  <th>Relato</th>
                  <th>Aluno</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className={s.link} to={`${BASE_ADMIN}/questoes/${r.questao.id}`}>
                        {r.questao.trecho}
                      </Link>
                      <div>
                        <Selo tom={TOM_STATUS_QUESTAO[r.questao.status]}>{NOMES_STATUS_QUESTAO[r.questao.status]}</Selo>{' '}
                        <span className={s.suave}>{r.questao.reportsAbertos} abertos</span>
                      </div>
                    </td>
                    <td>{NOMES_TIPO_REPORT[r.tipo]}</td>
                    <td>{r.texto ?? <span className={s.suave}>Sem texto</span>}</td>
                    <td>{r.usuario?.nome ?? <span className={s.suave}>Conta excluída</span>}</td>
                    <td className={s.suave}>{dataHora(r.criadoEm)}</td>
                    <td>
                      <Selo tom={r.status === 'aberto' ? 'aviso' : r.status === 'resolvido' ? 'sucesso' : 'neutro'}>
                        {NOMES_STATUS_REPORT[r.status]}
                      </Selo>
                    </td>
                    <td>
                      {r.status === 'aberto' ? (
                        <div className={s.acoes}>
                          <Botao pequeno variante="primario" onClick={() => setAcao({ report: r, status: 'resolvido' })}>
                            Resolver
                          </Botao>
                          <Botao pequeno onClick={() => setAcao({ report: r, status: 'descartado' })}>
                            Descartar
                          </Botao>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            <Paginacao
              pagina={d.pagina}
              porPagina={d.porPagina}
              total={d.total}
              aoMudar={(p) => {
                const n = new URLSearchParams(params);
                n.set('pagina', String(p));
                setParams(n);
              }}
            />
          </>
        )}
      </Consulta>
      <Modal
        titulo={acao?.status === 'resolvido' ? 'Marcar como resolvido?' : 'Descartar report?'}
        aberto={acao !== null}
        aoFechar={() => setAcao(null)}
        rodape={
          <>
            <Botao data-fechar onClick={() => setAcao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              carregando={atualizar.isPending}
              onClick={() =>
                acao &&
                atualizar.mutate({
                  id: acao.report.id,
                  corpo: { status: acao.status, ...(nota.trim() ? { nota: nota.trim() } : {}) },
                })
              }
            >
              Confirmar
            </Botao>
          </>
        }
      >
        {acao?.status === 'resolvido' ? (
          <p>
            Corrija a questão no editor antes de resolver.{' '}
            {acao ? (
              <Link className={s.link} to={`${BASE_ADMIN}/questoes/${acao.report.questao.id}`}>
                Abrir questão
              </Link>
            ) : null}
          </p>
        ) : (
          <p>Use quando o report não procede.</p>
        )}
        <CampoArea rotulo="Nota interna (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        {atualizar.isError ? <Alerta tom="erro">{mensagemDeErro(atualizar.error)}</Alerta> : null}
      </Modal>
    </>
  );
}
