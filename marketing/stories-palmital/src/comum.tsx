import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Botao3D, Brilhos, Chip, Efeito, Entra, Fundo, useMola } from './componentes';
import type { Fala } from './linhaDoTempo';
import { cor, fonte, SEGURO_BASE, SEGURO_TOPO } from './tema';

export const limita = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const Area: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      paddingTop: SEGURO_TOPO,
      paddingBottom: SEGURO_BASE,
      paddingLeft: 72,
      paddingRight: 72,
      alignItems: 'center',
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const Texto: React.FC<{ children: React.ReactNode; tamanho?: number; corTexto?: string; style?: React.CSSProperties }> = ({
  children,
  tamanho = 44,
  corTexto = cor.branco,
  style,
}) => (
  <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: tamanho, lineHeight: 1.3, color: corTexto, textAlign: 'center', ...style }}>
    {children}
  </div>
);

/** Posiciona um elemento em coordenadas absolutas do quadro 1080×1920. */
export const Em: React.FC<{ x?: number; y: number; children: React.ReactNode }> = ({ x = 540, y, children }) => (
  // faixa da largura do quadro centrada em x: o conteúdo não tem a largura limitada pela borda direita
  <div style={{ position: 'absolute', left: x - 540, top: y, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {children}
  </div>
);

export type PropsCena = { falas: Fala[]; duracao: number };


/** Tremida curta que amortece em ~10 quadros (impacto do carimbo). */
export const tremida = (f: number) => (f < 0 || f > 12 ? 0 : Math.sin(f * 2.4) * (1 - f / 12));

/** Carimbo "APROVADO": borda dupla, tinta translúcida, batida com onda de impacto. */
export const Carimbo: React.FC<{ em: number; x?: number; y?: number; texto?: string; topo?: string; verde?: string }> = ({
  em,
  x = 585,
  y = 985,
  texto = 'APROVADO',
  topo = '★ CONCURSO PALMITAL ★',
  verde = '#128A3E',
}) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 11, stiffness: 260, mass: 0.7 });
  const onda = interpolate(frame, [em + 4, em + 22], [0, 1], limita);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 440, height: 180 }}>
      {/* onda de impacto */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 420,
          height: 420,
          marginLeft: -210,
          marginTop: -210,
          borderRadius: '50%',
          border: `${10 * (1 - onda)}px solid rgba(255,255,255,${0.8 * (1 - onda)})`,
          transform: `scale(${0.4 + onda * 1.1})`,
          opacity: onda > 0 ? 1 : 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${interpolate(p, [0, 1], [2.8, 1])}) rotate(-11deg)`,
          opacity: Math.min(1, p * 3),
          borderRadius: 26,
          background: 'rgba(255,255,255,0.94)',
          border: `7px solid ${verde}`,
          boxShadow: '0 16px 36px rgba(0,0,0,0.28)',
          padding: 8,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 18,
            border: `3px solid ${verde}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: verde,
          }}
        >
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 19, letterSpacing: 4 }}>{topo}</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, lineHeight: 0.95, letterSpacing: 2 }}>{texto}</div>
          <div style={{ width: 280, height: 4, borderRadius: 2, background: verde, marginTop: 6, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  );
};

/* 8. Quadro final com a marca ----------------------------------------- */
export const CenaMarca: React.FC<PropsCena> = () => {
  const logo = useMola(4, { damping: 12, stiffness: 150 });
  return (
    <Fundo
      de={cor.branco}
      para="#FFF4E8"
      claro
      manchas={['rgba(255,194,51,0.45)', 'rgba(34,195,181,0.3)', 'rgba(255,106,31,0.25)', 'rgba(139,92,246,0.18)']}
      halo={{ x: 540, y: 820, cor: 'rgba(255,194,51,0.35)' }}
    >
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 120 }}>
        <div style={{ position: 'relative', transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`, opacity: Math.min(1, logo * 2) }}>
          <Img src={staticFile('img/logo-completa.webp')} style={{ width: 860, display: 'block' }} />
          <Brilhos
            atraso={10}
            pontos={[
              { x: -40, y: -30, t: 64, cor: cor.ouro },
              { x: 830, y: -10, t: 52, cor: cor.turquesa },
              { x: 800, y: 330, t: 40, cor: cor.laranjaVivo },
            ]}
          />
        </div>
        <div style={{ height: 40 }} />
        <Entra atraso={12}>
          <Texto tamanho={40} corTexto={cor.tinta}>
            Seu jeito prático de estudar<br />para o concurso de Palmital
          </Texto>
        </Entra>
        <div style={{ height: 34 }} />
        <Entra atraso={18} de="zoom">
          <Chip fundo={cor.laranja} tamanho={34}>
            Link na bio
          </Chip>
        </Entra>
      </AbsoluteFill>
      <Efeito nome="ding" em={6} volume={0.3} />
    </Fundo>
  );
};

/** Aviso legal no rodapé (obrigatório nas peças de venda). */
export const Aviso: React.FC<{ corTexto?: string }> = ({ corTexto = 'rgba(255,255,255,0.8)' }) => (
  <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: SEGURO_BASE - 110 }}>
    <div style={{ fontFamily: fonte.corpo, fontWeight: 700, fontSize: 22, color: corTexto, textAlign: 'center', padding: '0 80px' }}>
      Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital.
    </div>
  </AbsoluteFill>
);

/** Selo de texto que "bate" na tela (ex.: SEM CUSTO ADICIONAL). */
export const SeloBatida: React.FC<{
  texto: string;
  em: number;
  x: number;
  y: number;
  fundo?: string;
  tinta?: string;
  sombra?: string;
  tamanho?: number;
  giro?: number;
}> = ({ texto, em, x, y, fundo = cor.ouro, tinta = cor.tinta, sombra = cor.ouroSombra, tamanho = 50, giro = -4 }) => {
  const p = useMola(em, { damping: 9, stiffness: 180 });
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `scale(${interpolate(p, [0, 1], [2.4, 1])}) rotate(${interpolate(p, [0, 1], [giro * 3, giro])}deg)`,
          transformOrigin: '0 50%',
          opacity: Math.min(1, p * 3),
          background: fundo,
          color: tinta,
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: tamanho,
          lineHeight: 1,
          padding: '16px 32px',
          borderRadius: 24,
          boxShadow: `0 10px 0 ${sombra}, 0 0 50px rgba(255,194,51,0.45)`,
          whiteSpace: 'nowrap',
        }}
      >
        {texto}
      </div>
      <Efeito nome="pop" em={em} volume={0.55} />
    </>
  );
};

/** Botão de ação + selo "Link na bio", centrados na altura y. */
export const AcaoBio: React.FC<{ em: number; y: number; texto: string; corBio?: string; fundo?: string; sombra?: string }> = ({
  em,
  y,
  texto,
  corBio = cor.roxoSombra,
  fundo,
  sombra,
}) => {
  const frame = useCurrentFrame();
  const aperta = frame > em + 20 ? Math.max(0, Math.sin((frame - em - 20) / 5)) ** 4 : 0;
  const pulso = 1 + Math.max(0, Math.sin((frame - em) / 6)) * 0.05;
  return (
    <Em y={y}>
      <Efeito nome="pop" em={em} volume={0.5} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <Entra atraso={em} de="zoom">
          <Botao3D tamanho={48} apertado={aperta} fundo={fundo} sombra={sombra}>
            {texto}
          </Botao3D>
        </Entra>
        <Entra atraso={em + 10}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 30px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.95)',
              color: corBio,
              fontFamily: fonte.corpo,
              fontWeight: 900,
              fontSize: 38,
              transform: `scale(${pulso})`,
              boxShadow: '0 8px 0 rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={corBio} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            Link na bio
          </div>
        </Entra>
      </div>
    </Em>
  );
};

/** Preço "de R$ 397" que recebe um corte fino quando a fala termina. */
export const PrecoAntigo: React.FC<{ entra: number; corta: number; corTexto?: string; tamanho?: number }> = ({
  entra,
  corta,
  corTexto = cor.muted,
  tamanho = 80,
}) => {
  const frame = useCurrentFrame();
  const c = interpolate(frame, [corta, corta + 12], [0, 1], limita);
  return (
    <Entra atraso={entra}>
      <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 700, fontSize: tamanho, color: corTexto, opacity: 1 - c * 0.35 }}>
        de R$ 397
        <div
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: '50%',
            height: 8,
            marginTop: -4,
            background: cor.coral,
            borderRadius: 4,
            transformOrigin: 'left',
            transform: `scaleX(${c})`,
          }}
        />
      </div>
    </Entra>
  );
};
