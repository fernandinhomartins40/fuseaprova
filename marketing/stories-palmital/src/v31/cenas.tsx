import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Quica } from '../v15/cenas';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V31 · sábado 28/11 · "O ritmo da prova" — velocímetro entrando no vermelho; 40 | 4h; grade de 40 questões que fica
// vermelha no fim ("chute"); o simulado no app; bandeira quadriculada de chegada com o preço. Voz Lucas.

/* 1. Saber a matéria não basta: velocímetro -------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const ang = interpolate(frame, [a.ini, em(a, 0.8)], [-110, 75], { ...limita, easing: (t) => 1 - (1 - t) ** 2 }) + (frame > em(a, 0.8) ? Math.sin(frame * 1.7) * 4 : 0);
  const R = 300;
  const arco = (de: number, ate: number, c: string) => {
    const r1 = ((de - 90) * Math.PI) / 180;
    const r2 = ((ate - 90) * Math.PI) / 180;
    return <path d={`M ${340 + R * Math.cos(r1)} ${340 + R * Math.sin(r1)} A ${R} ${R} 0 0 1 ${340 + R * Math.cos(r2)} ${340 + R * Math.sin(r2)}`} stroke={c} strokeWidth="60" fill="none" />;
  };
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Saber a matéria / *não basta.*" em={a.ini} sobre="No dia da prova" tamanho={112} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={720}>
        <div style={{ position: 'relative', width: 680, height: 460, transform: `scale(${p})` }}>
          <svg width="680" height="460" style={{ position: 'absolute' }}>
            {arco(-120, -40, cor.verde)}
            {arco(-40, 40, cor.ouro)}
            {arco(40, 120, cor.vermelho)}
          </svg>
          <div style={{ position: 'absolute', left: 330, top: 100, width: 20, height: 250, borderRadius: 10, background: cor.branco, transformOrigin: '50% 240px', transform: `rotate(${ang}deg)`, boxShadow: '0 0 20px rgba(255,255,255,0.5)' }} />
          <div style={{ position: 'absolute', left: 300, top: 310, width: 80, height: 80, borderRadius: '50%', background: cor.branco }} />
        </div>
      </Em>
      <Em y={1260}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.branco, opacity: interpolate(frame, [em(a, 0.8), em(a, 0.8) + 8], [0, 1], limita) }}>
          O que pesa é o <span style={{ color: cor.coral }}>ritmo</span>.
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini} volume={0.4} />
      <Efeito nome="pop" em={em(a, 0.8)} volume={0.5} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. 40 questões | 4 horas ------------------------------------------------- */
export const CenaNumeros: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [a.ini + 2, em(a, 0.4)], [0, 40], limita));
  const h = Math.round(interpolate(frame, [em(a, 0.55), em(a, 0.85)], [0, 4], limita));
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="A prova / *objetiva:*" em={a.ini} tamanho={120} />
      <div style={{ position: 'absolute', left: 0, top: 700, width: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        <div style={{ textAlign: 'center', width: 440 }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 1, color: cor.branco, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 50, color: cor.ouro }}>questões</div>
        </div>
        <div style={{ width: 10, height: 380, borderRadius: 5, background: 'rgba(255,255,255,0.5)' }} />
        <div style={{ textAlign: 'center', width: 440 }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 1, color: cor.branco, fontVariantNumeric: 'tabular-nums' }}>{h}h</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 50, color: cor.ouro }}>de prova</div>
        </div>
      </div>
      <Efeito nome="ding" em={em(a, 0.4)} volume={0.4} />
      <Efeito nome="ding" em={em(a, 0.85)} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. 6 min por questão; sem treino, chute no fim --------------------------- */
export const CenaGrade: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const chip = useMola(a.ini + 2, { damping: 10, stiffness: 170 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="*6 minutos* / por questão." em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={120} />
      <div style={{ position: 'absolute', left: 120, top: 660, width: 840, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 16 }}>
        {Array.from({ length: 40 }, (_, i) => {
          const t0 = em(a, 0.35) + i * 1.3;
          const feito = frame >= t0;
          const chute = i >= 32;
          return (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 18, background: feito ? (chute ? cor.vermelho : cor.verde) : 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: feito ? cor.branco : cor.muted, transform: `scale(${feito ? 1 + Math.max(0, 1 - (frame - t0) / 6) * 0.2 : 1})`, boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}>
              {feito ? (chute ? '?' : '✓') : i + 1}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 1340, width: 1080, display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${chip})`, padding: '18px 36px', borderRadius: 999, background: cor.tinta, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 52 }}>
          4h ÷ 40 = <span style={{ color: cor.ouro }}>6 min</span>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 90, top: 1090, padding: '12px 26px', borderRadius: 20, background: cor.vermelho, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 48, transform: `rotate(-6deg) scale(${frame >= em(a, 0.35) + 32 * 1.3 ? 1 : 0})` }}>
        chute!
      </div>
      <Efeito nome="pop" em={Math.round(em(a, 0.35) + 32 * 1.3)} volume={0.55} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. Simulado no formato oficial ------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="Simulado, / *quantas vezes quiser.*" em={a.ini} sobre="No Fuse Aprova" tamanho={88} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateX(${(1 - cel) * 1100}px) rotate(3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'simulado', em: a.ini - 8 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Bandeira de chegada --------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const sobe = useMola(a.ini - 4, { damping: 14, stiffness: 110 });
  const onda = (c: number) => Math.sin(frame / 5 - c * 0.7) * 10;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="Chegue pronto / *por R$ 197.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={110} />
      <div style={{ position: 'absolute', left: 150, top: 640, transform: `translateY(${(1 - sobe) * 1000}px)` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 22, height: 760, borderRadius: 11, background: cor.tinta }} />
        <div style={{ position: 'absolute', left: 22, top: 10, display: 'grid', gridTemplateColumns: 'repeat(8, 70px)' }}>
          {Array.from({ length: 40 }, (_, i) => {
            const c = i % 8;
            const l = Math.floor(i / 8);
            return <div key={i} style={{ width: 70, height: 70, background: (c + l) % 2 ? cor.branco : cor.tinta, transform: `translateY(${onda(c)}px)` }} />;
          })}
        </div>
      </div>
      <Em y={1060}>
        <Quica em={em(a, 0.15)}>
          <div style={{ padding: '30px 50px', borderRadius: 40, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.tinta }}>em até 6x sem juros</div>
          </div>
        </Quica>
      </Em>
      <ChipData em={em(a, 0.8)} y={1440} texto="Até 05/12 · depois, R$ 297" fundo={cor.tinta} />
      <Efeito nome="ding" em={em(a, 0.15)} volume={0.45} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <FechoPalmital manchete="Treine / *o ritmo.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
