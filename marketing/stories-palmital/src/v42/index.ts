import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaDias, CenaFecho, CenaGancho, CenaOferta, CenaTreinos } from './cenas';
import narracao from './narracao.json';

// V42 · quinta 03/12 · "O número 80" (80 em ouro → 80 dias → 80 treinos → 5 min no app → neon com o preço → fecho) — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'dias', 'treinos', 'app', 'oferta', 'fecho'], {}, true, { gancho: 15, dias: 20, treinos: 30, app: 30, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, dias: CenaDias, treinos: CenaTreinos, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), fade(), slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v42/trilha.wav',
});
