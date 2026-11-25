import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaApp, CenaExemplos, CenaFecho, CenaGancho, CenaOferta, CenaPergunta, CenaRisco } from './cenas';
import narracao from './narracao.json';

// V25 · quarta 25/11 · "A pergunta que ninguém faz" (balão → prancheta → CNH/experiência → lixeira → cargo no app → etiqueta → link) — voz Lucas
export const linha = montarLinha(narracao, ['gancho', 'pergunta', 'exemplos', 'risco', 'app', 'oferta', 'fecho'], {}, true, { pergunta: 15, risco: 25, app: 30, oferta: 10, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, pergunta: CenaPergunta, exemplos: CenaExemplos, risco: CenaRisco, app: CenaApp, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [wipe({ direction: 'from-bottom' }), flip({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-top-right' }), slide({ direction: 'from-left' }), fade()],
  trilha: 'audio/v25/trilha.wav',
});
