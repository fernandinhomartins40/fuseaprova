import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaReler, CenaRevela } from './cenas';
import narracao from './narracao.json';

// V30 · sexta 27/11 · "O que você esquece" (memória despencando → reler → revisões 1/3/7/15 → revisão no app → fita até 05/12 → link) — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'reler', 'revela', 'app', 'oferta', 'fecho'], {}, true, { gancho: 20, reler: 20, revela: 25, app: 30, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, reler: CenaReler, revela: CenaRevela, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-right' }), fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-bottom-right' }), fade()],
  trilha: 'audio/v30/trilha.wav',
});
