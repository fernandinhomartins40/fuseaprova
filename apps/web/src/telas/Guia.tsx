import { useParams } from 'react-router-dom';
import { mensagemDeErro } from '../api/cliente';
import { useGuia } from '../api/consultas';
import { CabecalhoVoltar, Capi, Carregando, Cartao, Chip, ErroTela, Imagem, Pagina } from '../ui';
import { ICONE_DISCIPLINA } from './comum';
import s from './Info.module.css';

/** ✏️ Guia da unidade: as dicas de todas as lições, em cartões curtos, para ler sem responder. */
export default function Guia() {
  const { unidadeId = '' } = useParams();
  const g = useGuia(unidadeId);
  return (
    <Pagina>
      <CabecalhoVoltar para="/aprender" titulo="Guia da unidade" />
      {g.isPending ? (
        <Carregando />
      ) : g.isError ? (
        <ErroTela mensagem={mensagemDeErro(g.error)} onTentar={() => g.refetch()} />
      ) : (
        <div className={s.pilha}>
          <div className={s.secaoCab}>
            <Imagem nome={ICONE_DISCIPLINA[g.data.unidade.disciplina.slug]} tamanho={44} />
            <h1 className={s.titulo}>{g.data.unidade.titulo}</h1>
          </div>
          <Capi
            pose="estudando"
            tamanho={100}
            fala="Leia com calma. Aqui é só para estudar, sem responder nada."
          />
          {g.data.secoes.map((sec) => (
            <section key={sec.id} className={s.secaoGuia} aria-labelledby={`sec-${sec.id}`}>
              <div className={s.secaoCab}>
                <h2 id={`sec-${sec.id}`} className={s.subtitulo}>
                  {sec.titulo}
                </h2>
                {sec.noEdital === true ? <Chip variante="acerto">No edital</Chip> : null}
                {sec.noEdital === false ? <Chip variante="laranja">Fora do edital</Chip> : null}
              </div>
              {sec.dicas.map((d, i) => (
                <Cartao key={`${d.licaoId ?? 'x'}-${i}`} className={s.dica} como="article">
                  <h3 className={s.dicaTitulo}>{d.titulo}</h3>
                  <p className={s.dicaTexto}>{d.texto}</p>
                  {d.exemplo ? <p className={s.exemplo}>{d.exemplo}</p> : null}
                </Cartao>
              ))}
            </section>
          ))}
        </div>
      )}
    </Pagina>
  );
}
