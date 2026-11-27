import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, PropsCena } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { OfertaDupla } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, type Paleta, paletas, Surge } from '../v8/cinema';
import { GRADE, Palco, type Tela } from '../v47/grade';

// V48 · "As 5 coisas", versão 2 (voz Larissa) — mesma linha do V47, outro vídeo: noite de cinema com dourado e cinco
// cartas viradas; cada benefício revela uma carta; a 5ª é a dourada, que vira verde com o Pix. Oferta em bilhete.

const OURO = '#F5C451';
const VERDE = '#22C55E';
const CARTAS = [
  { cor: '#1BAFBC', icone: 'icone-alvo', rotulo: 'Seu cargo' },
  { cor: '#FF6A1F', icone: 'icone-especificos', rotulo: '+10 mil' },
  { cor: '#F0484D', icone: 'icone-revisao', rotulo: 'Revisão' },
  { cor: '#8B5CF6', icone: 'icone-simulados', rotulo: 'Simulado' },
  { cor: VERDE, icone: 'icone-pix', rotulo: 'Na hora' },
];

/** Carta de baralho: verso azul-noite com moldura dourada; `virada` de 0 (verso) a 1 (frente). */
const Carta: React.FC<{ k: number; virada: number; l?: number; brilho?: boolean }> = ({ k, virada, l = 220, brilho }) => {
  const frame = useCurrentFrame();
  const h = l * 1.45;
  const frente = virada >= 0.5;
  const c = CARTAS[k];
  const pulso = 0.5 + 0.5 * Math.sin(frame / 6);
  return (
    <div style={{ width: l, height: h, transform: `perspective(1200px) rotateY(${(frente ? 1 - virada : virada) * 180 * (frente ? -1 : 1)}deg)` }}>
      {frente ? (
        <div style={{ width: '100%', height: '100%', borderRadius: l * 0.09, background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 50%), ${c.cor}`, border: `${l * 0.03}px solid #fff`, boxShadow: `0 ${l * 0.1}px ${l * 0.2}px rgba(0,0,0,0.45), 0 0 ${l * 0.25}px ${c.cor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: `${l * 0.07}px 0 ${l * 0.09}px`, boxSizing: 'border-box' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: l * 0.3, lineHeight: 1, color: '#fff', textShadow: '0 3px 0 rgba(0,0,0,0.2)' }}>{k + 1}</div>
          <Img src={staticFile(`img/${c.icone}.webp`)} style={{ width: l * 0.48, height: l * 0.48, objectFit: 'contain', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))' }} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: l * 0.13, color: '#fff', whiteSpace: 'nowrap' }}>{c.rotulo}</div>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', borderRadius: l * 0.09, background: `repeating-linear-gradient(45deg, rgba(245,196,81,0.10) 0 ${l * 0.04}px, transparent ${l * 0.04}px ${l * 0.08}px), linear-gradient(160deg, #1E2A55, #0B1024)`, border: `${l * 0.03}px solid ${OURO}`, boxShadow: brilho ? `0 ${l * 0.1}px ${l * 0.2}px rgba(0,0,0,0.5), 0 0 ${l * 0.35 * pulso + 10}px ${OURO}` : `0 ${l * 0.1}px ${l * 0.2}px rgba(0,0,0,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: l * 0.42, color: OURO, textShadow: `0 0 ${l * 0.1}px rgba(245,196,81,0.6)` }}>{brilho ? '?' : '★'}</div>
        </div>
      )}
    </div>
  );
};

/** Virada da carta entre os quadros t e t+14. */
const useVira = (t: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [t, t + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => x * x * (3 - 2 * x) });
};

/** Fileira de cinco cartinhas (marcador do número): as anteriores abertas, a `n`ª vira no quadro `em`. */
const Fileira: React.FC<{ n: number; em: number; todas?: boolean }> = ({ n, em: t0, todas }) => {
  const vira = useVira(t0);
  return (
    <div style={{ position: 'absolute', left: 0, top: GRADE.marcador - 58, width: 1080, display: 'flex', justifyContent: 'center', gap: 22 }}>
      {CARTAS.map((_, k) => (
        <Carta key={k} k={k} l={80} virada={todas || k < n - 1 ? 1 : k === n - 1 ? vira : 0} brilho={k === 4} />
      ))}
    </div>
  );
};

/** Leque de cinco cartas viradas, centrado em `topo`; `abertas` delas de frente, a 5ª brilhando. */
const Leque: React.FC<{ topo: number; abertas: number; entra: number; l?: number }> = ({ topo, abertas, entra, l = 210 }) => {
  const p = useMola(entra, { damping: 14, stiffness: 110 });
  return (
    <div style={{ position: 'absolute', left: 0, top: topo, width: 1080, height: l * 1.6, display: 'flex', justifyContent: 'center' }}>
      {CARTAS.map((_, k) => {
        const ang = (k - 2) * 13 * p;
        return (
          <div key={k} style={{ position: 'absolute', left: 540 - l / 2, top: k === 4 ? -24 * p : 0, transformOrigin: '50% 140%', transform: `rotate(${ang}deg) translateY(${(1 - p) * 600}px)` }}>
            <Carta k={k} l={l} virada={k < abertas ? 1 : 0} brilho={k === 4} />
          </div>
        );
      })}
    </div>
  );
};

/** Linha de texto com marcador dourado (lista da direita), sem caixa branca. */
const Linha: React.FC<{ texto: string; em: number; marca?: string }> = ({ texto, em: t0, marca = OURO }) => (
  <Surge em={t0} de="direita">
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 18, borderBottom: '2px solid rgba(255,255,255,0.14)' }}>
      <div style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: marca, boxShadow: `0 0 16px ${marca}` }} />
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 40, lineHeight: 1.1, color: cor.branco }}>{texto}</div>
    </div>
    <Efeito nome="pop" em={t0} volume={0.3} />
  </Surge>
);

const Centro: React.FC<{ topo: number; children: React.ReactNode }> = ({ topo, children }) => (
  <div style={{ position: 'absolute', left: 0, top: topo, width: 1080, display: 'flex', justifyContent: 'center' }}>{children}</div>
);

/* 1. Cinco cartas; a 5ª surpreende ------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const selo = useMola(em(a, 0.62), { damping: 9, stiffness: 190 });
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Cabeca texto="*5 coisas* que quem / estuda sozinho não faz." em={a.ini} tamanho={92} />
      <Leque topo={700} abertas={0} entra={a.ini - 6} />
      <Centro topo={1110}>
        <div style={{ padding: '14px 32px', borderRadius: 999, border: `3px solid ${OURO}`, background: 'rgba(245,196,81,0.12)', fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: OURO, transform: `scale(${selo})` }}>A 5ª surpreende</div>
      </Centro>
      <Centro topo={1230}>
        <Surge em={em(a, 0.3)}>
          <Img src={staticFile('img/capi-boas-vindas.webp')} style={{ height: 380, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.5))' }} />
        </Surge>
      </Centro>
      <Efeito nome="whoosh" em={a.ini - 6} volume={0.35} />
      <Efeito nome="pop" em={em(a, 0.62)} volume={0.5} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2 a 5. Uma carta por benefício: celular à esquerda, carta e lista à direita ---- */
type Linhas = (f: PropsCena['falas']) => { texto: string; em: number }[];
const cenaCarta = (n: number, paleta: Paleta, titulo: string, telas: (f: PropsCena['falas']) => Tela[], linhas: Linhas): React.FC<PropsCena> => {
  const Cena: React.FC<PropsCena> = ({ falas, duracao }) => {
    const [a] = falas;
    const vira = useVira(a.ini + 4);
    return (
      <FundoCinema paleta={paleta} duracao={duracao}>
        <Cabeca texto={titulo} em={a.ini} tamanho={100} />
        <Fileira n={n} em={a.ini + 4} />
        <Palco telas={telas(falas)} fim={duracao + 30} entra={a.ini - 4} lado="esquerda">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Carta k={n - 1} l={200} virada={vira} />
          </div>
          {linhas(falas).map((it) => (
            <Linha key={it.texto} texto={it.texto} em={it.em} />
          ))}
        </Palco>
        <Efeito nome="whoosh" em={a.ini + 4} volume={0.3} />
        <Aviso />
      </FundoCinema>
    );
  };
  return Cena;
};

export const CenaUm = cenaCarta(
  1,
  paletas.petroleo,
  '*1.* Só o que cai / no seu cargo.',
  ([a]) => [{ tipo: 'cargo', em: a.ini - 4 }, { tipo: 'trilha', em: em(a, 0.5) }],
  ([a]) => [
    { texto: 'Só o seu cargo', em: em(a, 0.3) },
    { texto: 'Trilha pelo edital', em: em(a, 0.65) },
  ],
);

export const CenaDois = cenaCarta(
  2,
  paletas.oferta,
  '*2.* +10 mil questões / no estilo da FAU.',
  ([a]) => [{ tipo: 'questao', em: a.ini - 4 }],
  ([a]) => [
    { texto: 'Estilo da FAU', em: em(a, 0.4) },
    { texto: 'A banca de Palmital', em: em(a, 0.65) },
  ],
);

export const CenaTres = cenaCarta(
  3,
  paletas.alerta,
  '*3.* Errou? / *Entende o porquê.*',
  ([a, b]) => [{ tipo: 'erro', em: a.ini - 4 }, { tipo: 'revisao', em: b.ini - 4 }],
  ([a, b]) => [
    { texto: 'Explicação e mini-aula', em: em(a, 0.5) },
    { texto: 'O erro volta na hora certa', em: b.ini + 4 },
  ],
);

export const CenaQuatro = cenaCarta(
  4,
  paletas.verde,
  '*4.* Simulado no / *formato da prova.*',
  ([a]) => [{ tipo: 'simulado', em: a.ini - 4 }],
  ([a, b]) => [
    { texto: '40 questões em 4 horas', em: em(a, 0.55) },
    { texto: 'Modo treino, aos poucos', em: em(a, 0.8) },
    { texto: '10 min por dia', em: b.ini },
  ],
);

/* 6. E a 5ª? A carta dourada vira verde: Pix ou cartão, na hora ---------------- */
export const CenaCinco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const depois = frame >= b.ini;
  const vira = useVira(b.ini + 4);
  return (
    <FundoCinema paleta={depois ? paletas.verde : paletas.palco} duracao={duracao}>
      <div key={depois ? 1 : 0}>
        <Cabeca texto={depois ? '*5.* Começar leva / *1 minuto.*' : 'E a *5ª*?'} em={depois ? b.ini : a.ini} tamanho={depois ? 100 : 150} />
      </div>
      {depois ? (
        <>
          <Fileira n={5} em={b.ini + 4} />
          <Palco telas={[{ tipo: 'pagamento', em: em(b, 0.1) }]} fim={duracao + 30} entra={em(b, 0.1)} lado="esquerda">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Carta k={4} l={200} virada={vira} brilho />
            </div>
            <Linha texto="Pix: acesso na hora" em={em(b, 0.3)} marca={VERDE} />
            <Linha texto="Cartão: acesso na hora" em={em(b, 0.42)} marca={VERDE} />
            <Linha texto="Até 6x sem juros" em={em(b, 0.7)} />
          </Palco>
          <Confetes inicio={b.ini + 18} />
        </>
      ) : (
        <>
          <Leque topo={620} abertas={4} entra={a.ini - 10} />
          <Centro topo={1080}>
            <Surge em={a.ini + 4}>
              <Img src={staticFile('img/capi-explicando.webp')} style={{ height: 480, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.5))' }} />
            </Surge>
          </Centro>
        </>
      )}
      <Efeito nome="ding" em={b.ini + 18} volume={0.55} />
      <Aviso />
    </FundoCinema>
  );
};

/* 7. Bilhete: 6x de R$ 32,83, garantia e R$ 297 depois de 5/12 ---------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const fim = frame >= c.ini;
  const gar = useMola(b.ini, { damping: 12, stiffness: 160 });
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <div key={fim ? 1 : 0}>
        <Cabeca texto={fim ? '*R$ 197* / só até 5/12.' : '*6x* de R$ 32,83 / sem juros.'} em={fim ? c.ini : a.ini} tamanho={100} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: 'scale(0.82)', transformOrigin: '540px 1000px' }}>
        <OfertaDupla rotuloHoje="Até sábado · 05/12" rotuloDepois="Depois de 05/12" tPreco={a.ini - 2} tSeis={em(a, 0.5)} tDepois={em(c, 0.55)} topo={660} />
      </div>
      <Centro topo={1440}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 28px', borderRadius: 999, border: `3px solid ${OURO}`, background: 'rgba(0,0,0,0.35)', fontFamily: fonte.display, fontWeight: 800, fontSize: 38, color: OURO, transform: `scale(${gar})` }}>7 dias de garantia · 100% de volta</div>
      </Centro>
      <Aviso />
    </FundoCinema>
  );
};

/* 8. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <FechoPalmital manchete="Sua vez: / *link na bio.*" em={a.ini} len={a.fim - a.ini} />
    </FundoCinema>
  );
};
