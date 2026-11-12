import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaEdital, CenaEscolha, CenaFecho, CenaGancho, CenaOferta, CenaProduto, CenaProva, CenaVirada } from './cenas';
import narracao from './narracao.json';

// V9 · "Duas escolhas" (Júlia espera o edital, Marcos começa antes) — voz Matheus
export const linha = montarLinha(narracao, ['gancho', 'escolha', 'edital', 'prova', 'virada', 'produto', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    escolha: CenaEscolha,
    edital: CenaEdital,
    prova: CenaProva,
    virada: CenaVirada,
    produto: CenaProduto,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), fade(), fade()],
  trilha: 'audio/v9/trilha.wav',
});
