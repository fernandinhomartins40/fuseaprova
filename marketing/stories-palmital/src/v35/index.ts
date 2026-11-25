import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaFecho, CenaGancho, CenaIgual, CenaOferta, CenaRevela } from './cenas';
import narracao from './narracao.json';

// V35 · segunda 30/11 · "Faltam 6 dias" (dominós → cadeados e ingresso → elevador 197→297 → portas abrem → link) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'igual', 'revela', 'oferta', 'fecho'], {}, true, { gancho: 25, igual: 20, revela: 25, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, igual: CenaIgual, revela: CenaRevela, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), flip({ direction: 'from-right' }), fade()],
  trilha: 'audio/v35/trilha.wav',
});
