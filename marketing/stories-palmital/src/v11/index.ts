import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaFecho, CenaGancho, CenaNumeros, CenaOferta, CenaProduto, CenaVirada } from './cenas';
import narracao from './narracao.json';

// V11 · "Saiu o edital" (notícia → números → pouco tempo → app → última semana a R$ 197 → link) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'numeros', 'virada', 'produto', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    numeros: CenaNumeros,
    virada: CenaVirada,
    produto: CenaProduto,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), fade(), fade()],
  trilha: 'audio/v11/trilha.wav',
});
