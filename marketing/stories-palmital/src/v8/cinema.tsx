import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { limita } from '../comum';
import { cor, fonte, SEGURO_BASE, SEGURO_TOPO } from '../tema';

// Acabamento "de agência" dos V8–V10: fundo com profundidade, câmera lenta e títulos que sobem de uma máscara

export type Paleta = { de: string; para: string; luz: string; luz2: string };

export const paletas = {
  noite: { de: '#0A0F1F', para: '#18244E', luz: 'rgba(255,106,31,0.30)', luz2: 'rgba(29,111,224,0.38)' },
  alerta: { de: '#120C16', para: '#30121C', luz: 'rgba(220,38,38,0.32)', luz2: 'rgba(139,92,246,0.22)' },
  palco: { de: '#06070B', para: '#141725', luz: 'rgba(255,106,31,0.26)', luz2: 'rgba(255,194,51,0.10)' },
  oferta: { de: '#140A07', para: '#3B1606', luz: 'rgba(255,106,31,0.45)', luz2: 'rgba(255,194,51,0.22)' },
  verde: { de: '#06130E', para: '#10301F', luz: 'rgba(21,128,61,0.40)', luz2: 'rgba(34,195,181,0.20)' },
  petroleo: { de: '#071419', para: '#0D3540', luz: 'rgba(20,128,140,0.42)', luz2: 'rgba(255,194,51,0.16)' },
} satisfies Record<string, Paleta>;

// grão de filme: ruído fixo em SVG, sem arquivo externo
const GRAO = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

/**
 * Fundo com profundidade: gradiente, duas luzes grandes que derivam devagar, um brilho diagonal que atravessa
 * a cena uma vez, grão e vinheta. `duracao` liga a câmera: o conteúdo aproxima 4% ao longo da cena.
 */
export const FundoCinema: React.FC<{ paleta: Paleta; duracao?: number; children?: React.ReactNode }> = ({ paleta, duracao, children }) => {
  const frame = useCurrentFrame();
  const zoom = duracao ? interpolate(frame, [0, duracao], [1, 1.04], limita) : 1;
  const brilho = duracao ? interpolate(frame, [0, duracao], [-900, 1500], limita) : -2000;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(165deg, ${paleta.de} 0%, ${paleta.para} 100%)`, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: -300 + Math.sin(frame / 50) * 120,
          top: -260 + Math.cos(frame / 60) * 100,
          width: 1300,
          height: 1300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${paleta.luz} 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 260 + Math.cos(frame / 55) * 140,
          top: 1000 + Math.sin(frame / 45) * 120,
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${paleta.luz2} 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: brilho,
          top: -400,
          width: 260,
          height: 2800,
          transform: 'rotate(22deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        }}
      />
      <AbsoluteFill style={{ backgroundImage: GRAO, opacity: 0.07, mixBlendMode: 'overlay' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)' }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Área segura com o conteúdo centrado na vertical e alinhado à esquerda (ou ao centro). */
export const Centro: React.FC<{ children: React.ReactNode; alinhar?: 'flex-start' | 'center'; topo?: boolean }> = ({ children, alinhar = 'flex-start', topo }) => (
  <AbsoluteFill
    style={{
      paddingTop: SEGURO_TOPO,
      paddingBottom: SEGURO_BASE,
      paddingLeft: 72,
      paddingRight: 72,
      justifyContent: topo ? 'flex-start' : 'center',
      alignItems: alinhar,
    }}
  >
    {children}
  </AbsoluteFill>
);

/**
 * Manchete: cada palavra sobe de dentro de uma máscara; *trecho destacado* (uma ou mais palavras) ganha uma faixa
 * de cor revelada da esquerda para a direita, junto com a cor do texto. " / " quebra a linha. Sem quique.
 */
export const Manchete: React.FC<{
  texto: string;
  atraso?: number;
  passo?: number;
  tamanho?: number;
  faixa?: string;
  corFaixa?: string;
  corTexto?: string;
  centro?: boolean;
}> = ({ texto, atraso = 0, passo = 2, tamanho = 100, faixa = cor.laranjaVivo, corFaixa = cor.branco, corTexto = cor.branco, centro }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pad = tamanho * 0.14;
  let n = 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: centro ? 'center' : 'flex-start', gap: tamanho * 0.04 }}>
      {texto.split(' / ').map((linha, li) => {
        // trechos entre * viram uma unidade só; o resto, palavra por palavra
        const unidades = linha
          .split(/(\*[^*]+\*)/)
          .flatMap((t) => (t.startsWith('*') ? [{ t: t.slice(1, -1), d: true }] : t.split(' ').filter(Boolean).map((w) => ({ t: w, d: false }))));
        return (
          <div key={li} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: centro ? 'center' : 'flex-start', alignItems: 'baseline', columnGap: tamanho * 0.22 }}>
            {unidades.map((u, i) => {
              const ini = atraso + n * passo;
              n += u.t.split(' ').length;
              const p = spring({ frame: frame - ini, fps, config: { damping: 200, stiffness: 140 } });
              const pinta = spring({ frame: frame - ini - 7, fps, config: { damping: 200, stiffness: 110 } });
              const estilo: React.CSSProperties = { fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, lineHeight: 1.08, whiteSpace: 'nowrap', padding: u.d ? `0 ${pad}px` : 0 };
              return (
                <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: tamanho * 0.1, marginBottom: -tamanho * 0.1, marginLeft: u.d ? -pad * 0.5 : 0, marginRight: u.d ? -pad * 0.5 : 0 }}>
                  <span style={{ position: 'relative', display: 'inline-block', transform: `translateY(${(1 - p) * 115}%)` }}>
                    <span style={{ ...estilo, color: corTexto, display: 'inline-block' }}>{u.t}</span>
                    {u.d ? (
                      <span
                        style={{
                          ...estilo,
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          display: 'inline-block',
                          color: corFaixa,
                          background: faixa,
                          borderRadius: tamanho * 0.14,
                          clipPath: `inset(0 ${(1 - pinta) * 100}% 0 0 round ${tamanho * 0.14}px)`,
                        }}
                      >
                        {u.t}
                      </span>
                    ) : null}
                  </span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Rótulo pequeno em caixa alta com traço, que entra deslizando. */
export const Sobrelinha: React.FC<{ children: React.ReactNode; atraso?: number; tinta?: string }> = ({ children, atraso = 0, tinta = cor.ouro }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [atraso, atraso + 14], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateX(${(1 - p) * -40}px)`, marginBottom: 28 }}>
      <div style={{ width: 56 * p, height: 5, borderRadius: 3, background: tinta }} />
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 5, color: tinta, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  );
};

/** Entrada suave (sem quique): desliza e desfoca até nítido. */
export const Surge: React.FC<{ em: number; de?: 'baixo' | 'esquerda' | 'direita'; children: React.ReactNode; style?: React.CSSProperties }> = ({ em, de = 'baixo', children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [em, em + 16], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const d = (1 - p) * 70;
  const t = de === 'baixo' ? `translateY(${d}px)` : de === 'esquerda' ? `translateX(${-d}px)` : `translateX(${d}px)`;
  return <div style={{ opacity: p, transform: t, filter: `blur(${(1 - p) * 10}px)`, ...style }}>{children}</div>;
};
