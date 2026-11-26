import React from 'react';
import { interpolate, random, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Confetes, Efeito, Icone, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { Calculadora } from '../v15/cenas';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V26 · quarta 25/11 · "Quanto custa?" — caça-níquel num palco escuro girando "?"; os recursos caem numa sacola;
// a ponte até 21/02; os rolos param em 32,83 com luzes; a calculadora fecha a conta em 6x. Voz Raquel.

/* Caça-níquel ------------------------------------------------------------- */
const DIGITOS = '0123456789';
const ALTURA_ROLO = 230;

/** Rolo: gira enquanto `frame < para` e assenta em `final` com um tranco. `final` null = gira para sempre com "?". */
const Rolo: React.FC<{ final: string | null; para: number; semente: number }> = ({ final, para, semente }) => {
  const frame = useCurrentFrame();
  const gira = final === null || frame < para;
  const assenta = useMola(para, { damping: 9, stiffness: 220 });
  const desloc = (frame * 61 + semente * 97) % (ALTURA_ROLO * 10);
  return (
    <div style={{ width: 150, height: ALTURA_ROLO, borderRadius: 22, background: 'linear-gradient(180deg, #d9d9d9, #ffffff 30%, #ffffff 70%, #d9d9d9)', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.3)' }}>
      {gira ? (
        <div style={{ position: 'absolute', left: 0, top: -desloc, width: '100%', filter: 'blur(5px)' }}>
          {Array.from({ length: 22 }, (_, i) => (
            <div key={i} style={{ height: ALTURA_ROLO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 170, color: cor.tinta }}>
              {final === null && i % 3 === 0 ? '?' : DIGITOS[Math.floor(random(`${semente}-${i}`) * 10)]}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: ALTURA_ROLO, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 170, color: cor.tinta, transform: `translateY(${(1 - assenta) * -60}px)` }}>{final}</div>
      )}
    </div>
  );
};

const Maquina: React.FC<{ entra: number; finais: (string | null)[]; para: number[]; luzes?: number }> = ({ entra, finais, para, luzes = 99999 }) => {
  const frame = useCurrentFrame();
  const p = useMola(entra, { damping: 13, stiffness: 120 });
  const acesas = frame >= luzes;
  const alavanca = frame < (para[0] || 0) ? interpolate(frame, [entra + 6, entra + 14], [0, 1], limita) : 0;
  const lampada = (i: number) => {
    const on = acesas ? (Math.floor(frame / 4) + i) % 2 === 0 : (Math.floor(frame / 10) + i) % 3 === 0;
    return (
      <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: on ? 'radial-gradient(circle at 35% 30%, #FFFFFF, #FFE27A 45%, #FFB000)' : 'radial-gradient(circle at 35% 30%, #a35a4f, #5c1410)', boxShadow: on ? '0 0 18px #FFD54A, 0 0 40px rgba(255,194,51,0.6)' : 'inset 0 -3px 4px rgba(0,0,0,0.4)' }} />
    );
  };
  return (
    <div style={{ position: 'relative', width: 840, transform: `perspective(1800px) rotateX(${6 + (1 - p) * 20}deg) scale(${interpolate(p, [0, 1], [0.5, 1])})`, opacity: Math.min(1, p * 2) }}>
      {/* letreiro em cúpula */}
      <div style={{ position: 'relative', margin: '0 70px -26px', height: 150, borderRadius: '150px 150px 20px 20px', background: 'linear-gradient(180deg, #FFE27A, #E2A100 60%, #A87200)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.6), 0 14px 30px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '10px 36px', borderRadius: 999, background: 'linear-gradient(180deg, #2A0B0A, #4a1210)', boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6)', fontFamily: fonte.display, fontWeight: 800, fontSize: 52, letterSpacing: 2, color: acesas ? '#FFE27A' : '#FFB000', textShadow: acesas ? '0 0 18px #FFC233' : 'none' }}>FUSE APROVA</div>
      </div>
      <div style={{ position: 'relative', padding: '40px 40px 50px', borderRadius: 60, background: 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.18), transparent 50%), linear-gradient(180deg, #E53A30, #B11F18 60%, #7E120E)', border: '12px solid transparent', backgroundClip: 'padding-box', boxShadow: `0 0 0 12px #E2A100, 0 0 0 16px #8A5A00, inset 0 4px 0 rgba(255,255,255,0.25), 0 60px 100px rgba(0,0,0,0.55)${acesas ? ', 0 0 140px rgba(255,194,51,0.65)' : ''}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 28 }}>{Array.from({ length: 9 }, (_, i) => lampada(i))}</div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, borderRadius: 34, background: 'linear-gradient(180deg, #1a0605, #2A0B0A)', boxShadow: 'inset 0 10px 24px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.2)' }}>
          <Rolo final={finais[0]} para={para[0]} semente={1} />
          <Rolo final={finais[1]} para={para[1]} semente={2} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.ouro, margin: '60px -4px 0', textShadow: '0 0 20px rgba(255,194,51,0.6)' }}>,</div>
          <Rolo final={finais[2]} para={para[2]} semente={3} />
          <Rolo final={finais[3]} para={para[3]} semente={4} />
          <div style={{ position: 'absolute', left: 18, right: 18, top: '50%', height: 4, marginTop: -2, background: 'rgba(240,72,77,0.75)', boxShadow: '0 0 10px rgba(240,72,77,0.8)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 30%, transparent 55%, rgba(0,0,0,0.25) 100%)', pointerEvents: 'none' }} />
        </div>
        <div style={{ margin: '30px auto 0', width: 260, height: 26, borderRadius: 13, background: 'linear-gradient(180deg, #3a0c0a, #120302)', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.25)' }} />
      </div>
      <div style={{ margin: '0 40px', height: 50, borderRadius: '0 0 30px 30px', background: 'linear-gradient(180deg, #8A5A00, #4A3000)', boxShadow: '0 20px 30px rgba(0,0,0,0.45)' }} />
      {/* alavanca cromada */}
      <div style={{ position: 'absolute', right: -84, top: 330, width: 50, height: 90, borderRadius: 16, background: 'linear-gradient(90deg, #6B7280, #F3F4F6 45%, #9CA3AF)' }} />
      <div style={{ position: 'absolute', right: -70, top: 120, width: 22, height: 250, borderRadius: 11, background: 'linear-gradient(90deg, #6B7280, #F9FAFB 45%, #9CA3AF)', transformOrigin: '50% 100%', transform: `rotateX(${alavanca * 70}deg) scaleY(${1 - alavanca * 0.5})` }}>
        <div style={{ position: 'absolute', left: -29, top: -70, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FF8A8A, #DC2626 50%, #7F1010)', boxShadow: '0 10px 18px rgba(0,0,0,0.4)' }} />
      </div>
    </div>
  );
};

/* 1. Quanto custa? --------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      <Cabeca texto="Quanto / *custa?*" em={a.ini} sobre="Preparatório · Prefeitura de Palmital" tamanho={150} />
      <Em x={500} y={760}>
        <Maquina entra={a.ini - 4} finais={[null, null, null, null]} para={[0, 0, 0, 0]} />
      </Em>
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.4} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Tudo o que entra: os recursos caem na sacola -------------------------- */
const RECURSOS: [string, string][] = [
  ['icone-alvo', 'Trilha do cargo'],
  ['icone-acerto', '+10 mil questões'],
  ['icone-revisao', 'Revisão'],
  ['icone-simulados', 'Simulados'],
];

export const CenaInclui: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const sacola = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Com *tudo isso:*" em={a.ini} tamanho={130} faixa={cor.ouro} corFaixa={cor.tinta} />
      {RECURSOS.map(([ic, t], i) => {
        const t0 = em(a, 0.05 + i * 0.22);
        const q = interpolate(frame, [t0, t0 + 18], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
        const linha = i % 2;
        return (
          <div key={t} style={{ position: 'absolute', left: linha ? 560 : 80, top: interpolate(q, [0, 1], [-300, 560 + Math.floor(i / 2) * 200]), width: 440, display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', borderRadius: 30, background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', boxShadow: 'inset 0 2px 0 #fff, inset 0 -5px 0 rgba(0,0,0,0.06), 0 22px 36px rgba(0,0,0,0.24)', transform: `rotate(${(1 - q) * (linha ? 20 : -20)}deg)` }}>
            <Icone nome={ic} tamanho={80} />
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.tinta, lineHeight: 1.05 }}>{t}</div>
            <Efeito nome="pop" em={t0 + 14} volume={0.35} />
          </div>
        );
      })}
      <Em y={1000}>
        <div style={{ position: 'relative', transform: `translateY(${(1 - sacola) * 900}px)` }}>
        <svg width="520" height="520" viewBox="0 0 52 52" style={{ display: 'block', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.3))' }}>
          <defs>
            <linearGradient id="sac" x1="0" x2="1">
              <stop offset="0" stopColor="#C2410C" />
              <stop offset="0.35" stopColor="#FF7A2E" />
              <stop offset="0.7" stopColor="#F25F12" />
              <stop offset="1" stopColor="#B83A08" />
            </linearGradient>
          </defs>
          <path d="M17 16 C17 5, 35 5, 35 16" fill="none" stroke="#5E3A1E" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M17 16 C17 5, 35 5, 35 16" fill="none" stroke="#C99A6B" strokeWidth="1.1" strokeDasharray="1.2 1.4" strokeLinecap="round" />
          <path d="M8 16 h36 l-3 32 h-30 z" fill="url(#sac)" />
          <path d="M8 16 h36 l-0.6 6 h-34.8 z" fill="#A8380B" opacity="0.85" />
          <path d="M14 22 l-2 26" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          <circle cx="17" cy="19" r="1.3" fill="#FFE27A" />
          <circle cx="35" cy="19" r="1.3" fill="#FFE27A" />
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 84, lineHeight: 0.95, color: cor.branco, textShadow: '0 4px 0 rgba(0,0,0,0.25)' }}>Fuse<br />Aprova</div>
        </div>
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Até o dia da prova: ponte de hoje até 21/02 --------------------------- */
const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

const Folhinha: React.FC<{ mes: string; dia: string; corTopo: string; em: number }> = ({ mes, dia, corTopo, em: t0 }) => {
  const p = useMola(t0, { damping: 11, stiffness: 150 });
  return (
    <div style={{ position: 'relative', width: 300, transform: `scale(${p}) rotate(${(1 - p) * 20}deg)` }}>
      <div style={{ position: 'absolute', left: 40, right: 40, top: -18, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{ width: 14, height: 40, borderRadius: 7, background: 'linear-gradient(90deg, #6b7280, #e5e7eb 45%, #9ca3af)' }} />
        ))}
      </div>
      <div style={{ borderRadius: 34, overflow: 'hidden', background: 'linear-gradient(180deg, #FFFFFF, #EEF0F3)', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.06), 0 34px 60px rgba(0,0,0,0.32)' }}>
      <div style={{ background: `linear-gradient(180deg, ${corTopo}, ${corTopo}CC)`, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 40, letterSpacing: 6, textAlign: 'center', padding: '20px 0 12px', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }}>{mes}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 170, lineHeight: 1.15, color: cor.tinta, textAlign: 'center', textShadow: '0 5px 0 rgba(0,0,0,0.06)' }}>{dia}</div>
      </div>
    </div>
  );
};

export const CenaAte: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const ponte = interpolate(frame, [em(a, 0.2), em(a, 0.7)], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 2 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Até a prova / *de Palmital.*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 70, top: 810 }}>
        <Folhinha mes="HOJE" dia="25" corTopo={cor.laranjaVivo} em={a.ini} />
      </div>
      <div style={{ position: 'absolute', right: 70, top: 810 }}>
        <Folhinha mes="FEV" dia="21" corTopo={cor.vermelho} em={em(a, 0.65)} />
      </div>
      <svg width="1080" height="400" style={{ position: "absolute", left: 0, top: 650 }}>
        <path d="M230 160 C 400 0, 680 0, 850 160" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="16" strokeLinecap="round" strokeDasharray="2 26" />
        <path d="M230 160 C 400 0, 680 0, 850 160" fill="none" stroke={cor.ouro} strokeWidth="16" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ponte} style={{ filter: 'drop-shadow(0 0 12px rgba(255,194,51,0.9))' }} />
        {ponte > 0 && ponte < 1 ? <circle cx={bez(ponte, 230, 400, 680, 850)} cy={bez(ponte, 160, 0, 0, 160)} r="20" fill="#FFF6D0" style={{ filter: 'drop-shadow(0 0 16px #FFC233)' }} /> : null}
      </svg>
      <ChipData em={em(a, 0.8)} y={1230} texto="Acesso até a prova objetiva" fundo={cor.branco} tinta={cor.azul} />
      <Efeito nome="ding" em={em(a, 0.65)} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Os rolos param: R$ 32,83 por mês -------------------------------------- */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const para = [a.ini + 8, a.ini + 16, a.ini + 24, a.ini + 32];
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <Cabeca texto="Por *mês:*" em={a.ini} tamanho={140} />
      <Em x={500} y={640}>
        <Maquina entra={-40} finais={['3', '2', '8', '3']} para={para} luzes={para[3] + 4} />
      </Em>
      <Em y={1420}>
        <Surge em={para[3] + 8}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 84, color: cor.branco, textAlign: 'center' }}>
            R$ 32,83 <span style={{ color: cor.ouro }}>por mês</span>
          </div>
        </Surge>
      </Em>
      <Confetes inicio={para[3] + 4} />
      {para.map((q) => (
        <Efeito key={q} nome="pop" em={q} volume={0.45} />
      ))}
      <Efeito nome="ding" em={para[3] + 4} volume={0.6} />
      <Aviso />
    </FundoCinema>
  );
};

/* 5. A conta: R$ 197 ÷ 6 ---------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const sinal = useMola(em(a, 0.45), { damping: 10, stiffness: 190 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="R$ 197 em / *6x sem juros.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={110} />
      <div style={{ position: 'absolute', left: 80, top: 640 }}>
        <Calculadora em={a.ini} />
      </div>
      <div style={{ position: 'absolute', left: 580, top: 760, display: 'flex', flexDirection: 'column', gap: 26, transform: `scale(${sinal})`, transformOrigin: '0 50%' }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: cor.tinta }}>÷ 6</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 96, lineHeight: 1, color: cor.laranja, background: cor.branco, padding: '20px 26px', borderRadius: 30, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>= 32,83</div>
      </div>
      <ChipData em={em(a, 0.8)} y={1440} texto="Só até 5/12 · depois, R$ 297" fundo={cor.tinta} />
      <Efeito nome="pop" em={em(a, 0.45)} volume={0.45} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <FechoPalmital manchete="*R$ 32,83* / por mês." em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
