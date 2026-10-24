import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { STATUS_IMPORTACAO, type StatusImportacao } from '@fuse/shared';
import type { ImportacaoDetalhe } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../api';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoSelecao,
  Cartao,
  Consulta,
  estilos as s,
  Modal,
  Paginacao,
  Selo,
  Tabela,
  TituloSecao,
} from '../componentes/ui';
import { BASE_ADMIN, dataHora, NOMES_STATUS_IMPORTACAO, type TomSelo } from '../util';

const TOM: Record<StatusImportacao, TomSelo> = {
  baixado: 'neutro',
  extraido: 'info',
  confrontado: 'destaque',
  concluido: 'sucesso',
  erro: 'erro',
};

type LinhaConfronto = ImportacaoDetalhe['confronto'][number];

/** Divergência: anulada no definitivo, sem gabarito, sem questão extraída ou com observação do coletor. */
export function ehDivergencia(l: LinhaConfronto): boolean {
  return (
    l.gabaritoDefinitivo === null ||
    l.gabaritoDefinitivo === 'ANULADA' ||
    l.questaoId === null ||
    (l.observacao !== null && l.observacao.trim() !== '')
  );
}

export default function Importacoes() {
  const { id } = useParams();
  return id ? <DetalheImportacao id={id} /> : <FilaImportacao />;
}

function FilaImportacao() {
  const [status, setStatus] = useState<StatusImportacao | ''>('');
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ['admin', 'importacoes', status, pagina],
    queryFn: () => api('adminImportacoesListar', { query: { pagina, porPagina: 25, status: status || undefined } }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <Cabecalho
        titulo="Importação"
        subtitulo="Fila do coletor: PDFs baixados, questões extraídas e confronto com o gabarito definitivo. Tudo entra como rascunho."
      />
      <div className={s.filtros}>
        <CampoSelecao
          rotulo="Status"
          vazio="Todos"
          value={status}
          opcoes={STATUS_IMPORTACAO.map((st) => ({ valor: st, rotulo: NOMES_STATUS_IMPORTACAO[st] }))}
          onChange={(e) => {
            setStatus(e.target.value as StatusImportacao | '');
            setPagina(1);
          }}
        />
      </div>
      <Consulta consulta={consulta} vazio={(d) => d.itens.length === 0} textoVazio="A fila do coletor está vazia.">
        {(d) => (
          <>
            <Tabela rotulo="Fila de importação">
              <thead>
                <tr>
                  <th>Prova</th>
                  <th>Arquivos</th>
                  <th>Extraídas</th>
                  <th>Divergências</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((i) => (
                  <tr key={i.id} className={i.divergencias > 0 ? s.linhaDestaque : undefined}>
                    <td>
                      {i.provaOrigem ? (
                        <>
                          <strong>{i.provaOrigem.orgao}</strong>
                          <div className={s.suave}>
                            {[i.provaOrigem.ano, i.provaOrigem.cargo].filter(Boolean).join(' · ')}
                          </div>
                        </>
                      ) : (
                        <span className={s.suave}>Sem prova vinculada</span>
                      )}
                    </td>
                    <td className={s.mono}>
                      {i.arquivoCaderno ?? '—'}
                      <div className={s.suave}>{i.arquivoGabarito ?? 'sem gabarito'}</div>
                    </td>
                    <td>{i.questoesExtraidas}</td>
                    <td>{i.divergencias > 0 ? <Selo tom="aviso">{i.divergencias}</Selo> : '0'}</td>
                    <td>
                      <Selo tom={TOM[i.status]}>{NOMES_STATUS_IMPORTACAO[i.status]}</Selo>
                    </td>
                    <td className={s.suave}>{dataHora(i.atualizadoEm)}</td>
                    <td>
                      <Link className={s.link} to={`${BASE_ADMIN}/importacao/${i.id}`}>
                        Abrir
                      </Link>
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

function DetalheImportacao({ id }: { id: string }) {
  const qc = useQueryClient();
  const navegar = useNavigate();
  const [acao, setAcao] = useState<'aprovar' | 'descartar' | null>(null);
  const [soDivergencias, setSoDivergencias] = useState(false);
  const consulta = useQuery({
    queryKey: ['admin', 'importacoes', 'item', id],
    queryFn: () => api('adminImportacaoObter', { params: { id } }),
  });

  const executar = useMutation({
    mutationFn: async (tipo: 'aprovar' | 'descartar') => {
      const d = consulta.data;
      if (!d) throw new Error('sem dados');
      const ids = d.confronto
        .filter((l) => l.questaoId && l.gabaritoDefinitivo !== 'ANULADA')
        .map((l) => l.questaoId as string);
      const anuladas = d.confronto
        .filter((l) => l.questaoId && l.gabaritoDefinitivo === 'ANULADA')
        .map((l) => l.questaoId as string);
      if (tipo === 'aprovar') {
        if (ids.length) await api('adminQuestoesLote', { corpo: { ids, acao: 'revisao' } });
        if (anuladas.length) {
          await api('adminQuestoesLote', {
            corpo: { ids: anuladas, acao: 'anular', motivo: 'Anulada no gabarito definitivo da banca.' },
          });
        }
        return api('adminImportacaoAtualizar', { params: { id }, corpo: { status: 'concluido' } });
      }
      const todas = [...ids, ...anuladas];
      if (todas.length) {
        await api('adminQuestoesLote', {
          corpo: { ids: todas, acao: 'retirar', motivo: 'Importação descartada no painel.' },
        });
      }
      return api('adminImportacaoAtualizar', { params: { id }, corpo: { status: 'erro' } });
    },
    onSuccess: (d) => {
      qc.setQueryData(['admin', 'importacoes', 'item', id], d);
      void qc.invalidateQueries({ queryKey: ['admin', 'importacoes'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'questoes'] });
      setAcao(null);
    },
  });

  return (
    <>
      <Cabecalho
        titulo="Importação"
        acoes={
          <Botao onClick={() => navegar(`${BASE_ADMIN}/importacao`)}>Voltar à fila</Botao>
        }
      />
      <Consulta consulta={consulta}>
        {(d) => {
          const divergentes = d.confronto.filter(ehDivergencia);
          const linhas = soDivergencias ? divergentes : d.confronto;
          const finalizada = d.status === 'concluido' || d.status === 'erro';
          return (
            <>
              {executar.isSuccess ? (
                <Alerta tom="sucesso">
                  {executar.variables === 'aprovar'
                    ? 'Questões enviadas para revisão. Publique pelo editor depois de revisar dica e explicação.'
                    : 'Importação descartada. As questões extraídas foram retiradas.'}
                </Alerta>
              ) : null}
              <Cartao>
                <dl className={s.dl}>
                  <dt>Prova</dt>
                  <dd>
                    {d.provaOrigem
                      ? [d.provaOrigem.orgao, d.provaOrigem.ano, d.provaOrigem.cargo].filter(Boolean).join(' · ')
                      : 'Sem prova vinculada'}
                  </dd>
                  <dt>Status</dt>
                  <dd>
                    <Selo tom={TOM[d.status]}>{NOMES_STATUS_IMPORTACAO[d.status]}</Selo>
                  </dd>
                  <dt>Caderno</dt>
                  <dd className={s.mono}>{d.arquivoCaderno ?? '—'}</dd>
                  <dt>Gabarito definitivo</dt>
                  <dd className={s.mono}>{d.arquivoGabarito ?? '—'}</dd>
                  <dt>Questões extraídas</dt>
                  <dd>{d.questoesExtraidas}</dd>
                  <dt>Divergências</dt>
                  <dd>{divergentes.length}</dd>
                  <dt>Criada</dt>
                  <dd>{dataHora(d.criadoEm)}</dd>
                </dl>
                {d.log ? (
                  <details className={s.detalhes}>
                    <summary>Log do coletor</summary>
                    <pre className={s.pre}>{d.log}</pre>
                  </details>
                ) : null}
                <div className={s.modalRodape}>
                  <Botao variante="perigo" disabled={finalizada} onClick={() => setAcao('descartar')}>
                    Descartar
                  </Botao>
                  <Botao variante="primario" disabled={finalizada} onClick={() => setAcao('aprovar')}>
                    Aprovar para revisão
                  </Botao>
                </div>
              </Cartao>

              <div className={s.cabecalho}>
                <TituloSecao>Confronto com o gabarito definitivo</TituloSecao>
                <label className={s.marcar}>
                  <input type="checkbox" checked={soDivergencias} onChange={(e) => setSoDivergencias(e.target.checked)} />
                  <span>Só divergências ({divergentes.length})</span>
                </label>
              </div>
              {linhas.length === 0 ? (
                <Alerta tom="info">Nenhuma linha para mostrar.</Alerta>
              ) : (
                <Tabela rotulo="Confronto">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Gabarito definitivo</th>
                      <th>Questão extraída</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => {
                      const div = ehDivergencia(l);
                      return (
                        <tr key={l.numero} className={div ? s.linhaDestaque : undefined} data-divergencia={div || undefined}>
                          <td>
                            <strong>{String(l.numero).padStart(2, '0')}</strong>
                          </td>
                          <td>
                            {l.gabaritoDefinitivo === 'ANULADA' ? (
                              <Selo tom="aviso">Anulada</Selo>
                            ) : l.gabaritoDefinitivo ? (
                              <strong>{l.gabaritoDefinitivo}</strong>
                            ) : (
                              <Selo tom="erro">Sem gabarito</Selo>
                            )}
                          </td>
                          <td>
                            {l.questaoId ? (
                              <Link className={s.link} to={`${BASE_ADMIN}/questoes/${l.questaoId}`}>
                                Abrir no editor
                              </Link>
                            ) : (
                              <Selo tom="erro">Não extraída</Selo>
                            )}
                          </td>
                          <td>{l.observacao ?? (div ? 'Conferir manualmente.' : '—')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
              )}
            </>
          );
        }}
      </Consulta>

      <Modal
        titulo={acao === 'aprovar' ? 'Aprovar para revisão?' : 'Descartar a importação?'}
        aberto={acao !== null}
        aoFechar={() => setAcao(null)}
        rodape={
          <>
            <Botao data-fechar onClick={() => setAcao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante={acao === 'descartar' ? 'perigo' : 'primario'}
              carregando={executar.isPending}
              onClick={() => acao && executar.mutate(acao)}
            >
              Confirmar
            </Botao>
          </>
        }
      >
        {acao === 'aprovar' ? (
          <p>
            As questões extraídas passam de rascunho para <strong>em revisão</strong> (as anuladas no definitivo
            viram <strong>anuladas</strong>). Nada é publicado: cada questão ainda precisa de dica, explicação e
            revisão humana no editor.
          </p>
        ) : (
          <p>As questões extraídas desta importação são retiradas e a importação sai da fila.</p>
        )}
        {executar.isError ? <Alerta tom="erro">{mensagemDeErro(executar.error)}</Alerta> : null}
      </Modal>
    </>
  );
}
