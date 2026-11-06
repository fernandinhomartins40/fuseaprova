import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaChamada, CenaEdital, CenaGancho, CenaOferta, CenaQuiz } from './cenas';
import narracao from './narracao.json';

// V4 · "Você acertaria?" — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'quiz', 'app', 'edital', 'oferta', 'chamada'], { quiz: 50, app: 70, chamada: 48 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    quiz: CenaQuiz,
    app: CenaApp,
    edital: CenaEdital,
    oferta: CenaOferta,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), fade(), fade()],
  trilha: 'audio/v4/trilha.wav',
});
