import React from 'react';
import { AbsoluteFill, Html5Audio, Img, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { cor, fonte } from './tema';

/** Mola padrão de entrada, com atraso em quadros. */
export const useMola = (atraso = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: 14, stiffness: 160, mass: 0.8, ...config } });
};

/** Entrada com pulo (escala + subida). */
export const Entra: React.FC<{
  atraso?: number;
  de?: 'baixo' | 'cima' | 'esquerda' | 'direita' | 'zoom';
  distancia?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ atraso = 0, de = 'baixo', distancia = 80, style, children }) => {
  const p = useMola(atraso);
  const d = (1 - p) * distancia;
  const transform =
    de === 'zoom'
      ? `scale(${interpolate(p, [0, 1], [0.3, 1])})`
      : de === 'baixo'
        ? `translateY(${d}px)`
        : de === 'cima'
          ? `translateY(${-d}px)`
          : de === 'esquerda'
            ? `translateX(${-d}px)`
            : `translateX(${d}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.6), transform, ...style }}>{children}</div>;
};

/** Texto cinético: cada palavra entra em sequência. *Palavra* ganha destaque; " / " força quebra de linha. */
export const Palavras: React.FC<{
  texto: string;
  atraso?: number;
  passo?: number;
  tamanho?: number;
  corTexto?: string;
  corDestaque?: string;
  fundoDestaque?: string;
  alinhamento?: 'center' | 'left';
  peso?: number;
  familia?: string;
  altura?: number;
}> = ({
  texto,
  atraso = 0,
  passo = 3,
  tamanho = 96,
  corTexto = cor.branco,
  corDestaque = cor.tinta,
  fundoDestaque = cor.ouro,
  alinhamento = 'center',
  peso = 800,
  familia = fonte.display,
  altura = 1.05,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palavras = texto.split(' ');
  return (
    <div
      style={{
        fontFamily: familia,
        fontWeight: peso,
        fontSize: tamanho,
        lineHeight: altura,
        color: corTexto,
        textAlign: alinhamento,
        textShadow: corTexto === cor.branco ? '0 6px 24px rgba(0,0,0,0.22)' : 'none',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alinhamento === 'center' ? 'center' : 'flex-start',
        columnGap: tamanho * 0.26,
        rowGap: tamanho * 0.08,
      }}
    >
      {palavras.map((bruta, i) => {
        if (bruta === '/') return <span key={i} style={{ flexBasis: '100%', height: 0 }} />;
        const destaque = bruta.startsWith('*');
        const palavra = bruta.replace(/\*/g, '');
        const p = spring({ frame: frame - atraso - i * passo, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: Math.min(1, p * 2),
              transform: `translateY(${(1 - p) * 40}px) scale(${interpolate(p, [0, 1], [0.7, 1])}) rotate(${destaque ? -2 : 0}deg)`,
              ...(destaque
                ? {
                    color: corDestaque,
                    background: fundoDestaque,
                    padding: `0 ${tamanho * 0.16}px`,
                    borderRadius: tamanho * 0.18,
                    boxShadow: `0 ${tamanho * 0.07}px 0 rgba(0,0,0,0.18)`,
                  }
                : {}),
            }}
          >
            {palavra}
          </span>
        );
      })}
    </div>
  );
};

/** Chip arredondado, como os do app ("Palmital · PR"). */
export const Chip: React.FC<{ children: React.ReactNode; fundo?: string; texto?: string; tamanho?: number; icone?: string }> = ({
  children,
  fundo = 'rgba(255,255,255,0.18)',
  texto = cor.branco,
  tamanho = 34,
  icone,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: `${tamanho * 0.36}px ${tamanho * 0.8}px`,
      borderRadius: 999,
      background: fundo,
      color: texto,
      fontFamily: fonte.corpo,
      fontWeight: 900,
      fontSize: tamanho,
      letterSpacing: 2,
      textTransform: 'uppercase',
    }}
  >
    {icone ? <Img src={staticFile(`img/${icone}.webp`)} style={{ width: tamanho * 1.3, height: tamanho * 1.3 }} /> : null}
    {children}
  </div>
);

/** Botão 3D do kit: sombra sólida de deslocamento vertical, sem blur. */
export const Botao3D: React.FC<{ children: React.ReactNode; fundo?: string; sombra?: string; texto?: string; tamanho?: number; apertado?: number }> = ({
  children,
  fundo = cor.verde,
  sombra = cor.verdeSombra,
  texto = cor.branco,
  tamanho = 46,
  apertado = 0,
}) => {
  const lift = 12 * (1 - apertado);
  return (
    <div
      style={{
        background: fundo,
        color: texto,
        fontFamily: fonte.corpo,
        fontWeight: 900,
        fontSize: tamanho,
        letterSpacing: 3,
        textTransform: 'uppercase',
        padding: `${tamanho * 0.62}px ${tamanho * 1.2}px`,
        borderRadius: 28,
        boxShadow: `0 ${lift}px 0 ${sombra}`,
        transform: `translateY(${12 - lift}px)`,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

/** Celular com uma tela real do app (design/png, 1170×2532). */
export const Celular: React.FC<{ tela: string; largura?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  tela,
  largura = 540,
  style,
  children,
}) => {
  const borda = largura * 0.035;
  const altura = (largura - borda * 2) * (2532 / 1170) + borda * 2;
  return (
    <div
      style={{
        position: 'relative',
        width: largura,
        height: altura,
        borderRadius: largura * 0.13,
        background: '#15161A',
        padding: borda,
        boxShadow: '0 40px 80px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.12) inset',
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: largura * 0.1, overflow: 'hidden', position: 'relative', background: '#fff' }}>
        <Img src={staticFile(`telas/${tela}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* ilha da câmera */}
        <div
          style={{
            position: 'absolute',
            top: largura * 0.025,
            left: '50%',
            width: largura * 0.28,
            height: largura * 0.07,
            marginLeft: -largura * 0.14,
            borderRadius: 999,
            background: '#15161A',
          }}
        />
      </div>
      {children}
    </div>
  );
};

/** Desliga a Capi em todas as cenas abaixo dele (videoaulas do app reaproveitam cenas dos vídeos de redes). */
export const SemCapi = React.createContext(false);

/** Capi (poses 4K recortadas, sem margem), dimensionada pela altura, com flutuação leve contínua. */
export const Capi: React.FC<{ pose: string; altura?: number; atraso?: number; style?: React.CSSProperties }> = ({
  pose,
  altura = 700,
  atraso = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = useMola(atraso, { damping: 10, stiffness: 140 });
  if (React.useContext(SemCapi)) return null;
  const flutua = Math.sin((frame - atraso) / 9) * 8;
  return (
    <Img
      src={staticFile(`img/capi-${pose}.webp`)}
      style={{
        height: altura,
        width: 'auto',
        display: 'block',
        transformOrigin: '50% 100%',
        transform: `translateY(${(1 - p) * 260 + flutua}px) scale(${interpolate(p, [0, 1], [0.6, 1])})`,
        opacity: Math.min(1, p * 2),
        filter: 'drop-shadow(0 26px 34px rgba(0,0,0,0.28))',
        ...style,
      }}
    />
  );
};

/** Fundo "mesh": gradiente, manchas de cor desfocadas, grade de pontos e vinheta. */
export const Fundo: React.FC<{
  de: string;
  para: string;
  manchas?: string[];
  claro?: boolean;
  halo?: { x: number; y: number; cor: string };
  children?: React.ReactNode;
}> = ({ de, para, manchas = [], claro = false, halo, children }) => {
  const frame = useCurrentFrame();
  const lugares = [
    { x: -260, y: -120, r: 900 },
    { x: 520, y: 700, r: 820 },
    { x: -200, y: 1250, r: 760 },
    { x: 560, y: 1500, r: 700 },
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${de} 0%, ${para} 100%)`, overflow: 'hidden' }}>
      {manchas.map((c, i) => {
        const l = lugares[i % lugares.length];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: l.x + Math.sin(frame / 35 + i * 2) * 90,
              top: l.y + Math.cos(frame / 45 + i) * 90,
              width: l.r,
              height: l.r,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${c} 0%, transparent 68%)`,
              opacity: 0.85,
            }}
          />
        );
      })}
      {halo ? <Halo {...halo} /> : null}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${claro ? 'rgba(45,47,54,0.07)' : 'rgba(255,255,255,0.10)'} 2px, transparent 2.6px)`,
          backgroundSize: '44px 44px',
          backgroundPosition: `0 ${-frame * 0.6}px`,
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,${claro ? 0.05 : 0.22}) 100%)` }} />
      {children}
    </AbsoluteFill>
  );
};

/** Brilho suave e difuso atrás de um destaque, "respirando" devagar. */
export const Halo: React.FC<{ x: number; y: number; cor: string; tamanho?: number }> = ({ x, y, cor: c, tamanho = 1300 }) => {
  const frame = useCurrentFrame();
  const respira = 1 + Math.sin(frame / 30) * 0.04;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - tamanho / 2,
        top: y - tamanho / 2,
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c} 0%, transparent 62%)`,
        transform: `scale(${respira})`,
      }}
    />
  );
};

const ESTRELA = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';

/** Brilhos de quatro pontas (a estrela do logo), piscando. */
export const Brilhos: React.FC<{ pontos: { x: number; y: number; t: number; cor: string }[]; atraso?: number }> = ({ pontos, atraso = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {pontos.map((p, i) => {
        const f = frame - atraso - i * 4;
        const pisca = f < 0 ? 0 : 0.55 + 0.45 * Math.sin(f / 7 + i * 1.7);
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={p.t}
            height={p.t}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              transform: `scale(${pisca}) rotate(${f * 1.5}deg)`,
              filter: `drop-shadow(0 0 ${p.t / 4}px ${p.cor})`,
            }}
          >
            <path d={ESTRELA} fill={p.cor} />
          </svg>
        );
      })}
    </>
  );
};

/** Chuva de confetes coloridos (determinística, para o render ser estável). */
export const Confetes: React.FC<{ inicio: number; quantidade?: number; cores?: string[] }> = ({
  inicio,
  quantidade = 90,
  cores = [cor.laranjaVivo, cor.ouro, cor.verde, cor.azul, cor.roxo, cor.coral, cor.teal],
}) => {
  const frame = useCurrentFrame() - inicio;
  if (frame < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: quantidade }, (_, i) => {
        const x0 = random(`x${i}`) * 1080;
        const vx = (random(`vx${i}`) - 0.5) * 16;
        const vy = -18 - random(`vy${i}`) * 26;
        const t = frame;
        const x = 540 + (x0 - 540) * 0.25 + vx * t;
        const y = 1000 + vy * t + 0.9 * t * t;
        const giro = t * (6 + random(`g${i}`) * 14);
        const w = 14 + random(`w${i}`) * 18;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: w * 0.45,
              borderRadius: 3,
              background: cores[i % cores.length],
              transform: `rotate(${giro}deg) rotateX(${giro * 2}deg)`,
              opacity: y > 2000 ? 0 : 1,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Ícone gerado do app (128×128). */
export const Icone: React.FC<{ nome: string; tamanho?: number; style?: React.CSSProperties }> = ({ nome, tamanho = 96, style }) => (
  <Img src={staticFile(`img/${nome}.webp`)} style={{ width: tamanho, height: tamanho, ...style }} />
);

/** Efeito sonoro em um quadro da cena. */
export const Efeito: React.FC<{ nome: 'whoosh' | 'ding' | 'pop'; em: number; volume?: number }> = ({ nome, em, volume = 0.6 }) => (
  <Sequence from={em} layout="none">
    <Html5Audio src={staticFile(`audio/sfx-${nome}.wav`)} volume={volume} />
  </Sequence>
);

/** Rótulo editorial acima dos títulos: caixa alta espaçada, com traços dos lados. */
export const Rotulo: React.FC<{ children: React.ReactNode; atraso?: number; corTexto?: string }> = ({
  children,
  atraso = 0,
  corTexto = 'rgba(255,255,255,0.85)',
}) => {
  const p = useMola(atraso, { damping: 20 });
  const traco = <div style={{ width: 56 * p, height: 4, borderRadius: 2, background: corTexto }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: Math.min(1, p * 1.5) }}>
      {traco}
      <div
        style={{
          fontFamily: fonte.corpo,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 5 * p + 1,
          textTransform: 'uppercase',
          color: corTexto,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
      {traco}
    </div>
  );
};
