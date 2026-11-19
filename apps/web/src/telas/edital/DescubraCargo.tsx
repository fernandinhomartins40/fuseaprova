import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  AREAS_ACS,
  CARGOS_PALMITAL,
  CONHECIMENTOS_COMUNS,
  CURSOS_SUPERIORES,
  DATAS_PALMITAL,
  EDITAL_PALMITAL,
  REQUISITOS_GERAIS_INFORMATIVOS,
  TAXAS_PALMITAL,
  TEXTOS_CARGOS,
  avaliarCargo,
  buscarBairroAcs,
  cargoPalmital,
  respostasDoPerfil,
  sugerirCargos,
  type CargoPalmital,
  type CategoriaCnh,
  type CursoSuperior,
  type Escolaridade,
  type NivelCargo,
  type PerfilCandidato,
  type PerguntaRequisito,
  type RespostaRequisito,
  type SituacaoCargo,
} from '@fuse/shared/palmital2026';
import { chamar, mensagemDeErro } from '../../api/cliente';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoVoltar,
  Campo,
  Capi,
  Cartao,
  Chip,
  IconeTraco,
  Pagina,
} from '../../ui';
import s from './DescubraCargo.module.css';

type Respostas = Partial<Record<string, RespostaRequisito>>;
type Etapa = 'inicio' | 'perfil' | 'sugestoes' | 'lista' | 'perguntas' | 'resultado';

const NIVEIS: Record<NivelCargo, string> = {
  superior: 'Nível superior',
  medio: 'Nível médio/técnico',
  fundamental: 'Nível fundamental',
};
const COR_SITUACAO: Record<SituacaoCargo, string> = {
  atende: s.atende!,
  pendente: s.pendente!,
  confirmar: s.confirmar!,
  nao_atende: s.naoAtende!,
};
const ICONE_SITUACAO: Record<SituacaoCargo | 'sem_resposta', string> = {
  atende: '✅',
  pendente: '🟡',
  confirmar: '❓',
  nao_atende: '❌',
  sem_resposta: '❓',
};

const dataBR = (iso: string) => iso.split('-').reverse().join('/');

/**
 * D44: "Descubra seu cargo" — ferramenta pública (sem login) do edital de Palmital 2026.
 * O veredito vem só das regras de @fuse/shared/palmital2026; a IA só ajuda (curso e dúvidas).
 */
export default function DescubraCargo() {
  const [busca, setBusca] = useSearchParams();
  const cargo = cargoPalmital(Number(busca.get('cargo')));
  const [etapa, setEtapa] = useState<Etapa>(cargo ? 'perguntas' : 'inicio');
  const [perfil, setPerfil] = useState<PerfilCandidato | null>(null);
  const [respostas, setRespostas] = useState<Respostas>({});

  function abrirCargo(c: CargoPalmital) {
    setRespostas(perfil ? respostasDoPerfil(c, perfil) : {});
    setBusca({ cargo: String(c.codigo) });
    setEtapa('perguntas');
  }
  function voltarInicio() {
    setBusca({});
    setEtapa('inicio');
  }

  if (etapa === 'perguntas' && cargo)
    return (
      <Perguntas
        key={cargo.codigo}
        cargo={cargo}
        respostas={respostas}
        setRespostas={setRespostas}
        aoVoltar={() => (perfil ? setEtapa('sugestoes') : setEtapa('lista'))}
        aoTerminar={() => setEtapa('resultado')}
      />
    );
  if (etapa === 'resultado' && cargo)
    return (
      <Resultado
        cargo={cargo}
        respostas={respostas}
        aoRefazer={() => setEtapa('perguntas')}
        aoOutro={() => (perfil ? setEtapa('sugestoes') : setEtapa('lista'))}
        aoDescobrir={() => setEtapa('perfil')}
      />
    );
  if (etapa === 'lista') return <ListaCargos aoVoltar={voltarInicio} aoEscolher={abrirCargo} />;
  if (etapa === 'perfil')
    return (
      <Perfil
        inicial={perfil}
        aoVoltar={voltarInicio}
        aoConcluir={(p) => {
          setPerfil(p);
          setEtapa('sugestoes');
        }}
      />
    );
  if (etapa === 'sugestoes' && perfil)
    return (
      <Sugestoes perfil={perfil} aoVoltar={() => setEtapa('perfil')} aoEscolher={abrirCargo} />
    );
  return (
    <Inicio
      aoEscolher={() => {
        setPerfil(null);
        setEtapa('lista');
      }}
      aoDescobrir={() => setEtapa('perfil')}
    />
  );
}

/* ---------------------------------------------------------------------------------- início */

function Inicio({ aoEscolher, aoDescobrir }: { aoEscolher: () => void; aoDescobrir: () => void }) {
  const inscricao = DATAS_PALMITAL.find((d) => d.fonte === 'Item 5.3')!;
  const prova = DATAS_PALMITAL.find((d) => d.fonte.startsWith('Itens 10.1'))!;
  return (
    <Pagina rotulo="Descubra seu cargo">
      <div className={s.pilha}>
        <Capi
          pose="boas-vindas"
          tamanho={130}
          fala="Eu leio o edital com você e mostro, cargo por cargo, se você pode concorrer."
        />
        <h1 className={s.titulo}>Descubra seu cargo no concurso de Palmital</h1>
        <p className={s.texto}>
          Responda algumas perguntas e veja se você atende aos requisitos, quanto paga, como é a
          prova e o que cai. Grátis e sem cadastro, com base no edital nº 01/2026 da FAU.
        </p>
        <div className={s.chips}>
          <Chip variante="marca">49 cargos</Chip>
          <Chip variante="laranja">
            Inscrições {dataBR(inscricao.inicio)} a {dataBR(inscricao.fim!)}
          </Chip>
          <Chip variante="azul">Prova {dataBR(prova.inicio)}</Chip>
        </div>
        <Botao3D onClick={aoDescobrir}>Me ajude a descobrir</Botao3D>
        <Botao3D variante="secundario" onClick={aoEscolher}>
          Já sei o cargo
        </Botao3D>
        <PergunteAoEdital />
        <Rodape />
      </div>
    </Pagina>
  );
}

/* ---------------------------------------------------------------------------------- perfil */

const ESCOLARIDADES: [Escolaridade, string][] = [
  ['fundamental_incompleto', 'Ainda não terminei o ensino fundamental'],
  ['fundamental', 'Ensino fundamental completo'],
  ['medio', 'Ensino médio completo (ou técnico)'],
  ['superior', 'Curso superior completo'],
];
const CNHS: CategoriaCnh[] = ['A', 'B', 'C', 'D', 'E'];

function Perfil({
  inicial,
  aoVoltar,
  aoConcluir,
}: {
  inicial: PerfilCandidato | null;
  aoVoltar: () => void;
  aoConcluir: (p: PerfilCandidato) => void;
}) {
  const [escolaridade, setEscolaridade] = useState<Escolaridade | null>(
    inicial?.escolaridade ?? null,
  );
  const [cursos, setCursos] = useState<CursoSuperior[]>(inicial?.cursos ?? []);
  const [cnh, setCnh] = useState<CategoriaCnh[]>(inicial?.cnh ?? []);
  const alternar = <T,>(lista: T[], v: T) =>
    lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
  return (
    <Pagina rotulo="Seu perfil">
      <CabecalhoVoltar aoVoltar={aoVoltar} titulo="Seu perfil" />
      <div className={s.pilha}>
        <p className={s.texto}>
          Conte o que você já tem (ou vai ter até a posse). Nada disso é guardado.
        </p>
        <fieldset className={s.grupo}>
          <legend className={s.legenda}>Até onde você estudou?</legend>
          {ESCOLARIDADES.map(([v, t]) => (
            <Opcao
              key={v}
              tipo="radio"
              nome="escolaridade"
              marcado={escolaridade === v}
              aoMarcar={() => setEscolaridade(v)}
            >
              {t}
            </Opcao>
          ))}
        </fieldset>
        {escolaridade === 'superior' && (
          <fieldset className={s.grupo}>
            <legend className={s.legenda}>Qual é a sua graduação? (pode marcar mais de uma)</legend>
            <p className={s.ajuda}>
              Se o seu curso não aparece, deixe tudo desmarcado: em cada cargo você poderá digitar o
              nome.
            </p>
            {(Object.entries(CURSOS_SUPERIORES) as [CursoSuperior, string][]).map(([v, t]) => (
              <Opcao
                key={v}
                tipo="checkbox"
                nome="curso"
                marcado={cursos.includes(v)}
                aoMarcar={() => setCursos(alternar(cursos, v))}
              >
                {t}
              </Opcao>
            ))}
          </fieldset>
        )}
        <fieldset className={s.grupo}>
          <legend className={s.legenda}>Você tem CNH? Marque as categorias</legend>
          <div className={s.linhaCnh}>
            {CNHS.map((c) => (
              <Opcao
                key={c}
                tipo="checkbox"
                nome="cnh"
                marcado={cnh.includes(c)}
                aoMarcar={() => setCnh(alternar(cnh, c))}
              >
                {c}
              </Opcao>
            ))}
          </div>
        </fieldset>
        <Botao3D
          disabled={!escolaridade}
          onClick={() =>
            escolaridade &&
            aoConcluir({ escolaridade, cursos: escolaridade === 'superior' ? cursos : [], cnh })
          }
        >
          Ver cargos para mim
        </Botao3D>
      </div>
    </Pagina>
  );
}

function Opcao({
  tipo,
  nome,
  marcado,
  aoMarcar,
  children,
}: {
  tipo: 'radio' | 'checkbox';
  nome: string;
  marcado: boolean;
  aoMarcar: () => void;
  children: ReactNode;
}) {
  return (
    <label className={[s.opcao, marcado ? s.opcaoMarcada : ''].join(' ')}>
      <input type={tipo} name={nome} checked={marcado} onChange={aoMarcar} />
      <span>{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------------- sugestões e lista */

function LinhaCargo({
  cargo,
  extra,
  aoEscolher,
}: {
  cargo: CargoPalmital;
  extra?: ReactNode;
  aoEscolher: () => void;
}) {
  return (
    <li>
      <button type="button" className={s.linhaCargo} onClick={aoEscolher}>
        <span className={s.linhaCargoTexto}>
          <strong>{cargo.nome}</strong>
          <span className={s.ajuda}>
            {cargo.remuneracao} · {cargo.carga} ·{' '}
            {cargo.vagasAmpla ? `${cargo.vagas} vagas` : 'só cadastro reserva'}
          </span>
          {extra}
        </span>
        <IconeTraco nome="chevron" tamanho={20} />
      </button>
    </li>
  );
}

function Sugestoes({
  perfil,
  aoVoltar,
  aoEscolher,
}: {
  perfil: PerfilCandidato;
  aoVoltar: () => void;
  aoEscolher: (c: CargoPalmital) => void;
}) {
  const lista = useMemo(() => sugerirCargos(perfil), [perfil]);
  return (
    <Pagina rotulo="Cargos para você">
      <CabecalhoVoltar aoVoltar={aoVoltar} titulo="Cargos para você" />
      <div className={s.pilha}>
        {lista.length === 0 ? (
          <Cartao>
            <p className={s.texto}>
              Todos os cargos deste edital pedem pelo menos o ensino fundamental completo (item 4.1,
              e). Se você vai terminar os estudos antes da posse, volte e marque a escolaridade que
              terá.
            </p>
          </Cartao>
        ) : (
          <>
            <p className={s.texto}>
              {lista.length} cargos combinam com o que você contou, do maior salário para o menor.
              Toque em um para conferir os outros requisitos.
            </p>
            <ul className={s.lista}>
              {lista.map(({ cargo, faltam }) => (
                <LinhaCargo
                  key={cargo.codigo}
                  cargo={cargo}
                  aoEscolher={() => aoEscolher(cargo)}
                  extra={<span className={s.ajuda}>{faltam} perguntas para confirmar</span>}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </Pagina>
  );
}

function ListaCargos({
  aoVoltar,
  aoEscolher,
}: {
  aoVoltar: () => void;
  aoEscolher: (c: CargoPalmital) => void;
}) {
  const [termo, setTermo] = useState('');
  const n = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtrados = CARGOS_PALMITAL.filter((c) => n(c.nome).includes(n(termo)));
  return (
    <Pagina rotulo="Escolha o cargo">
      <CabecalhoVoltar aoVoltar={aoVoltar} titulo="Escolha o cargo" />
      <div className={s.pilha}>
        <Campo
          rotulo="Buscar cargo"
          valor={termo}
          onValor={setTermo}
          placeholder="Ex.: enfermeiro, motorista"
        />
        {(Object.keys(NIVEIS) as NivelCargo[]).map((nivel) => {
          const doNivel = filtrados.filter((c) => c.nivel === nivel);
          return doNivel.length ? (
            <section key={nivel}>
              <h2 className={s.subtitulo}>
                {NIVEIS[nivel]} <span className={s.ajuda}>· taxa {TAXAS_PALMITAL[nivel]}</span>
              </h2>
              <ul className={s.lista}>
                {doNivel.map((c) => (
                  <LinhaCargo key={c.codigo} cargo={c} aoEscolher={() => aoEscolher(c)} />
                ))}
              </ul>
            </section>
          ) : null;
        })}
        {filtrados.length === 0 && <p className={s.texto}>Nenhum cargo com esse nome.</p>}
      </div>
    </Pagina>
  );
}

/* -------------------------------------------------------------------------------- perguntas */

const PRAZO_BOTAO = {
  posse: 'Ainda não, mas terei até a posse',
  pratica: 'Ainda não, mas terei até a prova prática',
};

function Perguntas({
  cargo,
  respostas,
  setRespostas,
  aoVoltar,
  aoTerminar,
}: {
  cargo: CargoPalmital;
  respostas: Respostas;
  setRespostas: (r: Respostas) => void;
  aoVoltar: () => void;
  aoTerminar: () => void;
}) {
  const [i, setI] = useState(0);
  const p = cargo.perguntas[i]!;
  const total = cargo.perguntas.length;
  function responder(r: RespostaRequisito) {
    setRespostas({ ...respostas, [p.id]: r });
    if (i + 1 < total) setI(i + 1);
    else aoTerminar();
  }
  const opcoes: [RespostaRequisito, string][] = [
    ['sim', p.rotuloSim ?? 'Sim'],
    ...(p.prazo ? ([['ate_prazo', PRAZO_BOTAO[p.prazo]]] as [RespostaRequisito, string][]) : []),
    ['nao', p.rotuloNao ?? 'Não'],
    ['nao_sei', p.cursoLivre ? 'Não sei se meu curso vale' : 'Não sei'],
  ];
  return (
    <Pagina rotulo={`Requisitos de ${cargo.nome}`}>
      <CabecalhoVoltar aoVoltar={() => (i === 0 ? aoVoltar() : setI(i - 1))} titulo={cargo.nome} />
      <div className={s.pilha}>
        <BarraProgresso valor={i / total} rotulo={`Pergunta ${i + 1} de ${total}`} />
        <p className={s.ajuda}>
          Pergunta {i + 1} de {total}
        </p>
        <h1 className={s.pergunta}>{p.texto}</h1>
        {p.ajuda && <p className={s.texto}>{p.ajuda}</p>}
        <Citacao fonte={p.fonte}>{p.citacao}</Citacao>
        {p.id === 'residencia' && <BuscaBairro />}
        <div className={s.botoes}>
          {opcoes.map(([v, t]) => (
            <Botao3D
              key={v}
              variante={respostas[p.id] === v ? 'primario' : 'claro'}
              onClick={() => responder(v)}
              aria-pressed={respostas[p.id] === v}
            >
              {t}
            </Botao3D>
          ))}
        </div>
        {p.cursoLivre && <CursoLivre cargo={cargo} pergunta={p} aoSugerir={responder} />}
      </div>
    </Pagina>
  );
}

function Citacao({ fonte, children }: { fonte: string; children: ReactNode }) {
  return (
    <blockquote className={s.citacao}>
      <p>“{children}”</p>
      <footer>{fonte}</footer>
    </blockquote>
  );
}

function BuscaBairro() {
  const [termo, setTermo] = useState('');
  const achados = buscarBairroAcs(termo);
  return (
    <Cartao>
      <Campo
        rotulo="Procure o seu bairro"
        valor={termo}
        onValor={setTermo}
        placeholder="Ex.: Vila Carolo"
      />
      {termo.trim().length >= 2 && (
        <p className={s.texto} aria-live="polite">
          {achados.length
            ? achados.map((a) => `${a.bairro}: ${a.area}`).join(' · ')
            : 'Não achamos esse nome na lista do edital. Confira a lista completa abaixo ou pergunte à FAU.'}
        </p>
      )}
      <details className={s.detalhes}>
        <summary>Ver todos os bairros por área</summary>
        {AREAS_ACS.map((a) => (
          <p key={a.area} className={s.texto}>
            <strong>{a.area}:</strong> {a.bairros.join('; ')}.
          </p>
        ))}
      </details>
    </Cartao>
  );
}

const SUGESTAO_IA: Record<'consta' | 'nao_consta' | 'confirmar', RespostaRequisito> = {
  consta: 'sim',
  nao_consta: 'nao',
  confirmar: 'nao_sei',
};
const TEXTO_IA = {
  consta: 'Seu curso aparece no requisito.',
  nao_consta: 'Seu curso não aparece no requisito.',
  confirmar: 'Só a FAU pode confirmar.',
};

function CursoLivre({
  cargo,
  pergunta,
  aoSugerir,
}: {
  cargo: CargoPalmital;
  pergunta: PerguntaRequisito;
  aoSugerir: (r: RespostaRequisito) => void;
}) {
  const [curso, setCurso] = useState('');
  const m = useMutation({
    mutationFn: () => chamar('editalCurso', { corpo: { cargo: cargo.codigo, curso } }),
  });
  return (
    <details className={s.detalhes}>
      <summary>Meu curso não está na lista</summary>
      <form
        className={s.pilhaPequena}
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Campo
          rotulo="Nome do seu curso, como está no diploma"
          valor={curso}
          onValor={setCurso}
          maxLength={150}
        />
        <Botao3D
          type="submit"
          variante="secundario"
          compacto
          carregando={m.isPending}
          disabled={curso.trim().length < 3}
        >
          Comparar com o edital
        </Botao3D>
        {m.isError && <p className={s.erro}>{mensagemDeErro(m.error)}</p>}
        {m.data && (
          <Cartao>
            <p className={s.destaque}>{TEXTO_IA[m.data.veredito]}</p>
            <p className={s.texto}>{m.data.explicacao}</p>
            <p className={s.ajuda}>
              Comparação feita por inteligência artificial com o texto “{pergunta.citacao}”. Ela não
              substitui a FAU.
            </p>
            <Botao3D compacto onClick={() => aoSugerir(SUGESTAO_IA[m.data.veredito])}>
              Usar esta resposta
            </Botao3D>
          </Cartao>
        )}
      </form>
    </details>
  );
}

/* -------------------------------------------------------------------------------- resultado */

function Resultado({
  cargo,
  respostas,
  aoRefazer,
  aoOutro,
  aoDescobrir,
}: {
  cargo: CargoPalmital;
  respostas: Respostas;
  aoRefazer: () => void;
  aoOutro: () => void;
  aoDescobrir: () => void;
}) {
  const a = avaliarCargo(cargo, respostas);
  const t = TEXTOS_CARGOS[String(cargo.codigo) as keyof typeof TEXTOS_CARGOS];
  const comuns = CONHECIMENTOS_COMUNS[cargo.nivel];
  const url =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/descubra-seu-cargo?cargo=${cargo.codigo}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Veja o que o edital de Palmital pede para ${cargo.nome}: ${url}`)}`;
  return (
    <Pagina rotulo={`Resultado: ${cargo.nome}`}>
      <CabecalhoVoltar aoVoltar={aoRefazer} titulo={cargo.nome} />
      <div className={s.pilha}>
        <div className={[s.veredito, COR_SITUACAO[a.situacao]].join(' ')} role="status">
          <p className={s.vereditoTitulo}>
            {ICONE_SITUACAO[a.situacao]} {a.titulo}
          </p>
          <p>{a.resumo}</p>
        </div>

        <Cartao>
          <h2 className={s.subtitulo}>Seus requisitos</h2>
          <ul className={s.itens}>
            {a.itens.map((it) => (
              <li key={it.pergunta.id}>
                <span aria-hidden="true">{ICONE_SITUACAO[it.situacao]}</span>
                <span>
                  <strong>{it.pergunta.texto}</strong>
                  <br />
                  <span className={s.ajuda}>
                    {it.explicacao} ({it.pergunta.fonte})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {cargo.avisos.length > 0 && (
            <>
              <p className={s.legenda}>O edital também pede</p>
              <ul className={s.marcadores}>
                {cargo.avisos.map((x) => (
                  <li key={x.texto}>
                    {x.texto} <span className={s.ajuda}>({x.fonte})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <details className={s.detalhes}>
            <summary>Requisitos de todos os cargos para a posse (item 4.1)</summary>
            <ul className={s.marcadores}>
              {REQUISITOS_GERAIS_INFORMATIVOS.map((x) => (
                <li key={x.texto}>
                  {x.texto} <span className={s.ajuda}>({x.fonte})</span>
                </li>
              ))}
            </ul>
          </details>
        </Cartao>

        {cargo.alertas.map((x) => (
          <div key={x.titulo} className={s.alerta}>
            <p className={s.destaque}>
              <IconeTraco nome="alerta" tamanho={20} /> {x.titulo}
            </p>
            <p>{x.texto}</p>
            <p className={s.ajuda}>{x.fonte}</p>
          </div>
        ))}

        <Cartao>
          <h2 className={s.subtitulo}>O cargo</h2>
          <dl className={s.ficha}>
            <dt>Remuneração inicial</dt>
            <dd>{cargo.remuneracao}</dd>
            <dt>Carga horária</dt>
            <dd>{cargo.carga === '12x36' ? 'Plantão 12x36' : `${cargo.carga} por semana`}</dd>
            <dt>Vagas</dt>
            <dd>
              {cargo.vagasAmpla
                ? `${cargo.vagas} na ampla concorrência`
                : 'Só cadastro reserva (CR)'}
              {cargo.pcd ? `, ${cargo.pcd} PcD` : ''}
              {cargo.afro ? `, ${cargo.afro} afrodescendentes` : ''}
            </dd>
            <dt>Taxa de inscrição</dt>
            <dd>{cargo.taxa} (boleto, até 28/12/2026)</dd>
            <dt>Regime</dt>
            <dd>{EDITAL_PALMITAL.regime}</dd>
          </dl>
          {(t.descricao || t.tarefas.length > 0) && (
            <details className={s.detalhes}>
              <summary>O que você vai fazer</summary>
              {t.descricao && <p className={s.texto}>{t.descricao}</p>}
              <ul className={s.marcadores}>
                {t.tarefas.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
          )}
          {t.requisitos && (
            <details className={s.detalhes}>
              <summary>Requisitos completos (Anexo I)</summary>
              <p className={s.texto}>{t.requisitos}</p>
            </details>
          )}
        </Cartao>

        <Cartao>
          <h2 className={s.subtitulo}>Como é a prova</h2>
          <ul className={s.itens}>
            {cargo.fases.map((f) => (
              <li key={f.tipo}>
                <span aria-hidden="true">📝</span>
                <span>
                  <strong>
                    {f.nome}: {f.pontos} pontos
                  </strong>
                  <br />
                  {f.detalhe} <span className={s.ajuda}>({f.fonte})</span>
                </span>
              </li>
            ))}
          </ul>
          <table className={s.tabela}>
            <caption className="sr-only">Matérias da prova objetiva</caption>
            <thead>
              <tr>
                <th>Matéria</th>
                <th>Questões</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {cargo.materias.map((m) => (
                <tr key={m.nome}>
                  <td>
                    {m.nome}
                    {m.nota && <span className={s.ajuda}> ({m.nota})</span>}
                  </td>
                  <td>{m.questoes}</td>
                  <td>{m.total.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={s.texto}>
            <strong>Nota final:</strong> {cargo.notaFinal.texto}{' '}
            <span className={s.ajuda}>({cargo.notaFinal.fonte})</span>
          </p>
          <details className={s.detalhes}>
            <summary>O que cai (Anexo II)</summary>
            <p className={s.legenda}>Conhecimentos específicos</p>
            <p className={s.texto}>
              {t.especificos ?? 'O edital não traz conteúdo específico para este cargo.'}
            </p>
            {Object.entries(comuns.materias).map(([nome, txt]) => (
              <div key={nome}>
                <p className={s.legenda}>{nome}</p>
                <p className={s.texto}>{txt}</p>
              </div>
            ))}
          </details>
        </Cartao>

        <Cartao>
          <h2 className={s.subtitulo}>Datas importantes</h2>
          <ul className={s.itens}>
            {DATAS_PALMITAL.map((d) => (
              <li key={d.texto}>
                <span aria-hidden="true">📅</span>
                <span>
                  <strong>
                    {dataBR(d.inicio)}
                    {d.fim ? ` a ${dataBR(d.fim)}` : ''}
                    {d.provavel ? ' (data provável)' : ''}
                  </strong>
                  <br />
                  {d.texto} <span className={s.ajuda}>({d.fonte})</span>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>

        <div className={s.chamada}>
          <Capi pose="incentivando" tamanho={96} />
          <p className={s.destaque}>Agora é estudar para passar.</p>
          <p className={s.texto}>
            O Fuse Aprova tem trilha, revisão e simulados no estilo da FAU para {cargo.nome}, do
            jeito que cai em Palmital.
          </p>
          <a className={s.botaoLink} href="/">
            Conhecer o Fuse Aprova
          </a>
          <Link className={s.linkSimples} to="/cadastro">
            Criar minha conta
          </Link>
        </div>

        <PergunteAoEdital cargo={cargo} />

        <div className={s.botoes}>
          <a className={s.linkSimples} href={whatsapp} target="_blank" rel="noopener noreferrer">
            Compartilhar no WhatsApp<span className="sr-only"> (abre em nova aba)</span>
          </a>
          <Botao3D variante="secundario" onClick={aoOutro}>
            Ver outro cargo
          </Botao3D>
          {a.situacao === 'nao_atende' && (
            <Botao3D variante="claro" onClick={aoDescobrir}>
              Me ajude a achar um cargo
            </Botao3D>
          )}
        </div>
        <Rodape />
      </div>
    </Pagina>
  );
}

/* -------------------------------------------------------------------------- pergunte ao edital */

function PergunteAoEdital({ cargo }: { cargo?: CargoPalmital }) {
  const [pergunta, setPergunta] = useState('');
  const m = useMutation({
    mutationFn: () =>
      chamar('editalPergunta', { corpo: { pergunta, ...(cargo ? { cargo: cargo.codigo } : {}) } }),
  });
  return (
    <Cartao como="section">
      <h2 className={s.subtitulo}>Pergunte ao edital</h2>
      <form
        className={s.pilhaPequena}
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Campo
          rotulo="Sua dúvida"
          valor={pergunta}
          onValor={setPergunta}
          maxLength={500}
          placeholder="Ex.: posso pagar a inscrição com Pix?"
        />
        <Botao3D
          type="submit"
          variante="secundario"
          compacto
          carregando={m.isPending}
          disabled={pergunta.trim().length < 5}
        >
          Perguntar
        </Botao3D>
      </form>
      {m.isError && <p className={s.erro}>{mensagemDeErro(m.error)}</p>}
      {m.data && (
        <div aria-live="polite">
          <p className={s.texto}>{m.data.resposta}</p>
          <p className={s.ajuda}>
            Resposta gerada por inteligência artificial a partir do texto do edital. Confira sempre
            o item citado.
          </p>
        </div>
      )}
    </Cartao>
  );
}

function Rodape() {
  return (
    <p className={s.ajuda}>
      Ferramenta informativa do Fuse Aprova, sem ligação com a Prefeitura de Palmital nem com a FAU.
      Vale sempre o edital oficial, publicado em{' '}
      <a href={EDITAL_PALMITAL.site} target="_blank" rel="noopener noreferrer">
        concursosfau.com.br
      </a>
      . Dúvidas: {EDITAL_PALMITAL.emailFau}.
    </p>
  );
}
