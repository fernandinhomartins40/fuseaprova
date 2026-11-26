import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V25 · quarta 25/11 · "A pergunta que ninguém faz" — balão de pergunta com a Capi; prancheta de requisitos em branco;
// cartões de CNH e de experiência; folhas de calendário caindo na lixeira; o cargo no app; etiqueta de preço. Voz Lucas.

/* 1. Responda uma pergunta: balão com a Capi pensando ---------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const balao = useMola(a.ini + 6, { damping: 10, stiffness: 150 });
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="Antes de estudar, / *responda:*" em={a.ini} sobre="Concurso · Prefeitura de Palmital" tamanho={108} />
      <div style={{ position: 'absolute', left: 250, top: 640, width: 580, height: 440, borderRadius: 120, background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF1F5 100%)', boxShadow: 'inset 0 4px 0 #fff, inset 0 -14px 24px rgba(20,60,80,0.12), 0 40px 70px rgba(0,0,0,0.32), 0 10px 18px rgba(0,0,0,0.18)', transform: `scale(${balao}, ${0.6 + balao * 0.4}) rotate(${-3 + Math.sin(frame / 20) * 1.5}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 220, lineHeight: 1, color: [cor.laranjaVivo, cor.teal, cor.roxo][i], textShadow: Array.from({ length: 12 }, (_, k) => `0 ${k + 1}px 0 ${['#B4430A', '#0B5560', '#4C2A9E'][i]}`).join(', ') + ', 0 22px 24px rgba(0,0,0,0.2)', transform: `translateY(${Math.sin(frame / 5 + i * 1.3) * 16 - 6}px) rotate(${Math.sin(frame / 9 + i) * 6}deg)` }}>
            ?
          </div>
        ))}
        <div style={{ position: 'absolute', left: 90, bottom: -60, width: 0, height: 0, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderTop: '80px solid #EEF1F5', transform: 'rotate(20deg)', filter: 'drop-shadow(0 16px 10px rgba(0,0,0,0.18))' }} />
      </div>
      <div style={{ position: 'absolute', left: 90, top: 1130 }}>
        <Surge em={a.ini + 14} de="esquerda">
          <Img src={staticFile('img/capi-explicando.webp')} style={{ height: 420, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }} />
        </Surge>
      </div>
      <Efeito nome="pop" em={a.ini + 6} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Você atende aos requisitos? Prancheta com caixas vazias -------------- */
const Prancheta: React.FC<{ em: number; itens: string[] }> = ({ em: t0, itens }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 13, stiffness: 110 });
  return (
    <div style={{ position: 'relative', width: 760, padding: '110px 50px 50px', borderRadius: 40, background: 'repeating-linear-gradient(95deg, rgba(110,60,20,0.18) 0 3px, transparent 3px 22px), linear-gradient(160deg, #D9A066, #B57437 60%, #9A5E2A)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.25), inset 0 -8px 0 rgba(0,0,0,0.2), 0 50px 80px rgba(0,0,0,0.35), 0 12px 20px rgba(0,0,0,0.2)', transform: `translateY(${(1 - p) * 1300}px) perspective(1600px) rotateX(${8 + (1 - p) * 30}deg) rotate(${2 + Math.sin(frame / 30)}deg)` }}>
      <div style={{ position: 'absolute', left: 240, top: -30, width: 280, height: 100, borderRadius: 24, background: 'linear-gradient(180deg, #F1F3F6, #A9B1BC 55%, #7D8692)', boxShadow: 'inset 0 2px 0 #fff, inset 0 -10px 0 rgba(0,0,0,0.2), 0 10px 16px rgba(0,0,0,0.3)' }}>
        {[40, 220].map((x) => (
          <div key={x} style={{ position: 'absolute', left: x, top: 38, width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fff, #6B7280)' }} />
        ))}
      </div>
      <div style={{ background: 'linear-gradient(180deg, #FFFFFF, #F6F7F9)', borderRadius: 20, padding: '40px 40px 30px', boxShadow: '0 6px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 4, color: cor.muted, marginBottom: 20 }}>REQUISITOS DO CARGO</div>
        {itens.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '22px 0', borderTop: i ? '3px solid #EEF0F3' : 'none' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, border: `6px solid ${cor.tinta}`, background: 'linear-gradient(180deg, #fff, #EEF0F3)', boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.coral, opacity: interpolate(frame, [t0 + 20 + i * 8, t0 + 26 + i * 8], [0, 1], limita) }}>
              ?
            </div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 58, color: cor.tinta }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CenaPergunta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Você atende aos / *requisitos?*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={110} />
      <Em y={680}>
        <Prancheta em={a.ini - 4} itens={['Escolaridade', 'CNH', 'Experiência']} />
      </Em>
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.4} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. CNH? Experiência? Dois cartões ---------------------------------------- */
const Documento: React.FC<{ em: number; titulo: string; cor1: string; cor2: string; icone: React.ReactNode; giro: number }> = ({ em: t0, titulo, cor1, cor2, icone, giro }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 12, stiffness: 120 });
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: 760, height: 420, borderRadius: 40, padding: 44, background: `radial-gradient(circle at 85% 10%, rgba(255,255,255,0.25), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), linear-gradient(135deg, ${cor1}, ${cor2})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.25), 0 50px 80px rgba(0,0,0,0.35), 0 12px 20px rgba(0,0,0,0.2)', display: 'flex', gap: 40, alignItems: 'center', transform: `perspective(1400px) rotateY(${interpolate(p, [0, 1], [90, 0]) + Math.sin(frame / 30) * 4}deg) rotateX(6deg) rotate(${giro + Math.sin(frame / 25) * 1}deg)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ position: 'absolute', right: 40, bottom: 40, width: 120, height: 80, borderRadius: 14, background: 'linear-gradient(135deg, #ffd1f0, #c7f0ff, #fff3b0, #d6c9ff)', opacity: 0.75, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6)' }} />
      <div style={{ position: 'absolute', top: -60, bottom: -60, left: `${interpolate(frame, [t0 + 14, t0 + 44], [-40, 140], limita)}%`, width: 120, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', transform: 'skewX(-18deg)' }} />
      <div style={{ width: 230, height: 290, borderRadius: 26, background: 'linear-gradient(180deg, #FFFFFF, #E8ECF2)', boxShadow: 'inset 0 2px 0 #fff, 0 10px 20px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icone}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, lineHeight: 1, color: cor.branco, textShadow: '0 4px 0 rgba(0,0,0,0.2)' }}>{titulo}</div>
        {[0.9, 0.7, 0.8].map((w, i) => (
          <div key={i} style={{ height: 18, width: `${w * 100}%`, borderRadius: 9, background: 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
      <Efeito nome="whoosh" em={t0} volume={0.35} />
    </div>
  );
};

const Volante = (
  <svg width="170" height="170" viewBox="0 0 24 24" fill="none" stroke={cor.tinta} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M3.5 10.5h6M14.5 10.5h6M12 14.5V21" />
  </svg>
);
const Maleta = (
  <svg width="170" height="170" viewBox="0 0 24 24" fill="none" stroke={cor.tinta} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
  </svg>
);

export const CenaExemplos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="CNH? / *Experiência?*" em={a.ini} tamanho={130} faixa={cor.branco} corFaixa={cor.coral} />
      <Em y={640}>
        <Documento em={a.ini + 4} titulo="CNH" cor1="#2E7DD7" cor2="#1B4FA0" icone={Volante} giro={-4} />
      </Em>
      <Em y={1110}>
        <Documento em={em(a, 0.55)} titulo="Experiência" cor1="#8B5CF6" cor2="#5B2BC9" icone={Maleta} giro={3} />
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Meses à toa: folhas de calendário caem na lixeira --------------------- */
const MESES = ['DEZ', 'JAN', 'FEV'];

export const CenaRisco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="Sem conferir: / *meses jogados fora.*" em={a.ini} tamanho={94} />
      {MESES.map((m, i) => {
        const t0 = a.ini + 6 + i * 12;
        const q = interpolate(frame, [t0, t0 + 26], [0, 1], { ...limita, easing: (x) => x * x });
        return (
          <div key={m} style={{ position: 'absolute', left: 540 - 140 + (i - 1) * 90 * (1 - q), top: interpolate(q, [0, 1], [640, 1180]), width: 280, borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(180deg, #FFFFFF, #EEF0F3)', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.06), 0 24px 44px rgba(0,0,0,0.32)', transform: `rotate(${(i - 1) * 14 + q * 160 * (i % 2 ? 1 : -1)}deg) scale(${1 - q * 0.55})`, opacity: q >= 1 ? 0 : 1 }}>
            <div style={{ background: 'linear-gradient(180deg, #F0484D, #C81E2B)', color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 40, letterSpacing: 6, textAlign: 'center', padding: '10px 0', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)' }}>{m}</div>
            <div style={{ height: 180, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, padding: 20 }}>
              {Array.from({ length: 15 }, (_, k) => (
                <div key={k} style={{ borderRadius: 6, background: '#E5E7EB' }} />
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 540 - 190, top: 1170, width: 380, height: 440 }}>
        <div style={{ position: 'absolute', left: 30, top: 70, width: 320, height: 360, background: 'linear-gradient(90deg, #8B93A0, #E8EBEF 35%, #C2C8D0 60%, #7C8594)', clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)', boxShadow: '0 30px 50px rgba(0,0,0,0.35)' }}>
          {[0.28, 0.5, 0.72].map((x) => (
            <div key={x} style={{ position: 'absolute', left: `${x * 100}%`, top: 40, width: 18, height: 260, marginLeft: -9, borderRadius: 9, background: 'linear-gradient(90deg, rgba(0,0,0,0.25), rgba(255,255,255,0.4))' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 10, top: 40, width: 360, height: 40, borderRadius: 14, background: 'linear-gradient(180deg, #F3F5F8, #9AA3AE)', boxShadow: '0 8px 14px rgba(0,0,0,0.3)', transformOrigin: '0 100%', transform: `rotate(${-interpolate(frame, [a.ini + 2, a.ini + 12, a.ini + 62, a.ini + 72], [0, 38, 38, 0], limita)}deg)` }}>
          <div style={{ position: 'absolute', left: 140, top: -24, width: 80, height: 30, borderRadius: '12px 12px 0 0', background: 'linear-gradient(180deg, #F3F5F8, #AEB5BF)' }} />
        </div>
      </div>
      {MESES.map((m, i) => (
        <Efeito key={m} nome="pop" em={a.ini + 30 + i * 12} volume={0.35} />
      ))}
      <Aviso />
    </FundoVivo>
  );
};

/* 5. No app: escolha o cargo e veja os requisitos -------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Escolha o cargo. / *Veja o que pede.*" em={a.ini} sobre="No Fuse Aprova" tamanho={100} faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 300, top: 650, transform: `translateY(${(1 - cel) * 1200 + Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${-14 + (1 - cel) * 20}deg) rotateX(4deg) rotate(-2deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'cargo', em: a.ini - 6 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Etiqueta de preço balançando ------------------------------------------ */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini, { damping: 6, stiffness: 70 });
  const balanco = (1 - p) * 40 + Math.sin(frame / 14) * 4;
  const conta = Math.round(interpolate(frame, [a.ini + 4, a.ini + 30], [0, 197], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));
  const seis = useMola(em(a, 0.45), { damping: 10, stiffness: 200 });
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="A trilha do seu cargo / *por R$ 197.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={96} />
      <div style={{ position: 'absolute', left: 540, top: 650, width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: -14, top: -40, width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #9AA3AE 55%, #4B5563)', boxShadow: '0 6px 10px rgba(0,0,0,0.35)', zIndex: 2 }} />
        <div style={{ position: 'absolute', left: -380, top: 0, width: 760, transformOrigin: '380px -24px', transform: `rotate(${balanco}deg)` }}>
          <svg width="760" height="140" viewBox="0 0 760 140" style={{ display: 'block' }}>
            <path d="M380 -24 L380 120" stroke="#7A4B2A" strokeWidth="9" strokeLinecap="round" />
            <path d="M380 -24 L380 120" stroke="#C99A6B" strokeWidth="4" strokeDasharray="6 8" strokeLinecap="round" />
          </svg>
          <div style={{ marginTop: -10, borderRadius: 40, clipPath: 'polygon(28% 0, 72% 0, 100% 12%, 100% 100%, 0 100%, 0 12%)', background: 'linear-gradient(180deg, #FFFFFF, #F3F5F7)', padding: '40px 40px 50px', boxShadow: '0 40px 70px rgba(0,0,0,0.3)', filter: 'drop-shadow(0 34px 40px rgba(0,0,0,0.28))', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 344, top: 18, width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #B8BFC8 50%, #6B7280)', boxShadow: '0 3px 6px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'absolute', inset: 18, borderRadius: '50%', background: '#8FCB5C', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, marginTop: 70 }}>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 100, color: cor.laranja, marginTop: 40 }}>R$</div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 1, color: cor.tinta, fontVariantNumeric: 'tabular-nums', textShadow: Array.from({ length: 8 }, (_, k) => `0 ${k + 1}px 0 #C9CED6`).join(', ') + ', 0 16px 20px rgba(0,0,0,0.15)' }}>{conta}</div>
            </div>
            <div style={{ display: 'inline-block', marginTop: 10, background: `linear-gradient(180deg, ${cor.laranjaVivo}, ${cor.laranja})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), 0 8px 0 #A8380B, 0 18px 26px rgba(0,0,0,0.25)', color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 50, whiteSpace: 'nowrap', padding: '16px 30px', borderRadius: 26, transform: `scale(${interpolate(seis, [0, 1], [1.8, 1])})`, opacity: Math.min(1, seis * 3) }}>
              6x de R$ 32,83 sem juros
            </div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 38, color: cor.vermelho, marginTop: 24, opacity: interpolate(frame, [em(a, 0.8), em(a, 0.8) + 10], [0, 1], limita) }}>Até 5/12 · depois, R$ 297</div>
          </div>
        </div>
      </div>
      <Efeito nome="whoosh" em={a.ini} volume={0.35} />
      <Efeito nome="ding" em={a.ini + 30} volume={0.45} />
      <Efeito nome="pop" em={em(a, 0.45)} volume={0.45} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 7. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <FechoPalmital manchete="Confira o / *seu cargo.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
