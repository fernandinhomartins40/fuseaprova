import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { AcaoBio, Aviso, Em, limita } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Manchete, Surge } from '../v8/cinema';

// Identidade da campanha até 05/12: todo título leva o selo "Concurso da Prefeitura de Palmital" (o Fuse Aprova hoje é
// só para esse concurso, e isso tem que estar explícito em toda cena), o título centrado na mesma altura e o fecho.

export const CONCURSO = 'Concurso da Prefeitura de Palmital';

/** Selo de vidro com o pino de localização: deixa claro, em toda cena, para qual concurso é o preparatório. */
export const SeloPalmital: React.FC<{ em: number; claro?: boolean }> = ({ em: t0, claro }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [t0, t0 + 14], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const brilho = interpolate(frame, [t0 + 8, t0 + 34], [-30, 130], limita);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 26px 10px 14px',
        marginBottom: 26,
        borderRadius: 999,
        background: claro ? 'rgba(45,47,54,0.10)' : 'rgba(255,255,255,0.16)',
        border: `2px solid ${claro ? 'rgba(45,47,54,0.18)' : 'rgba(255,255,255,0.35)'}`,
        boxShadow: claro ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(8px)',
        opacity: p,
        transform: `translateY(${(1 - p) * -24}px)`,
      }}
    >
      <Img src={staticFile('img/icone-localizacao.webp')} style={{ width: 54, height: 54 }} />
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 37, letterSpacing: 1, color: claro ? cor.tinta : cor.branco, whiteSpace: 'nowrap' }}>{CONCURSO}</div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${brilho}%`, width: 80, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)', transform: 'skewX(-20deg)' }} />
    </div>
  );
};

/** Título da cena: selo do concurso + manchete, sempre centrados na mesma altura. `sobre` fica só por compatibilidade. */
export const Cabeca: React.FC<{ texto: string; em: number; sobre?: string; tamanho?: number; corTexto?: string; faixa?: string; corFaixa?: string; tintaSobre?: string }> = ({
  texto,
  em: t0,
  tamanho = 120,
  corTexto = cor.branco,
  faixa = cor.ouro,
  corFaixa = cor.tinta,
}) => (
  <div style={{ position: 'absolute', left: 40, top: 220, width: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <SeloPalmital em={t0 - 8} claro={corTexto !== cor.branco} />
    <div style={{ filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.12))' }}>
      <Manchete texto={texto} atraso={t0} tamanho={tamanho} corTexto={corTexto} faixa={faixa} corFaixa={corFaixa} centro />
    </div>
  </div>
);

/** Fecho da campanha: manchete, logo em cartão com brilho, a frase do preparatório e o botão com "link na bio". */
export const FechoPalmital: React.FC<{ manchete: string; em: number; len: number; tinta?: string; acao?: string }> = ({ manchete, em: t0, len, tinta = cor.branco, acao = 'Garantir por R$ 197' }) => {
  const frame = useCurrentFrame();
  const logo = useMola(t0 + Math.round(len * 0.2), { damping: 13, stiffness: 130 });
  const frase = useMola(t0 + Math.round(len * 0.35), { damping: 15, stiffness: 140 });
  const reflexo = interpolate(frame, [t0 + 20, t0 + 50], [-40, 140], limita);
  const claro = tinta !== cor.branco;
  return (
    <>
      <div style={{ position: 'absolute', left: 40, top: 240, width: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Manchete texto={manchete} atraso={t0 - 4} tamanho={112} corTexto={tinta} faixa={cor.laranjaVivo} centro />
      </div>
      <Em y={600}>
        <div style={{ position: 'relative', overflow: 'hidden', transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])}) rotate(${(1 - logo) * -6}deg)`, opacity: Math.min(1, logo * 2), background: 'linear-gradient(180deg, #FFFFFF, #F3F4F6)', borderRadius: 44, padding: '28px 52px', boxShadow: '0 2px 0 rgba(255,255,255,0.9) inset, 0 -6px 0 rgba(0,0,0,0.06) inset, 0 34px 70px rgba(0,0,0,0.28)' }}>
          <Img src={staticFile('img/logo-completa.webp')} style={{ height: 170, display: 'block' }} />
          <div style={{ position: 'absolute', top: -20, bottom: -20, left: `${reflexo}%`, width: 90, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)', transform: 'skewX(-20deg)' }} />
        </div>
      </Em>
      <Em y={880}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 34px', borderRadius: 30, background: claro ? 'rgba(45,47,54,0.9)' : 'rgba(0,0,0,0.28)', border: '2px solid rgba(255,255,255,0.25)', opacity: Math.min(1, frase * 2), transform: `translateY(${(1 - frase) * 40}px)` }}>
          <Img src={staticFile('img/icone-localizacao.webp')} style={{ width: 64, height: 64 }} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 42, lineHeight: 1.1, color: cor.branco }}>
            Preparatório para o concurso
            <br />
            da <span style={{ color: cor.ouro }}>Prefeitura de Palmital</span>
          </div>
        </div>
      </Em>
      <AcaoBio em={t0 + Math.round(len * 0.5)} y={1130} texto={acao} fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.tealSombra} />
      <Aviso corTexto={claro ? 'rgba(45,47,54,0.85)' : 'rgba(255,255,255,0.9)'} />
      <Efeito nome="ding" em={t0 + Math.round(len * 0.2)} volume={0.4} />
    </>
  );
};

/** Item com check laranja em relevo (lista do que o app tem), que entra de lado no quadro `em`. */
export const ItemCheck: React.FC<{ texto: string; em: number; tamanho?: number; de?: 'esquerda' | 'direita' | 'baixo'; marca?: string }> = ({ texto, em: t0, tamanho = 42, de = 'esquerda', marca = cor.laranjaVivo }) => (
  <Surge em={t0} de={de}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', borderRadius: 28, background: 'linear-gradient(180deg, #FFFFFF, #F4F5F7)', boxShadow: 'inset 0 -5px 0 rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.2)' }}>
      <div style={{ flex: 'none', width: 56, height: 56, borderRadius: 18, background: `linear-gradient(180deg, ${marca}, ${cor.laranja})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, lineHeight: 1.05, color: cor.tinta }}>{texto}</div>
    </div>
    <Efeito nome="pop" em={t0} volume={0.3} />
  </Surge>
);

/** Quadro de `fala` numa fração do seu tempo. */
export const em = (f: { ini: number; fim: number }, frac = 0) => f.ini + Math.round((f.fim - f.ini) * frac);
