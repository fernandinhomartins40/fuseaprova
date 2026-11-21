import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCartao, CenaDuas, CenaFecho, CenaGancho, CenaHoje } from './cenas';
import narracao from './narracao.json';

// V19 · terça 24/11 · "É amanhã" (despertador até 12h → último dia do R$ 197 → 6x só até amanhã → garante hoje → link) — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'duas', 'cartao', 'hoje', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    duas: CenaDuas,
    cartao: CenaCartao,
    hoje: CenaHoje,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), slide({ direction: 'from-left' }), fade(), fade()],
  trilha: 'audio/v19/trilha.wav',
});
