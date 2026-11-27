import { useNavigate, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/cliente';
import { useRedacaoPainel } from '../../api/consultas';
import { Botao3D, CabecalhoVoltar, Carregando, ErroTela, Markdown, Pagina } from '../../ui';
import s from './Redacao.module.css';

/** D49: uma aula do mini-curso de redação, com as fontes. */
export default function RedacaoAula() {
  const { id = '' } = useParams();
  const painel = useRedacaoPainel();
  const navegar = useNavigate();
  const aulas = painel.data?.aulas ?? [];
  const i = aulas.findIndex((a) => a.id === id);
  const aula = aulas[i];
  const proxima = aulas[i + 1];

  return (
    <Pagina rotulo="Aula de redação">
      <CabecalhoVoltar para="/redacao?aba=aulas" titulo="Mini-curso de redação" />
      {painel.isPending ? (
        <Carregando />
      ) : painel.isError ? (
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      ) : !aula ? (
        <ErroTela mensagem="Aula não encontrada." />
      ) : (
        <article className={s.aula}>
          <h1 className={s.aulaTitulo}>{aula.titulo}</h1>
          <p className={s.nota}>{aula.minutos} min de leitura</p>
          {aula.secoes.map((sec) => (
            <section key={sec.titulo} className={s.secao}>
              <h2>{sec.titulo}</h2>
              <Markdown texto={sec.texto} />
            </section>
          ))}
          <section className={s.fontes} aria-label="Fontes">
            <h2>Fontes</h2>
            <ul>
              {aula.fontes.map((f) => (
                <li key={f.url + f.titulo}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    {f.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </section>
          {proxima ? (
            <Botao3D onClick={() => navegar(`/redacao/aula/${proxima.id}`)}>PRÓXIMA AULA</Botao3D>
          ) : (
            <Botao3D onClick={() => navegar('/redacao?aba=temas')}>ESCOLHER UM TEMA E ESCREVER</Botao3D>
          )}
        </article>
      )}
    </Pagina>
  );
}
