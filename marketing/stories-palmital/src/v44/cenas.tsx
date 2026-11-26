import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { SeisVezes } from '../v7/cenas';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V44 · sexta 04/12 · "Quanto custa por dia" — moeda girando com "?"; a cédula de R$ 197 com guilhoché; a cédula
// fatiada em 79 tiras (dias até 21/02); uma tira salta: menos de R$ 2,50 por dia; 6x e "acaba amanhã". Voz Raquel.

const DIAS = 79; // de 04/12/2026 a 21/02/2027

/* 1. Moeda girando ---------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 12, stiffness: 120 });
  const giro = (frame - a.ini) * 7;
  const face = Math.cos((giro * Math.PI) / 180);
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <Cabeca texto="Quanto custa / *por dia?*" em={a.ini} tamanho={124} />
      <Em y={700}>
        <div style={{ position: 'relative', width: 520, height: 520, transform: `scale(${p})` }}>
          <div style={{ position: 'absolute', left: 60, top: 560, width: 400, height: 50, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)', transform: `scaleX(${0.4 + Math.abs(face) * 0.6})` }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', transform: `scaleX(${Math.max(0.06, Math.abs(face))})`, background: `repeating-conic-gradient(from 0deg, rgba(0,0,0,0.08) 0 3deg, transparent 3deg 6deg), radial-gradient(circle at 38% 30%, #FFF6C8, #FFD54A 40%, #E2A100 75%, #A87200)`, boxShadow: `inset 0 0 0 22px rgba(168,114,0,0.55), inset 0 0 0 26px #FFE27A, 0 30px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,194,51,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 280, lineHeight: 1, paddingTop: 30, color: '#8A5A00', textShadow: '0 4px 0 rgba(255,255,255,0.5), 0 -3px 0 rgba(0,0,0,0.25)', opacity: face > 0 ? 1 : 0.85 }}>{face > 0 ? '?' : 'R$'}</div>
          </div>
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini - 6} volume={0.35} />
      <Aviso />
    </FundoCinema>
  );
};

/* Cédula de R$ 197 ---------------------------------------------------------- */
const W = 900;
const H = 420;

const Cedula: React.FC<{ fatia?: number; separa?: number; destaque?: number }> = ({ fatia = 0, separa = 0, destaque = -1 }) => {
  const frame = useCurrentFrame();
  const n = fatia > 0 ? DIAS : 1;
  const larg = W / n;
  const corpo = (
    <div style={{ position: 'relative', width: W, height: H, borderRadius: 24, overflow: 'hidden', background: 'repeating-radial-gradient(circle at 25% 50%, rgba(255,255,255,0.10) 0 2px, transparent 2px 10px), repeating-linear-gradient(60deg, rgba(0,60,50,0.10) 0 2px, transparent 2px 12px), linear-gradient(135deg, #48C9A6, #1E8C7E 55%, #0F5F57)', boxShadow: 'inset 0 0 0 10px rgba(255,255,255,0.25), inset 0 0 0 14px rgba(0,60,50,0.4)' }}>
      <div style={{ position: 'absolute', left: 40, top: 40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.35), rgba(255,255,255,0.05))', border: '6px solid rgba(255,255,255,0.45)', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <Img src={staticFile('img/capi-acenando.webp')} style={{ height: 240, filter: 'sepia(0.4) hue-rotate(110deg) saturate(0.7) brightness(1.05)', opacity: 0.85 }} />
      </div>
      <div style={{ position: 'absolute', right: 50, top: 30, fontFamily: fonte.display, fontWeight: 800, fontSize: 170, lineHeight: 1, color: '#FFFFFF', textShadow: '0 6px 0 rgba(0,60,50,0.45)' }}>197</div>
      <div style={{ position: 'absolute', right: 56, top: 210, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 36, letterSpacing: 6, color: 'rgba(255,255,255,0.9)' }}>REAIS</div>
      <div style={{ position: 'absolute', left: 40, bottom: 30, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 24, letterSpacing: 3, color: 'rgba(255,255,255,0.85)' }}>CONCURSO DA PREFEITURA DE PALMITAL</div>
    </div>
  );
  if (n === 1) return corpo;
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {Array.from({ length: n }, (_, i) => {
        const centro = (n - 1) / 2;
        const dx = (i - centro) * separa * 1.6;
        const sai = i === destaque ? 1 : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: i * larg + dx, top: 0, width: larg + 0.6, height: H, overflow: 'hidden', transform: sai ? `translateY(${-sai * 0}px)` : `translateY(${Math.sin(i * 0.7 + frame / 6) * separa * 6}px)`, opacity: destaque >= 0 && !sai ? 0.35 : 1 }}>
            <div style={{ position: 'absolute', left: -i * larg, top: 0 }}>{corpo}</div>
          </div>
        );
      })}
    </div>
  );
};

/* 2. R$ 197 até a prova ----------------------------------------------------- */
export const CenaTotal: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 4, { damping: 13, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="*R$ 197* / até a prova." em={a.ini} tamanho={124} />
      <Em y={720}>
        <div style={{ transform: `perspective(1600px) rotateX(${12 + (1 - p) * 50}deg) rotateZ(${-3 + Math.sin(frame / 30)}deg) scale(${interpolate(p, [0, 1], [0.5, 1])})`, filter: 'drop-shadow(0 50px 60px rgba(0,0,0,0.45))' }}>
          <Cedula />
        </div>
      </Em>
      <ChipData em={em(a, 0.7)} y={1320} texto="Acesso até 21/02/2027" fundo={cor.branco} tinta={cor.teal} tamanho={40} />
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.35} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Dividindo pelos dias --------------------------------------------------- */
export const CenaDivide: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const corte = interpolate(frame, [a.ini, em(a, 0.5)], [0, 1], limita);
  const separa = interpolate(frame, [em(a, 0.5), a.fim + 6], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="Dividido em / *79 dias.*" em={a.ini} tamanho={124} />
      <Em y={720}>
        <div style={{ position: 'relative', transform: 'perspective(1600px) rotateX(12deg) rotateZ(-3deg)', filter: 'drop-shadow(0 50px 60px rgba(0,0,0,0.45))' }}>
          <Cedula fatia={corte > 0.02 ? 1 : 0} separa={separa} />
          <div style={{ position: 'absolute', left: corte * W - 6, top: -60, width: 12, height: H + 120, borderRadius: 6, background: 'linear-gradient(180deg, transparent, #fff, transparent)', boxShadow: '0 0 30px #fff', opacity: corte > 0 && corte < 1 ? 1 : 0 }} />
        </div>
      </Em>
      <Em y={1320}>
        <Surge em={em(a, 0.55)}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.branco }}>de hoje até <span style={{ color: cor.ouro }}>21/02</span></div>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={a.ini} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Menos de R$ 2,50 por dia ---------------------------------------------- */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const sai = useMola(a.ini + 2, { damping: 11, stiffness: 140 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Menos de / *R$ 2,50 por dia.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={110} />
      <Em y={700}>
        <div style={{ position: 'relative', transform: 'perspective(1600px) rotateX(12deg) rotateZ(-3deg)', opacity: 0.5, filter: 'blur(2px)' }}>
          <Cedula fatia={1} separa={1} destaque={40} />
        </div>
      </Em>
      <Em y={760}>
        <div style={{ transform: `translateY(${-sai * 40}px) scale(${interpolate(sai, [0, 1], [0.4, 1])}) rotate(${(1 - sai) * 20 - 4}deg)`, opacity: Math.min(1, sai * 2) }}>
          <div style={{ padding: '40px 70px', borderRadius: 40, background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', boxShadow: 'inset 0 2px 0 #fff, 0 12px 0 #C9CED6, 0 50px 90px rgba(0,0,0,0.35)', textAlign: 'center' }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 4, color: cor.muted }}>POR DIA</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 200, lineHeight: 1, color: cor.verde, textShadow: Array.from({ length: 8 }, (_, k) => `0 ${k + 1}px 0 #0F5F2D`).join(', ') }}>R$ 2,49</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.tinta }}>R$ 197 ÷ 79 dias</div>
          </div>
        </div>
      </Em>
      <Efeito nome="ding" em={a.ini + 4} volume={0.55} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. 6x sem juros, acaba amanhã -------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Em até 6x. / *Acaba amanhã.*" em={a.ini} tamanho={116} faixa={cor.branco} corFaixa={cor.coral} />
      <Em y={820}>
        <div style={{ filter: 'drop-shadow(0 20px 0 rgba(0,0,0,0.15))' }}>
          <SeisVezes em={a.ini + 4} />
        </div>
      </Em>
      <ChipData em={em(a, 0.6)} y={1180} texto="R$ 197 · sem juros no cartão" fundo={cor.branco} tinta={cor.laranja} tamanho={44} />
      <ChipData em={em(a, 0.8)} y={1310} texto="Sábado, 05/12 · depois, R$ 297" fundo={cor.tinta} />
      <Efeito nome="ding" em={a.ini + 4} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <FechoPalmital manchete="Menos de / *R$ 2,50 por dia.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
