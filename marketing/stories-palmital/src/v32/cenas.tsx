import React from 'react';
import { Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { Pessoa } from '../v8/pecas';
import { FundoVivo } from '../vivo';

// V32 · sábado 28/11 · "Dois candidatos" — dois rostos que se separam; pista vista de cima (pilha de livros × bandeira
// da trilha); grade dos 49 cargos que acende até sobrar "o seu"; a trilha no app; escada de dois degraus. Voz Raquel.

const A = { cabelo: '#1E1F25', camisa: cor.azulNoite, pele: '#E0AC84' };
const B = { cabelo: '#3B2416', camisa: cor.laranjaVivo, pele: '#B97A50', longo: true };

/* 1. Dois candidatos, um foco certo --------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const separa = interpolate(frame, [em(a, 0.55), em(a, 0.75)], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const pa = useMola(a.ini, { damping: 12, stiffness: 140 });
  const pb = useMola(a.ini + 6, { damping: 12, stiffness: 140 });
  const foco = interpolate(frame, [em(a, 0.75), em(a, 0.75) + 10], [0, 1], limita);
  return (
    <FundoVivo paleta={cores.petroleo} duracao={duracao}>
      <Cabeca texto="2 candidatos. / *1 foco certo.*" em={a.ini} sobre="Concurso · Prefeitura de Palmital" tamanho={116} />
      <div style={{ position: 'absolute', left: 540 - 180 - separa * 140 - 170, top: 760, transform: `scale(${pa})`, opacity: 1 - foco * 0.45 }}>
        <div style={{ width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.45), rgba(255,255,255,0.08))', border: '10px solid #fff', boxShadow: '0 0 0 6px rgba(0,0,0,0.12), 0 30px 50px rgba(0,0,0,0.35)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, bottom: -10 }}>
            <Pessoa {...A} tamanho={340} humor={foco > 0 ? 'triste' : 'neutro'} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 540 + 180 + separa * 140 - 170, top: 760, transform: `scale(${pb * (1 + foco * 0.08)})` }}>
        <div style={{ width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.45), rgba(255,255,255,0.08))', border: `10px solid ${foco > 0 ? cor.ouro : '#fff'}`, boxShadow: `0 0 0 6px rgba(0,0,0,0.12), 0 30px 50px rgba(0,0,0,0.35)${foco > 0 ? `, 0 0 70px ${cor.ouro}` : ''}`, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, bottom: -10 }}>
            <Pessoa {...B} tamanho={340} humor={foco > 0 ? 'feliz' : 'neutro'} />
          </div>
        </div>
      </div>
      <Em y={1180}>
        <Surge em={em(a, 0.78)}>
          <div style={{ padding: '16px 34px', borderRadius: 999, background: cor.ouro, color: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 48 }}>Qual dos dois é você?</div>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={em(a, 0.55)} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.75)} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. A pista vista de cima ------------------------------------------------- */
const Raia: React.FC<{ y: number; progresso: number; cor1: string; pessoa: typeof A; carga: 'livros' | 'bandeira'; rotulo: string; direita?: boolean }> = ({ y, progresso, cor1, pessoa, carga, rotulo, direita }) => {
  const frame = useCurrentFrame();
  const x = 60 + progresso * 720;
  const balanca = Math.sin(frame / (carga === 'livros' ? 6 : 3)) * (carga === 'livros' ? 4 : 8);
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: 1080, height: 330 }}>
      <div style={{ position: 'absolute', left: 0, top: 40, width: 1080, height: 250, background: `radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 2px) 0 0 / 10px 10px, linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.22)), ${cor1}`, borderTop: '8px solid rgba(255,255,255,0.9)', borderBottom: '8px solid rgba(255,255,255,0.9)', boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.25), 0 20px 30px rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'absolute', left: 0, top: 161, width: 1080, height: 6, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 50px, transparent 50px 90px)' }} />
      <div style={{ position: 'absolute', ...(direita ? { right: 110 } : { left: 40 }), top: -20, padding: '8px 22px', borderRadius: 18, background: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.branco }}>{rotulo}</div>
      <div style={{ position: 'absolute', left: x, top: 60 + balanca }}>
        <Pessoa {...pessoa} tamanho={210} humor={carga === 'livros' ? 'triste' : 'feliz'} />
        {carga === 'livros' ? (
          <div style={{ position: 'absolute', left: 120, top: -60, display: 'flex', flexDirection: 'column' }}>
            {[cor.coral, cor.azul, cor.verde, cor.roxo, cor.ouro, cor.rosa].map((c, i) => (
              <div key={c} style={{ width: 120, height: 34, borderRadius: 6, background: c, marginTop: -4, transform: `rotate(${(i % 2 ? 5 : -5) + balanca}deg)` }} />
            ))}
          </div>
        ) : (
          <div style={{ position: 'absolute', left: 170, top: -40 }}>
            <div style={{ width: 8, height: 170, background: cor.tinta, borderRadius: 4 }} />
            <div style={{ position: 'absolute', left: 8, top: 0, width: 110, height: 70, background: cor.ouro, clipPath: 'polygon(0 0, 100% 25%, 90% 50%, 100% 80%, 0 100%)', transform: `skewY(${Math.sin(frame / 3) * 6}deg)` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export const CenaPista: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const lento = interpolate(frame, [a.ini, duracao], [0, 0.3], limita);
  const rapido = interpolate(frame, [em(a, 0.5), duracao - 10], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="Sem rumo / *ou com trilha?*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={116} />
      <Raia y={640} progresso={lento} cor1="#C0503F" pessoa={A} carga="livros" rotulo="Estuda tudo, sem rumo" direita />
      <Raia y={1040} progresso={rapido} cor1="#1E8C7E" pessoa={B} carga="bandeira" rotulo="Segue a trilha do cargo" />
      <div style={{ position: 'absolute', left: 990, top: 640, width: 60, height: 760, backgroundImage: `repeating-linear-gradient(0deg, ${cor.tinta} 0 30px, ${cor.branco} 30px 60px), repeating-linear-gradient(90deg, transparent 0 30px, rgba(0,0,0,0) 30px 60px)`, backgroundSize: '30px 60px', boxShadow: '0 0 0 4px rgba(255,255,255,0.6), 0 20px 30px rgba(0,0,0,0.3)' }} />
      <Efeito nome="whoosh" em={em(a, 0.5)} volume={0.4} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. 49 cargos, cada um com a sua prova ------------------------------------ */
export const CenaCargos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const fim = em(a, 0.75);
  const escolhido = 24;
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="*49 cargos.* / 49 provas." em={a.ini} tamanho={130} />
      <div style={{ position: 'absolute', left: 130, top: 660, width: 820, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 14 }}>
        {Array.from({ length: 49 }, (_, i) => {
          const t0 = a.ini + 2 + random(`c${i}`) * (fim - a.ini - 10);
          const acende = frame >= t0;
          const ele = i === escolhido && frame >= fim;
          const apaga = frame >= fim && i !== escolhido;
          return (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 20, background: ele ? 'linear-gradient(180deg, #FFE27A, #FFC233)' : acende ? 'linear-gradient(180deg, #FFFFFF, #E9ECF1)' : 'rgba(255,255,255,0.2)', boxShadow: ele ? `0 7px 0 #D99A00, 0 0 50px ${cor.ouro}` : acende ? 'inset 0 2px 0 #fff, 0 6px 0 rgba(0,0,0,0.18)' : 'none', opacity: apaga ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 36, color: ele ? cor.tinta : cor.roxo, transform: `scale(${ele ? 1.5 : 1})`, zIndex: ele ? 2 : 1 }}>
              {i + 1}
            </div>
          );
        })}
      </div>
      <Em y={1530}>
        <Surge em={fim + 4}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.ouro }}>Qual é o seu?</div>
        </Surge>
      </Em>
      <Efeito nome="ding" em={fim} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. A trilha do seu cargo no app ------------------------------------------ */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Sua trilha, / *do seu cargo.*" em={a.ini} sobre="No Fuse Aprova" tamanho={116} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200}px) rotate(4deg)` }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'cargo', em: a.ini - 8 }, { tipo: 'trilha', em: em(a, 0.55) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Escada: R$ 197 até 05/12, R$ 297 depois ------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const d1 = useMola(a.ini, { damping: 13, stiffness: 140 });
  const d2 = useMola(em(a, 0.7), { damping: 13, stiffness: 140 });
  const capi = useMola(em(a, 0.2), { damping: 10, stiffness: 160 });
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="Suba agora: / *R$ 197.*" em={a.ini} tamanho={124} />
      <div style={{ position: 'absolute', left: 80, top: 1060, width: 440, height: 360, borderRadius: '36px 36px 0 0', background: 'linear-gradient(180deg, #FFFFFF, #ECEEF2)', boxShadow: 'inset 0 4px 0 #fff, inset -14px 0 0 rgba(0,0,0,0.05), 0 40px 70px rgba(0,0,0,0.3)', transform: `translateY(${(1 - d1) * 600}px)`, padding: 34, textAlign: 'center' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.muted }}>ATÉ 05/12</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.laranja }}>R$ 197</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.tinta }}>6x de R$ 32,83</div>
      </div>
      <div style={{ position: 'absolute', left: 560, top: 820, width: 440, height: 600, borderRadius: '36px 36px 0 0', background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.8), 0 40px 70px rgba(0,0,0,0.2)', transform: `translateY(${(1 - d2) * 900}px)`, padding: 34, textAlign: 'center' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, color: cor.tinta }}>A PARTIR DE 06/12</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: cor.vermelho }}>R$ 297</div>
      </div>
      <div style={{ position: 'absolute', left: 170, top: 700, transform: `translateY(${(1 - capi) * -700}px)` }}>
        <Img src={staticFile('img/capi-celebrando.webp')} style={{ height: 360, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }} />
      </div>
      <Efeito nome="pop" em={em(a, 0.2) + 6} volume={0.45} />
      <Efeito nome="whoosh" em={em(a, 0.7)} volume={0.35} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <FechoPalmital manchete="Estude *o que cai.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
