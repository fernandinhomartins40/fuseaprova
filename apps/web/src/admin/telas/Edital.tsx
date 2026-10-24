import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useState } from 'react';
import { AREAS_CARGO, ESCOLARIDADES, NOMES_AREA, type AreaCargo, type Escolaridade } from '@fuse/shared';
import type { EditalEntrada, EditalResposta } from '@fuse/shared/api';
import { api, camposDoErro, mensagemDeErro } from '../api';
import { chaves, useConcursos } from '../consultas';
import { EditorLinks, type LinkForm } from '../componentes/EditorLinks';
import {
  Alerta,
  Botao,
  Cabecalho,
  CampoArea,
  CampoSelecao,
  CampoTexto,
  Carregando,
  Cartao,
  ErroCaixa,
  estilos as s,
  Modal,
  Selo,
  TituloSecao,
} from '../componentes/ui';
import { dataHora, NOMES_ESCOLARIDADE, NOMES_STATUS_CONCURSO_CURTO } from '../util';

interface CargoForm {
  id?: string;
  nome: string;
  area: AreaCargo;
  escolaridade: Escolaridade | '';
  vagas: string;
  portugues: string;
  matematica: string;
  gerais: string;
  especificos: string;
  conteudoProgramatico: string;
}

interface FormEdital {
  dataProva: string;
  links: LinkForm[];
  cargos: CargoForm[];
  secoes: Record<string, boolean | null>;
}

const CARGO_VAZIO: CargoForm = {
  nome: '',
  area: 'administrativo',
  escolaridade: '',
  vagas: '',
  portugues: '5',
  matematica: '5',
  gerais: '5',
  especificos: '25',
  conteudoProgramatico: '',
};

function formDoEdital(e: EditalResposta): FormEdital {
  const cargos = e.cargos
    .filter((c) => !c.generico)
    .sort((a, b) => a.ordem - b.ordem)
    .map<CargoForm>((c) => ({
      id: c.id,
      nome: c.nome,
      area: c.area,
      escolaridade: c.escolaridade ?? '',
      vagas: c.vagas === null ? '' : String(c.vagas),
      portugues: String(c.distribuicao.portugues),
      matematica: String(c.distribuicao.matematica),
      gerais: String(c.distribuicao.gerais),
      especificos: String(c.distribuicao.especificos),
      conteudoProgramatico: c.conteudoProgramatico ?? '',
    }));
  return {
    dataProva: e.concurso.dataProva ?? '',
    links: e.concurso.links.map((l) => ({ ...l })),
    cargos: cargos.length ? cargos : [{ ...CARGO_VAZIO }],
    secoes: Object.fromEntries(e.secoes.map((x) => [x.id, x.noEdital])),
  };
}

const int = (v: string) => (v.trim() === '' ? 0 : Math.max(0, Math.trunc(Number(v))));

export function corpoDoEdital(concursoId: string, f: FormEdital): EditalEntrada {
  return {
    concursoId,
    dataProva: f.dataProva || null,
    links: f.links.filter((l) => l.titulo.trim() || l.url.trim()),
    cargos: f.cargos.map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      nome: c.nome,
      area: c.area,
      escolaridade: c.escolaridade || null,
      vagas: c.vagas.trim() === '' ? null : int(c.vagas),
      distribuicao: {
        portugues: int(c.portugues),
        matematica: int(c.matematica),
        gerais: int(c.gerais),
        especificos: int(c.especificos),
      },
      conteudoProgramatico: c.conteudoProgramatico.trim() || null,
    })),
    secoes: Object.entries(f.secoes)
      .filter((e): e is [string, boolean] => e[1] !== null)
      .map(([secaoId, noEdital]) => ({ secaoId, noEdital })),
  };
}

export default function Edital() {
  const concursos = useConcursos();
  const [concursoId, setConcursoId] = useState('');
  useEffect(() => {
    const primeiro = concursos.data?.itens[0];
    if (!concursoId && primeiro) setConcursoId(primeiro.id);
  }, [concursos.data, concursoId]);

  const edital = useQuery({
    queryKey: ['admin', 'edital', concursoId],
    queryFn: () => api('adminEditalObter', { query: { concursoId } }),
    enabled: !!concursoId,
  });

  return (
    <>
      <Cabecalho
        titulo="Edital"
        subtitulo="Cargos, vagas, área de cada cargo, distribuição das questões, conteúdo programático e data da prova."
      />
      <div className={s.filtros}>
        <CampoSelecao
          rotulo="Concurso"
          value={concursoId}
          opcoes={(concursos.data?.itens ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }))}
          onChange={(e) => setConcursoId(e.target.value)}
        />
      </div>
      {concursos.isError ? <ErroCaixa erro={concursos.error} /> : null}
      {!concursoId || edital.isPending ? (
        concursos.data && concursos.data.itens.length === 0 ? (
          <Alerta tom="info">Cadastre o concurso primeiro, na tela Concursos e provas.</Alerta>
        ) : (
          <Carregando />
        )
      ) : edital.isError || !edital.data ? (
        <ErroCaixa erro={edital.error} tentar={() => void edital.refetch()} />
      ) : (
        <FormularioEdital key={concursoId} edital={edital.data} />
      )}
    </>
  );
}

function FormularioEdital({ edital }: { edital: EditalResposta }) {
  const [f, setF] = useState<FormEdital>(() => formDoEdital(edital));
  const [confirmar, setConfirmar] = useState(false);
  const qc = useQueryClient();
  const concursoId = edital.concurso.id;
  const publicado = edital.concurso.status !== 'aguardando_edital' && !!edital.concurso.editalPublicadoEm;

  const salvar = useMutation({
    mutationFn: () => api('adminEditalSalvar', { corpo: corpoDoEdital(concursoId, f) }),
    onSuccess: (d) => {
      qc.setQueryData(['admin', 'edital', concursoId], d);
      void qc.invalidateQueries({ queryKey: chaves.concursos });
    },
  });
  const publicar = useMutation({
    mutationFn: async () => {
      await api('adminEditalSalvar', { corpo: corpoDoEdital(concursoId, f) });
      return api('adminEditalPublicar', { corpo: { concursoId } });
    },
    onSuccess: () => {
      setConfirmar(false);
      void qc.invalidateQueries({ queryKey: ['admin', 'edital', concursoId] });
      void qc.invalidateQueries({ queryKey: chaves.concursos });
    },
  });
  const erros = { ...camposDoErro(salvar.error), ...camposDoErro(publicar.error) };

  const mudarCargo = (i: number, k: keyof CargoForm, v: string) =>
    setF((a) => ({ ...a, cargos: a.cargos.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const unidades = [...new Set(edital.secoes.map((x) => x.unidadeTitulo))];

  return (
    <>
      {publicar.isSuccess ? (
        <Alerta tom="sucesso">
          Edital publicado. O app entrou no modo edital. {publicar.data.usuariosParaConfirmar} alunos vão ver o
          aviso “O edital saiu! Confirme seu cargo”.
        </Alerta>
      ) : null}
      {salvar.isSuccess ? <Alerta tom="sucesso">Edital salvo como rascunho.</Alerta> : null}
      {salvar.isError ? <Alerta tom="erro">{mensagemDeErro(salvar.error)}</Alerta> : null}

      <Cartao>
        <dl className={s.dl}>
          <dt>Concurso</dt>
          <dd>{edital.concurso.nome}</dd>
          <dt>Status</dt>
          <dd>
            <Selo tom={publicado ? 'sucesso' : 'info'}>{NOMES_STATUS_CONCURSO_CURTO[edital.concurso.status]}</Selo>
            {edital.concurso.editalPublicadoEm ? ` · publicado em ${dataHora(edital.concurso.editalPublicadoEm)}` : ''}
          </dd>
        </dl>
        <div className={s.linha}>
          <CampoTexto
            rotulo="Data da prova"
            type="date"
            value={f.dataProva}
            onChange={(e) => setF((a) => ({ ...a, dataProva: e.target.value }))}
            erro={erros.dataProva}
            ajuda="Liga a contagem regressiva no cabeçalho e no Perfil."
          />
        </div>
        <EditorLinks links={f.links} aoMudar={(links) => setF((a) => ({ ...a, links }))} erros={erros} />
      </Cartao>

      <div className={s.cabecalho}>
        <TituloSecao>Cargos do edital</TituloSecao>
        <Botao onClick={() => setF((a) => ({ ...a, cargos: [...a.cargos, { ...CARGO_VAZIO }] }))}>Adicionar cargo</Botao>
      </div>
      {erros.cargos ? <Alerta tom="erro">{erros.cargos}</Alerta> : null}
      {f.cargos.map((c, i) => {
        const total = int(c.portugues) + int(c.matematica) + int(c.gerais) + int(c.especificos);
        return (
          <Cartao key={c.id ?? `novo-${i}`}>
            <fieldset className={s.formulario} aria-label={`Cargo ${i + 1}`}>
              <div className={s.linha}>
                <CampoTexto
                  rotulo="Nome do cargo"
                  value={c.nome}
                  onChange={(e) => mudarCargo(i, 'nome', e.target.value)}
                  erro={erros[`cargos.${i}.nome`]}
                />
                <CampoSelecao
                  rotulo="Área do cargo"
                  value={c.area}
                  opcoes={AREAS_CARGO.map((a) => ({ valor: a, rotulo: NOMES_AREA[a] }))}
                  onChange={(e) => mudarCargo(i, 'area', e.target.value)}
                />
                <CampoSelecao
                  rotulo="Escolaridade"
                  vazio="Não informada"
                  value={c.escolaridade}
                  opcoes={ESCOLARIDADES.map((x) => ({ valor: x, rotulo: NOMES_ESCOLARIDADE[x] ?? x }))}
                  onChange={(e) => mudarCargo(i, 'escolaridade', e.target.value)}
                />
                <CampoTexto
                  rotulo="Vagas"
                  type="number"
                  min={0}
                  value={c.vagas}
                  onChange={(e) => mudarCargo(i, 'vagas', e.target.value)}
                  erro={erros[`cargos.${i}.vagas`]}
                />
              </div>
              <div className={s.linha}>
                <CampoTexto rotulo="Português" type="number" min={0} value={c.portugues} onChange={(e) => mudarCargo(i, 'portugues', e.target.value)} />
                <CampoTexto rotulo="Matemática / RL" type="number" min={0} value={c.matematica} onChange={(e) => mudarCargo(i, 'matematica', e.target.value)} />
                <CampoTexto rotulo="Conhecimentos gerais" type="number" min={0} value={c.gerais} onChange={(e) => mudarCargo(i, 'gerais', e.target.value)} />
                <CampoTexto rotulo="Específicos" type="number" min={0} value={c.especificos} onChange={(e) => mudarCargo(i, 'especificos', e.target.value)} />
              </div>
              <span className={s.ajuda}>
                {total} questões no simulado deste cargo
                {c.portugues === '5' && c.matematica === '5' && c.gerais === '5' && c.especificos === '25'
                  ? ' (padrão FAU 5/5/5/25).'
                  : ' (o simulado segue esta distribuição).'}
              </span>
              <CampoArea
                rotulo="Conteúdo programático"
                rows={5}
                value={c.conteudoProgramatico}
                onChange={(e) => mudarCargo(i, 'conteudoProgramatico', e.target.value)}
              />
              <div>
                <Botao
                  pequeno
                  variante="fantasma"
                  disabled={f.cargos.length === 1}
                  onClick={() => setF((a) => ({ ...a, cargos: a.cargos.filter((_, j) => j !== i) }))}
                >
                  Remover cargo
                </Botao>
              </div>
            </fieldset>
          </Cartao>
        );
      })}

      <TituloSecao>Seções no edital</TituloSecao>
      <p className={s.suave}>
        As seções fora do edital saem da trilha, mas continuam acessíveis no Guia.
      </p>
      {edital.secoes.length === 0 ? (
        <Alerta tom="info">Nenhuma seção cadastrada nas trilhas.</Alerta>
      ) : (
        <Cartao>
          <dl className={s.dl}>
            {unidades.map((un) => (
              <Fragment key={un}>
                <dt>{un}</dt>
                <dd>
                  <div className={s.formulario}>
                    {edital.secoes
                      .filter((x) => x.unidadeTitulo === un)
                      .map((x) => (
                        <CampoSelecao
                          key={x.id}
                          rotulo={`${x.titulo}${x.area ? ` (${NOMES_AREA[x.area]})` : ''}`}
                          value={f.secoes[x.id] === true ? 'sim' : f.secoes[x.id] === false ? 'nao' : ''}
                          vazio="Não definido"
                          opcoes={[
                            { valor: 'sim', rotulo: 'No edital' },
                            { valor: 'nao', rotulo: 'Fora do edital' },
                          ]}
                          onChange={(e) =>
                            setF((a) => ({
                              ...a,
                              secoes: {
                                ...a.secoes,
                                [x.id]: e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null,
                              },
                            }))
                          }
                        />
                      ))}
                  </div>
                </dd>
              </Fragment>
            ))}
          </dl>
        </Cartao>
      )}

      <div className={s.modalRodape}>
        <Botao carregando={salvar.isPending} onClick={() => salvar.mutate()}>
          Salvar rascunho
        </Botao>
        <Botao variante="primario" onClick={() => setConfirmar(true)}>
          {publicado ? 'Republicar edital' : 'Publicar edital'}
        </Botao>
      </div>

      <Modal
        titulo="Publicar o edital e ligar o modo edital?"
        aberto={confirmar}
        aoFechar={() => setConfirmar(false)}
        largo
        rodape={
          <>
            <Botao data-fechar onClick={() => setConfirmar(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" carregando={publicar.isPending} onClick={() => publicar.mutate()}>
              Publicar edital
            </Botao>
          </>
        }
      >
        <p>O edital é salvo e publicado agora. Para todos os alunos, imediatamente e sem deploy:</p>
        <ul className={s.lista}>
          <li>a lista de cargos passa a ser a do edital ({f.cargos.length} cargos), com a área que você mapeou;</li>
          <li>quem tinha um cargo genérico vê o aviso “O edital saiu! Confirme seu cargo”;</li>
          <li>
            as seções ganham o selo “No edital” ou “Fora do edital”; as de fora saem da trilha, mas continuam no
            Guia;
          </li>
          <li>
            a data da prova {f.dataProva ? `(${f.dataProva.split('-').reverse().join('/')})` : '(ainda não informada)'} liga
            a contagem regressiva no cabeçalho e no Perfil;
          </li>
          <li>o simulado passa a seguir exatamente a distribuição e os conteúdos do edital.</li>
        </ul>
        {publicar.isError ? <Alerta tom="erro">{mensagemDeErro(publicar.error)}</Alerta> : null}
      </Modal>
    </>
  );
}
