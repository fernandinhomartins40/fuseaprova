import React from 'react';
import { Html5Audio, Sequence, staticFile } from 'remotion';
import { linearTiming, TransitionPresentation, TransitionSeries } from '@remotion/transitions';
import type { PropsCena } from './comum';
import { Efeito } from './componentes';
import { Linha, T } from './linhaDoTempo';

export type ConfigVideo = {
  linha: Linha;
  componentes: Record<string, React.FC<PropsCena>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transicoes: TransitionPresentation<any>[];
  trilha: string;
};

/** Monta o vídeo: cenas em sequência com transições, falas em cada cena e a trilha com ducking. */
export const criarVideo = ({ linha, componentes, transicoes, trilha }: ConfigVideo): React.FC =>
  function Video() {
    return (
      <>
        <TransitionSeries>
          {linha.cenas.map((cena, i) => {
            const C = componentes[cena.nome];
            return (
              <React.Fragment key={cena.nome}>
                <TransitionSeries.Sequence durationInFrames={cena.duracao}>
                  <C falas={cena.falas} duracao={cena.duracao} />
                  {cena.falas.map((f) => (
                    <Sequence key={f.arquivo} from={f.ini} layout="none">
                      <Html5Audio src={staticFile(f.arquivo)} />
                    </Sequence>
                  ))}
                  {i > 0 ? <Efeito nome="whoosh" em={0} volume={0.5} /> : null}
                </TransitionSeries.Sequence>
                {i < linha.cenas.length - 1 ? (
                  <TransitionSeries.Transition
                    presentation={transicoes[i % transicoes.length]}
                    timing={linearTiming({ durationInFrames: T })}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </TransitionSeries>
        <Html5Audio src={staticFile(trilha)} volume={linha.volumeTrilha} />
      </>
    );
  };
