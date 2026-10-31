import type { AulaQuestao } from '@fuse/shared/api';
import { IconeTraco } from './IconeTraco';
import { Imagem } from './Imagem';
import { Markdown, MarkdownEmLinha } from './Markdown';
import s from './AulaTema.module.css';

/**
 * D28: "Entenda o tema", a mini-aula da questão. Conceito em poucas frases, exemplos numerados
 * fora da questão, macete e pegadinha. Ensina o assunto sem entregar a resposta, para quem nunca
 * estudou o tema ter chance de acertar.
 */
export function AulaTema({ aula, compacta = false }: { aula: AulaQuestao; compacta?: boolean }) {
  return (
    <article className={[s.aula, compacta ? s.compacta : ''].join(' ')} aria-label="Entenda o tema">
      <header className={s.cab}>
        {!compacta ? (
          <Imagem nome="mascote-explicando" tamanho={64} className={s.capi} carregamento="eager" />
        ) : null}
        <div>
          <p className={s.rotulo}>
            <Imagem nome="icone-dica" tamanho={18} carregamento="eager" /> Entenda o tema
          </p>
          <h3 className={s.titulo}>{aula.titulo}</h3>
        </div>
      </header>

      <div className={s.conceito}>
        <Markdown texto={aula.texto} />
      </div>

      {aula.exemplos.length > 0 ? (
        <section className={s.secao} aria-label="Exemplos">
          <p className={s.secaoTitulo}>
            <IconeTraco nome="livro" tamanho={18} /> {aula.exemplos.length === 1 ? 'Exemplo' : 'Exemplos'}
          </p>
          <ol className={s.exemplos}>
            {aula.exemplos.map((e, i) => (
              <li key={i} className={s.exemplo}>
                <span className={s.numero} aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <MarkdownEmLinha texto={e} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {aula.macete ? (
        <p className={s.macete}>
          <Imagem nome="icone-dica" tamanho={24} carregamento="eager" />
          <span>
            <strong>Macete</strong>
            <MarkdownEmLinha texto={aula.macete} />
          </span>
        </p>
      ) : null}

      {aula.atencao ? (
        <p className={s.atencao}>
          <IconeTraco nome="alerta" tamanho={22} />
          <span>
            <strong>Cuidado com a pegadinha</strong>
            <MarkdownEmLinha texto={aula.atencao} />
          </span>
        </p>
      ) : null}
    </article>
  );
}
