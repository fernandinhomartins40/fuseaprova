import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V46 · sábado 05/12 · "Últimas horas" — o sol se põe atrás das colinas; a placa da encruzilhada (sozinho × com
// plano); a estrada com os marcos até a prova de 21/02; a noite com lua e a placa do preço sob o poste. Voz Davi Andrei.

/** Céu que vai do entardecer (t = 0) à noite (t = 1), com colinas em camadas. */
const Ceu: React.FC<{ t: number; children?: React.ReactNode }> = ({ t, children }) => {
  const frame = useCurrentFrame();
  const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${mix([255, 138, 76], [12, 18, 48])} 0%, ${mix([255, 94, 98], [27, 33, 80])} 45%, ${mix([122, 44, 120], [10, 12, 30])} 100%)`, overflow: 'hidden' }}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: random(`sx${i}`) * 1080, top: random(`sy${i}`) * 900, width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: t * (0.4 + Math.sin(frame / 10 + i) * 0.4) }} />
      ))}
      {children}
      {[
        { y: 1250, c1: '#5B2A6E', c2: '#2A1238', amp: 60, f: 0.004 },
        { y: 1380, c1: '#3D1A4D', c2: '#1A0A26', amp: 80, f: 0.006 },
        { y: 1520, c1: '#24102F', c2: '#0E0616', amp: 50, f: 0.009 },
      ].map((m, k) => {
        const pts = Array.from({ length: 28 }, (_, i) => `${(i / 27) * 1080},${m.y + Math.sin(i * 0.9 + k) * m.amp * 0.5 + Math.sin(i * 0.37 + k * 2) * m.amp}`).join(' ');
        return (
          <svg key={k} width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
            <defs>
              <linearGradient id={`morro${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={m.c1} />
                <stop offset="1" stopColor={m.c2} />
              </linearGradient>
            </defs>
            <polygon points={`0,1920 ${pts} 1080,1920`} fill={`url(#morro${k})`} opacity={1 - t * 0.2} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/* 1. Últimas horas: o pôr do sol ------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const desce = interpolate(frame, [0, duracao], [0, 1], limita);
  return (
    <AbsoluteFill>
      <Ceu t={desce * 0.45}>
        <div style={{ position: 'absolute', left: 540 - 220, top: 980 + desce * 330, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, #FFF6C8 0%, #FFD54A 40%, #FF9A3D 75%, rgba(255,120,40,0) 100%)', boxShadow: '0 0 160px 60px rgba(255,170,60,0.45)' }} />
      </Ceu>
      <Cabeca texto="Últimas horas / *do R$ 197.*" em={a.ini} tamanho={124} faixa={cor.ouro} corFaixa={cor.tinta} />
      <ChipData em={em(a, 0.6)} y={720} texto="Promoção termina hoje, 23h59" fundo={cor.branco} tinta={cor.laranja} tamanho={40} />
      <Efeito nome="whoosh" em={a.ini} volume={0.3} />
      <Aviso />
    </AbsoluteFill>
  );
};

/* 2. A encruzilhada --------------------------------------------------------- */
const Seta: React.FC<{ texto: string; lado: 1 | -1; em: number; acesa?: boolean; topo: number }> = ({ texto, lado, em: t0, acesa, topo }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 11, stiffness: 150 });
  return (
    <div
      style={{
        position: 'absolute',
        left: lado > 0 ? 540 : 540 - 470,
        top: topo,
        width: 470,
        height: 140,
        transformOrigin: lado > 0 ? '0 50%' : '100% 50%',
        transform: `rotate(${lado * -6 + Math.sin(frame / 20) * 1}deg) scaleX(${p})`,
        clipPath: lado > 0 ? 'polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)' : 'polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%)',
        background: acesa ? 'repeating-linear-gradient(178deg, rgba(120,60,10,0.18) 0 3px, transparent 3px 18px), linear-gradient(180deg, #FFB067, #FF6A1F 55%, #C2410C)' : 'repeating-linear-gradient(178deg, rgba(0,0,0,0.12) 0 3px, transparent 3px 18px), linear-gradient(180deg, #A8A29E, #78716C 55%, #57534E)',
        filter: acesa ? 'drop-shadow(0 0 30px rgba(255,150,60,0.8))' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonte.display,
        fontWeight: 800,
        fontSize: 62,
        color: cor.branco,
        textShadow: '0 4px 0 rgba(0,0,0,0.3)',
      }}
    >
      {texto}
    </div>
  );
};

export const CenaEscolha: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const neblina = interpolate(frame, [em(a, 0.4), em(a, 0.7)], [0, 0.55], limita);
  return (
    <AbsoluteFill>
      <Ceu t={0.55} />
      <Cabeca texto="Sozinho ou / *com um plano?*" em={a.ini} tamanho={112} />
      <div style={{ position: 'absolute', left: 520, top: 720, width: 40, height: 900, borderRadius: 10, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0 4px, transparent 4px 30px), linear-gradient(90deg, #5E3A1E, #A0612E 45%, #6B3F1F)', boxShadow: '10px 0 30px rgba(0,0,0,0.5)' }} />
      <Seta texto="Sozinho" lado={-1} em={em(a, 0.45)} topo={800} />
      <Seta texto="Com plano" lado={1} em={em(a, 0.8)} topo={1000} acesa />
      <div style={{ position: 'absolute', left: 0, top: 700, width: 520, height: 600, background: 'radial-gradient(ellipse at 30% 40%, rgba(200,200,220,0.9), transparent 65%)', opacity: neblina, filter: 'blur(20px)' }} />
      <Efeito nome="pop" em={em(a, 0.45)} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.8)} volume={0.45} />
      <Aviso />
    </AbsoluteFill>
  );
};

/* 3. A estrada com os marcos até a prova ------------------------------------ */
const MARCOS = ['Trilha do cargo', 'Revisão dos erros', 'Simulados'];

export const CenaPlano: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const anda = (frame * 6) % 120;
  return (
    <AbsoluteFill>
      <Ceu t={0.65} />
      <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="estrada" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3F4A" />
            <stop offset="1" stopColor="#15171C" />
          </linearGradient>
        </defs>
        <polygon points="505,830 575,830 980,1920 100,1920" fill="url(#estrada)" />
        {Array.from({ length: 12 }, (_, i) => {
          const z = ((i * 120 + anda) % 1440) / 1440;
          const y = 830 + z * z * 1090;
          const w = 4 + z * 26;
          return <rect key={i} x={540 - w / 2} y={y} width={w} height={10 + z * 70} fill="#FFD54A" opacity={0.85} />;
        })}
      </svg>
      <Cabeca texto="O plano / *até 21/02.*" em={a.ini} tamanho={124} />
      {MARCOS.map((t, i) => (
        <div key={t} style={{ position: 'absolute', left: i % 2 ? 640 : 60, top: 1500 - i * 230, transform: `scale(${1 - i * 0.18})`, transformOrigin: i % 2 ? '0 100%' : '100% 100%' }}>
          <Surge em={em(a, 0.1 + i * 0.25)} de={i % 2 ? 'direita' : 'esquerda'}>
            <div style={{ padding: '18px 30px', borderRadius: 22, background: 'linear-gradient(180deg, #2FB67C, #15803D)', border: '6px solid #fff', boxShadow: '0 20px 30px rgba(0,0,0,0.45)', fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.branco, whiteSpace: 'nowrap' }}>{t}</div>
            <div style={{ width: 16, height: 90, margin: '0 auto', background: 'linear-gradient(90deg, #6B7280, #E5E7EB, #6B7280)' }} />
          </Surge>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 480, top: 670 }}>
        <Surge em={em(a, 0.85)}>
          <div style={{ width: 10, height: 170, background: '#E5E7EB', borderRadius: 5 }} />
          <div style={{ position: 'absolute', left: 10, top: 0, padding: '10px 18px', background: 'linear-gradient(180deg, #F87171, #DC2626)', color: '#fff', fontFamily: fonte.display, fontWeight: 800, fontSize: 34, whiteSpace: 'nowrap', boxShadow: '0 0 30px rgba(240,72,77,0.7)', transform: `skewY(${Math.sin(frame / 4) * 3}deg)` }}>Prova · 21/02</div>
        </Surge>
      </div>
      <Aviso />
    </AbsoluteFill>
  );
};

/* 4. A noite: placa do preço sob o poste ------------------------------------ */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const liga = interpolate(frame, [a.ini + 2, a.ini + 10], [0, 1], limita);
  const sobe = useMola(em(a, 0.72), { damping: 13, stiffness: 140 });
  return (
    <AbsoluteFill>
      <Ceu t={1}>
        <div style={{ position: 'absolute', right: 120, top: 640, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #FFFFFF, #E5E7EB 60%, #9CA3AF)', boxShadow: '0 0 80px 20px rgba(220,230,255,0.35)' }} />
      </Ceu>
      <Cabeca texto="Até a / *meia-noite.*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 140, top: 720, width: 22, height: 1000, background: 'linear-gradient(90deg, #1F2329, #4B5563, #1F2329)' }} />
      <div style={{ position: 'absolute', left: 140, top: 720, width: 200, height: 18, borderRadius: 9, background: '#2D3138' }} />
      <div style={{ position: 'absolute', left: 290, top: 730, width: 90, height: 40, borderRadius: '0 0 45px 45px', background: '#FFF6C8', boxShadow: `0 0 ${60 * liga}px ${30 * liga}px rgba(255,230,150,0.75)`, opacity: 0.3 + liga * 0.7 }} />
      <div style={{ position: 'absolute', left: 120, top: 770, width: 760, height: 900, background: 'linear-gradient(180deg, rgba(255,230,150,0.35), transparent 70%)', clipPath: 'polygon(30% 0, 40% 0, 100% 100%, 0 100%)', opacity: liga }} />
      <Em x={600} y={900}>
        <div style={{ padding: '36px 50px', borderRadius: 40, background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', boxShadow: `inset 0 2px 0 #fff, 0 12px 0 #C9CED6, 0 0 ${80 * liga}px rgba(255,230,150,0.6), 0 50px 90px rgba(0,0,0,0.6)`, textAlign: 'center', opacity: 0.3 + liga * 0.7 }}>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: cor.muted }}>ATÉ 23H59 DE HOJE</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.tinta }}>em até 6x sem juros</div>
        </div>
      </Em>
      <Em x={600} y={1340}>
        <div style={{ transform: `translateY(${(1 - sobe) * 300}px)`, opacity: Math.min(1, sobe * 2), padding: '16px 34px', borderRadius: 999, background: 'linear-gradient(180deg, #F87171, #DC2626)', color: '#fff', fontFamily: fonte.display, fontWeight: 800, fontSize: 46, boxShadow: '0 9px 0 #991B1B, 0 20px 30px rgba(0,0,0,0.4)' }}>Depois, R$ 297</div>
      </Em>
      <Efeito nome="ding" em={a.ini + 4} volume={0.45} />
      <Efeito nome="whoosh" em={em(a, 0.72)} volume={0.35} />
      <Aviso />
    </AbsoluteFill>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <FechoPalmital manchete="Garanta / *até 23h59.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
