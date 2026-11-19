import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaFecho, CenaFerramenta, CenaGancho, CenaIa, CenaProblema, CenaRequisitos } from './cenas';
import narracao from './narracao.json';

// V12 · "Descubra seu cargo" (49 cargos → edital difícil → ferramenta → requisitos → IA → grátis + Fuse Aprova) — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'problema', 'ferramenta', 'requisitos', 'ia', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    problema: CenaProblema,
    ferramenta: CenaFerramenta,
    requisitos: CenaRequisitos,
    ia: CenaIa,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v12/trilha.wav',
});
