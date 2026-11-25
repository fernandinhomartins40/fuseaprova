import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAcaba, CenaFecho, CenaGancho, CenaInclui, CenaOferta } from './cenas';
import narracao from './narracao.json';

// V39 · quarta 02/12 · "Faltam 4 dias" (bateria QUA–SÁB → descarrega → ícones do app → recarrega 6×32,83 → sábado → link) — voz Roberta
export const linha = montarLinha(narracao, ['gancho', 'acaba', 'inclui', 'oferta', 'fecho'], {}, true, { gancho: 25, acaba: 15, inclui: 20, oferta: 25, fecho: 30 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, acaba: CenaAcaba, inclui: CenaInclui, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), fade()],
  trilha: 'audio/v39/trilha.wav',
});
