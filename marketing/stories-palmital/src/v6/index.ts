import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAntes, CenaChamada, CenaFau, CenaGancho, CenaPassos, CenaRotina } from './cenas';
import narracao from './narracao.json';

// V6 · "Estude agora" (tutorial do app) — voz Matheus
export const linha = montarLinha(narracao, ['gancho', 'fau', 'passos', 'rotina', 'antes', 'chamada'], { passos: 70 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    fau: CenaFau,
    passos: CenaPassos,
    rotina: CenaRotina,
    antes: CenaAntes,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-top-left' }), fade(), fade()],
  trilha: 'audio/v6/trilha.wav',
});
