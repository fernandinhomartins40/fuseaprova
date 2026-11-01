import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatarDominio, NOMES_CLASSE_TEMA, type SlugDisciplina } from '@fuse/shared';
import type { DesempenhoResposta } from '@fuse/shared/api';
import { mensagemDeErro } from '../../api/cliente';
import { useDesempenho, useMe } from '../../api/consultas';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoApp,
  Capi,
  CartaoEstatistica,
  Carregando,
  Chip,
  ErroTela,
  IconeTraco,
  Imagem,
  Pagina,
  TituloSecao,
} from '../../ui';
import type { VarianteChip } from '../../ui/Chip';
import {
  COR_DISCIPLINA,
  formatarNumero,
  ICONE_DISCIPLINA,
  NOME_CURTO_DISCIPLINA,
  plural,
} from '../comum';
import s from './Desempenho.module.css';

type Tema = DesempenhoResposta['temas'][number];
type ClasseVisivel = 'fraco' | 'regular' | 'forte' | 'pouco_praticado';

/** Ordem das seções: primeiro o que precisa de atenção. */
const SECOES: ClasseVisivel[] = ['fraco', 'regular', 'forte', 'pouco_praticado'];

const CHIP_DISCIPLINA: Record<SlugDisciplina, VarianteChip> = {
  portugues: 'azul',
  matematica: 'roxo',
  gerais: 'laranja',
  especificos: 'acerto',
};

const TEXTO_PASSO: Record<DesempenhoResposta['proximoPasso'], string> = {
  revisao:
    'Você tem erros para revisar hoje. Comece por eles; depois, o treino inteligente reforça os temas que precisam de atenção.',
  trilha: 'Continue a trilha e reforce os temas fracos com o treino inteligente.',
  treino:
    'Você concluiu a trilha! O treino inteligente reforça o que precisa e mantém o que você já sabe até o dia da prova.',
};

/** Ordena os temas de uma seção: menor domínio primeiro (fracos), depois pelo nome. */
export function separarTemas(temas: readonly Tema[]) {
  const grupos: Record<ClasseVisivel, Tema[]> = {
    fraco: [],
    regular: [],
    forte: [],
    pouco_praticado: [],
  };
  let naoVistos = 0;
  for (const t of temas) {
    if (t.classe === 'nao_visto') naoVistos++;
    else grupos[t.classe].push(t);
  }
  for (const c of SECOES) {
    grupos[c].sort(
      (a, b) => (a.dominio ?? 0) - (b.dominio ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }
  return { grupos, naoVistos };
}

/** D29: Meu desempenho (`/desempenho`): treino inteligente, resumo e domínio por tema. */
export default function Desempenho() {
  const me = useMe();
  const d = useDesempenho();
  const navegar = useNavigate();
  const separados = useMemo(() => (d.data ? separarTemas(d.data.temas) : null), [d.data]);

  const treinar = () => navegar('/reforco/praticar');

  return (
    <Pagina comNav rotulo="Meu desempenho">
      <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
      <h1 className={s.titulo}>Meu desempenho</h1>
      {d.isPending ? (
        <Carregando />
      ) : d.isError ? (
        <ErroTela mensagem={mensagemDeErro(d.error)} onTentar={() => d.refetch()} />
      ) : (
        <>
          <section className={s.heroi} aria-labelledby="treino-titulo">
            <div className={s.heroiTexto}>
              <p className={s.heroiRotulo}>Seu próximo passo</p>
              <h2 id="treino-titulo" className={s.heroiTitulo}>
                Treino inteligente
              </h2>
              <p className={s.heroiSub}>{TEXTO_PASSO[d.data.proximoPasso]}</p>
              <div className={s.heroiBotoes}>
                {d.data.proximoPasso === 'revisao' ? (
                  <Botao3D
                    variante="claro"
                    bloco={false}
                    onClick={() => navegar('/revisar/praticar')}
                    iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
                  >
                    REVISAR ERROS
                  </Botao3D>
                ) : d.data.proximoPasso === 'trilha' ? (
                  <Botao3D
                    variante="claro"
                    bloco={false}
                    onClick={() => navegar('/aprender')}
                    iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
                  >
                    CONTINUAR TRILHA
                  </Botao3D>
                ) : null}
                <Botao3D
                  variante={d.data.proximoPasso === 'treino' ? 'claro' : 'laranja'}
                  bloco={false}
                  onClick={treinar}
                  iconeDireita={
                    d.data.proximoPasso === 'treino' ? (
                      <IconeTraco nome="seta" tamanho={20} />
                    ) : undefined
                  }
                >
                  TREINO INTELIGENTE
                </Botao3D>
              </div>
            </div>
            <Imagem
              nome="mascote-estudando"
              tamanho={130}
              className={s.heroiCapi}
              carregamento="eager"
            />
          </section>

          {d.data.resumo.questoes === 0 ? (
            <section className={s.vazio}>
              <Capi pose="incentivando" tamanho={180} descrever />
              <p className={s.vazioTitulo}>Seu desempenho aparece aqui</p>
              <p className={s.vazioTexto}>
                Responda às questões da trilha ou do treino inteligente e veja os temas em que você
                está bem e os que precisam de reforço.
              </p>
              <Botao3D onClick={() => navegar('/aprender')}>IR PARA A TRILHA</Botao3D>
            </section>
          ) : (
            <>
              <div className={s.grade}>
                <CartaoEstatistica
                  vertical
                  icone="icone-alvo"
                  valor={d.data.resumo.precisao == null ? '—' : `${d.data.resumo.precisao}%`}
                  legenda="de acertos"
                />
                <CartaoEstatistica
                  vertical
                  icone="icone-simulados"
                  valor={formatarNumero(d.data.resumo.questoes)}
                  legenda="questões"
                />
                <CartaoEstatistica
                  vertical
                  icone="icone-medalha"
                  valor={formatarNumero(separados!.grupos.forte.length)}
                  legenda="temas fortes"
                />
              </div>

              <section className={s.cartao} aria-labelledby="disc-titulo">
                <h2 id="disc-titulo" className={s.cartaoTitulo}>
                  Domínio por disciplina
                </h2>
                <ul className={s.disciplinas}>
                  {d.data.disciplinas.map((x) => (
                    <li key={x.slug} className={s.discLinha}>
                      <span className={s.discIcone} data-fundo={x.slug}>
                        <Imagem nome={ICONE_DISCIPLINA[x.slug]} tamanho={30} />
                      </span>
                      <span className={s.discCorpo}>
                        <span className={s.discNome}>{NOME_CURTO_DISCIPLINA[x.slug]}</span>
                        <BarraProgresso
                          valor={x.dominio ?? 0}
                          rotulo={`Domínio em ${x.nome}`}
                          cor={COR_DISCIPLINA[x.slug]}
                          fina
                        />
                      </span>
                      <span className={s.discValor}>{formatarDominio(x.dominio)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {SECOES.map((classe) =>
                separados!.grupos[classe].length > 0 ? (
                  <section key={classe} aria-labelledby={`secao-${classe}`}>
                    <TituloSecao>
                      <span id={`secao-${classe}`}>{NOMES_CLASSE_TEMA[classe]}</span>
                    </TituloSecao>
                    <ul className={s.temas}>
                      {separados!.grupos[classe].map((t) => (
                        <li key={t.assuntoId}>
                          <CartaoTema
                            tema={t}
                            onReforcar={() => navegar(`/reforco/praticar?assunto=${t.assuntoId}`)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null,
              )}
            </>
          )}

          {separados && separados.naoVistos > 0 ? (
            <p className={s.naoVistos}>
              <IconeTraco nome="livro" tamanho={22} />
              <span>
                {plural(separados.naoVistos, 'tema ainda não visto', 'temas ainda não vistos')}
                {separados.naoVistos === 1
                  ? ': o treino inteligente e a trilha vão apresentá-lo.'
                  : ': o treino inteligente e a trilha vão apresentá-los.'}
              </span>
            </p>
          ) : null}
        </>
      )}
    </Pagina>
  );
}

function CartaoTema({ tema, onReforcar }: { tema: Tema; onReforcar: () => void }) {
  return (
    <article className={s.tema}>
      <div className={s.temaTopo}>
        <h3 className={s.temaNome}>{tema.nome}</h3>
        <Chip variante={CHIP_DISCIPLINA[tema.disciplina]}>
          {NOME_CURTO_DISCIPLINA[tema.disciplina]}
        </Chip>
      </div>
      <div className={s.temaDominio}>
        <BarraProgresso
          valor={tema.dominio ?? 0}
          rotulo={`Domínio em ${tema.nome}`}
          cor={COR_DISCIPLINA[tema.disciplina]}
          fina
        />
        <span className={s.temaPct}>{formatarDominio(tema.dominio)}</span>
      </div>
      <div className={s.temaRodape}>
        <span className={s.temaQuestoes}>{plural(tema.tentativas, 'questão', 'questões')}</span>
        <Botao3D
          variante="secundario"
          compacto
          bloco={false}
          onClick={onReforcar}
          aria-label={`Reforçar ${tema.nome}`}
        >
          REFORÇAR
        </Botao3D>
      </div>
    </article>
  );
}
