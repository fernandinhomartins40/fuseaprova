import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES } from '../../api/consultas';
import {
  AulaTema,
  CabecalhoVoltar,
  Carregando,
  Chip,
  ErroTela,
  IconeTraco,
  Markdown,
  Pagina,
} from '../../ui';
import { MarkdownEmLinha } from '../../ui/Markdown';
import { NOME_CURTO_DISCIPLINA } from '../comum';
import { EditorAnotacao } from './EditorAnotacao';
import s from './Anotacoes.module.css';

/** D28: uma anotação (`/anotacoes/:id`) com a questão, o gabarito, a explicação e a aula do tema. */
export default function AnotacaoDetalhe() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: CHAVES.anotacao(id),
    queryFn: ({ signal }) => chamar('anotacaoDetalhe', { params: { id }, signal }),
  });

  return (
    <Pagina>
      <CabecalhoVoltar para="/anotacoes" titulo="Anotação" />
      {q.isPending ? (
        <Carregando />
      ) : q.isError ? (
        <ErroTela mensagem={mensagemDeErro(q.error)} onTentar={() => q.refetch()} />
      ) : (
        <>
          <div className={s.detCab}>
            <Chip variante="marca">
              {NOME_CURTO_DISCIPLINA[q.data.questao.disciplina.slug]} · {q.data.questao.assunto.nome}
            </Chip>
            <span className={s.detOrigem}>{q.data.questao.chipOrigem}</span>
          </div>

          <section className={s.cartao}>
            <EditorAnotacao
              questaoId={id}
              inicial={q.data.anotacao.texto}
              onMudou={(texto) => {
                void qc.invalidateQueries({ queryKey: CHAVES.anotacoes });
                if (texto === null) navegar('/anotacoes', { replace: true });
              }}
            />
          </section>

          <section className={s.cartao} aria-label="Questão">
            {q.data.questao.textoApoio ? (
              <div className={s.detApoio}>
                <Markdown texto={q.data.questao.textoApoio} />
              </div>
            ) : null}
            <div className={s.detEnunciado}>
              <Markdown texto={q.data.questao.enunciado} />
            </div>
            <ul className={s.detAlternativas}>
              {q.data.questao.alternativas.map((a) => {
                const certa = a.letra === q.data.correcao.gabarito;
                return (
                  <li key={a.letra} className={certa ? s.detCerta : s.detAlternativa}>
                    <span className={s.detLetra}>{a.letra}</span>
                    <span>
                      <MarkdownEmLinha texto={a.texto} />
                    </span>
                    {certa ? (
                      <span className={s.detSelo}>
                        <IconeTraco nome="check" tamanho={16} espessura={3} /> Correta
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          {q.data.correcao.explicacao ? (
            <section className={s.cartao} aria-labelledby="det-expl">
              <h2 id="det-expl" className={s.detTitulo}>
                Explicação da resposta
              </h2>
              <p className={s.detTexto}>{q.data.correcao.explicacao}</p>
              {q.data.correcao.dicaBolso ? (
                <p className={s.detBolso}>
                  <strong>Dica de bolso: </strong>
                  {q.data.correcao.dicaBolso}
                </p>
              ) : null}
            </section>
          ) : null}

          {q.data.questao.aula ? (
            <section className={s.cartao}>
              <AulaTema aula={q.data.questao.aula} />
            </section>
          ) : null}
        </>
      )}
    </Pagina>
  );
}
