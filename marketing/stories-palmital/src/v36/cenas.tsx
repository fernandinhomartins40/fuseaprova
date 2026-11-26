import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Confetes, Efeito, Icone, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V36 · segunda 30/11 · "A matéria de todos" — parede de 49 portas com fechadura e a chave misteriosa; a chave
// dourada PORTUGUÊS abre todas; pódio; a trilha no app; livro que folheia até a página do preço. Voz Keren.

const Porta: React.FC<{ aberta: number; tam: number }> = ({ aberta, tam }) => (
  <div style={{ width: tam, height: tam * 1.4, borderRadius: 10, background: '#2A1A10', perspective: 400 }}>
    <div style={{ width: '100%', height: '100%', borderRadius: 10, background: aberta > 0.5 ? cor.ouro : '#8B5A33', border: '3px solid #5E3A1E', transformOrigin: '0 50%', transform: `rotateY(${-aberta * 70}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: tam * 0.14 }}>
      <div style={{ width: tam * 0.14, height: tam * 0.14, borderRadius: '50%', background: '#2A1A10' }} />
    </div>
  </div>
);

const Chave: React.FC<{ tam: number; dourada: boolean; rotulo?: string }> = ({ tam, dourada, rotulo }) => (
  <div style={{ position: 'relative' }}>
    <svg width={tam} height={tam * 0.45} viewBox="0 0 100 45" style={{ filter: dourada ? `drop-shadow(0 0 24px ${cor.ouro})` : 'none' }}>
      <circle cx="20" cy="22" r="17" fill="none" stroke={dourada ? cor.ouro : 'rgba(255,255,255,0.35)'} strokeWidth="9" />
      <path d="M36 22 H96 M78 22 V36 M90 22 V32" stroke={dourada ? cor.ouro : 'rgba(255,255,255,0.35)'} strokeWidth="9" strokeLinecap="round" />
    </svg>
    {rotulo ? (
      <div style={{ position: 'absolute', left: tam * 0.06, top: tam * 0.4, padding: '10px 24px', borderRadius: 16, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: tam * 0.1, color: cor.laranja, transform: 'rotate(-8deg)', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>{rotulo}</div>
    ) : (
      <div style={{ position: 'absolute', left: tam * 0.1, top: -tam * 0.03, fontFamily: fonte.display, fontWeight: 800, fontSize: tam * 0.25, color: cor.ouro }}>?</div>
    )}
  </div>
);

const Parede: React.FC<{ abre?: number }> = ({ abre = 99999 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14 }}>
      {Array.from({ length: 49 }, (_, i) => (
        <Porta key={i} tam={84} aberta={interpolate(frame, [abre + (i % 7) * 1.5 + Math.floor(i / 7) * 1.5, abre + (i % 7) * 1.5 + Math.floor(i / 7) * 1.5 + 8], [0, 1], limita)} />
      ))}
    </div>
  );
};

/* 1. Uma matéria em todos os cargos ---------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 14, stiffness: 120 });
  const chave = useMola(em(a, 0.6), { damping: 11, stiffness: 140 });
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Cabeca texto="Cai em / *todos os 49 cargos.*" em={a.ini} sobre="Concurso · Prefeitura de Palmital" tamanho={104} />
      <Em y={660}>
        <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`, opacity: Math.min(1, p * 2) }}>
          <Parede />
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 260, top: 900, transform: `translateY(${Math.sin(frame / 10) * 14}px) scale(${chave})` }}>
        <Chave tam={560} dourada={false} />
      </div>
      <Efeito nome="pop" em={em(a, 0.6)} volume={0.45} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. É Português: a chave abre tudo ---------------------------------------- */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const chave = useMola(a.ini - 4, { damping: 9, stiffness: 160 });
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <Cabeca texto="É *Português.*" em={a.ini} tamanho={150} />
      <Em y={620}>
        <Parede abre={a.ini + 14} />
      </Em>
      <div style={{ position: 'absolute', left: 240, top: 950, transform: `scale(${chave}) rotate(${(1 - chave) * -90}deg)` }}>
        <Chave tam={600} dourada rotulo="PORTUGUÊS" />
      </div>
      <Confetes inicio={a.ini + 14} />
      <Efeito nome="ding" em={a.ini + 4} volume={0.55} />
      <Aviso />
    </FundoCinema>
  );
};

/* 3. Sai na frente: pódio --------------------------------------------------- */
export const CenaFrente: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const blocos: [number, number, string][] = [
    [2, 300, '#C9CDD3'],
    [1, 460, cor.ouro],
    [3, 220, '#D99A6C'],
  ];
  const capi = useMola(em(a, 0.5), { damping: 9, stiffness: 150 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Vai bem nela? / *Sai na frente.*" em={a.ini} tamanho={110} />
      <div style={{ position: 'absolute', left: 120, top: 1060, height: 460, width: 840, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        {blocos.map(([n, h, c], i) => {
          const sobe = useMola(a.ini + 4 + i * 5, { damping: 13, stiffness: 140 });
          return (
            <div key={n} style={{ flex: 1, height: h * sobe, overflow: 'hidden', borderRadius: '24px 24px 0 0', background: c, display: 'flex', justifyContent: 'center', paddingTop: 20, fontFamily: fonte.display, fontWeight: 800, fontSize: 120, color: cor.tinta, boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              {n}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 410, top: 690, transform: `translateY(${(1 - capi) * -900}px)` }}>
        <Img src={staticFile('img/capi-celebrando.webp')} style={{ height: 380, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }} />
      </div>
      <div style={{ position: 'absolute', left: 60, top: 760 }}>
        <Surge em={em(a, 0.7)} de="esquerda">
          <Icone nome="icone-portugues" tamanho={170} />
        </Surge>
      </div>
      <Efeito nome="pop" em={em(a, 0.5) + 8} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. A trilha começa por ela ------------------------------------------------ */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="A trilha / *começa por ela.*" em={a.ini} sobre="No Fuse Aprova" corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={110} tintaSobre={cor.tinta} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateX(${(1 - cel) * -1100}px) rotate(-3deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'trilha', em: a.ini - 8 }, { tipo: 'questao', em: em(a, 0.5) }]} />
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. O livro folheia até o preço ------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 14, stiffness: 120 });
  const folhas = [0, 1, 2, 3];
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="*R$ 197* / em até 6x." em={a.ini} tamanho={130} />
      <Em y={680}>
        <div style={{ position: 'relative', width: 900, height: 600, transform: `scale(${p})`, perspective: 2200 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 450, height: 600, borderRadius: '20px 0 0 20px', background: '#FFFDF7', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', padding: 50, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: cor.muted }}>FUSE APROVA</div>
            {[0.9, 0.7, 0.85, 0.6, 0.8].map((w, i) => (
              <div key={i} style={{ height: 16, width: `${w * 100}%`, borderRadius: 8, background: '#E1E4E8' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', left: 450, top: 0, width: 450, height: 600, borderRadius: '0 20px 20px 0', background: '#FFFDF7', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.tinta }}>6x de R$ 32,83</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.muted }}>sem juros · até 05/12</div>
          </div>
          {folhas.map((i) => {
            const t0 = a.ini + 4 + i * 7;
            const vira = interpolate(frame, [t0, t0 + 12], [0, 180], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
            return (
              <div key={i} style={{ position: 'absolute', left: 450, top: 0, width: 450, height: 600, borderRadius: '0 20px 20px 0', background: i % 2 ? '#F6F1E4' : '#FBF8EF', transformOrigin: '0 50%', transform: `rotateY(${-vira}deg)`, backfaceVisibility: 'hidden', boxShadow: '4px 0 10px rgba(0,0,0,0.08)', zIndex: 10 - i, padding: 50 }}>
                {[0.9, 0.75, 0.85, 0.6].map((w, k) => (
                  <div key={k} style={{ height: 16, width: `${w * 100}%`, borderRadius: 8, background: '#E1E4E8', marginTop: 22 }} />
                ))}
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: 444, top: 0, width: 12, height: 600, background: 'rgba(0,0,0,0.15)', zIndex: 20 }} />
        </div>
      </Em>
      <ChipData em={em(a, 0.8)} y={1360} texto="Depois de 05/12: R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      {folhas.map((i) => (
        <Efeito key={i} nome="whoosh" em={a.ini + 4 + i * 7} volume={0.2} />
      ))}
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <FechoPalmital manchete="Domine o / *Português.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
