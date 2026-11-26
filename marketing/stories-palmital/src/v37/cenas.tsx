import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V37 · terça 01/12 · "A armadilha de dezembro" — ratoeira com o queijo "Começo depois" que fecha; festas, férias e
// janeiro passando voando; FEV 21 batendo na tela; 5 minutos por dia no app; caixa de presente com o preço. Voz Lucas.

/* 1. A ratoeira ------------------------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const fecha = em(a, 0.75);
  const arco = frame < fecha ? 150 : interpolate(frame, [fecha, fecha + 3], [150, 0], limita);
  const treme = frame > fecha && frame < fecha + 12 ? Math.sin((frame - fecha) * 3) * (12 - (frame - fecha)) : 0;
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Dezembro é / *uma armadilha.*" em={a.ini} sobre="Concurso de Palmital" tamanho={116} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={820}>
        <div style={{ position: 'relative', width: 860, height: 520, transform: `scale(${p}) translateX(${treme}px)` }}>
          <div style={{ position: 'absolute', left: 0, top: 300, width: 860, height: 180, borderRadius: 24, background: '#C68B50', boxShadow: 'inset 0 -24px 0 rgba(0,0,0,0.2), 0 40px 60px rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', left: 750, top: 240, width: 90, height: 80, borderRadius: 16, background: '#9AA3AE' }} />
          <div style={{ position: 'absolute', left: 120, top: 120, width: 330, height: 190 }}>
            <svg width="330" height="190" viewBox="0 0 33 19">
              <path d="M2 18 L16 3 L31 18 Z" fill="#FFC233" stroke="#D99A00" strokeWidth="0.8" />
              <circle cx="12" cy="13" r="1.6" fill="#D99A00" />
              <circle cx="20" cy="10" r="1.2" fill="#D99A00" />
              <circle cx="22" cy="15" r="1.4" fill="#D99A00" />
            </svg>
            <div style={{ position: 'absolute', left: 30, top: -70, padding: '10px 22px', borderRadius: 16, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.tinta, whiteSpace: 'nowrap', transform: 'rotate(-6deg)' }}>Começo depois</div>
          </div>
          <div style={{ position: 'absolute', left: 150, top: 250, width: 640, height: 22, transformOrigin: '100% 50%', transform: `rotate(${arco}deg)` }}>
            <div style={{ width: 640, height: 22, borderRadius: 11, background: '#D7DCE3', boxShadow: '0 0 0 4px #7C8594' }} />
          </div>
        </div>
      </Em>
      <Efeito nome="pop" em={fecha} volume={0.8} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Festas, férias, janeiro voando ---------------------------------------- */
const Presente = (
  <svg width="200" height="200" viewBox="0 0 20 20">
    <rect x="2" y="8" width="16" height="11" rx="1.5" fill={cor.vermelho} />
    <rect x="1" y="5" width="18" height="4" rx="1" fill="#F05252" />
    <rect x="9" y="5" width="2" height="14" fill={cor.ouro} />
    <path d="M10 5 C 6 0, 3 3, 6 5 M10 5 C 14 0, 17 3, 14 5" stroke={cor.ouro} strokeWidth="1.4" fill="none" />
  </svg>
);
const Sol = (
  <svg width="200" height="200" viewBox="0 0 20 20">
    {Array.from({ length: 8 }, (_, i) => (
      <path key={i} d="M10 1.5 V4" stroke={cor.ouroVivo} strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${i * 45} 10 10)`} />
    ))}
    <circle cx="10" cy="10" r="4.6" fill={cor.ouro} />
  </svg>
);
const Janeiro = (
  <div style={{ width: 190, borderRadius: 20, overflow: 'hidden', background: cor.branco }}>
    <div style={{ background: cor.azul, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, textAlign: 'center', padding: '6px 0' }}>JAN</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, padding: 14 }}>
      {Array.from({ length: 15 }, (_, k) => (
        <div key={k} style={{ height: 18, borderRadius: 4, background: '#E5E7EB' }} />
      ))}
    </div>
  </div>
);

export const CenaVoa: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const itens: [React.ReactNode, string, number, number][] = [
    [Presente, 'Festas', em(a, 0.0), 640],
    [Sol, 'Férias', em(a, 0.3), 900],
    [Janeiro, 'Janeiro', em(a, 0.6), 1160],
  ];
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="E o tempo / *passa voando.*" em={a.ini} tamanho={120} />
      {itens.map(([ic, t, t0, y], i) => {
        const freio = interpolate(frame, [t0, t0 + 14, t0 + 22, t0 + 50], [1200, 340, 300, -700], limita);
        return (
          <div key={t} style={{ position: 'absolute', left: freio, top: y, display: 'flex', alignItems: 'center', gap: 30, transform: `rotate(${Math.sin(frame / 4 + i) * 4}deg)` }}>
            {ic}
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 80, color: cor.branco, textShadow: '0 8px 0 rgba(0,0,0,0.15)' }}>{t}</div>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ position: 'absolute', left: 260 + k * 60 + 200, top: 60 + k * 30, width: 120 - k * 30, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.5)' }} />
            ))}
            <Efeito nome="whoosh" em={t0} volume={0.35} />
          </div>
        );
      })}
      <Aviso />
    </FundoVivo>
  );
};

/* 3. FEV 21 bate na tela ---------------------------------------------------- */
export const CenaProva: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const bate = useMola(em(a, 0.45), { damping: 10, stiffness: 220, mass: 0.8 });
  const impacto = frame - em(a, 0.45);
  const treme = impacto > 4 && impacto < 16 ? Math.sin(impacto * 3) * (16 - impacto) : 0;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="A prova é / *21 de fevereiro.*" em={a.ini} tamanho={112} faixa={cor.branco} corFaixa={cor.coral} />
      <Em y={700}>
        <div style={{ width: 560, borderRadius: 50, overflow: 'hidden', background: cor.branco, boxShadow: '0 50px 90px rgba(0,0,0,0.4)', transform: `scale(${interpolate(bate, [0, 1], [3, 1])}) translateX(${treme}px) rotate(-4deg)`, opacity: Math.min(1, bate * 3) }}>
          <div style={{ background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 70, letterSpacing: 10, textAlign: 'center', padding: '16px 0' }}>FEVEREIRO</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 330, lineHeight: 1.05, color: cor.tinta, textAlign: 'center' }}>21</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 44, color: cor.muted, textAlign: 'center', paddingBottom: 30 }}>prova objetiva · 2027</div>
        </div>
      </Em>
      <Efeito nome="pop" em={em(a, 0.45) + 4} volume={0.7} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. 5 minutos por dia, a partir de hoje ----------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="*5 min por dia,* / a partir de hoje." em={a.ini} sobre="No Fuse Aprova" tamanho={104} faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200}px) rotate(3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'trilha', em: a.ini - 8 }, { tipo: 'licao', em: em(a, 0.6) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Presente que abre com o preço ----------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const caixa = useMola(a.ini - 6, { damping: 12, stiffness: 130 });
  const abre = interpolate(frame, [a.ini + 10, a.ini + 22], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const sobe = useMola(a.ini + 16, { damping: 10, stiffness: 140 });
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Só até / *sábado.*" em={a.ini} tamanho={140} />
      <div style={{ position: 'absolute', left: 540 - 260, top: 1060, width: 520, height: 400, transform: `scale(${caixa})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 520, height: 400, borderRadius: 24, background: cor.vermelho, boxShadow: '0 40px 70px rgba(0,0,0,0.35)' }} />
        <div style={{ position: 'absolute', left: 230, top: 0, width: 60, height: 400, background: cor.ouro }} />
      </div>
      <div style={{ position: 'absolute', left: 540 - 220, top: 1100 - sobe * 470, width: 440, padding: '30px 0', borderRadius: 34, background: cor.branco, textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', opacity: sobe > 0.05 ? 1 : 0, zIndex: 1 }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.tinta }}>6x de R$ 32,83</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, color: cor.muted }}>sem juros</div>
      </div>
      <div style={{ position: 'absolute', left: 540 - 290, top: 1010, width: 580, height: 110, transform: `scale(${caixa}) translate(${-abre * 420}px, ${-abre * 380}px) rotate(${-abre * 35}deg)`, opacity: 1 - abre * 0.6, zIndex: 2 }}>
        <div style={{ width: 580, height: 110, borderRadius: 20, background: '#F05252', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }} />
        <div style={{ position: 'absolute', left: 260, top: 0, width: 60, height: 110, background: cor.ouro }} />
      </div>
      <ChipData em={em(a, 0.8)} y={1500} texto="Sábado, 05/12 · depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="pop" em={a.ini + 10} volume={0.5} />
      <Efeito nome="ding" em={a.ini + 18} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <FechoPalmital manchete="Não caia na / *armadilha.*" em={a.ini} len={40} tinta={cor.tinta} />
    </FundoVivo>
  );
};
