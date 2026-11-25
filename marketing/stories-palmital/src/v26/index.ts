import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAte, CenaFecho, CenaGancho, CenaInclui, CenaOferta, CenaRevela } from './cenas';
import narracao from './narracao.json';

// V26 · quarta 25/11 · "Quanto custa?" (caça-níquel "?" → sacola → até 21/02 → rolos param em 32,83 → calculadora → link) — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'inclui', 'ate', 'revela', 'oferta', 'fecho'], {}, true, { gancho: 15, inclui: 15, revela: 35, oferta: 10, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, inclui: CenaInclui, ate: CenaAte, revela: CenaRevela, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), fade(), slide({ direction: 'from-top' }), fade()],
  trilha: 'audio/v26/trilha.wav',
});
