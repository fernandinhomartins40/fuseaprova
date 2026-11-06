import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaChamada, CenaExemplos, CenaGancho, CenaMacete, CenaPegadinha, CenaRegra, CenaTonica } from './cenas';
import narracao from './narracao.json';

// Aula 1 · Proparoxítonas (Português) — voz Matheus
export const linha = montarLinha(narracao, ['gancho', 'tonica', 'exemplos', 'regra', 'pegadinha', 'macete', 'chamada'], { exemplos: 40 });

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    tonica: CenaTonica,
    exemplos: CenaExemplos,
    regra: CenaRegra,
    pegadinha: CenaPegadinha,
    macete: CenaMacete,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), wipe({ direction: 'from-top-left' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/aula1/trilha.wav',
});
