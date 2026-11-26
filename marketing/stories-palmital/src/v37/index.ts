import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaProva, CenaVoa } from './cenas';
import narracao from './narracao.json';

// V37 · terça 01/12 · "A armadilha de dezembro" (ratoeira → festas/férias/janeiro voando → FEV 21 → 5 min no app → presente com o preço → link) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'voa', 'prova', 'app', 'oferta', 'fecho'], {}, true, { gancho: 20, voa: 4, prova: 20, app: 25, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, voa: CenaVoa, prova: CenaProva, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-right' }), slide({ direction: 'from-left' }), wipe({ direction: 'from-top' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v37/trilha.wav',
});
