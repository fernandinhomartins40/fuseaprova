import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaDivide, CenaFecho, CenaGancho, CenaOferta, CenaRevela, CenaTotal } from './cenas';
import narracao from './narracao.json';

// V44 · sexta 04/12 · "Quanto custa por dia" (moeda → cédula de R$ 197 → fatiada em 79 dias → R$ 2,49 por dia → 6x, acaba amanhã → fecho) — voz Raquel
export const linha = montarLinha(narracao, ['gancho', 'total', 'divide', 'revela', 'oferta', 'fecho'], {}, true, { gancho: 15, total: 15, divide: 25, revela: 35, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, total: CenaTotal, divide: CenaDivide, revela: CenaRevela, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-bottom' }), fade(), wipe({ direction: 'from-right' }), slide({ direction: 'from-left' }), fade()],
  trilha: 'audio/v44/trilha.wav',
});
