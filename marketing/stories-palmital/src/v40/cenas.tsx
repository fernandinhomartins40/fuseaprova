import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoVivo } from '../vivo';

// V40 · quarta 02/12 · "Os 4 passos" — tabuleiro com quatro casas e um peão que pula; a casa 4 dourada ("quase ninguém
// faz"); os passos no app; um dado que rola e para no 6 (6x sem juros). Voz Ana Alice.

const CASAS = [
  { x: 180, y: 1260, t: 'Cargo', c: cor.coral },
  { x: 420, y: 1060, t: 'Treino', c: cor.azul },
  { x: 680, y: 1220, t: 'Revisão', c: cor.verde },
  { x: 880, y: 960, t: 'Simulado', c: cor.ouro },
];

/** Tabuleiro: caminho pontilhado, quatro casas e o peão na casa `em` (fração entre casas para o pulo). */
const Tabuleiro: React.FC<{ pos: number; dourada?: number }> = ({ pos, dourada = 99999 }) => {
  const frame = useCurrentFrame();
  const i = Math.floor(pos);
  const f = pos - i;
  const de = CASAS[Math.max(0, Math.min(3, i))];
  const ate = CASAS[Math.max(0, Math.min(3, i + 1))];
  const px = de.x + (ate.x - de.x) * f;
  const py = de.y + (ate.y - de.y) * f - Math.sin(f * Math.PI) * 160;
  const brilho = frame >= dourada;
  return (
    <>
      <div style={{ position: 'absolute', left: 50, top: 800, width: 980, height: 640, borderRadius: 60, background: 'radial-gradient(circle at 30% 20%, #FFFDF6, #F5E9CF 70%)', boxShadow: 'inset 0 0 0 14px #E2C48E, inset 0 0 0 18px #B8925A, inset 0 10px 30px rgba(0,0,0,0.12), 0 50px 90px rgba(0,0,0,0.35)', transform: 'perspective(1800px) rotateX(10deg)' }} />
      <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={`M ${CASAS.map((c) => `${c.x} ${c.y}`).join(' L ')}`} fill="none" stroke="rgba(120,85,40,0.45)" strokeWidth="16" strokeDasharray="4 30" strokeLinecap="round" />
      </svg>
      {CASAS.map((c, k) => {
        const ultima = k === 3;
        return (
          <div key={c.t} style={{ position: 'absolute', left: c.x - 110, top: c.y - 60, width: 220, height: 120, borderRadius: '50%', background: `radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.45), transparent 55%), ${ultima && brilho ? cor.ouro : c.c}`, border: '8px solid #fff', boxShadow: ultima && brilho ? `0 14px 0 #B07D10, 0 0 70px ${cor.ouro}` : '0 14px 0 rgba(0,0,0,0.28), 0 26px 30px rgba(0,0,0,0.2)', textShadow: '0 3px 0 rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 70, color: ultima ? cor.tinta : cor.branco }}>
            {k + 1}
            <div style={{ position: 'absolute', top: 120, fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: cor.tinta, whiteSpace: 'nowrap', textShadow: '0 2px 0 rgba(255,255,255,0.7)' }}>{c.t}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: px - 50, top: py - 190, width: 100, height: 170 }}>
        <div style={{ position: 'absolute', left: 25, top: 0, width: 50, height: 50, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #FFC9A3, ${cor.laranjaVivo} 55%, ${cor.laranja})`, border: '5px solid #fff' }} />
        <div style={{ position: 'absolute', left: 10, top: 44, width: 80, height: 110, background: `linear-gradient(90deg, ${cor.laranja}, #FFA066 40%, ${cor.laranjaVivo} 60%, ${cor.laranja})`, clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)' }} />
        <div style={{ position: 'absolute', left: 0, top: 145, width: 100, height: 26, borderRadius: 13, background: `linear-gradient(180deg, ${cor.laranjaVivo}, #8A2E06)`, boxShadow: '0 10px 12px rgba(0,0,0,0.35)' }} />
      </div>
    </>
  );
};

/* 1. 4 passos até a prova --------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const selo = useMola(em(a, 0.65), { damping: 9, stiffness: 190 });
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="*4 passos* até a / prova de Palmital." em={a.ini} tamanho={98} />
      <Tabuleiro pos={0} dourada={em(a, 0.6)} />
      <div style={{ position: 'absolute', left: 650, top: 760, padding: '14px 26px', borderRadius: 22, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.vermelho, transform: `rotate(-6deg) scale(${selo})`, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}>
        Quase ninguém faz
      </div>
      <Efeito nome="pop" em={em(a, 0.65)} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Passos 1, 2 e 3 -------------------------------------------------------- */
export const CenaPassos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const pulo = (de: number, t: number) => interpolate(frame, [t, t + 12], [de, de + 1], { ...limita, easing: (x) => 1 - (1 - x) ** 2 });
  const t2 = em(a, 0.33);
  const t3 = em(a, 0.66);
  const pos = frame < t3 ? pulo(0, t2) : pulo(1, t3);
  const titulo = frame < t2 ? 'Descubra / *o seu cargo.*' : frame < t3 ? 'Um treino / *por dia.*' : 'Revise / *o que errou.*';
  const chave = frame < t2 ? 0 : frame < t3 ? 1 : 2;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <div key={chave}>
        <Cabeca texto={titulo} em={chave === 0 ? a.ini : chave === 1 ? t2 : t3} tamanho={124} />
      </div>
      <Tabuleiro pos={pos} />
      <Efeito nome="pop" em={t2 + 12} volume={0.45} />
      <Efeito nome="pop" em={t3 + 12} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Passo 4: simulado oficial ---------------------------------------------- */
export const CenaQuatro: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const t = a.ini + 6;
  const pos = interpolate(frame, [t, t + 14], [2, 3], { ...limita, easing: (x) => 1 - (1 - x) ** 2 });
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="Passo 4: / *simulado oficial.*" em={a.ini} tamanho={116} />
      <Tabuleiro pos={pos} dourada={t + 14} />
      <div style={{ position: 'absolute', left: 120, top: 640, padding: '18px 30px', borderRadius: 26, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 54, color: cor.tinta, opacity: interpolate(frame, [em(a, 0.55), em(a, 0.55) + 8], [0, 1], limita), boxShadow: '0 14px 28px rgba(0,0,0,0.2)' }}>
        40 questões · 4 horas
      </div>
      <Confetes inicio={t + 14} />
      <Efeito nome="ding" em={t + 14} volume={0.55} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Os 4 passos no app ----------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  const passo = Math.max(14, Math.round((a.fim - a.ini + 20) / 4));
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Tudo no / *Fuse Aprova.*" em={a.ini} tamanho={124} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200}px)` }}>
        <CelularApp
          largura={480}
          fim={duracao + 20}
          telas={[
            { tipo: 'trilha', em: a.ini - 8 },
            { tipo: 'simulado', em: a.ini - 8 + passo * 2 },
          ]}
        />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. O dado para no 6 ------------------------------------------------------- */
const PONTOS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
};

export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const para = a.ini + 26;
  const rolando = frame < para;
  const face = rolando ? (Math.floor(frame / 3) % 5) + 1 : 6;
  const giro = rolando ? frame * 23 : 0;
  const x = interpolate(frame, [a.ini - 4, para], [-300, 0], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const quica = rolando ? Math.abs(Math.sin(frame / 3)) * -80 : 0;
  const preco = useMola(para + 4, { damping: 11, stiffness: 160 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Tirou 6: / *6x sem juros.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={116} />
      <Em y={640}>
        <div style={{ width: 360, height: 360, borderRadius: 60, background: 'radial-gradient(circle at 30% 25%, #FFFFFF, #E1E4EA)', boxShadow: 'inset -14px -16px 0 rgba(0,0,0,0.07), inset 4px 4px 0 #fff, 0 40px 70px rgba(0,0,0,0.35)', position: 'relative', transform: `translate(${x}px, ${quica}px) rotate(${giro}deg)` }}>
          {PONTOS[face].map(([px, py], k) => (
            <div key={k} style={{ position: 'absolute', left: `${px}%`, top: `${py}%`, width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: '50%', background: face === 6 && !rolando ? `radial-gradient(circle at 40% 35%, #FFB27A, ${cor.laranjaVivo})` : 'radial-gradient(circle at 40% 35%, #555a66, #15161A)', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.5)' }} />
          ))}
        </div>
      </Em>
      <Em y={1080}>
        <div style={{ transform: `scale(${preco})`, padding: '28px 50px', borderRadius: 40, background: cor.branco, textAlign: 'center', boxShadow: '0 24px 50px rgba(0,0,0,0.2)' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.tinta }}>6x de R$ 32,83</div>
        </div>
      </Em>
      <ChipData em={em(a, 0.8)} y={1440} texto="Até sábado, 05/12 · depois, R$ 297" fundo={cor.tinta} />
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.35} />
      <Efeito nome="pop" em={para} volume={0.6} />
      <Efeito nome="ding" em={para + 4} volume={0.45} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <FechoPalmital manchete="Dê o / *primeiro passo.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
