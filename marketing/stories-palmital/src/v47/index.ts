import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCinco, CenaDois, CenaFecho, CenaGancho, CenaOferta, CenaQuatro, CenaTres, CenaUm } from '../v47/cenas';
import narracao from './narracao.json';

// V47 · venda "As 5 coisas" (painel de largada → 1 cargo → 2 questões FAU → 3 erro e revisão → 4 simulado → 5ª: largada verde e pagamento → 6x e garantia → link) — voz Will
export const linha = montarLinha(narracao, ['gancho', 'um', 'dois', 'tres', 'quatro', 'cinco', 'oferta', 'fecho'], {}, true, { gancho: 15, um: 10, dois: 10, tres: 10, quatro: 15, cinco: 25, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, um: CenaUm, dois: CenaDois, tres: CenaTres, quatro: CenaQuatro, cinco: CenaCinco, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), slide({ direction: 'from-right' }), slide({ direction: 'from-right' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' }), fade()],
  trilha: 'audio/v21/trilha.wav',
});
