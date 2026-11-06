import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAdapta, CenaChamada, CenaEdital, CenaGancho, CenaOferta, CenaSolucao, CenaVitrine } from './cenas';
import narracao from './narracao.json';

// V1 · "Comece antes do edital" — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'edital', 'solucao', 'vitrine', 'adapta', 'oferta', 'chamada'], { vitrine: 48 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    edital: CenaEdital,
    solucao: CenaSolucao,
    vitrine: CenaVitrine,
    adapta: CenaAdapta,
    oferta: CenaOferta,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [
    slide({ direction: 'from-bottom' }),
    wipe({ direction: 'from-left' }),
    slide({ direction: 'from-right' }),
    slide({ direction: 'from-bottom' }),
    wipe({ direction: 'from-top-left' }),
    fade(),
    fade(),
  ],
  trilha: 'audio/v1/trilha.wav',
});
