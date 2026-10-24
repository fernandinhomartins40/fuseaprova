/**
 * Pré-visualização da questão no formato da tela de Pergunta (05): chip de origem, Capi com o
 * balão do enunciado, alternativas A–E, DICA e VERIFICAR, e a folha de feedback.
 */
import { useState } from 'react';
import { tituloErro, type Letra, type OrigemQuestao } from '@fuse/shared';
import { juntarClasses } from '../util';
import { Markdown } from '../../ui';
import s from './PreviaPergunta.module.css';

export interface DadosPrevia {
  origem: OrigemQuestao;
  chipOrigem: string;
  disciplina: string;
  assunto?: string | null;
  textoApoio: string | null;
  enunciado: string;
  alternativas: readonly { letra: Letra; texto: string }[];
  gabarito: Letra | null;
  explicacao: string | null;
  dicaBolso: string | null;
  dica: string | null;
}

function Capi() {
  return (
    <svg className={s.capi} width="72" height="66" viewBox="0 0 120 110" aria-hidden="true">
      <ellipse cx="60" cy="80" rx="44" ry="26" fill="#A86B3C" />
      <rect x="22" y="18" width="76" height="62" rx="30" fill="#BC7E4A" />
      <ellipse cx="34" cy="22" rx="8" ry="7" fill="#8E5631" />
      <ellipse cx="86" cy="22" rx="8" ry="7" fill="#8E5631" />
      <rect x="36" y="48" width="48" height="30" rx="15" fill="#946038" />
      <ellipse cx="52" cy="58" rx="3" ry="2.3" fill="#3A2416" />
      <ellipse cx="68" cy="58" rx="3" ry="2.3" fill="#3A2416" />
      <path d="M54 69h12" stroke="#3A2416" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="44" cy="40" r="5.6" fill="#1F1A17" />
      <circle cx="76" cy="40" r="5.6" fill="#1F1A17" />
      <circle cx="46" cy="38" r="1.9" fill="#FFFFFF" />
      <circle cx="78" cy="38" r="1.9" fill="#FFFFFF" />
      <path d="M24 78q36 16 72 0l-2 9q-34 15-68 0z" fill="#FF6A16" />
    </svg>
  );
}

export function PreviaPergunta({ dados }: { dados: DadosPrevia }) {
  const [selecionada, setSelecionada] = useState<Letra | null>(null);
  const [verificada, setVerificada] = useState(false);
  const [verDica, setVerDica] = useState(false);

  const acertou = verificada && selecionada !== null && selecionada === dados.gabarito;

  function escolher(l: Letra) {
    if (verificada) return;
    setSelecionada(l);
  }

  function reiniciar() {
    setSelecionada(null);
    setVerificada(false);
    setVerDica(false);
  }

  return (
    <div className={s.tela} aria-label="Pré-visualização da tela de Pergunta" role="region">
      <div className={s.topo} aria-hidden="true">
        <span className={s.fechar}>✕</span>
        <span className={s.progresso}>
          <span className={s.progressoCheio} />
        </span>
        <span className={s.vidas}>♥ 5</span>
      </div>

      <div className={s.corpo}>
        <div className={s.linhaChip}>
          <span
            className={juntarClasses(s.chip, dados.origem === 'autoral' && s.chipAutoral)}
            data-testid="chip-origem"
          >
            {dados.chipOrigem}
          </span>
          <span className={s.disciplina}>{dados.disciplina}</span>
        </div>
        <h3 className={s.titulo}>Selecione a alternativa correta</h3>

        {dados.textoApoio ? (
          <div className={s.apoio}>
            <Markdown texto={dados.textoApoio} />
          </div>
        ) : null}

        <div className={s.linhaBalao}>
          <Capi />
          <div className={s.balao} data-testid="balao-enunciado">
            {dados.enunciado.trim() ? (
              <Markdown texto={dados.enunciado} />
            ) : (
              <span className={s.vazio}>O enunciado aparece aqui.</span>
            )}
          </div>
        </div>

        {verDica ? (
          <div className={s.dica} role="note">
            <strong>Dica:</strong> {dados.dica?.trim() || 'Sem dica cadastrada.'}
          </div>
        ) : null}

        <div role="radiogroup" aria-label="Alternativas" className={s.alternativas}>
          {dados.alternativas.map((a) => {
            const marcada = selecionada === a.letra;
            const correta = verificada && a.letra === dados.gabarito;
            const errada = verificada && marcada && a.letra !== dados.gabarito;
            return (
              <button
                key={a.letra}
                type="button"
                role="radio"
                aria-checked={marcada}
                className={juntarClasses(
                  s.alt,
                  marcada && !verificada && s.altSelecionada,
                  correta && s.altCorreta,
                  errada && s.altErrada,
                )}
                onClick={() => escolher(a.letra)}
              >
                <span className={s.letra}>{a.letra}</span>
                <span>{a.texto || <span className={s.vazio}>Alternativa {a.letra}</span>}</span>
              </button>
            );
          })}
        </div>
      </div>

      {verificada ? (
        <div
          className={juntarClasses(s.folha, acertou ? s.folhaAcerto : s.folhaErro)}
          role="status"
          data-testid="folha-feedback"
        >
          <div className={s.folhaTitulo}>
            {acertou ? 'Mandou bem!' : dados.gabarito ? tituloErro(dados.gabarito) : 'Sem gabarito'}
          </div>
          <div className={s.folhaTexto}>
            {dados.explicacao?.trim() ? (
              <Markdown texto={dados.explicacao} />
            ) : (
              <em>Sem explicação cadastrada.</em>
            )}
          </div>
          {dados.dicaBolso?.trim() ? (
            <div className={s.bolso}>
              <strong>Dica de bolso:</strong> {dados.dicaBolso}
            </div>
          ) : null}
          <button type="button" className={s.botaoFolha} onClick={reiniciar}>
            REFAZER
          </button>
        </div>
      ) : (
        <div className={s.rodape}>
          <button type="button" className={s.botaoDica} onClick={() => setVerDica((v) => !v)}>
            DICA
          </button>
          <button
            type="button"
            className={s.botaoVerificar}
            disabled={selecionada === null}
            onClick={() => setVerificada(true)}
          >
            VERIFICAR
          </button>
        </div>
      )}
    </div>
  );
}
