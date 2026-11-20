import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaLicao, CenaNeuronio, CenaVespera } from './cenas';
import narracao from './narracao.json';

// V16 · "O neurônio leva tempo" (time-lapse real → ligações e repetição → véspera não dá tempo → app → dia 25) — voz Lucas
export const linha = montarLinha(narracao, ['neuronio', 'licao', 'vespera', 'app', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    neuronio: CenaNeuronio,
    licao: CenaLicao,
    vespera: CenaVespera,
    app: CenaApp,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [fade(), wipe({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), fade()],
  trilha: 'audio/v16/trilha.wav',
});
