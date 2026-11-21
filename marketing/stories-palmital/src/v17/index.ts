import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaContagem, CenaFacil, CenaFecho, CenaOferta, CenaPlano } from './cenas';
import narracao from './narracao.json';

// V17 · domingo 22/11 · "Faltam 3 dias" (placa 4→3 → fácil × preparado → 3 passos → app → oferta → link) — voz Jenifer
export const linha = montarLinha(narracao, ['contagem', 'facil', 'plano', 'app', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    contagem: CenaContagem,
    facil: CenaFacil,
    plano: CenaPlano,
    app: CenaApp,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), fade(), fade()],
  trilha: 'audio/v17/trilha.wav',
});
