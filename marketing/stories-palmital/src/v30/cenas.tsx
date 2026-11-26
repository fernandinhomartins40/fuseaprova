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

// V30 · sexta 27/11 · "O que você esquece" — gráfico da memória despencando; resumo grifado de novo e de novo; o
// mesmo gráfico com as revisões de 1, 3, 7 e 15 dias; a revisão no app; fita de dias até 05/12. Voz Keren.

/* Gráfico da memória ------------------------------------------------------- */
const W = 860;
const H = 560;
const DIAS = 16;
const x = (d: number) => 80 + (d / DIAS) * (W - 120);
const y = (m: number) => 40 + (1 - m) * (H - 120);

/** Memória no dia d: sem revisão cai rápido; com revisão, volta a 100% em cada marco e cai cada vez mais devagar. */
const memoria = (d: number, revisoes: number[]) => {
  let ultimo = 0;
  let k = 0;
  for (const r of revisoes) if (d >= r) {
    ultimo = r;
    k++;
  }
  const forca = 1.2 * 5 ** k;
  return 0.12 + 0.88 * Math.exp(-(d - ultimo) / forca);
};

const Grafico: React.FC<{ progresso: number; revisoes: number[]; marcas?: number[]; cor1: string }> = ({ progresso, revisoes, marcas = [], cor1 }) => {
  const frame = useCurrentFrame();
  const n = 200;
  const ate = progresso * DIAS;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * DIAS;
    if (d > ate) break;
    pts.push(`${x(d).toFixed(1)},${y(memoria(d, revisoes)).toFixed(1)}`);
  }
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <line x1={80} y1={y(1)} x2={80} y2={y(0)} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
      <line x1={80} y1={y(0)} x2={W - 30} y2={y(0)} stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
      <text x={-10} y={y(1) + 10} fill="rgba(255,255,255,0.8)" fontFamily="Nunito" fontWeight={900} fontSize="30">100%</text>
      <text x={W - 150} y={y(0) + 50} fill="rgba(255,255,255,0.8)" fontFamily="Nunito" fontWeight={900} fontSize="30">dias →</text>
      <polyline points={pts.join(' ')} fill="none" stroke={cor1} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 12px ${cor1})` }} />
      {revisoes.map((r, i) =>
        ate >= r ? (
          <g key={r} transform={`translate(${x(r)}, ${y(1) - 40}) scale(${Math.min(1, (frame - (marcas[i] ?? 0)) / 8)})`}>
            <circle r="40" fill={cor.ouro} />
            <text y="14" textAnchor="middle" fontFamily="'Baloo 2'" fontWeight={800} fontSize="40" fill={cor.tinta}>{r}</text>
          </g>
        ) : null,
      )}
    </svg>
  );
};

/* 1. Você esquece ---------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [a.ini, em(a, 0.9)], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 1.5 });
  const pct = Math.round(memoria(prog * DIAS, []) * 100);
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Você / *esquece.*" em={a.ini} sobre="O que acontece depois que você estuda" tamanho={150} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={720}>
        <Grafico progresso={prog} revisoes={[]} cor1={cor.coral} />
      </Em>
      <Em y={1330}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 110, color: cor.branco, fontVariantNumeric: 'tabular-nums' }}>
          memória: <span style={{ color: cor.coral }}>{pct}%</span>
        </div>
      </Em>
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Reler não resolve: resumo grifado de novo ----------------------------- */
export const CenaReler: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const passadas = [a.ini, a.ini + 14, a.ini + 28];
  const vez = passadas.filter((t) => frame >= t).length;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Reler / *não resolve.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={140} />
      <Em y={700}>
        <div style={{ position: 'relative', width: 800, padding: '50px 60px', borderRadius: 24, background: cor.branco, boxShadow: '0 40px 70px rgba(0,0,0,0.25)', transform: `translateY(${(1 - p) * 1200}px) rotate(1.5deg)` }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 56, color: cor.tinta, marginBottom: 24 }}>Resumo</div>
          {[0.95, 0.8, 0.9, 0.7, 0.85].map((w, i) => {
            const grifo = passadas.reduce((acc, t) => acc + interpolate(frame, [t + i * 2, t + i * 2 + 8], [0, 1], limita), 0) / 3;
            return (
              <div key={i} style={{ position: 'relative', height: 22, width: `${w * 100}%`, margin: '26px 0' }}>
                <div style={{ position: 'absolute', left: -8, top: -12, height: 46, width: `${Math.min(1, grifo * 3) * 104}%`, background: `rgba(255,213,74,${0.3 + grifo * 0.5})`, borderRadius: 6 }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: '#BFC4CB' }} />
              </div>
            );
          })}
          <div style={{ position: 'absolute', right: -40, top: -50, padding: '16px 28px', borderRadius: 24, background: cor.coral, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 54, transform: `rotate(8deg) scale(${vez ? 1 : 0})` }}>{vez}ª vez</div>
        </div>
      </Em>
      {passadas.map((t) => (
        <Efeito key={t} nome="pop" em={t} volume={0.35} />
      ))}
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. Revisar no tempo certo: 1, 3, 7 e 15 ---------------------------------- */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const revisoes = [1, 3, 7, 15];
  const prog = interpolate(frame, [a.ini, em(a, 0.95)], [0, 1], limita);
  const marcas = revisoes.map((r) => a.ini + Math.round((r / DIAS) * (em(a, 0.95) - a.ini)));
  return (
    <FundoCinema paleta={paletas.verde} duracao={duracao}>
      <Cabeca texto="Revise no / *tempo certo.*" em={a.ini} tamanho={120} faixa={cor.ouro} corFaixa={cor.tinta} />
      <Em y={760}>
        <Grafico progresso={prog} revisoes={revisoes} marcas={marcas} cor1="#3DFFA2" />
      </Em>
      <Em y={1380}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, color: cor.branco }}>
          dias <span style={{ color: cor.ouro }}>1 · 3 · 7 · 15</span>
        </div>
      </Em>
      {marcas.map((t) => (
        <Efeito key={t} nome="pop" em={t} volume={0.4} />
      ))}
      <Aviso />
    </FundoCinema>
  );
};

/* 4. O app revisa por você -------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="O app *revisa* / por você." em={a.ini} sobre="No Fuse Aprova" tamanho={116} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200}px) rotate(-3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'revisao', em: a.ini - 8 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Fita de dias até 05/12 ------------------------------------------------- */
const FITA = ['26', '27', '28', '29', '30', '01', '02', '03', '04', '05'];

export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const rola = interpolate(frame, [a.ini, em(a, 0.6)], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const preco = useMola(em(a, 0.15), { damping: 11, stiffness: 150 });
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <Cabeca texto="*R$ 197* / em até 6x." em={a.ini} tamanho={130} />
      <Em y={660}>
        <div style={{ transform: `scale(${preco})`, padding: '30px 60px', borderRadius: 40, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, lineHeight: 1, color: cor.laranja }}>6x R$ 32,83</div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.muted }}>sem juros no cartão</div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 0, top: 1000, width: 1080, height: 300, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 40, left: 1080 - rola * 1880, display: 'flex', gap: 22 }}>
          {FITA.map((d, i) => {
            const ultimo = i === FITA.length - 1;
            return (
              <div key={d} style={{ width: 160, height: 200, borderRadius: 30, background: ultimo ? cor.ouro : 'rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: ultimo ? `0 0 40px ${cor.ouro}` : 'none', transform: ultimo ? 'scale(1.12)' : 'none' }}>
                <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, color: cor.muted }}>{i < 5 ? 'NOV' : 'DEZ'}</div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, lineHeight: 1, color: ultimo ? cor.vermelho : cor.tinta }}>{d}</div>
                {ultimo ? <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, color: cor.vermelho }}>ÚLTIMO DIA</div> : null}
              </div>
            );
          })}
        </div>
      </div>
      <ChipData em={em(a, 0.8)} y={1360} texto="Depois de 05/12: R$ 297" fundo={cor.tinta} />
      <Efeito nome="whoosh" em={a.ini} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.6)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <FechoPalmital manchete="Pare de / *esquecer.*" em={a.ini} len={a.fim - a.ini} tinta={cor.tinta} />
    </FundoVivo>
  );
};
