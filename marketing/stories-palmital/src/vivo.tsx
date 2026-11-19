import React from 'react';
import { AbsoluteFill, interpolate, Img, random, staticFile, useCurrentFrame } from 'remotion';
import { AcaoBio, Aviso, Em, limita } from './comum';
import { Chip, Efeito, useMola } from './componentes';
import { cor, fonte } from './tema';
import { Cartao, SeisVezes } from './v7/cenas';
import { Manchete, Sobrelinha, Surge } from './v8/cinema';
import { Aumento } from './v11/cenas';

// Campanha colorida "antes do dia 25" (V13–V15): fundos claros e vivos com as cores do kit, formas que flutuam,
// sem a vinheta escura dos V8–V12. `tinta` diz a cor do texto que fica legível sobre aquele fundo.

export type PaletaViva = { de: string; para: string; luz: string; tinta: string };

export const vivas = {
  sol: { de: '#FFD54A', para: '#FF9F1C', luz: 'rgba(255,255,255,0.45)', tinta: cor.tinta },
  laranja: { de: '#FF9447', para: '#E5470E', luz: 'rgba(255,214,74,0.45)', tinta: cor.branco },
  turquesa: { de: '#34D6C6', para: '#0E8F99', luz: 'rgba(255,255,255,0.32)', tinta: cor.branco },
  petroleo: { de: '#1BAFBC', para: '#0B5F6A', luz: 'rgba(255,194,51,0.35)', tinta: cor.branco },
  roxo: { de: '#9A6BFF', para: '#4B23C8', luz: 'rgba(236,72,153,0.40)', tinta: cor.branco },
  coral: { de: '#FF7A6B', para: '#D92F3A', luz: 'rgba(255,194,51,0.40)', tinta: cor.branco },
} satisfies Record<string, PaletaViva>;

const FORMAS = ['bola', 'anel', 'mais', 'bola', 'anel', 'ponto', 'mais', 'ponto', 'anel', 'bola', 'ponto', 'mais'] as const;

/** Fundo vivo: gradiente claro, uma luz que deriva, formas soltas flutuando e câmera que aproxima 4%. */
export const FundoVivo: React.FC<{ paleta: PaletaViva; duracao?: number; children?: React.ReactNode }> = ({ paleta, duracao, children }) => {
  const frame = useCurrentFrame();
  const zoom = duracao ? interpolate(frame, [0, duracao], [1, 1.04], limita) : 1;
  const traco = paleta.tinta === cor.branco ? 'rgba(255,255,255,0.22)' : 'rgba(45,47,54,0.12)';
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${paleta.de} 0%, ${paleta.para} 100%)`, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: -360 + Math.sin(frame / 50) * 120,
          top: -320 + Math.cos(frame / 60) * 100,
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${paleta.luz} 0%, transparent 62%)`,
        }}
      />
      {FORMAS.map((f, i) => {
        const x = random(`fx${i}`) * 1080;
        const y = random(`fy${i}`) * 1920;
        const t = 30 + random(`ft${i}`) * 70;
        const dx = Math.sin(frame / (40 + i * 7) + i) * 30;
        const dy = Math.cos(frame / (50 + i * 5) + i) * 40;
        const giro = frame * (0.3 + random(`fg${i}`)) * (i % 2 ? 1 : -1);
        const base: React.CSSProperties = { position: 'absolute', left: x + dx, top: y + dy, transform: `rotate(${giro}deg)` };
        if (f === 'bola') return <div key={i} style={{ ...base, width: t, height: t, borderRadius: '50%', background: traco }} />;
        if (f === 'ponto') return <div key={i} style={{ ...base, width: t * 0.3, height: t * 0.3, borderRadius: '50%', background: traco }} />;
        if (f === 'anel') return <div key={i} style={{ ...base, width: t * 1.2, height: t * 1.2, borderRadius: '50%', border: `${t * 0.16}px solid ${traco}` }} />;
        return (
          <div key={i} style={{ ...base, width: t, height: t }}>
            <div style={{ position: 'absolute', left: t * 0.4, top: 0, width: t * 0.2, height: t, borderRadius: t * 0.1, background: traco }} />
            <div style={{ position: 'absolute', top: t * 0.4, left: 0, height: t * 0.2, width: t, borderRadius: t * 0.1, background: traco }} />
          </div>
        );
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(0,0,0,0.14) 100%)' }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Folha de calendário grande do 25/11, com um círculo desenhado à mão em volta do dia. */
export const Calendario25: React.FC<{ em: number; circulo: number; largura?: number }> = ({ em, circulo, largura = 420 }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 13, stiffness: 120 });
  const traco = interpolate(frame, [circulo, circulo + 18], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const s = largura / 420;
  return (
    <div style={{ position: 'relative', transform: `translateY(${(1 - p) * -1400}px) rotate(${-5 + Math.sin(frame / 30) * 1.2}deg)` }}>
      <div style={{ width: largura, borderRadius: 40 * s, overflow: 'hidden', background: cor.branco, boxShadow: '0 40px 70px rgba(0,0,0,0.28)' }}>
        <div style={{ background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 56 * s, letterSpacing: 8, textAlign: 'center', padding: `${14 * s}px 0` }}>
          NOVEMBRO
        </div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 250 * s, lineHeight: 1.1, color: cor.tinta, textAlign: 'center' }}>25</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 40 * s, color: cor.muted, textAlign: 'center', paddingBottom: 24 * s }}>quarta-feira</div>
      </div>
      <svg width={largura} height={largura} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 70 * s }}>
        <path
          d="M50 14 C 78 12, 92 30, 90 52 C 88 76, 66 88, 46 86 C 22 84, 8 66, 12 44 C 15 26, 32 14, 56 16"
          fill="none"
          stroke={cor.laranjaVivo}
          strokeWidth="4.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - traco}
        />
      </svg>
      <Efeito nome="whoosh" em={em} volume={0.35} />
      <Efeito nome="pop" em={circulo} volume={0.4} />
    </div>
  );
};

/**
 * Oferta da campanha: título → cartão + R$ 197 → 6x sem juros com "no cartão até 25/11" → seta "Na próxima semana R$ 297".
 * Os momentos vêm em quadros, para servir a vídeos com falas divididas de jeitos diferentes.
 */
export const OfertaViva: React.FC<{ titulo: string; sobrelinha: string; tTitulo: number; tCartao: number; tSeis: number; tSobe: number }> = ({
  titulo,
  sobrelinha,
  tTitulo,
  tCartao,
  tSeis,
  tSobe,
}) => {
  const frame = useCurrentFrame();
  const sobe = interpolate(frame, [tSobe - 6, tSobe + 10], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  return (
    <>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936, opacity: 1 - sobe * 0.5 }}>
        <Sobrelinha atraso={tTitulo - 4}>{sobrelinha}</Sobrelinha>
        <Manchete texto={titulo} atraso={tTitulo} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-sobe * 120}px) scale(${1 - sobe * 0.16})`, transformOrigin: '50% 45%' }}>
        <Em x={560} y={830}>
          <Cartao em={tCartao} />
        </Em>
        <Em y={1200}>
          <SeisVezes em={tSeis} />
        </Em>
        <Em y={1430}>
          <Surge em={tSeis + 24}>
            <Chip fundo={cor.branco} texto={cor.tealSombra} tamanho={34}>
              Parcelamento no cartão até 25/11
            </Chip>
          </Surge>
        </Em>
      </div>
      <Em y={1330}>
        <Aumento em={tSobe + 2} />
      </Em>
      <Efeito nome="whoosh" em={tCartao} volume={0.35} />
      <Efeito nome="ding" em={tSeis} volume={0.45} />
      <Efeito nome="pop" em={tSobe + 2} volume={0.45} />
    </>
  );
};

/** Fecho da campanha: manchete, logo num cartão branco, botão "link na bio" e o aviso de não vínculo. */
export const FechoVivo: React.FC<{ manchete: string; em: number; len: number; tinta?: string; acao?: string }> = ({
  manchete,
  em,
  len,
  tinta = cor.branco,
  acao = 'Garantir por R$ 197',
}) => {
  const logo = useMola(em + Math.round(len * 0.25), { damping: 14, stiffness: 130 });
  return (
    <>
      <div style={{ position: 'absolute', left: 72, top: 300, width: 936 }}>
        <Manchete texto={manchete} atraso={em - 4} tamanho={112} corTexto={tinta} faixa={cor.laranjaVivo} centro />
      </div>
      <Em y={720}>
        <div style={{ transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`, opacity: Math.min(1, logo * 2), background: cor.branco, borderRadius: 40, padding: '26px 48px', boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}>
          <Img src={staticFile('img/logo-completa.webp')} style={{ height: 170, display: 'block' }} />
        </div>
      </Em>
      <AcaoBio em={em + Math.round(len * 0.5)} y={1080} texto={acao} fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.tealSombra} />
      <Aviso corTexto={tinta === cor.branco ? 'rgba(255,255,255,0.9)' : 'rgba(45,47,54,0.85)'} />
      <Efeito nome="ding" em={em + Math.round(len * 0.25)} volume={0.4} />
    </>
  );
};
