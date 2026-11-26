import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Carimbo, Em, limita, PropsCena } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { cores, OfertaDupla } from '../contagem';
import { Cabeca, FechoPalmital, ItemCheck } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V23 · quarta 25/11 · "A notícia" — um jornal de edição extra entra girando com a manchete borrada; o calendário
// mostra que hoje seria o último dia; o app aparece no celular; o jornal volta e a manchete fica nítida: PRORROGADO.
// Voz Davi Andrei.

const SERIFA = "Georgia, 'Times New Roman', serif";

// grão de papel: ruído fixo em SVG
const GRAO = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 0.5 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const TEXTO =
  'O preparatório para o concurso da Prefeitura de Palmital manteve o preço de lançamento por mais alguns dias. Quem ia deixar para depois ganhou uma segunda chance de começar a estudar antes da prova objetiva, com a trilha do cargo, questões no estilo da banca e simulados no formato oficial. ';

/** Jornal de edição extra com papel, dobra, colunas e foto em retícula. `nitido` tira o desfoque da manchete. */
const Jornal: React.FC<{ em: number; gira?: boolean; manchete: string; sub: string; nitido: number }> = ({ em, gira, manchete, sub, nitido }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 17, stiffness: 85 });
  const desfoque = interpolate(frame, [nitido, nitido + 12], [18, 0], limita);
  const giro = gira ? interpolate(p, [0, 1], [720, -3]) : -3 + (1 - p) * 16;
  const escala = gira ? interpolate(p, [0, 1], [0.08, 1]) : 1;
  const sobe = gira ? 0 : (1 - p) * 1400;
  const borrao = gira ? Math.max(0, (1 - p) * 10 - 1) : 0;
  const tilt = Math.sin(frame / 45) * 2;
  return (
    <div style={{ perspective: 1800 }}>
      <div
        style={{
          position: 'relative',
          width: 880,
          padding: '30px 40px 36px',
          borderRadius: 6,
          color: '#1d1b16',
          background: 'linear-gradient(100deg, #EFE5CC 0%, #FAF4E4 30%, #F4EBD5 49%, #E3D6B7 50%, #F7F0DF 51.5%, #FBF6E8 75%, #EEE3C8 100%)',
          boxShadow: 'inset 0 0 70px rgba(120,90,40,0.22), 0 2px 0 rgba(255,255,255,0.6) inset, 0 60px 90px rgba(0,0,0,0.38), 0 18px 26px rgba(0,0,0,0.25)',
          transform: `translateY(${sobe}px) rotateX(${8 + tilt}deg) rotateY(${-6 + tilt}deg) rotate(${giro}deg) scale(${escala})`,
          opacity: Math.min(1, p * 3),
          filter: borrao > 0 ? `blur(${borrao}px)` : undefined,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 6, backgroundImage: GRAO, opacity: 0.35, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SERIFA, fontWeight: 700, fontSize: 19, letterSpacing: 2, paddingBottom: 6 }}>
          <span>ANO 1 · Nº 25</span>
          <span>QUARTA-FEIRA, 25 DE NOVEMBRO DE 2026</span>
        </div>
        <div style={{ height: 2, background: '#1d1b16' }} />
        <div style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: 96, textAlign: 'center', letterSpacing: -2, lineHeight: 1.05, padding: '8px 0 4px', textShadow: '0 1px 0 rgba(0,0,0,0.15)' }}>O Candidato</div>
        <div style={{ height: 6, background: '#1d1b16', marginBottom: 3 }} />
        <div style={{ height: 2, background: '#1d1b16', marginBottom: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'linear-gradient(180deg, #E53935, #B71C1C)', color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 6, padding: '6px 18px', borderRadius: 4, boxShadow: '0 3px 0 rgba(0,0,0,0.25)' }}>EDIÇÃO EXTRA</div>
          <div style={{ fontFamily: SERIFA, fontStyle: 'italic', fontSize: 24, color: '#5a5040' }}>Concurso da Prefeitura de Palmital</div>
        </div>
        <div style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: 104, letterSpacing: -2, lineHeight: 1, margin: '14px 0 8px', filter: `blur(${desfoque}px)` }}>{manchete}</div>
        <div style={{ fontFamily: SERIFA, fontStyle: 'italic', fontSize: 36, lineHeight: 1.2, color: '#3d382d', filter: `blur(${desfoque * 0.7}px)` }}>{sub}</div>
        <div style={{ height: 1, background: 'rgba(29,27,22,0.4)', margin: '20px 0 18px' }} />
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ width: 280, flex: 'none' }}>
            <div style={{ position: 'relative', height: 230, background: 'linear-gradient(180deg, #cfc4a8, #b8ac8e)', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}>
              <Img src={staticFile('img/capi-explicando.webp')} style={{ height: 224, filter: 'grayscale(1) contrast(1.25) brightness(0.95)' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(29,27,22,0.35) 1.2px, transparent 1.6px)', backgroundSize: '6px 6px', mixBlendMode: 'multiply' }} />
            </div>
            <div style={{ fontFamily: SERIFA, fontStyle: 'italic', fontSize: 16, color: '#5a5040', marginTop: 6 }}>A Capi, mascote do Fuse Aprova.</div>
          </div>
          <div style={{ flex: 1, columnCount: 2, columnGap: 22, columnRule: '1px solid rgba(29,27,22,0.25)', fontFamily: SERIFA, fontSize: 15.5, lineHeight: 1.32, textAlign: 'justify', color: '#2c281f', height: 262, overflow: 'hidden' }}>
            {TEXTO + TEXTO}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Selo "?" em relevo que tampa a manchete até a revelação. */
const Interrogacao: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 8, stiffness: 180 });
  return (
    <div
      style={{
        position: 'relative',
        width: 210,
        height: 210,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 34% 28%, #FFF3B0 0%, #FFD54A 32%, #FFB000 70%, #C27C00 100%)',
        border: '8px solid #fff',
        boxShadow: 'inset 0 -12px 20px rgba(140,80,0,0.35), 0 24px 40px rgba(0,0,0,0.35), 0 0 0 3px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${p}) rotate(${12 + Math.sin(frame / 7) * 7}deg)`,
      }}
    >
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 160, lineHeight: 1, paddingTop: 22, color: '#3A2A00', textShadow: '0 3px 0 rgba(255,255,255,0.45), 0 -2px 0 rgba(0,0,0,0.2)' }}>?</div>
      <div style={{ position: 'absolute', left: 30, top: 18, width: 90, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', transform: 'rotate(-25deg)', filter: 'blur(2px)' }} />
    </div>
  );
};

/** Folha de calendário com espiral, cabeçalho em degradê e o dia 25 circulado com caneta. */
const Calendario: React.FC<{ em: number; circulo: number }> = ({ em, circulo }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 13, stiffness: 110 });
  const traco = interpolate(frame, [circulo, circulo + 20], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  return (
    <div style={{ perspective: 1600 }}>
      <div style={{ position: 'relative', width: 480, transform: `translateY(${(1 - p) * -1300}px) rotateX(${10 + Math.sin(frame / 40) * 2}deg) rotate(${-4 + Math.sin(frame / 32) * 1.2}deg)` }}>
        <div style={{ position: 'absolute', left: 50, right: 50, top: -26, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ width: 18, height: 54, borderRadius: 9, background: 'linear-gradient(90deg, #6b7280, #e5e7eb 45%, #9ca3af)', boxShadow: '0 3px 4px rgba(0,0,0,0.35)' }} />
          ))}
        </div>
        <div style={{ borderRadius: 34, overflow: 'hidden', background: 'linear-gradient(180deg, #FFFFFF, #F1F2F4)', boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.05), 0 40px 70px rgba(0,0,0,0.32), 0 10px 18px rgba(0,0,0,0.2)' }}>
          <div style={{ background: 'linear-gradient(180deg, #F0484D, #C81E2B)', color: cor.branco, textAlign: 'center', padding: '30px 0 14px', boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.15)' }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 52, letterSpacing: 10 }}>NOVEMBRO</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 24, letterSpacing: 6, opacity: 0.85 }}>2026</div>
          </div>
          <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 800, fontSize: 270, lineHeight: 1.05, color: cor.tinta, textAlign: 'center', textShadow: '0 6px 0 rgba(0,0,0,0.06)' }}>
            25
            <svg width="400" height="270" viewBox="0 0 100 75" style={{ position: 'absolute', left: 40, top: 14 }}>
              {[0, 1].map((k) => (
                <path
                  key={k}
                  d="M50 8 C 80 6, 94 22, 92 40 C 90 60, 68 70, 46 68 C 20 66, 6 52, 9 34 C 12 18, 32 8, 58 10"
                  fill="none"
                  stroke={k ? 'rgba(255,106,31,0.55)' : cor.laranjaVivo}
                  strokeWidth={k ? 2.2 : 3.6}
                  strokeLinecap="round"
                  transform={k ? 'rotate(3 50 38)' : undefined}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - traco}
                />
              ))}
            </svg>
          </div>
          <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 36, color: cor.muted, textAlign: 'center', paddingBottom: 26 }}>quarta-feira</div>
        </div>
        <Efeito nome="whoosh" em={em} volume={0.35} />
        <Efeito nome="pop" em={circulo} volume={0.4} />
      </div>
    </div>
  );
};

/* 1. Perdeu o prazo? Notícia boa ------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Perdeu a promoção? / *Notícia boa.*" tamanho={100} em={a.ini} sobre="Edição extra · 25/11" />
      <Em y={700}>
        <Jornal em={a.ini - 4} gira manchete="PRORROGADO!" sub="R$ 197 em até 6x sem juros vai até 5 de dezembro" nitido={99999} />
      </Em>
      <div style={{ position: 'absolute', left: 820, top: 640 }}>
        <Interrogacao em={a.ini + 18} />
      </div>
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.5} />
      <Efeito nome="pop" em={a.ini + 18} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. R$ 197 acabava hoje -------------------------------------------------- */
export const CenaUltimo: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="A promoção / *terminava hoje.*" em={a.ini} />
      <Em y={680}>
        <Calendario em={a.ini} circulo={a.ini + Math.round(len * 0.55)} />
      </Em>
      <Carimbo em={a.ini + Math.round(len * 0.85)} x={320} y={1300} texto="ÚLTIMO DIA" topo="★ R$ 197 EM ATÉ 6X ★" verde={cor.vermelho} />
      <Efeito nome="pop" em={a.ini + Math.round(len * 0.85)} volume={0.6} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Preparatório completo (o app no celular) ----------------------------- */
const ITENS = ['Trilha do seu cargo', 'Questões no estilo FAU', 'Simulado oficial'];

export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cel = useMola(a.ini - 4, { damping: 15, stiffness: 120 });
  const len = a.fim - a.ini;
  const quando = [a.ini + Math.round(len * 0.4), a.ini + Math.round(len * 0.6), a.ini + Math.round(len * 0.83)];
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Preparatório / *completo.*" em={a.ini} sobre="Concurso · Prefeitura de Palmital" faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 575, top: 650, transform: `translateX(${(1 - cel) * 900}px) translateY(${Math.sin(frame / 22) * 8}px) perspective(1600px) rotateY(${-18 + (1 - cel) * -30}deg) rotateX(5deg) rotate(3deg)` }}>
        <CelularApp
          largura={440}
          fim={duracao}
          telas={[
            { tipo: 'trilha', em: a.ini },
            { tipo: 'questao', em: quando[1] },
            { tipo: 'simulado', em: quando[2] },
          ]}
        />
      </div>
      <div style={{ position: 'absolute', left: 60, top: 920, width: 490, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {ITENS.map((t, i) => (
          <ItemCheck key={t} texto={t} em={quando[i]} />
        ))}
      </div>
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.35} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Prorrogamos até 5/12! ------------------------------------------------ */
export const CenaRevela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  const revela = a.ini + Math.round(len * 0.3);
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="*Prorrogado* / até 5/12!" em={a.ini} corTexto={cor.tinta} faixa={cor.vermelho} corFaixa={cor.branco} />
      <Em y={660}>
        <Jornal em={a.ini - 8} manchete="PRORROGADO!" sub="R$ 197 em até 6x sem juros vai até 5 de dezembro" nitido={revela} />
      </Em>
      <Carimbo em={revela + 12} x={320} y={1380} texto="ATÉ 05/12" topo="★ R$ 197 EM ATÉ 6X ★" verde={cor.verde} />
      <Confetes inicio={revela + 4} />
      <Efeito nome="ding" em={revela} volume={0.55} />
      <Efeito nome="pop" em={revela + 12} volume={0.55} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. R$ 197 em 6x; no dia 6 sobe ------------------------------------------ */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="R$ 197 / em *até 6x.*" em={a.ini} />
      <OfertaDupla rotuloHoje="Até sábado · 05/12" rotuloDepois="Domingo · 06/12" tPreco={a.ini + 2} tSeis={a.ini + Math.round(len * 0.55)} tDepois={b.ini + 4} topo={620} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <FechoPalmital manchete="Garanta até *5/12.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
