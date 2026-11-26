import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores, Placa } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { Pessoa } from '../v8/pecas';
import { FundoVivo } from '../vivo';

// V28 · quinta 26/11 · "Na fila do banco" — a fila anda sob o painel de senha e a última pessoa estuda no celular;
// apostila e "2h" riscados; cronômetro de 5:00 com cinco bolinhas; a questão no app; preço no painel de senha. Voz Ana Alice.

/* 1. A fila do banco ------------------------------------------------------- */
const FILA = [
  { cabelo: '#2B1B12', camisa: cor.azul, pele: '#C98B5E' },
  { cabelo: '#6B4226', camisa: cor.coral, pele: '#E0AC84', longo: true },
  { cabelo: '#1E1F25', camisa: cor.verde, pele: '#8D5A3B' },
  { cabelo: '#3B2416', camisa: cor.ouro, pele: '#B97A50', longo: true },
];

export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const anda = interpolate(frame, [a.ini + 20, a.ini + 34], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 2 });
  const brilho = 0.6 + Math.sin(frame / 5) * 0.4;
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="Estudar na / *fila do banco?*" em={a.ini} tamanho={116} />
      <div style={{ position: 'absolute', right: 80, top: 640, padding: '18px 30px', borderRadius: 22, background: 'linear-gradient(180deg, #1B1F26, #07080A)', border: '6px solid #3B414C', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 0 24px rgba(255,77,61,0.15), 0 24px 44px rgba(0,0,0,0.45)' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#8A9099' }}>SENHA</div>
        <div style={{ fontFamily: "'Consolas', monospace", fontWeight: 900, fontSize: 90, lineHeight: 1, color: '#FF4D3D', textShadow: '0 0 20px #FF4D3D' }}>{frame < a.ini + 20 ? '046' : '047'}</div>
      </div>
      <div style={{ position: 'absolute', left: -200, top: 1440, width: 1480, height: 600, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 160px), repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0 4px, transparent 4px 90px), linear-gradient(180deg, #2A7F88, #0B4A52)', transformOrigin: '50% 0', transform: 'perspective(900px) rotateX(58deg)', boxShadow: 'inset 0 30px 40px rgba(0,0,0,0.25)' }} />
      {FILA.map((f, i) => {
        const x = 60 + i * 250 - anda * 250;
        const entra = useMola(a.ini - 6 + i * 4, { damping: 13, stiffness: 140 });
        const passo = Math.abs(Math.sin((frame - a.ini - 20) / 2.2)) * 16 * (anda > 0 && anda < 1 ? 1 : 0);
        const ultimo = i === FILA.length - 1;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: 960 - passo, opacity: x < -100 ? 0 : 1, transform: `translateY(${(1 - entra) * 700}px)` }}>
            <Pessoa {...f} tamanho={300} humor={ultimo ? 'feliz' : 'neutro'} />
            <div style={{ width: 170, height: 210, margin: '-30px auto 0', borderRadius: '40px 40px 14px 14px', background: `linear-gradient(90deg, rgba(0,0,0,0.25), rgba(255,255,255,0.12) 40%, rgba(0,0,0,0.2)), ${f.camisa}`, boxShadow: '0 20px 24px rgba(0,0,0,0.3)' }} />
            {ultimo ? (
              <div style={{ position: 'absolute', left: 175, top: 210, width: 90, height: 160, borderRadius: 16, background: '#15161A', border: '6px solid #15161A', transform: 'rotate(-14deg)', boxShadow: `0 0 ${40 * brilho}px ${cor.ouro}` }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 10, background: cor.laranjaSoft, display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
                  {[1, 0.7, 0.85, 0.6].map((w, k) => (
                    <div key={k} style={{ height: 12, width: `${w * 100}%`, borderRadius: 6, background: k === 0 ? cor.laranjaVivo : '#D8DBE0' }} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <Efeito nome="ding" em={a.ini + 20} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Sem apostila, sem 2 horas --------------------------------------------- */
const Riscado: React.FC<{ em: number; children: React.ReactNode }> = ({ em: t0, children }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 12, stiffness: 140 });
  const x = interpolate(frame, [t0 + 14, t0 + 24], [0, 1], limita);
  return (
    <div style={{ position: 'relative', transform: `scale(${p})` }}>
      {children}
      <svg width="420" height="420" viewBox="0 0 100 100" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -210, marginTop: -210 }}>
        <path d="M12 12 L88 88 M88 12 L12 88" stroke={cor.vermelho} strokeWidth="6" strokeLinecap="round" opacity={0.9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - x} />
      </svg>
      <Efeito nome="pop" em={t0 + 14} volume={0.45} />
    </div>
  );
};

export const CenaSem: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="Sem apostila. / *Sem 2h livres.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={110} />
      <div style={{ position: 'absolute', left: 0, top: 760, width: 1080, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <Riscado em={a.ini + 2}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {[cor.azul, cor.coral, cor.roxo, cor.verde].map((c, i) => (
              <div key={c} style={{ position: 'relative', width: 340 - i * 14, height: 74, borderRadius: 10, background: `linear-gradient(180deg, rgba(255,255,255,0.25), rgba(0,0,0,0.15)), ${c}`, marginTop: i ? -6 : 0, transform: `rotate(${(i % 2 ? 3 : -3)}deg)`, boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.2), 0 10px 14px rgba(0,0,0,0.25)' }}>
                <div style={{ position: 'absolute', right: 10, top: 10, bottom: 14, width: 24, borderRadius: 4, background: 'repeating-linear-gradient(180deg, #FFFDF5 0 3px, #E6E1D3 3px 5px)' }} />
                <div style={{ position: 'absolute', left: 30, top: 0, bottom: 0, width: 14, background: 'rgba(255,255,255,0.25)' }} />
              </div>
            ))}
          </div>
        </Riscado>
        <Riscado em={em(a, 0.5)}>
          <div style={{ width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #FFFFFF, #E6E9EE)', border: '14px solid #2D2F36', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 130, color: cor.tinta, boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.18), 0 26px 44px rgba(0,0,0,0.28)' }}>2h</div>
        </Riscado>
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. Cronômetro de 5:00 com cinco bolinhas --------------------------------- */
export const CenaTreino: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const anel = interpolate(frame, [a.ini, a.ini + 90], [1, 0.82], limita);
  const segundos = Math.max(0, 300 - Math.floor(Math.max(0, frame - a.ini) * 0.5));
  const p = useMola(a.ini - 6, { damping: 12, stiffness: 130 });
  const R = 260;
  const C = 2 * Math.PI * R;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="*5 minutos.* / 5 questões." em={a.ini} tamanho={130} />
      <Em y={740}>
        <div style={{ position: 'relative', width: 600, height: 600, transform: `scale(${p})`, filter: 'drop-shadow(0 34px 40px rgba(0,0,0,0.35))' }}>
          <div style={{ position: 'absolute', left: 260, top: -70, width: 80, height: 60, borderRadius: 14, background: 'linear-gradient(180deg, #F3F4F6, #8B93A0)' }} />
          <div style={{ position: 'absolute', left: 230, top: -96, width: 140, height: 36, borderRadius: 18, background: `linear-gradient(180deg, ${cor.laranjaVivo}, ${cor.laranja})`, boxShadow: '0 6px 0 #A8380B' }} />
          <svg width="600" height="600" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <defs>
              <radialGradient id="mostrador" cx="0.4" cy="0.35" r="0.7">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#E3E6EB" />
              </radialGradient>
            </defs>
            <circle cx="300" cy="300" r={R + 26} fill="#2D2F36" />
            <circle cx="300" cy="300" r={R} fill="url(#mostrador)" stroke="rgba(0,0,0,0.12)" strokeWidth="34" />
            <circle cx="300" cy="300" r={R} fill="none" stroke={cor.ouro} strokeWidth="34" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - anel)} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 190, color: cor.tinta, fontVariantNumeric: 'tabular-nums' }}>
            {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}
          </div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 0, top: 1400, width: 1080, display: 'flex', justifyContent: 'center', gap: 34 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Surge key={i} em={em(a, 0.45 + i * 0.1)}>
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle at 38% 30%, #FFFFFF, #ECEEF2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.laranja, boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.08), 0 8px 0 #C9CED6, 0 18px 26px rgba(0,0,0,0.25)' }}>{i + 1}</div>
            <Efeito nome="pop" em={em(a, 0.45 + i * 0.1)} volume={0.3} />
          </Surge>
        ))}
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Acertou, ganha ponto; errou, vem a explicação ------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <Cabeca texto="Acertou: ponto. / *Errou: explicação.*" em={a.ini} tamanho={96} />
      <div style={{ position: 'absolute', left: 300, top: 640, transform: `translateX(${(1 - cel) * -1100}px) rotate(${(1 - cel) * -20 + 3}deg)` }}>
        <CelularApp largura={480} fim={em(a, 1) + 30} telas={[{ tipo: 'questao', em: a.ini - 8 }, { tipo: 'erro', em: em(a, 0.5) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Preço no painel de senha ---------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Sua vez: / *R$ 197.*" em={a.ini} tamanho={130} />
      <Em y={680}>
        <div style={{ padding: '40px 50px 50px', borderRadius: 50, background: 'linear-gradient(180deg, #1B1F26, #07080A)', border: '10px solid #3B414C', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.12), 0 0 0 4px #1F2329, 0 50px 90px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 6, color: '#8A9099' }}>FUSE APROVA · ATÉ 05/12</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 110, color: cor.ouro }}>R$</div>
            {['1', '9', '7'].map((d, i) => (
              <Placa key={i} de="0" para={d} em={a.ini + 6 + i * 6} entra={a.ini - 4} largura={180} altura={250} />
            ))}
          </div>
        </div>
      </Em>
      <ChipData em={em(a, 0.45)} y={1180} texto="Em até 6x de R$ 32,83 sem juros" fundo={cor.ouro} tinta={cor.tinta} tamanho={40} />
      <ChipData em={em(a, 0.8)} y={1300} texto="A partir de 06/12: R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <FechoPalmital manchete="Estude *na fila.*" em={a.ini} len={a.fim - a.ini} tinta={cor.tinta} />
    </FundoVivo>
  );
};
