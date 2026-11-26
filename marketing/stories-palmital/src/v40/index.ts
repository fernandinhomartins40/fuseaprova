import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaPassos, CenaQuatro } from './cenas';
import narracao from './narracao.json';

// V40 · quarta 02/12 · "Os 4 passos" (tabuleiro → passos 1-3 → casa 4 dourada → passos no app → dado no 6 → link) — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'passos', 'quatro', 'app', 'oferta', 'fecho'], {}, true, { gancho: 15, passos: 15, quatro: 25, app: 35, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, passos: CenaPassos, quatro: CenaQuatro, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), fade()],
  trilha: 'audio/v40/trilha.wav',
});
