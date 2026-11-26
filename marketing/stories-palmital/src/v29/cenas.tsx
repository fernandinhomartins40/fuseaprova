import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V29 · sexta 27/11 · "O padrão da banca" — impressão digital escaneada; SORTE × TREINO; dardo no alvo; contador
// +10.000 com leque de cartas; seis moedas de R$ 32,83 empilhando até R$ 197. Voz Davi Andrei.

/* 1. Toda banca tem um jeito: digital escaneada ---------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const laser = interpolate(frame, [a.ini + 4, em(a, 0.7)], [0, 1], limita);
  const pronto = frame >= em(a, 0.7);
  const verde = '#3DFFA2';
  return (
    <FundoCinema paleta={paletas.verde} duracao={duracao}>
      <Cabeca texto="A FAU tem / *um jeito.*" em={a.ini} sobre="Banca do concurso de Palmital" tamanho={130} />
      <Em y={680}>
        <div style={{ position: 'relative', width: 560, height: 680, borderRadius: 60, background: 'rgba(0,0,0,0.35)', border: `6px solid ${pronto ? verde : 'rgba(255,255,255,0.25)'}`, boxShadow: pronto ? `0 0 80px ${verde}` : 'none', transform: `scale(${p})`, overflow: 'hidden' }}>
          <svg width="560" height="680" viewBox="0 0 56 68">
            {Array.from({ length: 11 }, (_, i) => {
              const r = 4 + i * 2.4;
              return <path key={i} d={`M${28 - r} ${36 + i * 0.6} A ${r} ${r * 1.25} 0 0 1 ${28 + r} ${36 - i * 0.4}`} fill="none" stroke={pronto ? verde : 'rgba(255,255,255,0.75)'} strokeWidth="1.1" strokeLinecap="round" strokeDasharray={i % 3 === 1 ? '6 2' : undefined} />;
            })}
            {Array.from({ length: 6 }, (_, i) => {
              const r = 6 + i * 3;
              return <path key={`b${i}`} d={`M${28 - r} ${40} Q 28 ${58 + i * 1.2} ${28 + r} ${40}`} fill="none" stroke={pronto ? verde : 'rgba(255,255,255,0.6)'} strokeWidth="1.1" strokeLinecap="round" />;
            })}
          </svg>
          <div style={{ position: 'absolute', left: 0, top: laser * 680 - 4, width: '100%', height: 8, background: verde, boxShadow: `0 0 30px 10px ${verde}`, opacity: pronto ? 0 : 1 }} />
          <div style={{ position: 'absolute', left: 0, bottom: 30, width: '100%', textAlign: 'center', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 40, letterSpacing: 6, color: verde, opacity: pronto ? 1 : 0 }}>PADRÃO FAU</div>
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini + 4} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.7)} volume={0.5} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Não é sorte, é treino ------------------------------------------------- */
const Carta: React.FC<{ em: number; titulo: string; fundo: string; bom: boolean; children: React.ReactNode }> = ({ em: t0, titulo, fundo, bom, children }) => {
  const p = useMola(t0, { damping: 12, stiffness: 140 });
  const selo = useMola(t0 + 12, { damping: 9, stiffness: 220 });
  return (
    <div style={{ position: 'relative', width: 420, height: 560, borderRadius: 50, background: fundo, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, transform: `perspective(1200px) rotateY(${interpolate(p, [0, 1], [180, 0])}deg)`, opacity: p > 0.5 ? 1 : 0, filter: bom ? 'none' : 'grayscale(0.5) brightness(0.85)' }}>
      {children}
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 80, color: cor.branco }}>{titulo}</div>
      <div style={{ position: 'absolute', top: -40, right: -30, width: 130, height: 130, borderRadius: '50%', background: bom ? cor.verde : cor.vermelho, color: cor.branco, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 80, transform: `scale(${selo})`, boxShadow: '0 12px 24px rgba(0,0,0,0.3)' }}>{bom ? '✓' : '✕'}</div>
      <Efeito nome={bom ? 'ding' : 'pop'} em={t0 + 12} volume={0.45} />
    </div>
  );
};

export const CenaSorte: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Não é sorte. / *É treino.*" em={a.ini} tamanho={120} />
      <div style={{ position: 'absolute', left: 0, top: 720, width: 1080, display: 'flex', justifyContent: 'center', gap: 60 }}>
        <Carta em={a.ini} titulo="Sorte" fundo="#6B6F7A" bom={false}>
          <div style={{ width: 200, height: 200, borderRadius: 36, background: cor.branco, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', padding: 26, gap: 10 }}>
            {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((v, i) => (
              <div key={i} style={{ borderRadius: '50%', background: v ? cor.tinta : 'transparent' }} />
            ))}
          </div>
        </Carta>
        <Carta em={em(a, 0.5)} titulo="Treino" fundo={cor.laranjaVivo} bom>
          <svg width="230" height="200" viewBox="0 0 46 40">
            <rect x="2" y="12" width="8" height="16" rx="2" fill={cor.branco} />
            <rect x="9" y="8" width="7" height="24" rx="2" fill={cor.branco} />
            <rect x="15" y="18" width="16" height="4" rx="2" fill={cor.branco} />
            <rect x="30" y="8" width="7" height="24" rx="2" fill={cor.branco} />
            <rect x="36" y="12" width="8" height="16" rx="2" fill={cor.branco} />
          </svg>
        </Carta>
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Reconhece a pegadinha: dardo no alvo ---------------------------------- */
export const CenaAlvo: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const voo = interpolate(frame, [em(a, 0.35), em(a, 0.35) + 10], [0, 1], { ...limita, easing: (x) => x * x });
  const acerto = em(a, 0.35) + 10;
  const treme = frame > acerto && frame < acerto + 12 ? Math.sin((frame - acerto) * 3) * (12 - (frame - acerto)) : 0;
  const onda = interpolate(frame, [acerto, acerto + 20], [0, 1], limita);
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Você *reconhece* / a pegadinha." em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={110} />
      <Em y={680}>
        <div style={{ position: 'relative', width: 640, height: 640, transform: `rotate(${treme * 0.4}deg)` }}>
          {[cor.vermelho, cor.branco, cor.vermelho, cor.branco, cor.vermelho].map((c, i) => (
            <div key={i} style={{ position: 'absolute', inset: i * 64, borderRadius: '50%', background: c, boxShadow: i === 0 ? '0 30px 60px rgba(0,0,0,0.3)' : 'none' }} />
          ))}
          <div style={{ position: 'absolute', inset: 320 - 300 * onda, borderRadius: '50%', border: `${12 * (1 - onda)}px solid ${cor.branco}`, opacity: onda > 0 && onda < 1 ? 1 : 0 }} />
          <div style={{ position: 'absolute', left: 320, top: 320, transform: `translate(${(1 - voo) * 700}px, ${(1 - voo) * -500}px) rotate(-35deg)` }}>
            <div style={{ position: 'absolute', left: -6, top: -10, width: 300, height: 20, borderRadius: 10, background: cor.tinta, transformOrigin: '0 50%' }} />
            <div style={{ position: 'absolute', left: 230, top: -40, width: 90, height: 80, background: cor.azul, clipPath: 'polygon(0 50%, 100% 0, 80% 50%, 100% 100%)' }} />
          </div>
        </div>
      </Em>
      <Efeito nome="whoosh" em={em(a, 0.35)} volume={0.4} />
      <Efeito nome="pop" em={acerto} volume={0.6} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. +10 mil questões nesse estilo ----------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [a.ini + 4, em(a, 0.6)], [0, 10000], { ...limita, easing: (x) => 1 - (1 - x) ** 3 }));
  const leque = useMola(a.ini, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Questões no / *estilo FAU.*" em={a.ini} sobre="No Fuse Aprova" tamanho={116} />
      <Em y={640}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 200, lineHeight: 1, color: cor.branco, fontVariantNumeric: 'tabular-nums', textShadow: '0 16px 0 rgba(0,0,0,0.15)' }}>+{n.toLocaleString('pt-BR')}</div>
      </Em>
      <div style={{ position: 'absolute', left: 540, top: 1500 }}>
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <div key={k} style={{ position: 'absolute', left: -170, top: -560, width: 340, height: 460, borderRadius: 30, background: cor.branco, boxShadow: '0 16px 30px rgba(0,0,0,0.25)', transformOrigin: '50% 120%', transform: `rotate(${k * 12 * leque}deg)`, padding: 26 }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 20, letterSpacing: 3, color: cor.teal }}>ESTILO FAU</div>
            {[0.95, 0.8, 0.6].map((w, i) => (
              <div key={i} style={{ height: 12, width: `${w * 100}%`, borderRadius: 6, background: '#E5E7EB', marginTop: 12 }} />
            ))}
            {['A', 'B', 'C', 'D', 'E'].map((l) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, border: '3px solid #E5E7EB', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 18, color: cor.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>
                <div style={{ height: 10, flex: 1, borderRadius: 5, background: '#EEF0F3' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <ChipData em={em(a, 0.8)} y={1440} texto="Todas com explicação" fundo={cor.ouro} tinta={cor.tinta} tamanho={40} />
      <Efeito nome="ding" em={em(a, 0.6)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Seis moedas de R$ 32,83 = R$ 197 -------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="6x de / *R$ 32,83.*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 140, top: 640, width: 360, height: 760 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t0 = a.ini + 4 + i * 6;
          const q = interpolate(frame, [t0, t0 + 10], [0, 1], { ...limita, easing: (x) => x * x });
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: interpolate(q, [0, 1], [-900, 640 - i * 104]), width: 360, height: 120, borderRadius: '50%', background: `linear-gradient(180deg, ${cor.ouro}, ${cor.ouroSombra})`, border: `6px solid ${cor.ouroTinta}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 54, color: cor.ouroTinta, opacity: q > 0 ? 1 : 0 }}>
              R$ 32,83
              <Efeito nome="pop" em={t0 + 10} volume={0.3} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 560, top: 900 }}>
        <Surge em={a.ini + 46} de="direita">
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.branco, lineHeight: 1 }}>=</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, color: cor.branco, lineHeight: 1, textShadow: '0 12px 0 rgba(0,0,0,0.15)' }}>R$ 197</div>
          <div style={{ display: 'inline-block', fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.tinta, background: cor.ouro, borderRadius: 20, padding: '6px 22px', marginTop: 14 }}>sem juros</div>
        </Surge>
      </div>
      <ChipData em={em(a, 0.8)} y={1470} texto="Até 05/12 · depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="ding" em={a.ini + 46} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <FechoPalmital manchete="Treine o / *jeito FAU.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};

