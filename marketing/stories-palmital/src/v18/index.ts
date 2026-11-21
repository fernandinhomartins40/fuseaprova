import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaDuas, CenaFecho, CenaGancho, CenaOferta, CenaQuarta } from './cenas';
import narracao from './narracao.json';

// V18 · segunda 23/11 · "Faltam 2 dias" (placa 3→2 → duas pessoas → quarta: só uma chega estudando → app → oferta → link) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'duas', 'quarta', 'app', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    duas: CenaDuas,
    quarta: CenaQuarta,
    app: CenaApp,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [wipe({ direction: 'from-left' }), fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v18/trilha.wav',
});
