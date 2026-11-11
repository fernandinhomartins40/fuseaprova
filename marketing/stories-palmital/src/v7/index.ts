import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaBanca, CenaChamada, CenaGancho, CenaOferta, CenaPrazo } from './cenas';
import narracao from './narracao.json';

// V7 · "Parcelado em até 6x sem juros" — voz Paulo, visual mais sóbrio
export const linha = montarLinha(narracao, ['gancho', 'banca', 'app', 'oferta', 'prazo', 'chamada']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    banca: CenaBanca,
    app: CenaApp,
    oferta: CenaOferta,
    prazo: CenaPrazo,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), fade(), slide({ direction: 'from-right' }), fade()],
  trilha: 'audio/v7/trilha.wav',
});
