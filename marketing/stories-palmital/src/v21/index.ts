import { fade } from '@remotion/transitions/fade';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCaminho, CenaLogo } from './cenas';
import narracao from './narracao.json';

// V21 · "O pavio" — uma cena contínua: o pavio aceso desce acendendo cada ideia (estilo escuro, neon e 3D) — voz Davi Andrei
export const linha = montarLinha(narracao, ['caminho'], { caminho: 72 });

export const Video = criarVideo({
  linha,
  componentes: { caminho: CenaCaminho, marca: CenaLogo },
  transicoes: [fade()],
  trilha: 'audio/v21/trilha.wav',
});
