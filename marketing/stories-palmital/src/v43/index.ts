import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaFecho, CenaGancho, CenaNao, CenaRevela, CenaSobe } from './cenas';
import narracao from './narracao.json';

// V43 · sexta 04/12 · "Amanhã acaba" (vela → o que continua → o preço com a chama baixa → a vela apaga, R$ 297 → fecho) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'nao', 'revela', 'sobe', 'fecho'], {}, true, { gancho: 20, nao: 20, revela: 20, sobe: 30, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, nao: CenaNao, revela: CenaRevela, sobe: CenaSobe, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [slide({ direction: 'from-bottom' }), fade(), fade(), slide({ direction: 'from-right' })],
  trilha: 'audio/v43/trilha.wav',
});
