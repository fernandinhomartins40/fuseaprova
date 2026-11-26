import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAgora, CenaAmanha, CenaFecho, CenaGancho, CenaPreco } from './cenas';
import narracao from './narracao.json';

// V45 · sábado 05/12 · "Hoje à meia-noite" (painel de partidas → cartão de embarque → amanhã R$ 297 → 23:59 e a Capi → fecho) — voz Roberta
export const linha = montarLinha(narracao, ['gancho', 'preco', 'amanha', 'agora', 'fecho'], {}, true, { gancho: 25, preco: 20, amanha: 25, agora: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, preco: CenaPreco, amanha: CenaAmanha, agora: CenaAgora, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-right' }), fade(), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v45/trilha.wav',
});
