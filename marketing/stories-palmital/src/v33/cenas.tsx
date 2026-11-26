import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Quica } from '../v15/cenas';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V33 · domingo 29/11 · "Teste sem risco" — cofre que abre e mostra o escudo; sete dias acendendo em arco; a moeda
// que volta pra carteira (100%); treino e simulado no app; o preço dentro do escudo da garantia. Voz Roberta.

const VERDE = '#22C55E';

const Escudo: React.FC<{ tamanho: number; children?: React.ReactNode; fundo?: string }> = ({ tamanho, children, fundo = VERDE }) => {
  const id = React.useId().replace(/:/g, '');
  const claro = fundo === cor.branco;
  return (
  <div style={{ position: 'relative', width: tamanho, height: tamanho * 1.15 }}>
    <svg width={tamanho} height={tamanho * 1.15} viewBox="0 0 100 115" style={{ position: 'absolute', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }}>
      <defs>
        <linearGradient id={`esc${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro ? '#FFFFFF' : '#6EE7A0'} />
          <stop offset="0.55" stopColor={claro ? '#F3F4F6' : fundo} />
          <stop offset="1" stopColor={claro ? '#D9DDE3' : '#15803D'} />
        </linearGradient>
      </defs>
      <path d="M50 4 L92 18 V55 C92 85, 70 102, 50 111 C30 102, 8 85, 8 55 V18 Z" fill={`url(#esc${id})`} stroke={claro ? '#C9CED6' : cor.branco} strokeWidth="5" />
      <path d="M50 12 L84 23 V55 C84 80, 66 95, 50 102 C34 95, 16 80, 16 55 V23 Z" fill="none" stroke={claro ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.35)'} strokeWidth="2.5" />
      <path d="M50 12 L84 23 V40 C 60 44, 30 40, 16 30 V23 Z" fill="rgba(255,255,255,0.18)" />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: tamanho * 0.08 }}>{children}</div>
  </div>
  );
};

/* 1. Teste sem risco: o cofre abre ----------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const roda = interpolate(frame, [a.ini, em(a, 0.55)], [0, 540], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const abre = interpolate(frame, [em(a, 0.6), em(a, 0.6) + 14], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const escudo = useMola(em(a, 0.65), { damping: 9, stiffness: 160 });
  return (
    <FundoCinema paleta={paletas.verde} duracao={duracao}>
      <Cabeca texto="Teste / *sem risco.*" em={a.ini} sobre="Fuse Aprova" tamanho={140} faixa={VERDE} corFaixa={cor.branco} />
      <Em y={680}>
        <div style={{ position: 'relative', width: 640, height: 640, transform: `scale(${p})`, perspective: 1600 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 50, background: 'radial-gradient(circle at 50% 40%, #1E2229, #0B0D10)', boxShadow: 'inset 0 0 0 16px #4A515E, inset 0 0 0 20px #2A2F38, inset 0 0 50px rgba(0,0,0,0.8), 0 50px 90px rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'absolute', left: 170, top: 150, transform: `scale(${escudo})` }}>
            <Escudo tamanho={300}>
              <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </Escudo>
          </div>
          <div style={{ position: 'absolute', inset: 30, borderRadius: 36, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 6px), linear-gradient(135deg, #C3CAD4, #8E98A8 40%, #5B6472)', transformOrigin: '0 50%', transform: `rotateY(${-abre * 105}deg)`, boxShadow: '0 0 0 6px #4A5160', backfaceVisibility: 'hidden' }}>
            <div style={{ position: 'absolute', left: 170, top: 170, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #FFFFFF, #C9CED6 60%, #8E98A8)', border: '14px solid #3B424E', boxShadow: '0 12px 20px rgba(0,0,0,0.45), inset 0 -6px 12px rgba(0,0,0,0.25)', transform: `rotate(${roda}deg)` }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{ position: 'absolute', left: 99, top: 6, width: 14, height: 30, borderRadius: 4, background: '#3B424E', transformOrigin: '7px 100px', transform: `rotate(${i * 30}deg)` }} />
              ))}
            </div>
            <div style={{ position: 'absolute', right: 40, top: 250, width: 40, height: 100, borderRadius: 14, background: '#3B424E' }} />
          </div>
        </div>
      </Em>
      <Efeito nome="whoosh" em={em(a, 0.6)} volume={0.4} />
      <Efeito nome="ding" em={em(a, 0.65)} volume={0.5} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Sete dias de garantia -------------------------------------------------- */
export const CenaSete: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="*7 dias* / de garantia." em={a.ini} tamanho={130} />
      {Array.from({ length: 7 }, (_, i) => {
        const ang = (-150 + i * 20) * (Math.PI / 180);
        const x = 540 + Math.cos(ang) * 380 - 70;
        const y = 1150 + Math.sin(ang) * 380 - 70;
        const t0 = a.ini + 2 + i * 5;
        const ok = frame >= t0;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: 140, height: 140, borderRadius: '50%', background: ok ? 'radial-gradient(circle at 38% 30%, #FFFFFF, #E6E9EE)' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 70, color: ok ? cor.teal : 'rgba(255,255,255,0.6)', transform: `scale(${ok ? 1 + Math.max(0, 1 - (frame - t0) / 8) * 0.25 : 0.85})`, boxShadow: ok ? 'inset 0 -6px 0 rgba(0,0,0,0.06), 0 9px 0 #0E7C70, 0 20px 30px rgba(0,0,0,0.25)' : 'none' }}>
            {i + 1}
            <Efeito nome="pop" em={t0} volume={0.25} />
          </div>
        );
      })}
      <Em y={1080}>
        <Quica em={a.ini + 40}>
          <Escudo tamanho={260}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 110, lineHeight: 0.9, color: cor.branco }}>7</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, color: cor.branco }}>DIAS</div>
          </Escudo>
        </Quica>
      </Em>
      <Efeito nome="ding" em={a.ini + 40} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Não gostou? 100% de volta --------------------------------------------- */
export const CenaDevolve: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const t0 = em(a, 0.35);
  const voo = interpolate(frame, [t0, t0 + 22], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const cx = interpolate(voo, [0, 1], [760, 300]);
  const cy = interpolate(voo, [0, 0.5, 1], [760, 560, 900]);
  const cem = Math.round(interpolate(frame, [t0 + 10, t0 + 34], [0, 100], limita));
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Não gostou? / *Devolvemos.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={120} />
      <div style={{ position: 'absolute', left: 140, top: 900, width: 320, height: 230, borderRadius: 40, background: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1.5px) 0 0 / 8px 8px, linear-gradient(160deg, #9A6236, #6B3F1F)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.18), inset 0 -8px 0 rgba(0,0,0,0.25), 0 40px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ position: 'absolute', inset: 14, borderRadius: 30, border: '3px dashed rgba(255,220,170,0.55)' }} />
        <div style={{ position: 'absolute', right: -20, top: 70, width: 120, height: 90, borderRadius: 24, background: 'linear-gradient(160deg, #7A4B2A, #4E2E15)', boxShadow: '0 8px 14px rgba(0,0,0,0.35)' }}>
          <div style={{ position: 'absolute', left: 30, top: 30, width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #C99A3A)' }} />
        </div>
      </div>
      <svg width="700" height="400" style={{ position: 'absolute', left: 220, top: 560 }}>
        <path d="M560 210 C 520 40, 200 0, 120 300" fill="none" stroke={cor.tinta} strokeWidth="10" strokeDasharray="20 18" strokeLinecap="round" opacity={0.35} />
      </svg>
      <div style={{ position: 'absolute', left: cx - 90, top: cy - 90, width: 180, height: 180, borderRadius: '50%', background: `linear-gradient(180deg, ${cor.ouro}, ${cor.ouroSombra})`, border: `10px solid ${cor.ouroTinta}`, boxShadow: `0 10px 0 ${cor.ouroTinta}, 0 20px 30px rgba(0,0,0,0.3), inset 0 3px 0 rgba(255,255,255,0.6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 80, color: cor.ouroTinta, textShadow: '0 2px 0 rgba(255,255,255,0.5)', transform: `rotate(${voo * 360}deg)`, opacity: voo >= 1 ? 0 : 1 }}>R$</div>
      <Em y={1220}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 200, lineHeight: 1, color: cor.tinta, fontVariantNumeric: 'tabular-nums' }}>
          {cem}
          <span style={{ color: cor.verde }}>%</span>
        </div>
      </Em>
      <Em y={1440}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 44, color: cor.tinta, opacity: cem / 100 }}>do valor de volta</div>
      </Em>
      <Efeito nome="whoosh" em={t0} volume={0.4} />
      <Efeito nome="ding" em={t0 + 22} volume={0.5} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. Use e depois decida ---------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Use. / *Depois decida.*" em={a.ini} sobre="Nos 7 dias" tamanho={120} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200 + Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${16 - (1 - cel) * 20}deg) rotateX(4deg) rotate(-3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'questao', em: a.ini - 8 }, { tipo: 'simulado', em: em(a, 0.5) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Preço dentro do escudo ------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const fita = interpolate(frame, [em(a, 0.4), em(a, 0.4) + 12], [0, 1], limita);
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="*R$ 197* / com garantia." em={a.ini} tamanho={124} />
      <Em y={620}>
        <Quica em={a.ini + 2}>
          <Escudo tamanho={560} fundo={cor.branco}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: cor.tinta }}>6x de R$ 32,83</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.muted }}>sem juros</div>
          </Escudo>
        </Quica>
      </Em>
      <div style={{ position: 'absolute', left: 140, top: 1150, width: 800, padding: '22px 0', background: VERDE, color: cor.branco, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 54, clipPath: `inset(0 ${(1 - fita) * 100}% 0 0)`, transform: 'rotate(-3deg)', boxShadow: '0 16px 30px rgba(0,0,0,0.25)' }}>
        GARANTIA DE 7 DIAS
      </div>
      <ChipData em={em(a, 0.8)} y={1360} texto="Até 05/12 · depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="ding" em={a.ini + 2} volume={0.45} />
      <Efeito nome="whoosh" em={em(a, 0.4)} volume={0.35} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <FechoPalmital manchete="Comece / *sem medo.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
