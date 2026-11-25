import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaDevolve, CenaFecho, CenaGancho, CenaOferta, CenaSete } from './cenas';
import narracao from './narracao.json';

// V33 · domingo 29/11 · "Teste sem risco" (cofre → 7 dias → 100% de volta → use e decida → escudo com o preço → link) — voz Roberta
export const linha = montarLinha(narracao, ['gancho', 'sete', 'devolve', 'app', 'oferta', 'fecho'], {}, true, { gancho: 20, sete: 30, devolve: 25, app: 30, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, sete: CenaSete, devolve: CenaDevolve, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [flip({ direction: 'from-left' }), wipe({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), slide({ direction: 'from-right' }), fade()],
  trilha: 'audio/v33/trilha.wav',
});
