import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { CenaMarca } from '../comum';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { CenaEscolha, CenaFecho, CenaGancho, CenaOferta, CenaPlano } from './cenas';
import narracao from './narracao.json';

// V46 · sábado 05/12 · "Últimas horas" (pôr do sol → encruzilhada → estrada até 21/02 → noite, placa do preço → fecho) — voz Davi Andrei
export const linha = montarLinha(narracao, ['gancho', 'escolha', 'plano', 'oferta', 'fecho'], {}, true, { gancho: 15, escolha: 25, plano: 25, oferta: 20, fecho: 45 });

export const Video = criarVideo({
  linha,
  componentes: { gancho: CenaGancho, escolha: CenaEscolha, plano: CenaPlano, oferta: CenaOferta, fecho: CenaFecho, marca: CenaMarca },
  transicoes: [fade(), fade(), fade(), slide({ direction: 'from-bottom' })],
  trilha: 'audio/v46/trilha.wav',
});
