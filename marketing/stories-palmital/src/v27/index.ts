import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaGaveta, CenaHoras, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V27 · quinta 26/11 · "A resposta no edital" (lupa → gaveta → ampulheta → Pergunte ao edital → cupom → link) — voz Roberta
export const linha = montarLinha(narracao, ['gancho', 'gaveta', 'horas', 'app', 'oferta', 'fecho'], {}, true, { gancho: 15, gaveta: 15, horas: 20, app: 45, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, gaveta: CenaGaveta, horas: CenaHoras, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), flip({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade()],
  trilha: 'audio/v27/trilha.wav',
});
