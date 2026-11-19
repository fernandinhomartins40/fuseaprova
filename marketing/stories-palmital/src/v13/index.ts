import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaTempo, CenaVirada } from './cenas';
import narracao from './narracao.json';

// V13 · "Dia 25 abre a inscrição" (calendário → formulário x estudo → linha do tempo → app → R$ 197 em 6x → link) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'virada', 'tempo', 'app', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    virada: CenaVirada,
    tempo: CenaTempo,
    app: CenaApp,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v13/trilha.wav',
});
