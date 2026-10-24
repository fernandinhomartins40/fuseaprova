import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AREAS_CARGO, NOMES_AREA, SLUGS_DISCIPLINA, type SlugDisciplina } from '@fuse/shared';
import type { QuestoesLoteEntrada, QuestoesLoteResposta, QuestoesQuery } from '@fuse/shared/api';
import { api, mensagemDeErro } from '../api';
import { useAssuntos, useDisciplinas } from '../consultas';
import { PreviaPergunta } from '../componentes/PreviaPergunta';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  CampoTexto,
  Consulta,
  estilos as s,
  Marcar,
  Modal,
  opcoesDe,
  Paginacao,
  Selo,
  Tabela,
  Carregando,
  ErroCaixa,
} from '../componentes/ui';
import {
  BASE_ADMIN,
  dataHora,
  juntarClasses,
  NOMES_DIFICULDADE,
  NOMES_ORIGEM,
  NOMES_STATUS_QUESTAO,
  TOM_STATUS_QUESTAO,
} from '../util';

type Acao = QuestoesLoteEntrada['acao'];

const ROTULO_ACAO: Record<Acao, string> = {
  publicar: 'Publicar',
  retirar: 'Retirar',
  revisao: 'Mandar para revisão',
  rascunho: 'Voltar para rascunho',
  anular: 'Anular',
};

const FILTROS = [
  'q',
  'disciplina',
  'assuntoId',
  'status',
  'origem',
  'area',
  'dificuldade',
  'comReports',
  'provaOrigemId',
  'ordenar',
] as const;

const POR_PAGINA = 25;

function lerFiltros(p: URLSearchParams): QuestoesQuery {
  const q: Record<string, string> = {};
  for (const f of FILTROS) {
    const v = p.get(f);
    if (v) q[f] = v;
  }
  return { ...q, pagina: Number(p.get('pagina') ?? 1) || 1, porPagina: POR_PAGINA } as QuestoesQuery;
}

export default function Questoes() {
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(() => lerFiltros(params), [params]);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [acaoPendente, setAcaoPendente] = useState<Acao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [resultado, setResultado] = useState<{ acao: Acao; r: QuestoesLoteResposta } | null>(null);
  const [previaId, setPreviaId] = useState<string | null>(null);
  const qc = useQueryClient();

  const disciplinas = useDisciplinas();
  const assuntos = useAssuntos(filtros.disciplina as SlugDisciplina | undefined);

  const lista = useQuery({
    queryKey: ['admin', 'questoes', filtros],
    queryFn: () => api('adminQuestoesListar', { query: filtros }),
    placeholderData: keepPreviousData,
  });

  const lote = useMutation({
    mutationFn: (corpo: QuestoesLoteEntrada) => api('adminQuestoesLote', { corpo }),
    onSuccess: (r, corpo) => {
      setResultado({ acao: corpo.acao, r });
      setSelecao(new Set());
      setAcaoPendente(null);
      setMotivo('');
      void qc.invalidateQueries({ queryKey: ['admin', 'questoes'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'painel'] });
    },
  });

  function mudarFiltro(nome: (typeof FILTROS)[number], valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(nome, valor);
    else novo.delete(nome);
    if (nome === 'disciplina') novo.delete('assuntoId');
    novo.delete('pagina');
    setParams(novo);
    setSelecao(new Set());
  }

  function mudarPagina(p: number) {
    const novo = new URLSearchParams(params);
    novo.set('pagina', String(p));
    setParams(novo);
  }

  function limpar() {
    setParams(new URLSearchParams());
    setSelecao(new Set());
  }

  function alternar(id: string) {
    setSelecao((atual) => {
      const n = new Set(atual);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const itens = lista.data?.itens ?? [];
  const todosMarcados = itens.length > 0 && itens.every((q) => selecao.has(q.id));

  function alternarTodos() {
    setSelecao((atual) => {
      const n = new Set(atual);
      if (todosMarcados) itens.forEach((q) => n.delete(q.id));
      else itens.forEach((q) => n.add(q.id));
      return n;
    });
  }

  function pedirAcao(acao: Acao) {
    lote.reset();
    setResultado(null);
    setMotivo('');
    setAcaoPendente(acao);
  }

  const exigeMotivo = acaoPendente === 'anular' || acaoPendente === 'retirar';
  const motivoOk = !exigeMotivo || motivo.trim().length >= 3;

  function confirmarAcao() {
    if (!acaoPendente || !motivoOk) return;
    lote.mutate({
      ids: [...selecao],
      acao: acaoPendente,
      ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
    });
  }

  const opDisciplinas = (disciplinas.data?.itens ?? []).map((d) => ({ valor: d.slug, rotulo: d.nome }));
  const opAssuntos = (assuntos.data?.itens ?? []).map((a) => ({ valor: a.id, rotulo: a.nome }));

  return (
    <>
      <Cabecalho
        titulo="Questões"
        subtitulo="Banco de questões. Publicar exige dica, explicação, dica de bolso e revisão humana."
        acoes={
          <Link className={juntarClasses(s.botao, s.primario)} to={`${BASE_ADMIN}/questoes/nova`}>
            Nova questão
          </Link>
        }
      />

      <form className={s.filtros} role="search" aria-label="Filtros de questões" onSubmit={(e) => e.preventDefault()}>
        <CampoTexto
          rotulo="Buscar no enunciado"
          type="search"
          defaultValue={filtros.q ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') mudarFiltro('q', e.currentTarget.value.trim());
          }}
          onBlur={(e) => {
            if (e.currentTarget.value.trim() !== (filtros.q ?? '')) mudarFiltro('q', e.currentTarget.value.trim());
          }}
        />
        <CampoSelecao
          rotulo="Disciplina"
          vazio="Todas"
          value={filtros.disciplina ?? ''}
          opcoes={opDisciplinas.length ? opDisciplinas : SLUGS_DISCIPLINA.map((d) => ({ valor: d, rotulo: d }))}
          onChange={(e) => mudarFiltro('disciplina', e.target.value)}
        />
        <CampoSelecao
          rotulo="Assunto"
          vazio="Todos"
          value={filtros.assuntoId ?? ''}
          opcoes={opAssuntos}
          onChange={(e) => mudarFiltro('assuntoId', e.target.value)}
        />
        <CampoSelecao
          rotulo="Status"
          vazio="Todos"
          value={filtros.status ?? ''}
          opcoes={opcoesDe(NOMES_STATUS_QUESTAO)}
          onChange={(e) => mudarFiltro('status', e.target.value)}
        />
        <CampoSelecao
          rotulo="Origem"
          vazio="Todas"
          value={filtros.origem ?? ''}
          opcoes={opcoesDe(NOMES_ORIGEM)}
          onChange={(e) => mudarFiltro('origem', e.target.value)}
        />
        <CampoSelecao
          rotulo="Área"
          vazio="Todas"
          value={filtros.area ?? ''}
          opcoes={AREAS_CARGO.map((a) => ({ valor: a, rotulo: NOMES_AREA[a] }))}
          onChange={(e) => mudarFiltro('area', e.target.value)}
        />
        <CampoSelecao
          rotulo="Dificuldade"
          vazio="Todas"
          value={filtros.dificuldade !== undefined ? String(filtros.dificuldade) : ''}
          opcoes={opcoesDe(NOMES_DIFICULDADE as Record<string, string>)}
          onChange={(e) => mudarFiltro('dificuldade', e.target.value)}
        />
        <CampoSelecao
          rotulo="Ordenar"
          value={filtros.ordenar ?? 'recentes'}
          opcoes={[
            { valor: 'recentes', rotulo: 'Mais recentes' },
            { valor: 'antigas', rotulo: 'Mais antigas' },
            { valor: 'numero', rotulo: 'Número na prova' },
            { valor: 'reports', rotulo: 'Mais reports' },
          ]}
          onChange={(e) => mudarFiltro('ordenar', e.target.value === 'recentes' ? '' : e.target.value)}
        />
        <Marcar
          rotulo="Só com reports"
          checked={filtros.comReports === 'true'}
          onChange={(e) => mudarFiltro('comReports', e.target.checked ? 'true' : '')}
        />
        <Botao variante="fantasma" onClick={limpar}>
          Limpar filtros
        </Botao>
      </form>

      {resultado ? (
        <Alerta tom={resultado.r.ignoradas.length ? 'aviso' : 'sucesso'}>
          {ROTULO_ACAO[resultado.acao]}: {resultado.r.atualizadas}{' '}
          {resultado.r.atualizadas === 1 ? 'questão atualizada' : 'questões atualizadas'}.
          {resultado.r.ignoradas.length ? (
            <>
              {' '}
              {resultado.r.ignoradas.length} {resultado.r.ignoradas.length === 1 ? 'ignorada' : 'ignoradas'}:
              <ul>
                {resultado.r.ignoradas.map((i) => (
                  <li key={i.id}>
                    <Link className={s.link} to={`${BASE_ADMIN}/questoes/${i.id}`}>
                      {i.id.slice(0, 8)}
                    </Link>
                    : {i.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Alerta>
      ) : null}

      {selecao.size > 0 ? (
        <div className={s.barraLote} role="toolbar" aria-label="Ações em lote">
          <span>
            {selecao.size} {selecao.size === 1 ? 'selecionada' : 'selecionadas'}
          </span>
          {(Object.keys(ROTULO_ACAO) as Acao[]).map((a) => (
            <Botao key={a} pequeno variante={a === 'publicar' ? 'primario' : 'secundario'} onClick={() => pedirAcao(a)}>
              {ROTULO_ACAO[a]}
            </Botao>
          ))}
          <Botao pequeno variante="fantasma" onClick={() => setSelecao(new Set())}>
            Limpar seleção
          </Botao>
        </div>
      ) : null}

      <Consulta
        consulta={lista}
        vazio={(d) => d.itens.length === 0}
        textoVazio="Nenhuma questão com esses filtros."
      >
        {(d) => (
          <>
            <Tabela rotulo="Lista de questões">
              <thead>
                <tr>
                  <th className={s.colunaMarcar}>
                    <input
                      type="checkbox"
                      aria-label="Selecionar todas desta página"
                      checked={todosMarcados}
                      onChange={alternarTodos}
                    />
                  </th>
                  <th>Questão</th>
                  <th>Disciplina / assunto</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Dif.</th>
                  <th>Reports</th>
                  <th>Atualizada</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {d.itens.map((q) => (
                  <tr key={q.id} className={selecao.has(q.id) ? s.linhaSelecionada : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar questão ${q.trecho.slice(0, 40)}`}
                        checked={selecao.has(q.id)}
                        onChange={() => alternar(q.id)}
                      />
                    </td>
                    <td>
                      <Link className={s.link} to={`${BASE_ADMIN}/questoes/${q.id}`}>
                        {q.trecho}
                      </Link>
                    </td>
                    <td>
                      {q.disciplina.nome}
                      <div className={s.suave}>{q.assunto.nome}</div>
                    </td>
                    <td>
                      {q.origem === 'fau_real' && q.provaOrigem ? (
                        <>
                          <Selo tom="destaque">FAU</Selo>
                          <div className={s.suave}>
                            {q.provaOrigem.orgao}
                            {q.provaOrigem.ano ? ` · ${q.provaOrigem.ano}` : ''}
                            {q.numeroOrigem ? ` · nº ${q.numeroOrigem}` : ''}
                          </div>
                        </>
                      ) : (
                        <Selo>{NOMES_ORIGEM[q.origem]}</Selo>
                      )}
                    </td>
                    <td>
                      <Selo tom={TOM_STATUS_QUESTAO[q.status]}>{NOMES_STATUS_QUESTAO[q.status]}</Selo>
                    </td>
                    <td>{q.dificuldade}</td>
                    <td>{q.reportsAbertos > 0 ? <Selo tom="erro">{q.reportsAbertos}</Selo> : '0'}</td>
                    <td className={s.suave}>{dataHora(q.atualizadoEm)}</td>
                    <td>
                      <Botao pequeno variante="fantasma" onClick={() => setPreviaId(q.id)}>
                        Prévia
                      </Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
            <Paginacao pagina={d.pagina} porPagina={d.porPagina} total={d.total} aoMudar={mudarPagina} />
          </>
        )}
      </Consulta>

      <Modal
        titulo={acaoPendente ? `${ROTULO_ACAO[acaoPendente]} ${selecao.size} ${selecao.size === 1 ? 'questão' : 'questões'}?` : ''}
        aberto={acaoPendente !== null}
        aoFechar={() => setAcaoPendente(null)}
        rodape={
          <>
            <Botao data-fechar onClick={() => setAcaoPendente(null)}>
              Cancelar
            </Botao>
            <Botao
              variante={acaoPendente === 'publicar' ? 'primario' : acaoPendente === 'retirar' || acaoPendente === 'anular' ? 'perigo' : 'primario'}
              disabled={!motivoOk}
              carregando={lote.isPending}
              onClick={confirmarAcao}
            >
              Confirmar
            </Botao>
          </>
        }
      >
        {acaoPendente === 'publicar' ? (
          <p>
            Só são publicadas as questões com dica, explicação, dica de bolso e revisão humana. As
            outras ficam de fora e aparecem na lista de ignoradas.
          </p>
        ) : null}
        {acaoPendente === 'retirar' ? (
          <p>As questões retiradas somem do app do aluno no próximo carregamento, inclusive offline.</p>
        ) : null}
        {exigeMotivo ? (
          <CampoArea
            rotulo="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            erro={motivo && !motivoOk ? 'Informe o motivo.' : undefined}
            ajuda="Fica registrado na auditoria."
          />
        ) : null}
        {lote.isError ? <Alerta tom="erro">{mensagemDeErro(lote.error)}</Alerta> : null}
      </Modal>

      <ModalPrevia id={previaId} aoFechar={() => setPreviaId(null)} />
    </>
  );
}

function ModalPrevia({ id, aoFechar }: { id: string | null; aoFechar: () => void }) {
  const previa = useQuery({
    queryKey: ['admin', 'questoes', 'previa', id],
    queryFn: () => api('adminQuestaoPrevia', { params: { id: id as string } }),
    enabled: id !== null,
  });
  return (
    <Modal titulo="Pré-visualização" aberto={id !== null} aoFechar={aoFechar} rodape={<Botao onClick={aoFechar}>Fechar</Botao>}>
      {previa.isPending ? (
        <Carregando />
      ) : previa.isError || !previa.data ? (
        <ErroCaixa erro={previa.error} />
      ) : (
        <PreviaPergunta
          dados={{
            origem: previa.data.questao.origem,
            chipOrigem: previa.data.questao.chipOrigem,
            disciplina: previa.data.questao.disciplina.nome,
            assunto: previa.data.questao.assunto.nome,
            textoApoio: previa.data.questao.textoApoio,
            enunciado: previa.data.questao.enunciado,
            alternativas: previa.data.questao.alternativas,
            gabarito: previa.data.gabarito,
            explicacao: previa.data.explicacao,
            dicaBolso: previa.data.dicaBolso,
            dica: previa.data.dica,
          }}
        />
      )}
    </Modal>
  );
}
