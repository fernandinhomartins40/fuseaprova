import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaAlvo, CenaApp, CenaFecho, CenaGancho, CenaOferta, CenaSorte } from './cenas';
import narracao from './narracao.json';

// V29 · sexta 27/11 · "O padrão da banca" (digital escaneada → sorte × treino → dardo → +10.000 → moedas → link) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'sorte', 'alvo', 'app', 'oferta', 'fecho'], {}, true, { gancho: 15, sorte: 25, alvo: 15, app: 15, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, sorte: CenaSorte, alvo: CenaAlvo, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [flip({ direction: 'from-right' }), wipe({ direction: 'from-top-left' }), slide({ direction: 'from-bottom' }), slide({ direction: 'from-left' }), fade()],
  trilha: 'audio/v29/trilha.wav',
});
