import React from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V42 · quinta 03/12 · "O número 80" — "80" gigante em ouro extrudado com brilho; grade de 80 dias até 21/02;
// os 80 viram treinos em onda verde; o treino no app; letreiro de neon numa parede de tijolos com o preço. Voz Keren.

const OURO_3D = Array.from({ length: 26 }, (_, k) => `0 ${k + 1}px 0 hsl(38, 90%, ${46 - k * 1.1}%)`).join(', ');

/* 1. "80" gigante ----------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 4, { damping: 11, stiffness: 120, mass: 1.1 });
  const brilho = interpolate(frame, [a.ini + 14, a.ini + 44], [-30, 130], limita);
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Cabeca texto="Guarde / *esse número.*" em={em(a, 0.4)} tamanho={116} />
      {Array.from({ length: 26 }, (_, i) => {
        const x = random(`px${i}`) * 1080;
        const y = 600 + random(`py${i}`) * 900;
        const t = (frame / (40 + random(`pt${i}`) * 50) + random(`po${i}`)) % 1;
        return <div key={i} style={{ position: 'absolute', left: x, top: y - t * 200, width: 8, height: 8, borderRadius: '50%', background: '#FFE27A', opacity: Math.sin(t * Math.PI) * 0.8, boxShadow: '0 0 12px #FFC233' }} />;
      })}
      <Em y={720}>
        <div style={{ position: 'relative', perspective: 1600, transform: `scale(${interpolate(p, [0, 1], [0.3, 1])}) rotateX(${(1 - p) * 60}deg)`, opacity: Math.min(1, p * 2) }}>
          <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 800, fontSize: 620, lineHeight: 0.9, color: '#FFE27A', backgroundImage: `linear-gradient(110deg, transparent ${brilho - 12}%, rgba(255,255,255,0.95) ${brilho}%, transparent ${brilho + 12}%), linear-gradient(180deg, #FFF6C8 0%, #FFD54A 40%, #F0A500 75%, #FFE27A 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 40px 50px rgba(0,0,0,0.55)) drop-shadow(0 0 40px rgba(255,194,51,0.35))`, textShadow: OURO_3D, transform: `rotate(${Math.sin(frame / 40) * 2}deg)` }}>
            80
          </div>
        </div>
      </Em>
      <Efeito nome="ding" em={a.ini + 4} volume={0.5} />
      <Aviso />
    </FundoCinema>
  );
};

/* Grade de 80 dias (10 × 8) ------------------------------------------------ */
const Grade: React.FC<{ enche: number; verdes: number; t0: number }> = ({ enche, verdes, t0 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12, width: 900, padding: 30, borderRadius: 40, background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))', border: '2px solid rgba(255,255,255,0.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 40px 80px rgba(0,0,0,0.3)' }}>
      {Array.from({ length: 80 }, (_, i) => {
        const on = i < enche;
        const ok = i < verdes;
        const ultimo = i === 79;
        const pulo = ok ? Math.max(0, 1 - (frame - (t0 + i * 0.5)) / 8) * 0.25 : 0;
        return (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 30, color: ok ? cor.branco : ultimo ? cor.branco : cor.tinta, background: ok ? 'linear-gradient(180deg, #4ADE80, #15803D)' : ultimo && on ? 'linear-gradient(180deg, #F87171, #DC2626)' : on ? 'linear-gradient(180deg, #FFFFFF, #E6E9EE)' : 'rgba(255,255,255,0.12)', boxShadow: on ? `inset 0 2px 0 rgba(255,255,255,0.45), 0 5px 0 ${ok ? '#0F5F2D' : ultimo ? '#991B1B' : '#B7BDC6'}` : 'none', transform: `scale(${(on ? 1 : 0.85) + pulo})` }}>
            {ok ? '✓' : ultimo && on ? '21' : on ? i + 1 : ''}
          </div>
        );
      })}
    </div>
  );
};

/* 2. 80 dias até a prova ---------------------------------------------------- */
export const CenaDias: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const enche = Math.floor(interpolate(frame, [a.ini, em(a, 0.8)], [0, 80], limita));
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="*80 dias* até a / prova de Palmital." em={a.ini} tamanho={98} />
      <Em y={660}>
        <Grade enche={enche} verdes={0} t0={0} />
      </Em>
      <ChipData em={em(a, 0.82)} y={1500} texto="Prova objetiva · 21/02/2027" fundo={cor.branco} tinta={cor.vermelho} tamanho={40} />
      <Efeito nome="ding" em={em(a, 0.8)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. 80 treinos ------------------------------------------------------------- */
export const CenaTreinos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const t0 = a.ini + 4;
  const verdes = Math.floor(interpolate(frame, [t0, t0 + 40], [0, 80], limita));
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="1 treino por dia = / *80 treinos.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={104} />
      <Em y={660}>
        <Grade enche={80} verdes={verdes} t0={t0} />
      </Em>
      <Em y={1480}>
        <Surge em={t0 + 40}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 80, color: cor.tinta, textShadow: '0 4px 0 rgba(255,255,255,0.5)' }}>
            <span style={{ color: cor.verde }}>{verdes}</span> treinos feitos
          </div>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={t0} volume={0.35} />
      <Efeito nome="ding" em={t0 + 40} volume={0.5} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. Cada treino: 5 minutos no app ----------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Cada treino: / *5 minutos.*" em={a.ini} tamanho={116} faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200 + Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${14 - (1 - cel) * 20}deg) rotateX(4deg) rotate(2deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'trilha', em: a.ini - 8 }, { tipo: 'licao', em: em(a, 0.55) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Letreiro de neon na parede de tijolos --------------------------------- */
const TIJOLOS = 'linear-gradient(335deg, rgba(0,0,0,0.25) 23px, transparent 23px), linear-gradient(155deg, rgba(0,0,0,0.25) 23px, transparent 23px), linear-gradient(335deg, rgba(0,0,0,0.25) 23px, transparent 23px), linear-gradient(155deg, rgba(0,0,0,0.25) 23px, transparent 23px)';

const Neon: React.FC<{ children: React.ReactNode; corNeon: string; liga: number; tamanho: number }> = ({ children, corNeon, liga, tamanho }) => {
  const frame = useCurrentFrame();
  const t = frame - liga;
  const pisca = t < 0 ? 0 : t < 10 ? (Math.floor(t / 2) % 2 ? 1 : 0.15) : 1;
  return (
    <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, lineHeight: 1, color: pisca > 0.5 ? '#FFFFFF' : 'rgba(255,255,255,0.25)', textShadow: pisca > 0.5 ? `0 0 8px #fff, 0 0 20px ${corNeon}, 0 0 50px ${corNeon}, 0 0 90px ${corNeon}` : 'none', WebkitTextStroke: `3px ${corNeon}` }}>{children}</div>
  );
};

export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#3A1A14', backgroundImage: `${TIJOLOS}, repeating-linear-gradient(0deg, #2A120E 0 6px, transparent 6px 60px), repeating-linear-gradient(90deg, #2A120E 0 6px, transparent 6px 120px)`, opacity: 0.85 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, rgba(255,106,31,0.25), rgba(0,0,0,0.75) 70%)' }} />
      <Cabeca texto="R$ 197 só / *até sábado.*" em={a.ini} tamanho={124} />
      <Em y={700}>
        <div style={{ padding: '50px 70px', borderRadius: 50, border: '4px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 0 60px rgba(255,106,31,0.15), 0 40px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <Neon corNeon="#FF6A1F" liga={a.ini + 4} tamanho={210}>R$ 197</Neon>
          <Neon corNeon="#22C3B5" liga={em(a, 0.45)} tamanho={70}>em até 6x sem juros</Neon>
          <Neon corNeon="#F0484D" liga={em(a, 0.8)} tamanho={56}>até sábado · 05/12</Neon>
        </div>
      </Em>
      <ChipData em={em(a, 0.9)} y={1420} texto="Depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="pop" em={a.ini + 4} volume={0.4} />
      <Efeito nome="pop" em={em(a, 0.45)} volume={0.3} />
      <Efeito nome="pop" em={em(a, 0.8)} volume={0.3} />
      <Aviso />
    </FundoCinema>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <FechoPalmital manchete="Comece o / *1º dos 80.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
