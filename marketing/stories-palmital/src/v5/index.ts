import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAntes, CenaApp, CenaChamada, CenaEdital, CenaGancho, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V5 · "Quer estudar para Palmital?" — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'antes', 'app', 'edital', 'oferta', 'chamada'], { app: 70 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    antes: CenaAntes,
    app: CenaApp,
    edital: CenaEdital,
    oferta: CenaOferta,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), fade(), fade(), fade()],
  trilha: 'audio/v5/trilha.wav',
});
