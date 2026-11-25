import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCresce, CenaExplica, CenaFecho, CenaGancho, CenaOferta, CenaRega } from './cenas';
import narracao from './narracao.json';

// V38 · terça 01/12 · "Do zero" (semente → explicação no app → regador da revisão → planta floresce → plaquinha com o preço → link) — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'explica', 'rega', 'cresce', 'oferta', 'fecho'], {}, true, { gancho: 20, explica: 30, rega: 20, cresce: 25, oferta: 15, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, explica: CenaExplica, rega: CenaRega, cresce: CenaCresce, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), wipe({ direction: 'from-top' }), fade()],
  trilha: 'audio/v38/trilha.wav',
});
