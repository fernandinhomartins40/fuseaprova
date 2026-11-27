import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaCinco, CenaDois, CenaFecho, CenaGancho, CenaOferta, CenaQuatro, CenaTres, CenaUm } from './cenas';
import narracao from './narracao.json';

// V48 · venda "As 5 coisas" versão 2 (leque de cartas → uma carta por benefício → a 5ª, dourada, vira verde com o pagamento → bilhete → link) — voz Larissa
export const linha = montarLinha(narracao, ['gancho', 'um', 'dois', 'tres', 'quatro', 'cinco', 'oferta', 'fecho'], {}, true, { gancho: 15, um: 10, dois: 10, tres: 10, quatro: 15, cinco: 25, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, um: CenaUm, dois: CenaDois, tres: CenaTres, quatro: CenaQuatro, cinco: CenaCinco, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-right' }), fade(), fade(), fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), fade()],
  trilha: 'audio/v20/trilha.wav',
});
