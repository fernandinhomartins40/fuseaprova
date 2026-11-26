import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaCinco, CenaDia, CenaFecho, CenaGancho, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V41 · quinta 03/12 · "Não tenho tempo" (balão estilhaça → 1.440 min → fatia de 5 → questão no app → relógio de bolso → link) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'dia', 'cinco', 'app', 'oferta', 'fecho'], {}, true, { gancho: 8, dia: 10, cinco: 25, app: 30, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, dia: CenaDia, cinco: CenaCinco, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-bottom' }), fade(), slide({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v41/trilha.wav',
});
