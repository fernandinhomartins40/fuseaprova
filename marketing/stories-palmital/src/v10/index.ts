import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAntes, CenaErro, CenaExplica, CenaFecho, CenaGancho, CenaOferta, CenaProduto } from './cenas';
import narracao from './narracao.json';

// V10 · "O erro que mais reprova" (curiosidade → demonstração → produto → motivo para agora → oferta) — voz Ana Alice
export const linha = montarLinha(narracao, ['gancho', 'erro', 'explica', 'produto', 'antes', 'oferta', 'fecho']);

export const Video = criarVideo({
  linha,
  componentes: {
    gancho: CenaGancho,
    erro: CenaErro,
    explica: CenaExplica,
    produto: CenaProduto,
    antes: CenaAntes,
    oferta: CenaOferta,
    fecho: CenaFecho,
    marca: CenaMarca,
  },
  transicoes: [slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), fade(), fade()],
  trilha: 'audio/v10/trilha.wav',
});
