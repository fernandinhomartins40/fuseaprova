import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAumento, CenaChamada, CenaDesconto, CenaGancho, CenaPegadinha, CenaPorcento } from './cenas';
import narracao from './narracao.json';

// Aula 2 · Aumento e desconto percentual (Matemática) — voz Matheus
export const linha = montarLinha(narracao, ['gancho', 'porcento', 'desconto', 'aumento', 'pegadinha', 'chamada']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    porcento: CenaPorcento,
    desconto: CenaDesconto,
    aumento: CenaAumento,
    pegadinha: CenaPegadinha,
    chamada: CenaChamada,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-top-left' }), fade(), fade()],
  trilha: 'audio/aula2/trilha.wav',
});
