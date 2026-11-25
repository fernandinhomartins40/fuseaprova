import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaGrade, CenaNumeros, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V31 · sábado 28/11 · "O ritmo da prova" (velocímetro → 40 | 4h → grade de 40 → simulado → bandeira de chegada → link) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'numeros', 'grade', 'app', 'oferta', 'fecho'], {}, true, { gancho: 25, numeros: 15, grade: 20, app: 30, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, numeros: CenaNumeros, grade: CenaGrade, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-top' }), flip({ direction: 'from-bottom' }), slide({ direction: 'from-left' }), fade()],
  trilha: 'audio/v31/trilha.wav',
});
