import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, Icone, useMola } from '../componentes';
import { cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V27 · quinta 26/11 · "A resposta no edital" — lupa que revela a linha certa numa página borrada; gaveta de arquivo
// com as fichas do cargo; ampulheta virando; "Pergunte ao edital" no celular; cupom saindo da impressora. Voz Roberta.

/* 1. Regras escondidas: a lupa revela -------------------------------------- */
const LINHAS = [0.95, 0.8, 0.9, 0.7, 0.92, 0.85, 0.6, 0.9, 0.75, 0.88, 0.95, 0.66];
const DESTAQUE = 6;

const Pagina: React.FC<{ nitido: boolean }> = ({ nitido }) => (
  <div style={{ width: 760, padding: '50px 56px', background: 'linear-gradient(180deg, #FFFFFF, #F4F2EA)', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 26, boxShadow: 'inset 0 0 40px rgba(120,100,60,0.10)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '3px solid #2D2F36', paddingBottom: 10, filter: nitido ? 'none' : 'blur(5px)' }}>
      <span style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 4, color: cor.tinta }}>EDITAL · ANEXO</span>
      <span style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 22, color: cor.muted }}>Requisitos por cargo</span>
    </div>
    {LINHAS.map((w, i) =>
      i === DESTAQUE && nitido ? (
        <div key={i} style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 40, lineHeight: 1, color: cor.tinta, background: 'linear-gradient(180deg, rgba(255,226,122,0.95), rgba(255,194,51,0.95))', borderRadius: 6, padding: '6px 12px', width: 'fit-content', boxShadow: '0 2px 0 rgba(0,0,0,0.1)' }}>
          Exige CNH
        </div>
      ) : (
        <div key={i} style={{ height: 20, width: `${w * 100}%`, borderRadius: 10, background: '#C9CDD3', filter: nitido ? 'none' : 'blur(5px)' }} />
      ),
    )}
  </div>
);

export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const folha = useMola(a.ini - 6, { damping: 14, stiffness: 120 });
  const passeio = interpolate(frame, [a.ini, em(a, 0.75)], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 2 });
  const lx = interpolate(passeio, [0, 0.5, 1], [620, 400, 200]);
  const ly = interpolate(passeio, [0, 0.5, 1], [120, 640, 400]);
  const R = 180;
  return (
    <FundoCinema paleta={paletas.petroleo} duracao={duracao}>
      <Cabeca texto="Uma linha do edital / *muda seu estudo.*" em={a.ini} tamanho={96} />
      <div style={{ position: 'absolute', left: 160, top: 640, transform: `translateY(${(1 - folha) * 1300}px) perspective(1800px) rotateX(10deg) rotate(-2deg)`, borderRadius: 16 }}>
        {[3, 2, 1].map((k) => (
          <div key={k} style={{ position: 'absolute', inset: 0, borderRadius: 16, background: '#ECE9DF', transform: `translate(${k * 10}px, ${k * 12}px) rotate(${k * 1.2}deg)`, boxShadow: '0 30px 60px rgba(0,0,0,0.35)' }} />
        ))}
        <div style={{ position: 'relative', borderRadius: 16, boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <Pagina nitido={false} />
        <div style={{ position: 'absolute', left: 0, top: 0, clipPath: `circle(${R}px at ${lx}px ${ly}px)` }}>
          <div style={{ transformOrigin: `${lx}px ${ly}px`, transform: 'scale(1.22)' }}>
            <Pagina nitido />
          </div>
        </div>
        </div>
        <div style={{ position: 'absolute', left: lx - R - 26, top: ly - R - 26, width: (R + 26) * 2, height: (R + 26) * 2, borderRadius: '50%', background: 'linear-gradient(135deg, #F3F4F6, #6B7280 40%, #1F2937 60%, #D1D5DB)', WebkitMaskImage: `radial-gradient(circle, transparent ${R}px, #000 ${R + 1}px)`, filter: 'drop-shadow(0 30px 30px rgba(0,0,0,0.45))' }} />
        <div style={{ position: 'absolute', left: lx - R, top: ly - R, width: R * 2, height: R * 2, borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), rgba(255,255,255,0.06) 35%, transparent 60%)', boxShadow: 'inset 0 0 40px rgba(120,200,255,0.3)' }} />
        <div style={{ position: 'absolute', left: lx + R * 0.68, top: ly + R * 0.68, width: 70, height: 250, borderRadius: 35, background: `repeating-linear-gradient(180deg, transparent 0 34px, rgba(0,0,0,0.18) 34px 40px), linear-gradient(90deg, ${cor.laranja}, ${cor.laranjaVivo} 45%, #B4430A)`, boxShadow: '0 20px 30px rgba(0,0,0,0.4)', transformOrigin: '50% 0', transform: 'rotate(-45deg)' }} />
      </div>
      <Efeito nome="whoosh" em={a.ini - 6} volume={0.4} />
      <Efeito nome="ding" em={em(a, 0.75)} volume={0.4} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Gaveta de arquivo com as fichas --------------------------------------- */
const FICHAS: [string, string][] = [
  ['Requisitos', cor.coral],
  ['Matérias', cor.azul],
  ['Nº de questões', cor.verde],
];

export const CenaGaveta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const abre = useMola(a.ini, { damping: 15, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Cada cargo / *tem os seus.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={116} />
      <div style={{ position: 'absolute', left: 140, top: 640, width: 800 }}>
        {FICHAS.map(([t, c], i) => {
          const sobe = useMola(em(a, 0.1 + i * 0.26), { damping: 11, stiffness: 160 });
          return (
            <div key={t} style={{ position: 'absolute', left: 50 + i * 30, top: 420 - sobe * (400 - i * 135), width: 640, height: 200, borderRadius: '30px 30px 0 0', background: 'linear-gradient(180deg, #FFFFFF, #F1F2F4)', boxShadow: 'inset 0 2px 0 #fff, 0 -12px 30px rgba(0,0,0,0.16)', padding: '26px 34px', zIndex: i }}>
              <div style={{ position: 'absolute', left: 380 + i * 70, top: -44, width: 180, height: 50, borderRadius: '18px 18px 0 0', background: `linear-gradient(180deg, ${c}, ${c}CC)`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35)' }} />
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: c }}>{t}</div>
              <Efeito nome="pop" em={em(a, 0.1 + i * 0.26)} volume={0.35} />
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, top: 500 + (1 - abre) * 40, width: 800, height: 380, borderRadius: 34, background: 'linear-gradient(180deg, #8A94A3, #5B6472 40%, #444C58)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -10px 0 rgba(0,0,0,0.25), 0 50px 80px rgba(0,0,0,0.4)', zIndex: 5 }}>
          <div style={{ position: 'absolute', inset: 22, borderRadius: 22, boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.25), inset 0 3px 0 rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', left: 300, top: 70, width: 200, height: 46, borderRadius: 23, background: 'linear-gradient(180deg, #FFFFFF, #AEB5BF 55%, #7D8692)', boxShadow: '0 8px 12px rgba(0,0,0,0.35)' }} />
          <div style={{ position: 'absolute', left: 340, top: 150, width: 120, height: 70, borderRadius: 10, background: 'linear-gradient(180deg, #FFFFFF, #E8EAED)', border: '5px solid #AEB5BF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, color: cor.tinta }}>
            CARGO
          </div>
        </div>
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. Sozinho leva horas: ampulheta virando --------------------------------- */
export const CenaHoras: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const vira = interpolate(frame, [a.ini, a.ini + 16], [0, 180], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  const areia = interpolate(frame, [a.ini + 16, a.ini + 90], [1, 0.25], limita);
  const relogio = (frame - a.ini) * 18;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Sozinho: / *horas procurando.*" em={a.ini} tamanho={110} faixa={cor.branco} corFaixa={cor.coral} />
      <Em y={680}>
        <div style={{ position: 'relative', width: 420, height: 640, transform: `rotate(${vira + 180}deg)` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 420, height: 44, borderRadius: 20, background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 4px, transparent 4px 26px), linear-gradient(180deg, #A0612E, #6B3A16)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.25), 0 10px 20px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: 420, height: 44, borderRadius: 20, background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 4px, transparent 4px 26px), linear-gradient(180deg, #A0612E, #6B3A16)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.25), 0 10px 20px rgba(0,0,0,0.3)' }} />
          {[30, 375].map((x) => (
            <div key={x} style={{ position: 'absolute', left: x, top: 40, width: 16, height: 560, borderRadius: 8, background: 'linear-gradient(90deg, #6B3A16, #C07A3E 50%, #6B3A16)' }} />
          ))}
          <svg width="420" height="560" viewBox="0 0 42 56" style={{ position: 'absolute', top: 40 }}>
            <path d="M6 0 h30 C36 16, 24 22, 22 28 C24 34, 36 40, 36 56 h-30 C6 40, 18 34, 20 28 C18 22, 6 16, 6 0 z" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.6" />
            <path d="M10 4 C 12 14, 16 20, 19 25" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d={`M${21 - 13 * areia} ${28 - 22 * areia} h${26 * areia} L21 27 z`} fill={cor.ouro} />
            <path d={`M${21 - 14 * (1 - areia) - 1} 55 h${28 * (1 - areia) + 2} L21 ${55 - 20 * (1 - areia)} z`} fill={cor.ouro} />
            <path d="M21 28 V55" stroke="#E2A100" strokeWidth="0.9" strokeDasharray="1.2 1" strokeDashoffset={-frame * 0.6} />
          </svg>
        </div>
      </Em>
      <div style={{ position: 'absolute', right: 90, top: 700, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #FFFFFF, #E9ECF1)', border: '12px solid #2D2F36', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.2), 0 24px 40px rgba(0,0,0,0.3)' }}>
        {Array.from({ length: 12 }, (_, k) => (
          <div key={k} style={{ position: 'absolute', left: 85, top: 2, width: 6, height: k % 3 ? 10 : 18, borderRadius: 3, background: cor.tinta, transformOrigin: '3px 86px', transform: `rotate(${k * 30}deg)` }} />
        ))}
        <div style={{ position: 'absolute', left: 96, top: 30, width: 8, height: 74, borderRadius: 4, background: cor.tinta, transformOrigin: '50% 70px', transform: `rotate(${relogio}deg)` }} />
        <div style={{ position: 'absolute', left: 95, top: 50, width: 10, height: 54, borderRadius: 5, background: cor.coral, transformOrigin: '50% 50px', transform: `rotate(${relogio / 12}deg)` }} />
      </div>
      <Efeito nome="whoosh" em={a.ini} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Pergunte ao edital no app --------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="Pergunte. / *O edital responde.*" em={a.ini} sobre="No Fuse Aprova" tamanho={104} />
      <div style={{ position: 'absolute', left: 300, top: 650, transform: `translateY(${Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${12 - (1 - cel) * 30}deg) rotateX(4deg) scale(${interpolate(cel, [0, 1], [0.6, 1])})`, opacity: Math.min(1, cel * 2) }}>
        <CelularApp largura={480} fim={duracao + 10} telas={[{ tipo: 'edital', em: a.ini - 8 }]} />
      </div>
      <div style={{ position: 'absolute', left: 60, top: 1240 }}>
        <Icone nome="icone-dica" tamanho={150} style={{ transform: `rotate(-10deg) scale(${cel})` }} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Cupom saindo da impressora -------------------------------------------- */
const ITENS_CUPOM: [string, string][] = [
  ['Preparatório Fuse Aprova', ''],
  ['Acesso até a prova', 'R$ 197,00'],
  ['Em até 6x sem juros', 'R$ 32,83'],
];

export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const imprime = interpolate(frame, [a.ini, em(a, 0.75)], [0, 1], limita);
  const altura = 580;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Tudo isso / *por R$ 197.*" em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 140, top: 620, width: 800, height: 120, borderRadius: 34, background: 'linear-gradient(180deg, #4A4D57, #24262C 60%, #15161A)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.18), 0 40px 70px rgba(0,0,0,0.45)', zIndex: 2 }}>
        <div style={{ position: 'absolute', left: 90, top: 70, width: 620, height: 16, borderRadius: 8, background: '#0F1014' }} />
        <div style={{ position: 'absolute', right: 40, top: 30, width: 24, height: 24, borderRadius: '50%', background: Math.floor(frame / 6) % 2 ? '#4ADE80' : '#166534', boxShadow: Math.floor(frame / 6) % 2 ? '0 0 16px #4ADE80' : 'none' }} />
      </div>
      <div style={{ position: 'absolute', left: 240, top: 720, width: 600, height: altura * imprime, overflow: 'hidden', zIndex: 1, filter: 'drop-shadow(0 24px 24px rgba(0,0,0,0.3))' }}>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 600, height: altura, background: 'linear-gradient(90deg, #EDEBE3, #FFFEF8 12%, #FFFEF8 88%, #EDEBE3)', padding: '40px 44px', clipPath: 'polygon(0 0, 100% 0, 100% 97%, 95% 100%, 90% 97%, 85% 100%, 80% 97%, 75% 100%, 70% 97%, 65% 100%, 60% 97%, 55% 100%, 50% 97%, 45% 100%, 40% 97%, 35% 100%, 30% 97%, 25% 100%, 20% 97%, 15% 100%, 10% 97%, 5% 100%, 0 97%)', fontFamily: "'Consolas', 'Courier New', monospace", color: cor.tinta }}>
          <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 34, letterSpacing: 3 }}>CUPOM</div>
          <div style={{ borderTop: '4px dashed #B9BCC2', margin: '24px 0' }} />
          {ITENS_CUPOM.map(([n, v]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 32, fontWeight: 700, margin: '16px 0' }}>
              <span>{n}</span>
              <span>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: '4px dashed #B9BCC2', margin: '24px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: fonte.display, fontWeight: 800, fontSize: 66, color: cor.laranja }}>
            <span>TOTAL</span>
            <span>R$ 197</span>
          </div>
          <div style={{ marginTop: 26, textAlign: 'center', fontSize: 30, fontWeight: 900, color: cor.vermelho }}>VÁLIDO ATÉ 05/12</div>
          <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 700, color: cor.muted }}>a partir de 06/12: R$ 297</div>
        </div>
      </div>
      {[0.2, 0.4, 0.6].map((f) => (
        <Efeito key={f} nome="pop" em={em(a, f)} volume={0.25} />
      ))}
      <Efeito nome="ding" em={em(a, 0.78)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <FechoPalmital manchete="Pergunte / *ao edital.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
