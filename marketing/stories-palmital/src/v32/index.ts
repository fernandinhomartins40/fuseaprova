import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaCargos, CenaFecho, CenaGancho, CenaOferta, CenaPista } from './cenas';
import narracao from './narracao.json';

// V32 · sábado 28/11 · "Dois candidatos" (rostos → pista vista de cima → 49 cargos → trilha no app → escada → link) — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'pista', 'cargos', 'app', 'oferta', 'fecho'], {}, true, { gancho: 25, pista: 25, cargos: 25, app: 20, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, pista: CenaPista, cargos: CenaCargos, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-top' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v32/trilha.wav',
});
