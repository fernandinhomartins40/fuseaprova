import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaRevela, CenaUltimo } from './cenas';
import narracao from './narracao.json';

// V23 · quarta 25/11 · "A notícia" (jornal borrado → último dia → o app → PRORROGADO → oferta até 05/12 → link) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'ultimo', 'app', 'revela', 'oferta', 'fecho'], {}, true, { revela: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, ultimo: CenaUltimo, app: CenaApp, revela: CenaRevela, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-top-left' }), slide({ direction: 'from-right' }), flip({ direction: 'from-bottom' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v23/trilha.wav',
});
