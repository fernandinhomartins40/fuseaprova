import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cores } from '../contagem';
import { Cabeca, em } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { FechoVivo, FundoVivo } from '../vivo';

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
      <div style={{ position: 'absolute', left: 250, top: 640, width: 580, height: 440, borderRadius: 120, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', transform: `scale(${balao}) rotate(${-3 + Math.sin(frame / 20) * 1.5}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 220, lineHeight: 1, color: [cor.laranjaVivo, cor.teal, cor.roxo][i], transform: `translateY(${Math.sin(frame / 5 + i * 1.3) * 16}px)` }}>
            ?
          </div>
        ))}
        <div style={{ position: 'absolute', left: 90, bottom: -60, width: 0, height: 0, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderTop: `80px solid ${cor.branco}`, transform: 'rotate(20deg)' }} />
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
    <div style={{ position: 'relative', width: 760, padding: '110px 50px 50px', borderRadius: 40, background: '#C98A4B', boxShadow: '0 40px 70px rgba(0,0,0,0.35)', transform: `translateY(${(1 - p) * 1300}px) rotate(${2 + Math.sin(frame / 30)}deg)` }}>
      <div style={{ position: 'absolute', left: 240, top: -30, width: 280, height: 100, borderRadius: 24, background: '#9AA3AE', boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.2)' }} />
      <div style={{ background: cor.branco, borderRadius: 20, padding: '40px 40px 30px' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 4, color: cor.muted, marginBottom: 20 }}>REQUISITOS DO CARGO</div>
        {itens.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '22px 0', borderTop: i ? '3px solid #EEF0F3' : 'none' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, border: `6px solid ${cor.tinta}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 52, color: cor.coral, opacity: interpolate(frame, [t0 + 20 + i * 8, t0 + 26 + i * 8], [0, 1], limita) }}>
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
    <div style={{ width: 760, height: 420, borderRadius: 40, padding: 44, background: `linear-gradient(135deg, ${cor1}, ${cor2})`, boxShadow: '0 40px 70px rgba(0,0,0,0.35)', display: 'flex', gap: 40, alignItems: 'center', transform: `perspective(1400px) rotateY(${interpolate(p, [0, 1], [90, 0])}deg) rotate(${giro + Math.sin(frame / 25) * 1}deg)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ width: 230, height: 290, borderRadius: 26, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icone}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, lineHeight: 1, color: cor.branco }}>{titulo}</div>
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
      <Cabeca texto="Sem conferir: / *meses à toa.*" em={a.ini} tamanho={110} />
      {MESES.map((m, i) => {
        const t0 = a.ini + 6 + i * 12;
        const q = interpolate(frame, [t0, t0 + 26], [0, 1], { ...limita, easing: (x) => x * x });
        return (
          <div key={m} style={{ position: 'absolute', left: 540 - 140 + (i - 1) * 90 * (1 - q), top: interpolate(q, [0, 1], [640, 1180]), width: 280, borderRadius: 26, overflow: 'hidden', background: cor.branco, boxShadow: '0 20px 40px rgba(0,0,0,0.3)', transform: `rotate(${(i - 1) * 14 + q * 160 * (i % 2 ? 1 : -1)}deg) scale(${1 - q * 0.55})`, opacity: q >= 1 ? 0 : 1 }}>
            <div style={{ background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 40, letterSpacing: 6, textAlign: 'center', padding: '10px 0' }}>{m}</div>
            <div style={{ height: 180, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, padding: 20 }}>
              {Array.from({ length: 15 }, (_, k) => (
                <div key={k} style={{ borderRadius: 6, background: '#E5E7EB' }} />
              ))}
            </div>
          </div>
        );
      })}
      <Em y={1250}>
        <svg width="380" height="420" viewBox="0 0 38 42">
          <rect x="3" y="2" width="32" height="5" rx="2" fill={cor.branco} />
          <rect x="14" y="0" width="10" height="3" rx="1.5" fill={cor.branco} />
          <path d="M6 9h26l-2.5 31h-21z" fill="rgba(255,255,255,0.92)" />
          {[13, 19, 25].map((x) => (
            <path key={x} d={`M${x} 14v20`} stroke={cor.roxo} strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>
      </Em>
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
  const cel = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Escolha o cargo. / *Veja o que pede.*" em={a.ini} sobre="No Fuse Aprova" tamanho={100} faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 300, top: 650, transform: `translateY(${(1 - cel) * 1200}px) rotate(-3deg)` }}>
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
      <Cabeca texto="Tudo por / *R$ 197.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={120} />
      <div style={{ position: 'absolute', left: 540, top: 560, width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: -6, top: -30, width: 12, height: 12, borderRadius: '50%', background: cor.tinta }} />
        <div style={{ position: 'absolute', left: -380, top: 0, width: 760, transformOrigin: '380px -24px', transform: `rotate(${balanco}deg)` }}>
          <svg width="760" height="140" viewBox="0 0 760 140" style={{ display: 'block' }}>
            <path d="M380 -24 L160 140 M380 -24 L600 140" stroke={cor.tinta} strokeWidth="5" />
          </svg>
          <div style={{ marginTop: -10, borderRadius: 50, background: cor.branco, padding: '40px 40px 50px', boxShadow: '0 40px 70px rgba(0,0,0,0.3)', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 350, top: 24, width: 60, height: 60, borderRadius: '50%', background: '#9FD86B', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.25)' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, marginTop: 70 }}>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 100, color: cor.laranja, marginTop: 40 }}>R$</div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 1, color: cor.tinta, fontVariantNumeric: 'tabular-nums' }}>{conta}</div>
            </div>
            <div style={{ display: 'inline-block', marginTop: 10, background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 50, whiteSpace: 'nowrap', padding: '16px 30px', borderRadius: 26, transform: `scale(${interpolate(seis, [0, 1], [1.8, 1])})`, opacity: Math.min(1, seis * 3) }}>
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
      <FechoVivo manchete="Confira o / *seu cargo.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
