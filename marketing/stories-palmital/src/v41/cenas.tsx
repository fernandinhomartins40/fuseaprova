import React from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V41 · quinta 03/12 · "Não tenho tempo" — o balão da desculpa treme, racha e estilhaça; o disco do dia conta até
// 1.440 minutos; a fatia de 5 minutos se destaca; a questão no app; relógio de bolso que abre com o preço. Voz Davi Andrei.

/* 1. O balão da desculpa estilhaça ----------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const entra = useMola(a.ini - 6, { damping: 11, stiffness: 150 });
  const quebra = em(a, 0.6);
  const t = Math.max(0, frame - quebra);
  const racha = interpolate(frame, [quebra - 12, quebra], [0, 1], limita);
  const treme = frame > quebra - 14 && frame < quebra ? Math.sin(frame * 3) * 8 : 0;
  const N = 14;
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Essa desculpa / *acaba agora.*" em={em(a, 0.45)} tamanho={116} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={720}>
        <div style={{ position: 'relative', width: 820, height: 460, transform: `scale(${entra}) translateX(${treme}px)` }}>
          {frame < quebra ? (
            <>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 100, background: 'linear-gradient(180deg, #FFFFFF, #ECEFF3)', border: '4px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 104, lineHeight: 1.05, textAlign: 'center', padding: '0 50px', color: cor.tinta, boxShadow: 'inset 0 -14px 24px rgba(0,0,0,0.08), 0 40px 70px rgba(0,0,0,0.5), 0 0 60px rgba(240,72,77,0.25)' }}>"Não tenho tempo."</div>
              <div style={{ position: 'absolute', left: 130, bottom: -70, width: 0, height: 0, borderLeft: '50px solid transparent', borderRight: '50px solid transparent', borderTop: '90px solid #ECEFF3' }} />
              <svg width="820" height="460" style={{ position: 'absolute', inset: 0 }}>
                <path d="M410 0 L380 120 L450 200 L360 300 L430 460 M380 120 L260 160 M450 200 L600 230" stroke={cor.tinta} strokeWidth="6" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - racha} />
              </svg>
            </>
          ) : (
            Array.from({ length: N }, (_, i) => {
              const ang = random(`a${i}`) * Math.PI * 2;
              const v = 18 + random(`v${i}`) * 26;
              return (
                <div key={i} style={{ position: 'absolute', left: 300 + random(`x${i}`) * 220 + Math.cos(ang) * v * t, top: 160 + random(`y${i}`) * 140 + Math.sin(ang) * v * t + 1.2 * t * t, width: 90 + random(`w${i}`) * 90, height: 70 + random(`h${i}`) * 70, background: cor.branco, clipPath: 'polygon(0 20%, 60% 0, 100% 45%, 70% 100%, 10% 80%)', transform: `rotate(${t * (random(`g${i}`) * 30 - 15)}deg)`, opacity: Math.max(0, 1 - t / 30) }} />
              );
            })
          )}
        </div>
      </Em>
      <Efeito nome="pop" em={quebra} volume={0.8} />
      <Aviso />
    </FundoCinema>
  );
};

/* Disco do dia -------------------------------------------------------------- */
const Disco: React.FC<{ cheio: number; fatia: number; destaque: number }> = ({ cheio, fatia, destaque }) => {
  const R = 300;
  const C = 2 * Math.PI * (R / 2);
  return (
    <div style={{ position: 'relative', width: 2 * R, height: 2 * R }}>
      <svg width={2 * R} height={2 * R} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={R} cy={R} r={R - 4} fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="8" />
        {Array.from({ length: 24 }, (_, k) => (
          <line key={k} x1={R} y1={10} x2={R} y2={k % 6 ? 34 : 50} stroke="rgba(45,47,54,0.35)" strokeWidth={k % 6 ? 4 : 8} strokeLinecap="round" transform={`rotate(${k * 15} ${R} ${R})`} />
        ))}
        <circle cx={R} cy={R} r={R / 2} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={R} strokeDasharray={`${C * cheio} ${C}`} />
        <circle cx={R} cy={R} r={R / 2} fill="none" stroke={cor.laranjaVivo} strokeWidth={R} strokeDasharray={`${C * fatia} ${C}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.45), transparent 45%)', boxShadow: '0 40px 70px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: R - 36, top: R - 36, width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #9CA3AF 55%, #4B5563)', boxShadow: '0 6px 12px rgba(0,0,0,0.35)' }} />
      {destaque > 0 ? (
        <div style={{ position: 'absolute', left: R - 20, top: -20, width: 40, height: R + 20, transformOrigin: '50% 100%', transform: `rotate(${(fatia * 360) / 2}deg)` }}>
          <div style={{ position: 'absolute', left: -60, top: -110 * destaque, width: 160, padding: '10px 0', borderRadius: 20, background: cor.laranjaVivo, color: cor.branco, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 50, opacity: destaque, boxShadow: '0 10px 20px rgba(0,0,0,0.25)' }}>5 min</div>
        </div>
      ) : null}
    </div>
  );
};

/* 2. O dia tem 1.440 minutos ----------------------------------------------- */
export const CenaDia: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cheio = interpolate(frame, [a.ini, em(a, 0.9)], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="O seu dia tem / *1.440 minutos.*" em={a.ini} tamanho={110} />
      <Em y={800}>
        <Disco cheio={cheio} fatia={0} destaque={0} />
      </Em>
      <Em y={1460}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 110, color: cor.branco, fontVariantNumeric: 'tabular-nums' }}>{Math.round(cheio * 1440).toLocaleString('pt-BR')} min</div>
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 3. O treino leva 5 -------------------------------------------------------- */
export const CenaCinco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const fatia = interpolate(frame, [em(a, 0.4), em(a, 0.4) + 14], [0, 5 / 1440 * 6], limita);
  const destaque = interpolate(frame, [em(a, 0.5), em(a, 0.5) + 10], [0, 1], limita);
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="O treino / *leva 5.*" em={a.ini} tamanho={140} faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <Em y={800}>
        <Disco cheio={1} fatia={fatia} destaque={destaque} />
      </Em>
      <Em y={1460}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.branco, opacity: destaque }}>
          <span style={{ color: cor.ouro }}>5</span> de 1.440
        </div>
      </Em>
      <Efeito nome="ding" em={em(a, 0.5)} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Cinco questões com explicação ----------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <Cabeca texto="5 questões, / *com explicação.*" em={a.ini} sobre="No Fuse Aprova" tamanho={110} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateX(${(1 - cel) * 1100}px) translateY(${Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${-14 + (1 - cel) * 20}deg) rotateX(4deg) rotate(-3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'questao', em: a.ini - 8 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Relógio de bolso que abre com o preço --------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const entra = useMola(a.ini - 6, { damping: 12, stiffness: 120 });
  const abre = interpolate(frame, [a.ini + 8, a.ini + 22], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const balanca = Math.sin(frame / 12) * 4;
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="*R$ 197* / até sábado." em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 540, top: 640, transformOrigin: '0 0', transform: `rotate(${balanca}deg)` }}>
        <div style={{ position: 'absolute', left: -4, top: 0, width: 8, height: 160, background: cor.ouro }} />
        <div style={{ position: 'absolute', left: -310, top: 150, width: 620, height: 620, transform: `scale(${entra})`, perspective: 1600 }}>
          <div style={{ position: 'absolute', left: 270, top: -40, width: 80, height: 60, borderRadius: 20, background: cor.ouroSombra }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #FFE27A, ${cor.ouroSombra})`, boxShadow: '0 40px 70px rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', inset: 34, borderRadius: '50%', background: '#FFFCF2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.tinta }}>6x de R$ 32,83</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.muted }}>sem juros</div>
          </div>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #FFE27A, ${cor.ouroSombra})`, border: `10px solid ${cor.ouroTinta}`, transformOrigin: '50% 0', transform: `rotateX(${abre * 160}deg)`, backfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 300, height: 300, borderRadius: '50%', border: `8px solid ${cor.ouroTinta}`, opacity: 0.5 }} />
          </div>
        </div>
      </div>
      <ChipData em={em(a, 0.8)} y={1460} texto="Sábado, 05/12 · depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="pop" em={a.ini + 8} volume={0.5} />
      <Efeito nome="ding" em={a.ini + 20} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <FechoPalmital manchete="Cabe / *no seu dia.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
