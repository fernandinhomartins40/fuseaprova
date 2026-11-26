import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { FundoVivo } from '../vivo';

// V34 · domingo 29/11 · "O plano da semana" — quadro de cortiça SEG–SÁB; post-its de treino voando para os dias;
// revisão em todo dia e simulado no sábado; plano pronto no app; o preço num post-it gigante. Voz Ana Alice.

const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MAO = "'Segoe Print', 'Comic Sans MS', cursive";

type Fases = { treinos: number[]; revisoes: number[]; simulado: number };
const NUNCA: Fases = { treinos: [], revisoes: [], simulado: 99999 };

const PostIt: React.FC<{ em: number; cor1: string; texto: string; de: number; alto?: number }> = ({ em: t0, cor1, texto, de, alto = 110 }) => {
  const p = useMola(t0, { damping: 13, stiffness: 160 });
  return (
    <div style={{ height: alto, borderRadius: 6, background: cor1, boxShadow: '0 8px 14px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: MAO, fontWeight: 700, fontSize: 30, lineHeight: 1.1, color: cor.tinta, padding: 6, whiteSpace: 'pre-line', transform: `translate(${(1 - p) * de}px, ${(1 - p) * -500}px) rotate(${(1 - p) * 40 + (de > 0 ? 2 : -2)}deg)`, opacity: p > 0.02 ? 1 : 0 }}>
      {texto}
    </div>
  );
};

/** Quadro de cortiça com os seis dias; os post-its entram nos quadros dados em `f`. */
const Quadro: React.FC<{ entra: number; f: Fases }> = ({ entra, f }) => {
  const p = useMola(entra, { damping: 14, stiffness: 120 });
  return (
    <div style={{ width: 960, padding: 26, borderRadius: 30, background: '#B07A47', border: '22px solid #6B4423', boxShadow: '0 40px 70px rgba(0,0,0,0.35)', backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 2px, transparent 3px)', backgroundSize: '18px 18px', transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
        {DIAS.map((d, i) => (
          <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 330 }}>
            <div style={{ background: cor.branco, borderRadius: 8, textAlign: 'center', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, color: i === 5 ? cor.roxo : cor.tinta, padding: '6px 0' }}>{d}</div>
            {i < 5 && f.treinos[i] !== undefined ? <PostIt em={f.treinos[i]} cor1="#FFD54A" texto={'Treino\n5 min'} de={(i - 2) * 120} /> : null}
            {f.revisoes[i] !== undefined ? <PostIt em={f.revisoes[i]} cor1="#8FD3FF" texto="Revisão" de={(i - 2) * 100} alto={90} /> : null}
            {i === 5 ? <PostIt em={f.simulado} cor1="#C4A7FF" texto="Simulado" de={300} alto={210} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/* 1. Domingo: monte a semana ----------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Monte a sua / *semana de estudo.*" em={a.ini} sobre="Domingo" corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={104} tintaSobre={cor.tinta} />
      <Em y={680}>
        <Quadro entra={a.ini} f={NUNCA} />
      </Em>
      <Efeito nome="whoosh" em={a.ini} volume={0.35} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 2. Seg a sex: treino de 5 minutos ---------------------------------------- */
export const CenaTreinos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const treinos = [0, 1, 2, 3, 4].map((i) => em(a, 0.3 + i * 0.1));
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="Seg a sex: / *5 minutos.*" em={a.ini} tamanho={124} />
      <Em y={680}>
        <Quadro entra={-40} f={{ ...NUNCA, treinos }} />
      </Em>
      {treinos.map((t) => (
        <Efeito key={t} nome="pop" em={t + 8} volume={0.3} />
      ))}
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Revisão todo dia, simulado no sábado ---------------------------------- */
export const CenaRevisao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const revisoes = DIAS.map((_, i) => em(a, 0.08 + i * 0.07));
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="Revisão todo dia. / *Sábado: simulado.*" em={a.ini} tamanho={98} />
      <Em y={680}>
        <Quadro entra={-40} f={{ treinos: [-30, -30, -30, -30, -30], revisoes, simulado: em(a, 0.7) }} />
      </Em>
      {revisoes.map((t) => (
        <Efeito key={t} nome="pop" em={t + 8} volume={0.25} />
      ))}
      <Efeito nome="ding" em={em(a, 0.7) + 8} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Plano pronto no app --------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Plano *pronto* / no app." em={a.ini} sobre="No Fuse Aprova" tamanho={124} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `scale(${interpolate(cel, [0, 1], [0.5, 1])}) rotate(${(1 - cel) * 30 + 3}deg)`, opacity: Math.min(1, cel * 2) }}>
        <CelularApp largura={480} fim={duracao + 20} telas={[{ tipo: 'trilha', em: a.ini - 8 }, { tipo: 'licao', em: em(a, 0.55) }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Post-it gigante com o preço ------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 4, { damping: 11, stiffness: 120 });
  const tacha = useMola(a.ini + 10, { damping: 8, stiffness: 240 });
  const escrita = (de: number) => interpolate(frame, [de, de + 14], [0, 100], limita);
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="Anota aí: / *até 5/12.*" em={a.ini} tamanho={124} />
      <Em y={640}>
        <div style={{ position: 'relative', width: 720, height: 720, background: '#FFD54A', boxShadow: '0 40px 70px rgba(0,0,0,0.35)', transform: `translateY(${(1 - p) * 900}px) rotate(${-4 + (1 - p) * 20}deg)`, padding: '90px 60px', display: 'flex', flexDirection: 'column', gap: 30, fontFamily: MAO, color: cor.tinta }}>
          <div style={{ position: 'absolute', left: 330, top: -30, width: 60, height: 60, borderRadius: '50%', background: cor.vermelho, boxShadow: 'inset -6px -6px 0 rgba(0,0,0,0.25), 0 8px 12px rgba(0,0,0,0.3)', transform: `scale(${tacha})` }} />
          <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, clipPath: `inset(0 ${100 - escrita(a.ini + 6)}% 0 0)` }}>R$ 197</div>
          <div style={{ fontSize: 62, fontWeight: 700, clipPath: `inset(0 ${100 - escrita(em(a, 0.4))}% 0 0)` }}>6x de R$ 32,83</div>
          <div style={{ fontSize: 50, fontWeight: 700, color: cor.vermelho, clipPath: `inset(0 ${100 - escrita(em(a, 0.75))}% 0 0)` }}>sem juros · até 05/12</div>
        </div>
      </Em>
      <ChipData em={em(a, 0.85)} y={1460} texto="Depois, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="pop" em={a.ini + 10} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <FechoPalmital manchete="Comece / *na segunda.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
