import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaConta, CenaData, CenaFecho, CenaParcela, CenaPreco, CenaSobe } from './cenas';
import narracao from './narracao.json';

// V15 · "Faz a conta" (calculadora → R$ 197 → 6x de R$ 32,83 → sobe para R$ 297 → inscrições 25/11 → link) — voz Raquel
export const linha = montarLinha(narracao, ['conta', 'preco', 'parcela', 'sobe', 'data', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    conta: CenaConta,
    preco: CenaPreco,
    parcela: CenaParcela,
    sobe: CenaSobe,
    data: CenaData,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), slide({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v15/trilha.wav',
});
