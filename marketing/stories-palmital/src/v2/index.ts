import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaChamada, CenaEdital, CenaGancho, CenaHabito, CenaOferta, CenaRotina, CenaSoma } from './cenas';
import narracao from './narracao.json';

// V2 · "Cabe na sua rotina" — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'rotina', 'soma', 'habito', 'edital', 'oferta', 'chamada'], { rotina: 62, soma: 70 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    rotina: CenaRotina,
    soma: CenaSoma,
    habito: CenaHabito,
    edital: CenaEdital,
    oferta: CenaOferta,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [fade(), slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), fade(), fade()],
  trilha: 'audio/v2/trilha.wav',
});
