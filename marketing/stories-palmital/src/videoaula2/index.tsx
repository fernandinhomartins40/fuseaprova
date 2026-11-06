import React from 'react';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import type { PropsCena } from '../comum';
import { CenaFechoAula, ModoVideoaula } from '../aulas';
import { CenaAumento, CenaDesconto, CenaPegadinha, CenaPorcento } from '../aula2/cenas';
import aula from '../aula2/narracao.json';
import { montarLinha } from '../linhaDoTempo';
import { criarVideo } from '../Video';
import { cor } from '../tema';
import fecho from './narracao.json';

// Videoaula 2 · Aumento e desconto percentual, para tocar dentro da questão no app: sem gancho de venda,
// sem chamada, sem Capi e só a logo pequena no canto. Reaproveita as falas e as cenas da aula2; só o fecho é novo.
const ordem = ['porcento', 'desconto', 'aumento', 'pegadinha', 'fecho'];
export const linha = montarLinha({ ...aula, ...fecho }, ordem, {}, false);

const CenaFecho: React.FC<PropsCena> = (props) => (
  <CenaFechoAula
    {...props}
    de="#0E9F6E"
    para={cor.azulNoite}
    manchas={[cor.turquesa, cor.ouro, cor.azul]}
    linhas={[
      { de: 'Desconto de 20%', para: '× 0,8' },
      { de: 'Aumento de 10%', para: '× 1,1' },
    ]}
  />
);

export const Video = ModoVideoaula(criarVideo({
  linha,
  componentes: { porcento: CenaPorcento, desconto: CenaDesconto, aumento: CenaAumento, pegadinha: CenaPegadinha, fecho: CenaFecho },
  transicoes: [wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-top-left' }), fade()],
  trilha: 'audio/aula2/trilha.wav',
}));
