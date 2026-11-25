import { fade } from '@remotion/transitions/fade';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCelular } from './cenas';
import narracao from './narracao.json';

// V22 · "O jeito da banca" — celular 3D com as telas reais: cargo pelo edital → trilha → questões no estilo da FAU
// → explicação e revisão do erro → simulado oficial → marca. Uma cena contínua, sem quadro de marca separado. Voz Jenifer.
export const linha = montarLinha(narracao, ['celular'], { celular: 170 }, false, { celular: 60 });

export const Video = criarVideo({
  linha,
  componentes: { celular: CenaCelular },
  transicoes: [fade()],
  trilha: 'audio/v22/trilha.wav',
});
