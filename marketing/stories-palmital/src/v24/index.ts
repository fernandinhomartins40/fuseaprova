import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaCorrige, CenaFecho, CenaGancho, CenaOferta, CenaProva, CenaRegra } from './cenas';
import narracao from './narracao.json';

// V24 · quarta 25/11 · "A palavra de uma letra" (o "à" que cai → qual está certa → caneta vermelha → volto de, vou a → app → cartão → link) — voz Keren
export const linha = montarLinha(narracao, ['gancho', 'prova', 'corrige', 'regra', 'app', 'oferta', 'fecho'], {}, true, { gancho: 10, prova: 15, corrige: 20, regra: 20, app: 30, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, prova: CenaProva, corrige: CenaCorrige, regra: CenaRegra, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-top' }), slide({ direction: 'from-right' }), fade()],
  trilha: 'audio/v24/trilha.wav',
});
