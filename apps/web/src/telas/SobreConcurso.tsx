import { formatarDataBR } from '@fuse/shared';
import { mensagemDeErro } from '../api/cliente';
import { useConcurso } from '../api/consultas';
import {
  CabecalhoVoltar,
  Capi,
  Carregando,
  Cartao,
  Chip,
  ErroTela,
  IconeTraco,
  Pagina,
} from '../ui';
import { plural } from './comum';
import s from './Info.module.css';

/** ✏️ Sobre o concurso: status do edital, links oficiais e data da prova (com contagem). */
export default function SobreConcurso() {
  const c = useConcurso();
  return (
    <Pagina>
      <CabecalhoVoltar para="/aprender" titulo="Sobre o concurso" />
      {c.isPending ? (
        <Carregando />
      ) : c.isError ? (
        <ErroTela mensagem={mensagemDeErro(c.error)} onTentar={() => c.refetch()} />
      ) : (
        <div className={s.pilha}>
          <h1 className={s.titulo}>{c.data.nome}</h1>
          <div className={s.chips}>
            <Chip variante="marca">{c.data.sigla}</Chip>
            <Chip>
              {c.data.municipio} · {c.data.uf}
            </Chip>
            <Chip>Banca {c.data.banca}</Chip>
          </div>

          <Cartao>
            <p className={s.rotulo}>STATUS DO EDITAL</p>
            <p className={s.destaque}>{c.data.statusTexto}</p>
            {c.data.dataProva ? (
              <p className={s.prova}>
                <IconeTraco nome="relogio" tamanho={20} /> Prova em{' '}
                {formatarDataBR(c.data.dataProva)}
                {c.data.diasParaProva != null && c.data.diasParaProva >= 0 ? (
                  <strong> · faltam {plural(c.data.diasParaProva, 'dia', 'dias')}</strong>
                ) : null}
              </p>
            ) : (
              <p className={s.textoMenor}>A data da prova ainda não foi divulgada.</p>
            )}
          </Cartao>

          <Capi pose="explicando" tamanho={110} fala={c.data.avisoEdital} />

          <section>
            <h2 className={s.subtitulo}>Links oficiais</h2>
            {c.data.links.length === 0 ? (
              <p className={s.textoMenor}>Ainda não há links oficiais publicados.</p>
            ) : (
              <ul className={s.links}>
                {c.data.links.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className={s.link}>
                      <IconeTraco nome="link" tamanho={20} />
                      <span>{l.titulo}</span>
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Pagina>
  );
}
