import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cores, Placa } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V43 · sexta 04/12 · "Amanhã acaba" — uma vela queimando no escuro; o que continua (acesso e garantia); o preço
// ao lado da chama que diminui; a vela apaga e a placa vira para R$ 297 no domingo. Voz Lucas.

/** Vela de cera com chama viva. `altura` encolhe com o tempo; `apaga` é o quadro em que a chama some em fumaça. */
const Vela: React.FC<{ altura: number; apaga?: number }> = ({ altura, apaga = 99999 }) => {
  const frame = useCurrentFrame();
  const fim = interpolate(frame, [apaga, apaga + 8], [1, 0], limita);
  const tremor = 1 + Math.sin(frame * 0.9) * 0.06 + Math.sin(frame * 2.3) * 0.04;
  const inclina = Math.sin(frame * 0.5) * 4;
  return (
    <div style={{ position: 'relative', width: 240, height: altura + 360 }}>
      {/* halo */}
      <div style={{ position: 'absolute', left: 120 - 340, top: -220, width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,60,0.38), rgba(255,120,30,0.12) 40%, transparent 70%)', opacity: fim * tremor }} />
      {/* chama */}
      <div style={{ position: 'absolute', left: 120 - 45, top: 70, width: 90, height: 170, transformOrigin: '50% 100%', transform: `scale(${fim * tremor}, ${fim * (1.05 - (tremor - 1))}) rotate(${inclina}deg)` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%', background: 'radial-gradient(ellipse at 50% 75%, #FFFFFF 0%, #FFF1A8 22%, #FFB000 50%, #FF6A1F 75%, rgba(255,80,20,0) 100%)', filter: 'blur(1.5px)', boxShadow: '0 0 50px rgba(255,170,40,0.9)' }} />
        <div style={{ position: 'absolute', left: 30, top: 80, width: 30, height: 70, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(80,140,255,0.8), transparent 70%)' }} />
      </div>
      {/* fumaça */}
      {frame > apaga
        ? [0, 1, 2].map((k) => {
            const t = (frame - apaga - k * 6) / 40;
            return t > 0 && t < 1 ? <div key={k} style={{ position: 'absolute', left: 100 + Math.sin(t * 6 + k) * 30, top: 200 - t * 300, width: 40 + t * 60, height: 40 + t * 60, borderRadius: '50%', background: 'rgba(200,200,210,0.35)', filter: 'blur(10px)', opacity: 1 - t }} /> : null;
          })
        : null}
      {/* pavio */}
      <div style={{ position: 'absolute', left: 114, top: 220, width: 12, height: 46, borderRadius: 6, background: 'linear-gradient(180deg, #111, #4B3A2A)' }} />
      {/* cera */}
      <div style={{ position: 'absolute', left: 0, top: 250, width: 240, height: altura, borderRadius: '24px 24px 30px 30px', background: 'linear-gradient(90deg, #D8C9A8 0%, #FFF8E6 35%, #F3E7C9 65%, #C9B890 100%)', boxShadow: 'inset 0 -20px 30px rgba(0,0,0,0.15), 0 40px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', left: 0, top: -18, width: 240, height: 40, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 40%, #FFFBEF, #E8DCBD)', boxShadow: 'inset 0 4px 10px rgba(255,170,40,0.35)' }} />
        {[[40, 70], [170, 110], [95, 50]].map(([x, h], k) => (
          <div key={k} style={{ position: 'absolute', left: x, top: 4, width: 26, height: h, borderRadius: '0 0 13px 13px', background: 'linear-gradient(90deg, #EFE3C2, #FFF8E6)' }} />
        ))}
      </div>
      {/* prato */}
      <div style={{ position: 'absolute', left: -60, top: 250 + altura - 20, width: 360, height: 60, borderRadius: '50%', background: 'linear-gradient(180deg, #F3F4F6, #9CA3AF 60%, #4B5563)', boxShadow: '0 20px 30px rgba(0,0,0,0.5)' }} />
    </div>
  );
};

/* 1. Amanhã, à meia-noite --------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  const altura = interpolate(frame, [0, duracao], [520, 470], limita);
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      <Cabeca texto="Amanhã, / *à meia-noite...*" em={a.ini} tamanho={116} />
      <Em y={680}>
        <div style={{ transform: `translateY(${(1 - p) * 900}px)` }}>
          <Vela altura={altura} />
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini - 6} volume={0.3} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. O que NÃO acaba --------------------------------------------------------- */
const Continua: React.FC<{ em: number; titulo: string; sub: string }> = ({ em: t0, titulo, sub }) => {
  const p = useMola(t0, { damping: 13, stiffness: 140 });
  const ok = useMola(t0 + 12, { damping: 9, stiffness: 220 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 30, width: 880, padding: '34px 40px', borderRadius: 40, background: 'linear-gradient(180deg, #FFFFFF, #EEF0F3)', boxShadow: 'inset 0 2px 0 #fff, 0 10px 0 #C9CED6, 0 34px 60px rgba(0,0,0,0.3)', transform: `perspective(1400px) rotateX(${(1 - p) * 70}deg)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ flex: 'none', width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #4ADE80, #15803D)', border: '6px solid #fff', boxShadow: '0 10px 20px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${ok})` }}>
        <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 60, lineHeight: 1.05, color: cor.tinta }}>{titulo}</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, color: cor.verde }}>{sub}</div>
      </div>
      <Efeito nome="ding" em={t0 + 12} volume={0.35} />
    </div>
  );
};

export const CenaNao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Isso *continua:*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 0, top: 720, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50 }}>
        <Continua em={a.ini + 4} titulo="Acesso até a prova" sub="continua valendo" />
        <Continua em={em(a, 0.55)} titulo="Garantia de 7 dias" sub="continua valendo" />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 3. O que acaba: o preço, com a chama diminuindo ---------------------------- */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const altura = interpolate(frame, [0, duracao], [300, 160], limita);
  const preco = useMola(em(a, 0.25), { damping: 12, stiffness: 140 });
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <Cabeca texto="O que acaba / *é o preço.*" em={a.ini} tamanho={116} />
      <div style={{ position: 'absolute', left: 90, top: 1450 - altura - 360 }}>
        <Vela altura={altura} />
      </div>
      <div style={{ position: 'absolute', left: 420, top: 820, width: 580, padding: '40px 30px', borderRadius: 44, background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', boxShadow: 'inset 0 2px 0 #fff, 0 12px 0 #C9CED6, 0 0 80px rgba(255,170,40,0.35), 0 40px 70px rgba(0,0,0,0.45)', textAlign: 'center', transform: `scale(${preco}) rotate(3deg)` }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 4, color: cor.vermelho }}>SÓ ATÉ AMANHÃ</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.tinta }}>6x de R$ 32,83</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.muted }}>sem juros</div>
      </div>
      <Efeito nome="ding" em={em(a, 0.25)} volume={0.45} />
      <Aviso />
    </FundoCinema>
  );
};

/* 4. Domingo sobe: a vela apaga e a placa vira ------------------------------- */
export const CenaSobe: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const apaga = a.ini + 4;
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Domingo, / *R$ 297.*" em={a.ini} tamanho={130} faixa={cor.coral} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 90, top: 1450 - 140 - 360 }}>
        <Vela altura={140} apaga={apaga} />
      </div>
      <div style={{ position: 'absolute', left: 395, top: 800, padding: '36px 40px', borderRadius: 44, background: 'linear-gradient(180deg, #16181D, #050506)', border: '10px solid #4B5563', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, color: cor.ouro }}>R$</div>
        {['2', '9', '7'].map((d, i) => (
          <Placa key={i} de={['1', '9', '7'][i]} para={d} em={a.ini + 10 + i * 4} entra={-40} largura={120} altura={170} />
        ))}
      </div>
      <Em y={1180}>
        <Surge em={em(a, 0.8)}>
          <div style={{ padding: '18px 40px', borderRadius: 999, background: cor.ouro, color: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 50, boxShadow: '0 9px 0 #D99A00, 0 20px 30px rgba(0,0,0,0.3)', marginLeft: 280 }}>Hoje ainda é R$ 197</div>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={apaga} volume={0.4} />
      <Aviso />
    </FundoCinema>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <FechoPalmital manchete="Garanta / *até amanhã.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};

