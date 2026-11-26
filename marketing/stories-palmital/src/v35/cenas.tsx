import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V35 · segunda 30/11 · "Faltam 6 dias" — seis dominós (o primeiro cai); três cartões com cadeado e o ingresso
// "acesso até a prova"; o painel do elevador sobe de 197 para 297; as portas abrem com o R$ 197 lá dentro. Voz Davi Andrei.

/* 1. Em 6 dias, muda: seis dominós ----------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cai = interpolate(frame, [em(a, 0.7), em(a, 0.7) + 10], [0, 1], { ...limita, easing: (t) => t * t });
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Em 6 dias, / *o valor sobe.*" em={a.ini} tamanho={140} />
      <div style={{ position: 'absolute', left: 60, top: 760, width: 960, height: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 34 }}>
        {[6, 5, 4, 3, 2, 1].map((n, i) => {
          const entra = useMola(a.ini + i * 3, { damping: 12, stiffness: 170 });
          const giro = i === 0 ? -cai * 80 : 0;
          return (
            <div key={n} style={{ width: 120, height: 420, borderRadius: 22, background: 'linear-gradient(100deg, #4A4D57 0%, #2D2F36 35%, #15161A 100%)', border: '8px solid #F3F4F6', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), 10px 0 0 #9CA3AF, 10px 24px 30px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', transformOrigin: '0% 100%', transform: `translateY(${(1 - entra) * 700}px) rotate(${giro}deg)`, opacity: i === 0 ? 1 - cai * 0.4 : 1 }}>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: i === 0 ? cor.ouro : cor.branco }}>{n}</div>
              <div style={{ width: 70, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }} />
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>{n === 1 ? 'DIA' : 'DIAS'}</div>
            </div>
          );
        })}
      </div>
      <Efeito nome="pop" em={em(a, 0.7) + 10} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. O que continua igual: cadeados + ingresso ----------------------------- */
const Cadeado: React.FC<{ fechado: number }> = ({ fechado }) => {
  const frame = useCurrentFrame();
  const f = interpolate(frame, [fechado, fechado + 6], [0, 1], limita);
  return (
    <svg width="70" height="80" viewBox="0 0 24 28">
      <path d={`M7 ${12 - (1 - f) * 4} V8 a5 5 0 0 1 10 0 V${12 - (1 - f) * 0}`} fill="none" stroke={cor.tinta} strokeWidth="3" />
      <defs>
        <linearGradient id="cad35" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="1" stopColor="#D99A00" />
        </linearGradient>
      </defs>
      <rect x="3" y="12" width="18" height="14" rx="3" fill="url(#cad35)" stroke={cor.tinta} strokeWidth="2" />
      <circle cx="12" cy="18.5" r="2" fill={cor.tinta} />
    </svg>
  );
};

export const CenaIgual: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const itens = ['Trilha', 'Questões', 'Simulados'];
  const ingresso = useMola(em(a, 0.65), { damping: 12, stiffness: 130 });
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="Garantindo antes, / *você leva tudo:*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 0, top: 620, width: 1080, display: 'flex', justifyContent: 'center', gap: 30 }}>
        {itens.map((t, i) => (
          <Surge key={t} em={em(a, 0.05 + i * 0.13)}>
            <div style={{ width: 290, padding: '36px 0', borderRadius: 36, background: 'linear-gradient(180deg, #FFFFFF, #ECEEF2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: 'inset 0 2px 0 #fff, 0 10px 0 #C9CED6, 0 26px 44px rgba(0,0,0,0.3)' }}>
              <Cadeado fechado={em(a, 0.05 + i * 0.13) + 10} />
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.tinta }}>{t}</div>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, color: cor.verde }}>IGUAL</div>
            </div>
            <Efeito nome="pop" em={em(a, 0.05 + i * 0.13) + 10} volume={0.3} />
          </Surge>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 140, top: 1080, width: 800, height: 260, borderRadius: 30, background: 'radial-gradient(circle at 20% 0%, rgba(255,255,255,0.5), transparent 45%), linear-gradient(180deg, #FFE27A, #FFC233 60%, #F0AE14)', WebkitMaskImage: 'radial-gradient(circle 28px at 578px 0, transparent 27px, #000 28px), radial-gradient(circle 28px at 578px 100%, transparent 27px, #000 28px)', WebkitMaskComposite: 'source-in', maskComposite: 'intersect', display: 'flex', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.3))', transform: `translateX(${(1 - ingresso) * 1200}px) rotate(-3deg)` }}>
        <div style={{ flex: 1, padding: '34px 40px', borderRight: `6px dashed ${cor.tinta}` }}>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, letterSpacing: 4, color: cor.ouroTinta }}>INGRESSO</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, lineHeight: 1.05, color: cor.tinta }}>Acesso até a prova</div>
        </div>
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, color: cor.ouroTinta }}>FEV</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 100, lineHeight: 1, color: cor.tinta }}>21</div>
        </div>
      </div>
      <Efeito nome="whoosh" em={em(a, 0.65)} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. O preço sobe: painel do elevador -------------------------------------- */
const Painel: React.FC<{ valor: string; subindo: boolean; corValor: string }> = ({ valor, subindo, corValor }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 680, padding: '30px 40px', borderRadius: 40, background: 'linear-gradient(180deg, #16181D, #050506)', border: '12px solid #6B7280', boxShadow: 'inset 0 0 30px rgba(255,77,61,0.15), 0 0 0 4px #1F2329, 0 40px 80px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
      <svg width="110" height="110" viewBox="0 0 24 24" style={{ opacity: subindo ? (Math.floor(frame / 6) % 2 ? 1 : 0.35) : 0.2 }}>
        <path d="M12 3 L21 14 H15 V21 H9 V14 H3 Z" fill={cor.vermelho} />
      </svg>
      <div style={{ fontFamily: "'Consolas', monospace", fontWeight: 900, fontSize: 180, lineHeight: 1, color: corValor, textShadow: `0 0 30px ${corValor}` }}>{valor}</div>
    </div>
  );
};

export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const t0 = em(a, 0.45);
  const t1 = em(a, 0.8);
  const valor = frame < t0 ? 197 : frame < t1 ? Math.round(interpolate(frame, [t0, t1], [197, 297])) : 297;
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Dia 6, / *o valor sobe.*" em={a.ini} tamanho={120} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={680}>
        <Painel valor={`R$${valor}`} subindo={frame >= t0 && frame < t1 + 10} corValor={frame >= t1 ? '#FF4D3D' : '#FFB020'} />
      </Em>
      <Em y={1080}>
        <Surge em={t1}>
          <div style={{ padding: '20px 40px', borderRadius: 999, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.vermelho }}>Domingo, 06/12</div>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={t0} volume={0.35} />
      <Efeito nome="ding" em={t1} volume={0.55} />
      <Aviso />
    </FundoCinema>
  );
};

/* 4. Ainda dá pra entrar: portas abrem com o R$ 197 ------------------------ */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const abre = interpolate(frame, [a.ini + 4, a.ini + 24], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="Até sábado: / *R$ 197.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={96} />
      <div style={{ position: 'absolute', left: 190, top: 720, width: 700, height: 760, borderRadius: '30px 30px 0 0', background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px), linear-gradient(90deg, #6B7280, #C3CAD4 50%, #6B7280)`, padding: 26, boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3), 0 50px 80px rgba(0,0,0,0.38)' }}>
        <div style={{ position: 'absolute', left: 250, top: -90, width: 200, height: 70, borderRadius: 18, background: 'linear-gradient(180deg, #16181D, #050506)', border: '6px solid #9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Consolas', monospace", fontWeight: 900, fontSize: 40, color: '#FFB020', textShadow: '0 0 12px #FFB020' }}>▲ 197</div>
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 14, background: `linear-gradient(180deg, #FFF6EE, ${cor.ouro})` }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: cor.tinta }}>em até 6x</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: cor.tinta }}>sem juros</div>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px), linear-gradient(90deg, #9CA3AF, #E5E7EB 70%, #C3CAD4)`, borderRight: '3px solid #6B7280', boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.18)', transform: `translateX(${-abre * 100}%)` }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 5px), linear-gradient(270deg, #9CA3AF, #E5E7EB 70%, #C3CAD4)`, borderLeft: '3px solid #6B7280', boxShadow: 'inset 10px 0 20px rgba(0,0,0,0.18)', transform: `translateX(${abre * 100}%)` }} />
        </div>
      </div>
      <ChipData em={em(a, 0.7)} y={1530} texto="R$ 197 até sábado, 05/12" fundo={cor.tinta} />
      <Efeito nome="ding" em={a.ini + 2} volume={0.45} />
      <Efeito nome="whoosh" em={a.ini + 4} volume={0.35} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <FechoPalmital manchete="Entre *antes* / de subir." em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
