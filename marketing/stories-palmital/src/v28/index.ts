import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaSem, CenaTreino } from './cenas';
import narracao from './narracao.json';

// V28 · quinta 26/11 · "Na fila do banco" (fila e senha → apostila e 2h riscados → 5:00 → acerto/erro no app → senha R$ 197 → link) — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'sem', 'treino', 'app', 'oferta', 'fecho'], {}, true, { gancho: 20, sem: 15, treino: 15, app: 30, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, sem: CenaSem, treino: CenaTreino, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom-left' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-top' }), fade()],
  trilha: 'audio/v28/trilha.wav',
});
