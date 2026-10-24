import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AREAS_CARGO, NOMES_AREA, TIPOS_LICAO, type AreaCargo, type TipoLicao } from '@fuse/shared';
import type {
  AssuntoAdmin,
  LicaoAdmin,
  LicaoEntrada,
  ReordenarEntrada,
  SecaoAdmin,
  UnidadeAdmin,
} from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../api';
import { useAssuntos, useConcursos, useDisciplinas } from '../consultas';
import { ListaOrdenavel } from '../componentes/ListaOrdenavel';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  CampoTexto,
  Carregando,
  ErroCaixa,
  estilos as s,
  Modal,
  Selo,
  Vazio,
} from '../componentes/ui';
import { juntarClasses, NOMES_TIPO_LICAO } from '../util';
import t from './Trilhas.module.css';

const TIPO_ASSUNTO = 'application/x-fuse-assunto';

type FiltroArea = AreaCargo | 'comum';

const ordenar = <T extends { ordem: number }>(l: readonly T[]) => [...l].sort((a, b) => a.ordem - b.ordem);

function normalizar(unidades: UnidadeAdmin[]): UnidadeAdmin[] {
  return ordenar(unidades).map((u) => ({
    ...u,
    secoes: ordenar(u.secoes).map((sec) => ({ ...sec, licoes: ordenar(sec.licoes) })),
  }));
}

/** Aplica a nova ordem localmente (otimista) no nível indicado. */
export function aplicarOrdem(unidades: UnidadeAdmin[], r: ReordenarEntrada): UnidadeAdmin[] {
  const porIds = <T extends { id: string; ordem: number }>(itens: T[]): T[] =>
    r.ids
      .map((id, i) => {
        const it = itens.find((x) => x.id === id);
        return it ? { ...it, ordem: i } : null;
      })
      .filter((x): x is T => x !== null);
  if (r.nivel === 'unidades') return porIds(unidades);
  if (r.nivel === 'secoes') {
    return unidades.map((u) => (u.id === r.paiId ? { ...u, secoes: porIds(u.secoes) } : u));
  }
  return unidades.map((u) => ({
    ...u,
    secoes: u.secoes.map((sec) => (sec.id === r.paiId ? { ...sec, licoes: porIds(sec.licoes) } : sec)),
  }));
}

type Edicao =
  | { tipo: 'unidade'; unidade: UnidadeAdmin | null }
  | { tipo: 'secao'; unidadeId: string; secao: SecaoAdmin | null; assuntoId?: string }
  | { tipo: 'licao'; secaoId: string; licao: LicaoAdmin | null }
  | { tipo: 'excluir'; nivel: 'unidade' | 'secao' | 'licao'; id: string; nome: string };

export default function Trilhas() {
  const concursos = useConcursos();
  const [concursoId, setConcursoId] = useState('');
  const [area, setArea] = useState<FiltroArea>('comum');
  const [unidades, setUnidades] = useState<UnidadeAdmin[]>([]);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erroOrdem, setErroOrdem] = useState<unknown>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const primeiro = concursos.data?.itens[0];
    if (!concursoId && primeiro) setConcursoId(primeiro.id);
  }, [concursos.data, concursoId]);

  const chave = ['admin', 'trilhas', concursoId, area] as const;
  const trilha = useQuery({
    queryKey: chave,
    queryFn: () => api('adminTrilhas', { query: { concursoId, area } }),
    enabled: !!concursoId,
  });

  useEffect(() => {
    if (trilha.data) setUnidades(normalizar(trilha.data.unidades));
  }, [trilha.data]);

  const disciplinas = useDisciplinas();
  const assuntos = useAssuntos();
  const nomeDisciplina = useMemo(() => {
    const m = new Map((disciplinas.data?.itens ?? []).map((d) => [d.id, d.nome]));
    return (id: string) => m.get(id) ?? 'Disciplina';
  }, [disciplinas.data]);
  const assuntoPorId = useMemo(
    () => new Map((assuntos.data?.itens ?? []).map((a) => [a.id, a])),
    [assuntos.data],
  );

  const ordem = useMutation({
    mutationFn: (corpo: ReordenarEntrada) => api('adminTrilhasOrdem', { corpo }),
    onMutate: (corpo) => {
      setErroOrdem(null);
      const antes = unidades;
      setUnidades((u) => aplicarOrdem(u, corpo));
      return { antes };
    },
    onError: (err, _c, ctx) => {
      if (ctx) setUnidades(ctx.antes);
      setErroOrdem(err);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['admin', 'trilhas'] }),
  });

  const reordenar = (nivel: ReordenarEntrada['nivel'], paiId: string) => (ids: string[]) =>
    ordem.mutate({ nivel, paiId, ids });

  const atualizar = () => void qc.invalidateQueries({ queryKey: ['admin', 'trilhas'] });

  const assuntosLivres = (assuntos.data?.itens ?? []).filter(
    (a) => !unidades.some((u) => u.secoes.some((sec) => sec.assuntoId === a.id)),
  );

  return (
    <>
      <Cabecalho
        titulo="Trilhas"
        subtitulo="Monte unidades, seções e lições. Arraste para reordenar ou use as setas (teclado)."
        acoes={
          <Botao variante="primario" disabled={!concursoId} onClick={() => setEdicao({ tipo: 'unidade', unidade: null })}>
            Nova unidade
          </Botao>
        }
      />
      <div className={s.filtros}>
        <CampoSelecao
          rotulo="Concurso"
          value={concursoId}
          opcoes={(concursos.data?.itens ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))}
          onChange={(e) => setConcursoId(e.target.value)}
        />
        <CampoSelecao
          rotulo="Trilha"
          value={area}
          opcoes={[
            { valor: 'comum', rotulo: 'Comum (Português, Matemática, Gerais)' },
            ...AREAS_CARGO.map((a) => ({ valor: a, rotulo: `Específico: ${NOMES_AREA[a]}` })),
          ]}
          onChange={(e) => setArea(e.target.value as FiltroArea)}
        />
      </div>

      {erroOrdem ? <ErroCaixa erro={erroOrdem} /> : null}

      <div className={t.layout}>
        <div>
          {concursos.isError ? <ErroCaixa erro={concursos.error} /> : null}
          {!concursoId || trilha.isPending ? (
            <Carregando />
          ) : trilha.isError ? (
            <ErroCaixa erro={trilha.error} tentar={() => void trilha.refetch()} />
          ) : unidades.length === 0 ? (
            <Vazio>Nenhuma unidade nesta trilha. Crie a primeira com “Nova unidade”.</Vazio>
          ) : (
            <ListaOrdenavel
              grupo="unidades"
              rotuloLista="Unidades"
              itens={unidades}
              rotulo={(u) => `unidade ${u.titulo}`}
              aoReordenar={reordenar('unidades', concursoId)}
              render={(u) => (
                <CartaoUnidade
                  unidade={u}
                  disciplina={nomeDisciplina(u.disciplinaId)}
                  assuntoPorId={assuntoPorId}
                  reordenar={reordenar}
                  editar={setEdicao}
                />
              )}
            />
          )}
        </div>

        <aside className={t.assuntos} aria-label="Assuntos sem seção">
          <h2 className={s.secaoTitulo}>Assuntos sem seção</h2>
          <p className={s.suave}>Arraste um assunto para uma unidade para criar a seção.</p>
          {assuntos.isPending ? (
            <Carregando />
          ) : assuntosLivres.length === 0 ? (
            <Vazio>Todos os assuntos já estão em alguma seção desta trilha.</Vazio>
          ) : (
            <ul className={t.listaAssuntos}>
              {assuntosLivres.map((a) => (
                <li
                  key={a.id}
                  className={t.assunto}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData(TIPO_ASSUNTO, a.id);
                  }}
                >
                  <strong>{a.nome}</strong>
                  <span className={s.suave}>
                    {nomeDisciplina(a.disciplinaId)} · {a.publicadas}/{a.totalQuestoes} publicadas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {edicao?.tipo === 'unidade' ? (
        <ModalUnidade
          unidade={edicao.unidade}
          concursoId={concursoId}
          area={area === 'comum' ? null : area}
          proximaOrdem={unidades.length}
          aoFechar={() => setEdicao(null)}
          aoSalvar={atualizar}
        />
      ) : null}
      {edicao?.tipo === 'secao' ? (
        <ModalSecao
          unidadeId={edicao.unidadeId}
          secao={edicao.secao}
          assuntoInicial={edicao.assuntoId}
          assuntos={assuntos.data?.itens ?? []}
          proximaOrdem={unidades.find((u) => u.id === edicao.unidadeId)?.secoes.length ?? 0}
          aoFechar={() => setEdicao(null)}
          aoSalvar={atualizar}
        />
      ) : null}
      {edicao?.tipo === 'licao' ? (
        <ModalLicao
          secaoId={edicao.secaoId}
          licao={edicao.licao}
          proximaOrdem={
            unidades.flatMap((u) => u.secoes).find((sec) => sec.id === edicao.secaoId)?.licoes.length ?? 0
          }
          aoFechar={() => setEdicao(null)}
          aoSalvar={atualizar}
        />
      ) : null}
      {edicao?.tipo === 'excluir' ? (
        <ModalExcluir {...edicao} aoFechar={() => setEdicao(null)} aoSalvar={atualizar} />
      ) : null}
    </>
  );
}

function CartaoUnidade(props: {
  unidade: UnidadeAdmin;
  disciplina: string;
  assuntoPorId: Map<string, AssuntoAdmin>;
  reordenar: (nivel: ReordenarEntrada['nivel'], paiId: string) => (ids: string[]) => void;
  editar: (e: Edicao) => void;
}) {
  const { unidade: u, editar } = props;
  const [alvo, setAlvo] = useState(false);
  return (
    <div
      className={juntarClasses(t.unidade, alvo && t.alvo)}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(TIPO_ASSUNTO)) return;
        e.preventDefault();
        setAlvo(true);
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        const assuntoId = e.dataTransfer.getData(TIPO_ASSUNTO);
        setAlvo(false);
        if (!assuntoId) return;
        e.preventDefault();
        e.stopPropagation();
        editar({ tipo: 'secao', unidadeId: u.id, secao: null, assuntoId });
      }}
    >
      <div className={t.cabUnidade}>
        <div>
          <h3 className={t.tituloUnidade}>{u.titulo}</h3>
          <span className={s.suave}>
            {props.disciplina} · {u.secoes.length} seções ·{' '}
            {u.secoes.reduce((n, sec) => n + sec.licoes.length, 0)} lições
          </span>
        </div>
        <div className={s.acoes}>
          <Botao pequeno onClick={() => editar({ tipo: 'secao', unidadeId: u.id, secao: null })}>
            Nova seção
          </Botao>
          <Botao pequeno onClick={() => editar({ tipo: 'unidade', unidade: u })}>
            Editar
          </Botao>
          <Botao
            pequeno
            variante="fantasma"
            onClick={() => editar({ tipo: 'excluir', nivel: 'unidade', id: u.id, nome: u.titulo })}
          >
            Excluir
          </Botao>
        </div>
      </div>
      {u.secoes.length === 0 ? (
        <p className={s.suave}>Sem seções. Arraste um assunto para cá ou use “Nova seção”.</p>
      ) : (
        <ListaOrdenavel
          grupo={`secoes-${u.id}`}
          rotuloLista={`Seções de ${u.titulo}`}
          itens={u.secoes}
          rotulo={(sec) => `seção ${sec.titulo}`}
          aoReordenar={props.reordenar('secoes', u.id)}
          render={(sec) => (
            <div>
              <div className={t.cabSecao}>
                <div>
                  <strong>{sec.titulo}</strong>{' '}
                  {sec.noEdital === true ? <Selo tom="sucesso">No edital</Selo> : null}
                  {sec.noEdital === false ? <Selo tom="aviso">Fora do edital</Selo> : null}
                  <div className={s.suave}>
                    Assunto: {props.assuntoPorId.get(sec.assuntoId)?.nome ?? '—'}
                  </div>
                </div>
                <div className={s.acoes}>
                  <Botao pequeno onClick={() => editar({ tipo: 'licao', secaoId: sec.id, licao: null })}>
                    Nova lição
                  </Botao>
                  <Botao pequeno onClick={() => editar({ tipo: 'secao', unidadeId: u.id, secao: sec })}>
                    Editar
                  </Botao>
                  <Botao
                    pequeno
                    variante="fantasma"
                    onClick={() => editar({ tipo: 'excluir', nivel: 'secao', id: sec.id, nome: sec.titulo })}
                  >
                    Excluir
                  </Botao>
                </div>
              </div>
              {sec.licoes.length === 0 ? (
                <p className={s.suave}>Sem lições. A seção precisa de 3 a 6 lições.</p>
              ) : (
                <ListaOrdenavel
                  grupo={`licoes-${sec.id}`}
                  rotuloLista={`Lições de ${sec.titulo}`}
                  itens={sec.licoes}
                  rotulo={(l) => `lição ${l.ordem + 1}${l.titulo ? ` ${l.titulo}` : ''}`}
                  aoReordenar={props.reordenar('licoes', sec.id)}
                  render={(l) => (
                    <div className={t.licao}>
                      <span>
                        <Selo tom={l.tipo === 'bau' ? 'aviso' : l.tipo === 'desafio' ? 'destaque' : 'info'}>
                          {NOMES_TIPO_LICAO[l.tipo]}
                        </Selo>{' '}
                        <strong>{l.titulo ?? `Lição ${l.ordem + 1}`}</strong>{' '}
                        <span className={s.suave}>
                          · {l.tamanho} questões · {l.dicaTitulo ? `dica: ${l.dicaTitulo}` : 'dica do assunto'}
                        </span>
                      </span>
                      <span className={s.acoes}>
                        <Botao pequeno variante="fantasma" onClick={() => editar({ tipo: 'licao', secaoId: sec.id, licao: l })}>
                          Editar
                        </Botao>
                        <Botao
                          pequeno
                          variante="fantasma"
                          onClick={() =>
                            editar({ tipo: 'excluir', nivel: 'licao', id: l.id, nome: l.titulo ?? `Lição ${l.ordem + 1}` })
                          }
                        >
                          Excluir
                        </Botao>
                      </span>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- modais */

function ModalUnidade(props: {
  unidade: UnidadeAdmin | null;
  concursoId: string;
  area: AreaCargo | null;
  proximaOrdem: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const disciplinas = useDisciplinas();
  const [titulo, setTitulo] = useState(props.unidade?.titulo ?? '');
  const [disciplinaId, setDisciplinaId] = useState(props.unidade?.disciplinaId ?? '');
  const [area, setArea] = useState<AreaCargo | ''>(props.unidade ? (props.unidade.area ?? '') : (props.area ?? ''));
  const salvar = useMutation({
    mutationFn: () => {
      const corpo = {
        concursoId: props.concursoId,
        area: area || null,
        ordem: props.unidade?.ordem ?? props.proximaOrdem,
        titulo,
        disciplinaId,
      };
      return props.unidade
        ? api('adminUnidadeAtualizar', { params: { id: props.unidade.id }, corpo })
        : api('adminUnidadeCriar', { corpo });
    },
    onSuccess: () => {
      props.aoSalvar();
      props.aoFechar();
    },
  });
  const erros = camposDoErro(salvar.error);
  return (
    <Modal titulo={props.unidade ? 'Editar unidade' : 'Nova unidade'} aberto aoFechar={props.aoFechar}>
      <form
        className={s.formulario}
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          salvar.mutate();
        }}
      >
        {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        <CampoTexto rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} />
        <CampoSelecao
          rotulo="Disciplina"
          vazio="Escolha"
          value={disciplinaId}
          opcoes={(disciplinas.data?.itens ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }))}
          onChange={(e) => setDisciplinaId(e.target.value)}
          erro={erros.disciplinaId ? 'Escolha a disciplina.' : undefined}
        />
        <CampoSelecao
          rotulo="Trilha"
          vazio="Comum (todas as áreas)"
          value={area}
          opcoes={AREAS_CARGO.map((a) => ({ valor: a, rotulo: NOMES_AREA[a] }))}
          onChange={(e) => setArea(e.target.value as AreaCargo | '')}
        />
        <div className={s.modalRodape}>
          <Botao data-fechar onClick={props.aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

function ModalSecao(props: {
  unidadeId: string;
  secao: SecaoAdmin | null;
  assuntoInicial: string | undefined;
  assuntos: AssuntoAdmin[];
  proximaOrdem: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const inicial = props.assuntos.find((a) => a.id === props.assuntoInicial);
  const [titulo, setTitulo] = useState(props.secao?.titulo ?? inicial?.nome ?? '');
  const [assuntoId, setAssuntoId] = useState(props.secao?.assuntoId ?? props.assuntoInicial ?? '');
  const salvar = useMutation({
    mutationFn: () => {
      const corpo = {
        unidadeId: props.unidadeId,
        ordem: props.secao?.ordem ?? props.proximaOrdem,
        titulo,
        assuntoId,
        noEdital: props.secao?.noEdital ?? null,
      };
      return props.secao
        ? api('adminSecaoAtualizar', { params: { id: props.secao.id }, corpo })
        : api('adminSecaoCriar', { corpo });
    },
    onSuccess: () => {
      props.aoSalvar();
      props.aoFechar();
    },
  });
  const erros = camposDoErro(salvar.error);
  return (
    <Modal titulo={props.secao ? 'Editar seção' : 'Nova seção'} aberto aoFechar={props.aoFechar}>
      <form
        className={s.formulario}
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          salvar.mutate();
        }}
      >
        {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        <CampoSelecao
          rotulo="Assunto do edital"
          vazio="Escolha"
          value={assuntoId}
          opcoes={props.assuntos.map((a) => ({ valor: a.id, rotulo: a.nome }))}
          onChange={(e) => {
            setAssuntoId(e.target.value);
            const a = props.assuntos.find((x) => x.id === e.target.value);
            if (a && !titulo) setTitulo(a.nome);
          }}
          erro={erros.assuntoId ? 'Escolha o assunto.' : undefined}
        />
        <CampoTexto rotulo="Título da seção" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} />
        <div className={s.modalRodape}>
          <Botao data-fechar onClick={props.aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

function ModalLicao(props: {
  secaoId: string;
  licao: LicaoAdmin | null;
  proximaOrdem: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const l = props.licao;
  const [tipo, setTipo] = useState<TipoLicao>(l?.tipo ?? 'normal');
  const [tamanho, setTamanho] = useState<5 | 10>(l?.tamanho === 10 ? 10 : 5);
  const [titulo, setTitulo] = useState(l?.titulo ?? '');
  const [dicaTitulo, setDicaTitulo] = useState(l?.dicaTitulo ?? '');
  const [dicaTexto, setDicaTexto] = useState(l?.dicaTexto ?? '');
  const [dicaExemplo, setDicaExemplo] = useState(l?.dicaExemplo ?? '');
  const salvar = useMutation({
    mutationFn: () => {
      const dados = {
        ordem: l?.ordem ?? props.proximaOrdem,
        tipo,
        tamanho: tipo === 'desafio' ? 10 : tamanho,
        titulo,
        dicaTitulo,
        dicaTexto,
        dicaExemplo,
      } satisfies Omit<LicaoEntrada, 'secaoId'>;
      return l
        ? api('adminLicaoAtualizar', { params: { id: l.id }, corpo: dados })
        : api('adminLicaoCriar', { corpo: { ...dados, secaoId: props.secaoId } });
    },
    onSuccess: () => {
      props.aoSalvar();
      props.aoFechar();
    },
  });
  const erros = camposDoErro(salvar.error);
  return (
    <Modal titulo={l ? 'Editar lição' : 'Nova lição'} aberto aoFechar={props.aoFechar} largo>
      <form
        className={s.formulario}
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          salvar.mutate();
        }}
      >
        {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}
        <div className={s.linha}>
          <CampoSelecao
            rotulo="Tipo"
            value={tipo}
            opcoes={TIPOS_LICAO.map((x) => ({ valor: x, rotulo: NOMES_TIPO_LICAO[x] }))}
            onChange={(e) => {
              const v = e.target.value as TipoLicao;
              setTipo(v);
              if (v === 'desafio') setTamanho(10);
            }}
            ajuda="Baú a cada 3 lições; desafio de 10 questões no fim da unidade."
          />
          <CampoSelecao
            rotulo="Questões"
            value={String(tipo === 'desafio' ? 10 : tamanho)}
            disabled={tipo === 'desafio'}
            opcoes={[
              { valor: '5', rotulo: '5 questões' },
              { valor: '10', rotulo: '10 questões' },
            ]}
            onChange={(e) => setTamanho(e.target.value === '10' ? 10 : 5)}
            erro={erros.tamanho}
          />
          <CampoTexto rotulo="Título (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <fieldset className={s.formulario}>
          <legend className={s.rotulo}>Dica da lição (cartão antes da 1ª questão)</legend>
          <span className={s.ajuda}>Em branco, a lição usa a dica do assunto.</span>
          <CampoTexto rotulo="Título da dica" value={dicaTitulo} onChange={(e) => setDicaTitulo(e.target.value)} />
          <CampoArea rotulo="Texto da dica" rows={3} value={dicaTexto} onChange={(e) => setDicaTexto(e.target.value)} />
          <CampoArea rotulo="Exemplo" rows={2} value={dicaExemplo} onChange={(e) => setDicaExemplo(e.target.value)} />
        </fieldset>
        <div className={s.modalRodape}>
          <Botao data-fechar onClick={props.aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

function ModalExcluir(props: {
  nivel: 'unidade' | 'secao' | 'licao';
  id: string;
  nome: string;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const excluir = useMutation({
    mutationFn: () => {
      const params = { id: props.id };
      if (props.nivel === 'unidade') return api('adminUnidadeExcluir', { params });
      if (props.nivel === 'secao') return api('adminSecaoExcluir', { params });
      return api('adminLicaoExcluir', { params });
    },
    onSuccess: () => {
      props.aoSalvar();
      props.aoFechar();
    },
  });
  const nome = { unidade: 'a unidade', secao: 'a seção', licao: 'a lição' }[props.nivel];
  return (
    <Modal
      titulo={`Excluir ${nome}?`}
      aberto
      aoFechar={props.aoFechar}
      rodape={
        <>
          <Botao data-fechar onClick={props.aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" carregando={excluir.isPending} onClick={() => excluir.mutate()}>
            Excluir
          </Botao>
        </>
      }
    >
      <p>
        <strong>{props.nome}</strong> sai da trilha. O progresso dos alunos nas lições excluídas deixa de
        contar.
      </p>
      {excluir.isError ? <Alerta tom="erro">{mensagemDeErro(excluir.error)}</Alerta> : null}
    </Modal>
  );
}

