import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V24 · quarta 25/11 · "A palavra de uma letra" — um "à" gigante despenca e treme a tela; uma folha de prova com duas
// frases; a caneta vermelha corrige; o truque "volto de, vou a"; a folha de explicação do app; cartão em 6x. Voz Keren.

const CANETA = '#D7263D';
const MAO = "'Segoe Print', 'Comic Sans MS', cursive";

/** "à" gigante, extrudado em 3D, que cai do alto, amassa no impacto e solta poeira e uma onda no chão. */
const PROFUNDIDADE = Array.from({ length: 22 }, (_, k) => `0 ${k + 1}px 0 hsl(222, 62%, ${62 - k * 1.3}%)`).join(', ');

const LetraQueCai: React.FC<{ em: number }> = ({ em: t0 }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 10, stiffness: 150, mass: 1.2 });
  const impacto = frame - t0 - 7;
  const amassa = impacto > 0 && impacto < 12 ? Math.sin((impacto / 12) * Math.PI) * 0.16 : 0;
  const treme = impacto > 0 && impacto < 14 ? Math.sin(impacto * 2.6) * (14 - impacto) * 1.4 : 0;
  const poeira = interpolate(frame, [t0 + 6, t0 + 30], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const onda = interpolate(frame, [t0 + 7, t0 + 30], [0, 1], limita);
  const flutua = impacto > 14 ? Math.sin((frame - t0) / 14) * 6 : 0;
  return (
    <div style={{ position: 'relative', width: 760, height: 780, transform: `translateX(${treme}px)` }}>
      {/* sombra de contato que cresce enquanto a letra desce */}
      <div style={{ position: 'absolute', left: 150, right: 150, bottom: 18, height: 50, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(10,20,60,0.45), transparent 70%)', transform: `scaleX(${0.3 + p * 0.7 + amassa})` }} />
      <div style={{ position: 'absolute', left: 380 - 320 * onda, right: 380 - 320 * onda, bottom: 10, height: 60 * onda + 4, borderRadius: '50%', border: `${8 * (1 - onda)}px solid rgba(255,255,255,0.7)`, opacity: onda > 0 && onda < 1 ? 1 : 0 }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 50,
          textAlign: 'center',
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: 760,
          lineHeight: 0.8,
          color: '#FFFFFF',
          textShadow: `${PROFUNDIDADE}, 0 40px 60px rgba(8,20,70,0.45)`,
          transformOrigin: '50% 100%',
          transform: `translateY(${(1 - p) * -1500 + flutua}px) rotate(${(1 - p) * -25}deg) scale(${1 + amassa * 0.7}, ${1 - amassa})`,
        }}
      >
        à
      </div>
      {[-1, 1].map((lado) =>
        [0, 1, 2, 3].map((i) => (
          <div
            key={`${lado}${i}`}
            style={{
              position: 'absolute',
              left: 380 + lado * (140 + poeira * (160 + i * 70)) - 25,
              bottom: 40 + i * 34 * poeira + Math.sin(i + poeira * 3) * 10,
              width: 56 - i * 10,
              height: 56 - i * 10,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.35))',
              filter: `blur(${poeira * 4}px)`,
              opacity: poeira > 0 && poeira < 1 ? 1 - poeira : 0,
            }}
          />
        )),
      )}
      <Efeito nome="pop" em={t0 + 7} volume={0.7} />
    </div>
  );
};

/** Caneta vermelha com tampa, que aparece rabiscando enquanto `ativa`. */
const Caneta: React.FC<{ ativa: number }> = ({ ativa }) => {
  const frame = useCurrentFrame();
  if (ativa <= 0 || ativa >= 1) return null;
  return (
    <div style={{ position: 'absolute', right: 40 + Math.sin(frame * 1.7) * 18, top: -150 + Math.cos(frame * 1.3) * 16, width: 60, height: 300, transform: 'rotate(32deg)', transformOrigin: '50% 100%', filter: 'drop-shadow(12px 18px 10px rgba(0,0,0,0.3))', zIndex: 3 }}>
      <div style={{ position: 'absolute', left: 8, top: 0, width: 44, height: 220, borderRadius: '22px 22px 8px 8px', background: 'linear-gradient(90deg, #8E0F1E, #E23A4B 45%, #B5182A)' }} />
      <div style={{ position: 'absolute', left: 44, top: 20, width: 10, height: 110, borderRadius: 5, background: 'linear-gradient(90deg, #C9CDD3, #FFFFFF)' }} />
      <div style={{ position: 'absolute', left: 8, top: 216, width: 44, height: 50, background: 'linear-gradient(90deg, #9AA0A8, #E6E8EB 45%, #8B9098)', clipPath: 'polygon(0 0, 100% 0, 60% 100%, 40% 100%)' }} />
      <div style={{ position: 'absolute', left: 27, top: 264, width: 6, height: 18, borderRadius: 3, background: CANETA }} />
    </div>
  );
};

/** Folha de prova pautada, com furos e margem, inclinada em 3D; a caneta marca X na primeira e ✓ na segunda. */
const FolhaProva: React.FC<{ entra: number; x?: number; certo?: number }> = ({ entra, x = 99999, certo = 99999 }) => {
  const frame = useCurrentFrame();
  const p = useMola(entra, { damping: 14, stiffness: 120 });
  const tracoX = interpolate(frame, [x, x + 12], [0, 1], limita);
  const tracoC = interpolate(frame, [certo, certo + 12], [0, 1], limita);
  const linha = (letra: string, texto: string, marca: 'x' | 'c', traco: number) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, height: 150, paddingLeft: 30 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #E9ECF1)', border: `5px solid ${cor.tinta}`, boxShadow: '0 4px 0 rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: cor.tinta }}>{letra}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.tinta, opacity: marca === 'x' ? 1 - traco * 0.45 : 1 }}>{texto}</div>
      <svg width="170" height="170" viewBox="0 0 100 100" style={{ position: 'absolute', right: 10, top: '50%', marginTop: -85, overflow: 'visible', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.12))' }}>
        {marca === 'x' ? (
          <path d="M15 15 Q 52 46 85 85 M85 15 Q 48 52 15 85" fill="none" stroke={CANETA} strokeWidth="11" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traco} opacity={traco > 0 ? 1 : 0} />
        ) : (
          <path d="M10 55 Q 28 70 40 82 Q 62 46 92 18" fill="none" stroke={cor.verde} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traco} opacity={traco > 0 ? 1 : 0} />
        )}
      </svg>
      <Caneta ativa={traco} />
    </div>
  );
  return (
    <div style={{ perspective: 1800 }}>
      <div
        style={{
          position: 'relative',
          width: 920,
          padding: '34px 30px 40px 70px',
          borderRadius: 14,
          background: `repeating-linear-gradient(180deg, transparent 0 74px, rgba(80,130,220,0.28) 74px 77px), linear-gradient(180deg, #FFFEFA, #F7F3E8)`,
          backgroundPosition: '0 60px, 0 0',
          boxShadow: 'inset 0 0 40px rgba(150,120,60,0.12), 0 50px 80px rgba(0,0,0,0.3), 0 12px 20px rgba(0,0,0,0.18)',
          transform: `translateY(${(1 - p) * 1200}px) rotateX(${8 + (1 - p) * 30}deg) rotate(${-2 + (1 - p) * 10}deg)`,
        }}
      >
        <div style={{ position: 'absolute', left: 52, top: 0, bottom: 0, width: 3, background: 'rgba(215,38,61,0.55)' }} />
        {[0.2, 0.5, 0.8].map((y) => (
          <div key={y} style={{ position: 'absolute', left: 16, top: `${y * 100}%`, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.18)', boxShadow: 'inset 0 3px 4px rgba(0,0,0,0.35)' }} />
        ))}
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: cor.muted, padding: '0 30px 8px' }}>PORTUGUÊS · QUESTÃO 7</div>
        {linha('A', 'Fomos à Curitiba.', 'x', tracoX)}
        {linha('B', 'Fomos a Curitiba.', 'c', tracoC)}
        <Efeito nome="whoosh" em={entra} volume={0.35} />
        <Efeito nome="pop" em={x} volume={0.5} />
        <Efeito nome="ding" em={certo} volume={0.5} />
      </div>
    </div>
  );
};

/* 1. Uma letra derruba ------------------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="*1 letra* derruba / muita gente." em={a.ini} sobre="Prova de Palmital" tamanho={112} />
      <Em y={720}>
        <LetraQueCai em={a.ini + 2} />
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Qual está certa? ------------------------------------------------------- */
export const CenaProva: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Qual está / *certa?*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={130} />
      <Em y={800}>
        <FolhaProva entra={a.ini - 4} />
      </Em>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. Quem marcou a primeira errou ------------------------------------------ */
export const CenaCorrige: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Marcou a A? / *Errou.*" em={a.ini} faixa={cor.branco} corFaixa={CANETA} tamanho={130} />
      <Em y={800}>
        <FolhaProva entra={-60} x={em(a, 0.4)} certo={em(a, 0.8)} />
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 4. O truque: volto de, vou a --------------------------------------------- */
const Par: React.FC<{ quando: number; volto: string; vou: string; crase: boolean }> = ({ quando, volto, vou, crase }) => {
  const p = useMola(quando, { damping: 13, stiffness: 150 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, transform: `perspective(1200px) rotateX(${(1 - p) * 70}deg) scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ padding: '24px 30px', borderRadius: 30, background: 'linear-gradient(180deg, #4A4D57, #24262C)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), 0 10px 0 #15161A, 0 22px 30px rgba(0,0,0,0.3)', fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.branco, whiteSpace: 'nowrap' }}>{volto}</div>
      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={cor.tinta} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
      <div style={{ padding: '24px 30px', borderRadius: 30, background: 'linear-gradient(180deg, #FFFFFF, #EEF0F3)', fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.tinta, whiteSpace: 'nowrap', boxShadow: 'inset 0 2px 0 #fff, 0 10px 0 #C9CED6, 0 22px 30px rgba(0,0,0,0.25)' }}>
        {vou.split('|')[0]}
        <span style={{ color: crase ? cor.laranjaVivo : cor.verde, background: crase ? cor.laranjaSoft : cor.verdeSoft, borderRadius: 14, padding: '0 10px' }}>{vou.split('|')[1]}</span>
        {vou.split('|')[2]}
      </div>
      <Efeito nome="pop" em={quando} volume={0.4} />
    </div>
  );
};

export const CenaRegra: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="O truque: / *volto de, vou a.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={104} />
      <div style={{ position: 'absolute', left: 0, top: 760, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 70 }}>
        <Par quando={em(a, 0.12)} volto="Volto de" vou="Vou |a| Curitiba" crase={false} />
        <Par quando={em(a, 0.55)} volto="Volto da" vou="Vou |à| Bahia" crase />
        <Surge em={em(a, 0.85)}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.tinta, textAlign: 'center', background: 'linear-gradient(180deg, #FFE27A, #FFC233)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6), 0 9px 0 #D99A00, 0 20px 30px rgba(0,0,0,0.22)', padding: '14px 36px', borderRadius: 26 }}>
            Voltou <u>da</u>? Tem crase.
          </div>
        </Surge>
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. No app, cada erro vem com a explicação -------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Errou? / *Explicação na hora.*" em={a.ini} sobre="No Fuse Aprova" tamanho={100} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200 + Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${14 - (1 - cel) * 20}deg) rotateX(4deg) rotate(-2deg)` }}>
        <CelularApp largura={480} fim={duracao + 30} telas={[{ tipo: 'erro', em: a.ini - 6 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 6. R$ 197 em 6x no cartão, até 5/12 -------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="+10 mil questões / *por R$ 197.*" em={a.ini} tamanho={100} />
      <Em x={560} y={700}>
        <Cartao em={a.ini + 4} />
      </Em>
      <Em y={1120}>
        <SeisVezes em={em(a, 0.5)} />
      </Em>
      <ChipData em={em(a, 0.85)} y={1400} texto="Depois de 5/12, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="whoosh" em={a.ini + 4} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.5)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 7. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <FechoPalmital manchete="Não erre / *a crase.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
