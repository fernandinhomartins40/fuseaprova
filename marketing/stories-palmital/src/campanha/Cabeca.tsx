import React from 'react';
import { Efeito } from '../componentes';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';

// Identidade da campanha até 05/12: título sempre centrado na mesma altura e a lista com check.

export /** Título da cena: sempre centrado, na mesma altura em todas as cenas. */
const Cabeca: React.FC<{ texto: string; em: number; sobre?: string; tamanho?: number; corTexto?: string; faixa?: string; corFaixa?: string; tintaSobre?: string }> = ({
  texto,
  em,
  sobre,
  tamanho = 120,
  corTexto = cor.branco,
  faixa = cor.ouro,
  corFaixa = cor.tinta,
  tintaSobre,
}) => (
  <div style={{ position: 'absolute', left: 60, top: 240, width: 960, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {sobre ? (
      <Sobrelinha atraso={em - 6} tinta={tintaSobre}>
        {sobre}
      </Sobrelinha>
    ) : null}
    <Manchete texto={texto} atraso={em} tamanho={tamanho} corTexto={corTexto} faixa={faixa} corFaixa={corFaixa} centro />
  </div>
);

/** Item com check laranja (lista do que o app tem), que entra de lado no quadro `em`. */
export const ItemCheck: React.FC<{ texto: string; em: number; tamanho?: number; de?: 'esquerda' | 'direita' | 'baixo'; marca?: string }> = ({ texto, em, tamanho = 42, de = 'esquerda', marca = cor.laranjaVivo }) => (
  <Surge em={em} de={de}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', borderRadius: 28, background: cor.branco, boxShadow: '0 14px 30px rgba(0,0,0,0.18)' }}>
      <div style={{ flex: 'none', width: 54, height: 54, borderRadius: 16, background: marca, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, lineHeight: 1.05, color: cor.tinta }}>{texto}</div>
    </div>
    <Efeito nome="pop" em={em} volume={0.3} />
  </Surge>
);

/** Quadro de `fala` numa fração do seu tempo. */
export const em = (f: { ini: number; fim: number }, frac = 0) => f.ini + Math.round((f.fim - f.ini) * frac);
