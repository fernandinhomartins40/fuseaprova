import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cores } from '../contagem';
import { Cabeca, em } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FechoVivo, FundoVivo } from '../vivo';

// V38 · terça 01/12 · "Do zero" — semente que cai no vaso (0%); o broto ao lado da explicação no app; o regador
// (revisão) faz a planta crescer; barra sobe e a planta floresce; plaquinha de jardim com o preço. Voz Raquel.

/** Vaso com a planta: `g` vai de 0 (semente) a 1 (planta com flor). */
const Vaso: React.FC<{ g: number; x: number; y: number; escala?: number; placa?: React.ReactNode }> = ({ g, x, y, escala = 1, placa }) => {
  const frame = useCurrentFrame();
  const caule = interpolate(g, [0.1, 0.8], [0, 300], limita);
  const folhas = [0.3, 0.45, 0.6, 0.72];
  const flor = interpolate(g, [0.85, 1], [0, 1], limita);
  const balanca = Math.sin(frame / 18) * 3;
  return (
    <div style={{ position: 'absolute', left: x - 200, top: y, width: 400, height: 640, transform: `scale(${escala})`, transformOrigin: '50% 100%' }}>
      <div style={{ position: 'absolute', left: 200, bottom: 230, width: 0, height: 0, transform: `rotate(${balanca}deg)`, transformOrigin: '0 0' }}>
        <div style={{ position: 'absolute', left: -8, bottom: 0, width: 16, height: caule, borderRadius: 8, background: '#2F9E44' }} />
        {folhas.map((f, i) => {
          const k = interpolate(g, [f, f + 0.12], [0, 1], limita);
          const lado = i % 2 ? 1 : -1;
          return (
            <div key={f} style={{ position: 'absolute', left: lado > 0 ? 4 : -114, bottom: caule * ((f - 0.1) / 0.7) - 20, width: 110, height: 56, borderRadius: lado > 0 ? '0 60px 0 60px' : '60px 0 60px 0', background: '#40C057', transformOrigin: lado > 0 ? '0 100%' : '100% 100%', transform: `scale(${k}) rotate(${lado * -20}deg)` }} />
          );
        })}
        <div style={{ position: 'absolute', left: -70, bottom: caule - 60, width: 140, height: 140, transform: `scale(${flor})` }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: 45, top: 0, width: 50, height: 70, borderRadius: '50%', background: cor.laranjaVivo, transformOrigin: '25px 70px', transform: `rotate(${i * 60}deg)` }} />
          ))}
          <div style={{ position: 'absolute', left: 45, top: 45, width: 50, height: 50, borderRadius: '50%', background: cor.ouro }} />
        </div>
        <div style={{ position: 'absolute', left: -14, bottom: -14, width: 28, height: 22, borderRadius: '50%', background: '#7A4B2A', opacity: g < 0.12 ? 1 : 0 }} />
      </div>
      <div style={{ position: 'absolute', left: 40, bottom: 0, width: 320, height: 240, background: '#D9663A', clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)', boxShadow: 'inset 0 20px 0 rgba(0,0,0,0.15)' }} />
      <div style={{ position: 'absolute', left: 20, bottom: 220, width: 360, height: 40, borderRadius: 12, background: '#C2552C' }} />
      <div style={{ position: 'absolute', left: 50, bottom: 240, width: 300, height: 24, borderRadius: '50%', background: '#5A3A22' }} />
      {placa}
    </div>
  );
};

/* 1. Não sabe nada? A semente cai ------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const vaso = useMola(a.ini - 6, { damping: 13, stiffness: 130 });
  const cai = interpolate(frame, [em(a, 0.55), em(a, 0.55) + 14], [0, 1], { ...limita, easing: (t) => t * t });
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Não sabe nada? / *Dá pra começar.*" em={a.ini} tamanho={110} />
      <div style={{ transform: `translateY(${(1 - vaso) * 900}px)` }}>
        <Vaso g={0} x={540} y={820} escala={1.35} placa={<div style={{ position: 'absolute', left: 0, bottom: 60, width: 400, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 100, color: cor.branco }}>0%</div>} />
      </div>
      <div style={{ position: 'absolute', left: 526, top: interpolate(cai, [0, 1], [560, 1100]), width: 28, height: 22, borderRadius: '50%', background: '#7A4B2A', opacity: cai > 0 && cai < 1 ? 1 : 0 }} />
      <Efeito nome="pop" em={em(a, 0.55) + 14} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. A explicação do zero no app, com o broto ------------------------------ */
export const CenaExplica: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  const g = interpolate(frame, [a.ini, a.fim], [0.1, 0.35], limita);
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Explicação / *do zero.*" em={a.ini} sobre="No Fuse Aprova" tamanho={124} />
      <div style={{ position: 'absolute', left: 460, top: 640, transform: `translateX(${(1 - cel) * 900}px) rotate(4deg)` }}>
        <CelularApp largura={470} fim={duracao + 20} telas={[{ tipo: 'erro', em: a.ini - 14 }]} />
      </div>
      <Vaso g={g} x={230} y={900} escala={0.75} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. O regador: o que errou volta pra revisão ------------------------------ */
export const CenaRega: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const rega = useMola(a.ini - 4, { damping: 13, stiffness: 120 });
  const inclina = interpolate(frame, [a.ini + 6, a.ini + 16], [0, -35], limita);
  const g = interpolate(frame, [a.ini + 14, a.fim + 10], [0.35, 0.75], limita);
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="O que errou / *volta pra revisão.*" em={a.ini} tamanho={104} />
      <Vaso g={g} x={440} y={820} escala={1.3} />
      <div style={{ position: 'absolute', left: 620, top: 600, transform: `translateX(${(1 - rega) * 600}px) rotate(${inclina}deg)`, transformOrigin: '30% 60%' }}>
        <svg width="360" height="260" viewBox="0 0 36 26">
          <path d="M8 8 h16 v14 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 z" fill="#4DABF7" />
          <path d="M8 12 L1 5" stroke="#4DABF7" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 10 C 32 10, 32 22, 24 22" stroke="#1C7ED6" strokeWidth="2.4" fill="none" />
          <text x="16" y="19" textAnchor="middle" fontFamily="'Baloo 2'" fontWeight={800} fontSize="4.2" fill="#fff">revisão</text>
        </svg>
      </div>
      {Array.from({ length: 10 }, (_, i) => {
        const t = ((frame - a.ini - 16 + i * 3) % 24) / 24;
        const ativo = frame > a.ini + 16;
        return <div key={i} style={{ position: 'absolute', left: 560 - (i % 3) * 18, top: 640 + t * 380, width: 14, height: 26, borderRadius: '50%', background: '#74C0FC', opacity: ativo ? 1 - t * 0.5 : 0 }} />;
      })}
      <Efeito nome="whoosh" em={a.ini + 6} volume={0.3} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Um pouco por dia: barra sobe e a planta floresce ---------------------- */
export const CenaCresce: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const g = interpolate(frame, [a.ini, a.fim + 6], [0.75, 1], limita);
  const barra = interpolate(frame, [a.ini, a.fim + 6], [0.4, 0.9], limita);
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="Um pouco por dia, / *você evolui.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={104} />
      <Vaso g={g} x={380} y={820} escala={1.3} />
      <div style={{ position: 'absolute', left: 760, top: 700, width: 120, height: 700, borderRadius: 60, background: 'rgba(255,255,255,0.6)', overflow: 'hidden', boxShadow: 'inset 0 6px 12px rgba(0,0,0,0.12)' }}>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${barra * 100}%`, borderRadius: 60, background: `linear-gradient(0deg, ${cor.verde}, #40C057)` }} />
      </div>
      <div style={{ position: 'absolute', left: 740, top: 600, width: 160, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.tinta }}>{Math.round(barra * 100)}%</div>
      <Efeito nome="ding" em={a.fim} volume={0.4} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. Plaquinha de jardim com o preço --------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const finca = useMola(a.ini + 2, { damping: 9, stiffness: 180 });
  const seis = useMola(em(a, 0.5), { damping: 10, stiffness: 190 });
  const placa = (
    <div style={{ position: 'absolute', left: 230, bottom: 210, transform: `translateY(${(1 - finca) * -700}px) rotate(6deg)`, transformOrigin: '50% 100%' }}>
      <div style={{ position: 'absolute', left: 140, top: 230, width: 22, height: 220, background: '#8B5A33' }} />
      <div style={{ width: 300, padding: '24px 0', borderRadius: 24, background: cor.branco, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: `6px solid #8B5A33` }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 34, color: cor.tinta, transform: `scale(${seis})` }}>6x de R$ 32,83</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, color: cor.vermelho }}>até 05/12</div>
      </div>
    </div>
  );
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Plante agora: / *R$ 197.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={116} />
      <Vaso g={1} x={420} y={800} escala={1.3} placa={placa} />
      <div style={{ position: 'absolute', left: 0, top: 1500, width: 1080, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.tinta }}>sem juros · depois de 05/12, R$ 297</div>
      <Efeito nome="pop" em={a.ini + 8} volume={0.5} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <FechoVivo manchete="Comece / *do zero.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
