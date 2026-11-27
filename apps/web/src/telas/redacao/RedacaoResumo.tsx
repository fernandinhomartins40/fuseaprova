import { useNavigate, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/cliente';
import { useRedacaoPainel } from '../../api/consultas';
import { Botao3D, CabecalhoVoltar, Carregando, ErroTela, Markdown, Pagina } from '../../ui';
import s from './Redacao.module.css';

/** D49: resumo de uma aula de redação (o texto completo, com as fontes), para consulta. */
export default function RedacaoResumo() {
  const { id = '' } = useParams();
  const painel = useRedacaoPainel();
  const navegar = useNavigate();
  const aulas = painel.data?.aulas ?? [];
  const aula = aulas.find((a) => a.id === id);

  return (
    <Pagina rotulo="Resumo da aula de redação">
      <CabecalhoVoltar para="/redacao" titulo="Resumo da aula" />
      {painel.isPending ? (
        <Carregando />
      ) : painel.isError ? (
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      ) : !aula ? (
        <ErroTela mensagem="Aula não encontrada." />
      ) : (
        <article className={s.aula}>
          <h1 className={s.aulaTitulo}>{aula.titulo}</h1>
          <p className={s.nota}>{aula.minutos} min de leitura · tudo o que a aula ensina, para revisar</p>
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
          <Botao3D onClick={() => navegar(`/redacao/aula/${aula.id}`)}>FAZER A AULA INTERATIVA</Botao3D>
        </article>
      )}
    </Pagina>
  );
}
