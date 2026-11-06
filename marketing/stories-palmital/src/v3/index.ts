import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaChamada, CenaConta, CenaContraste, CenaEdital, CenaGancho, CenaMetodo, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V3 · "A conta que aprova" — voz Lendário
export const linha = montarLinha(narracao, ['gancho', 'conta', 'contraste', 'metodo', 'edital', 'oferta', 'chamada'], {
  conta: 62,
  metodo: 40,
  chamada: 48,
});

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    conta: CenaConta,
    contraste: CenaContraste,
    metodo: CenaMetodo,
    edital: CenaEdital,
    oferta: CenaOferta,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), slide({ direction: 'from-bottom' }), fade(), slide({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v3/trilha.wav',
});
