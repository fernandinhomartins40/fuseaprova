import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaFecho, CenaGancho, CenaHistoria, CenaOferta, CenaProduto, CenaVirada, criarContagem } from './cenas';
import narracao from './narracao.json';

// V8 · "A notificação" (gancho → história → virada → produto → oferta com motivo → fecho em loop) — voz Paulo
export const linha = montarLinha(narracao, ['gancho', 'historia', 'virada', 'produto', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    historia: CenaHistoria,
    virada: CenaVirada,
    produto: CenaProduto,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), fade()],
  trilha: 'audio/v8/trilha.wav',
  sobreposicao: criarContagem(linha),
});
