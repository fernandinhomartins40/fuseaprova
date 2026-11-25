import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaFrente, CenaGancho, CenaOferta, CenaRevela } from './cenas';
import narracao from './narracao.json';

// V36 · segunda 30/11 · "A matéria de todos" (49 portas e a chave "?" → PORTUGUÊS abre tudo → pódio → trilha → livro com o preço → link) — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'revela', 'frente', 'app', 'oferta', 'fecho'], {}, true, { gancho: 15, revela: 45, frente: 20, app: 25, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, revela: CenaRevela, frente: CenaFrente, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), wipe({ direction: 'from-bottom' }), slide({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v36/trilha.wav',
});
