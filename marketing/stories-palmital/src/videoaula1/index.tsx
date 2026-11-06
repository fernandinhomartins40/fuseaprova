import React from 'react';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import type { PropsCena } from '../comum';
import { CenaFechoAula, ModoVideoaula } from '../aulas';
import { CenaExemplos, CenaMacete, CenaPegadinha, CenaRegra, CenaTonica } from '../aula1/cenas';
import aula from '../aula1/narracao.json';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { cor } from '../tema';
import fecho from './narracao.json';

// Videoaula 1 · Proparoxítonas, para tocar dentro da questão no app: sem gancho de venda, sem chamada, sem Capi e só a logo pequena no canto.
// Reaproveita as falas e as cenas da aula1; só o fecho é novo.
const ordem = ['tonica', 'exemplos', 'regra', 'pegadinha', 'macete', 'fecho'];
export const linha = montarLinha({ ...aula, ...fecho }, ordem, { exemplos: 40 }, false);

const CenaFecho: React.FC<PropsCena> = (props) => (
  <CenaFechoAula
    {...props}
    de={cor.roxo}
    para={cor.azulNoite}
    manchas={[cor.rosa, cor.azul, cor.ouro]}
    linhas={[{ de: 'Forte na 3ª do fim', para: 'acento' }]}
  />
);

export const Video = ModoVideoaula(criarVideo({
  linha,
  componentes: { tonica: CenaTonica, exemplos: CenaExemplos, regra: CenaRegra, pegadinha: CenaPegadinha, macete: CenaMacete, fecho: CenaFecho },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade(), wipe({ direction: 'from-top-left' }), slide({ direction: 'from-bottom' })],
  trilha: 'audio/aula1/trilha.wav',
}));
