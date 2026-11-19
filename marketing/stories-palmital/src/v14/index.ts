import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaDois, CenaFecho, CenaGancho, CenaQuatro, CenaTres, CenaUm } from './cenas';
import narracao from './narracao.json';

// V14 · "4 coisas pra fazer antes do dia 25" (lista → cargo → 20 min → Português e Matemática → preço → link) — voz Roberta
export const linha = montarLinha(narracao, ['gancho', 'um', 'dois', 'tres', 'quatro', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    um: CenaUm,
    dois: CenaDois,
    tres: CenaTres,
    quatro: CenaQuatro,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), slide({ direction: 'from-right' }), slide({ direction: 'from-right' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), fade()],
  trilha: 'audio/v14/trilha.wav',
});
