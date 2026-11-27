import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useMola } from '../componentes';
import { CelularApp } from '../campanha/CelularApp';
import type { TipoTela } from '../venda/telas';

// Grade das cenas de "As 5 coisas" (V47 e V48), para nada encostar: título (Cabeca) termina em ~550,
// marcador do número em 645, conteúdo de 750 a 1620, aviso legal em ~1690. Margem lateral de 70 e vão de 50.
export const GRADE = { marcador: 645, topo: 750, alto: 870, margem: 70, vao: 50, celular: 420 };

export type Tela = { tipo: TipoTela; em: number };

/** Celular com as telas reais de um lado e a coluna `children` do outro, centrados na faixa de conteúdo. */
export const Palco: React.FC<{ telas: Tela[]; fim: number; entra: number; lado?: 'direita' | 'esquerda'; children: React.ReactNode }> = ({ telas, fim, entra, lado = 'direita', children }) => {
  const frame = useCurrentFrame();
  const cel = useMola(entra, { damping: 14, stiffness: 110 });
  const { topo, alto, margem, vao, celular } = GRADE;
  return (
    <div style={{ position: 'absolute', left: margem, top: topo, width: 1080 - margem * 2, height: alto, display: 'flex', flexDirection: lado === 'direita' ? 'row' : 'row-reverse', alignItems: 'center', gap: vao }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>{children}</div>
      <div style={{ flex: 'none', transform: `translateX(${(1 - cel) * (lado === 'direita' ? 900 : -900)}px) translateY(${Math.sin(frame / 22) * 6}px)` }}>
        <CelularApp largura={celular} fim={fim} telas={telas} />
      </div>
    </div>
  );
};
