import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaRevisao, CenaTreinos } from './cenas';
import narracao from './narracao.json';

// V34 · domingo 29/11 · "O plano da semana" (quadro de cortiça → treinos → revisão e simulado → plano no app → post-it com o preço → link) — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'treinos', 'revisao', 'app', 'oferta', 'fecho'], {}, true, { gancho: 10, treinos: 20, revisao: 25, app: 35, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, treinos: CenaTreinos, revisao: CenaRevisao, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), fade(), slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v34/trilha.wav',
});
