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
      <Cabeca texto="Daqui a / *6 dias...*" em={a.ini} tamanho={140} />
      <div style={{ position: 'absolute', left: 60, top: 760, width: 960, height: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 34 }}>
        {[6, 5, 4, 3, 2, 1].map((n, i) => {
          const entra = useMola(a.ini + i * 3, { damping: 12, stiffness: 170 });
          const giro = i === 0 ? -cai * 80 : 0;
          return (
            <div key={n} style={{ width: 120, height: 420, borderRadius: 20, background: cor.tinta, border: `8px solid ${cor.branco}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', transformOrigin: '0% 100%', transform: `translateY(${(1 - entra) * 700}px) rotate(${giro}deg)`, opacity: i === 0 ? 1 - cai * 0.4 : 1, boxShadow: '0 20px 30px rgba(0,0,0,0.3)' }}>
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
      <rect x="3" y="12" width="18" height="14" rx="3" fill={cor.ouro} stroke={cor.tinta} strokeWidth="2" />
    </svg>
  );
};

export const CenaIgual: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const itens = ['Trilha', 'Questões', 'Simulados'];
  const ingresso = useMola(em(a, 0.65), { damping: 12, stiffness: 130 });
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="Isso *não muda.*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 0, top: 620, width: 1080, display: 'flex', justifyContent: 'center', gap: 30 }}>
        {itens.map((t, i) => (
          <Surge key={t} em={em(a, 0.05 + i * 0.13)}>
            <div style={{ width: 290, padding: '36px 0', borderRadius: 36, background: cor.branco, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <Cadeado fechado={em(a, 0.05 + i * 0.13) + 10} />
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.tinta }}>{t}</div>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, color: cor.verde }}>IGUAL</div>
            </div>
            <Efeito nome="pop" em={em(a, 0.05 + i * 0.13) + 10} volume={0.3} />
          </Surge>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 140, top: 1080, width: 800, height: 260, borderRadius: 30, background: cor.ouro, display: 'flex', boxShadow: '0 30px 50px rgba(0,0,0,0.3)', transform: `translateX(${(1 - ingresso) * 1200}px) rotate(-3deg)` }}>
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
    <div style={{ width: 680, padding: '30px 40px', borderRadius: 40, background: '#0E0F13', border: '10px solid #3B424E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
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
      <Cabeca texto="O que muda / *é o preço.*" em={a.ini} tamanho={120} faixa={cor.coral} corFaixa={cor.branco} />
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
      <Cabeca texto="Até sábado, / *ainda dá pra entrar.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={96} />
      <div style={{ position: 'absolute', left: 190, top: 620, width: 700, height: 820, borderRadius: '30px 30px 0 0', background: '#5B6472', padding: 26, boxShadow: '0 40px 70px rgba(0,0,0,0.35)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 14, background: `linear-gradient(180deg, #FFF6EE, ${cor.ouro})` }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: cor.tinta }}>em até 6x</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: cor.tinta }}>sem juros</div>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, #AEB6C2, #D7DCE3)', borderRight: '3px solid #7C8594', transform: `translateX(${-abre * 100}%)` }} />
          <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', background: 'linear-gradient(270deg, #AEB6C2, #D7DCE3)', borderLeft: '3px solid #7C8594', transform: `translateX(${abre * 100}%)` }} />
        </div>
      </div>
      <ChipData em={em(a, 0.7)} y={1480} texto="Último dia: sábado, 05/12" fundo={cor.tinta} />
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
