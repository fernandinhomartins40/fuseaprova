import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCartao, CenaFecho, CenaGancho, CenaInscricao, CenaUltimo } from './cenas';
import narracao from './narracao.json';

// V20 · quarta 25/11 · "É hoje" (HOJE em placas + 12h → datas do edital → último dia do R$ 197 → 6x só hoje → estudar → link) — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'inscricao', 'ultimo', 'cartao', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    inscricao: CenaInscricao,
    ultimo: CenaUltimo,
    cartao: CenaCartao,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [wipe({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), fade(), fade()],
  trilha: 'audio/v20/trilha.wav',
});
