import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Carimbo, Em, limita, PropsCena } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { cores, OfertaDupla } from '../contagem';
import { Cabeca } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Surge } from '../v8/cinema';
import { Calendario25, FechoVivo, FundoVivo } from '../vivo';

// V23 · quarta 25/11 · "A notícia" — um jornal de edição extra entra girando com a manchete borrada; o calendário
// mostra que hoje seria o último dia; o app aparece no celular; o jornal volta e a manchete fica nítida: PRORROGADO.
// Voz Davi Andrei.

const SERIFA = "Georgia, 'Times New Roman', serif";

/** Jornal de edição extra. `nitido` é o quadro em que a manchete perde o desfoque (antes disso fica borrada). */
const Jornal: React.FC<{ em: number; gira?: boolean; manchete: string; sub: string; nitido: number }> = ({ em, gira, manchete, sub, nitido }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 16, stiffness: 90 });
  const desfoque = interpolate(frame, [nitido, nitido + 10], [16, 0], limita);
  const giro = gira ? interpolate(p, [0, 1], [900, -4]) : -4 + (1 - p) * 20;
  const escala = gira ? interpolate(p, [0, 1], [0.05, 1]) : 1;
  const sobe = gira ? 0 : (1 - p) * 1400;
  return (
    <div
      style={{
        width: 860,
        padding: '34px 40px 40px',
        background: '#F6EFDD',
        borderRadius: 10,
        boxShadow: '0 50px 90px rgba(0,0,0,0.4)',
        transform: `translateY(${sobe}px) rotate(${giro + Math.sin(frame / 40) * 0.6}deg) scale(${escala})`,
        opacity: Math.min(1, p * 3),
        color: '#1d1b16',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: fonte.corpo, fontWeight: 800, fontSize: 20, letterSpacing: 2, borderBottom: '3px solid #1d1b16', paddingBottom: 8 }}>
        <span>QUARTA, 25 DE NOVEMBRO</span>
        <span>EDIÇÃO EXTRA</span>
      </div>
      <div style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: 92, textAlign: 'center', letterSpacing: -1, lineHeight: 1.1, padding: '10px 0 6px' }}>O Candidato</div>
      <div style={{ height: 6, background: '#1d1b16', marginBottom: 4 }} />
      <div style={{ height: 2, background: '#1d1b16', marginBottom: 22 }} />
      <div style={{ display: 'inline-block', background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 6, padding: '6px 18px', borderRadius: 6 }}>URGENTE</div>
      <div style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: 94, lineHeight: 1, margin: '14px 0 10px', filter: `blur(${desfoque}px)` }}>{manchete}</div>
      <div style={{ fontFamily: SERIFA, fontStyle: 'italic', fontSize: 38, lineHeight: 1.2, color: '#3d382d', filter: `blur(${desfoque * 0.7}px)` }}>{sub}</div>
      <div style={{ display: 'flex', gap: 26, marginTop: 26 }}>
        <div style={{ width: 300, height: 250, background: '#d9cfb6', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <Img src={staticFile('img/capi-explicando.webp')} style={{ height: 240, filter: 'grayscale(1) contrast(1.1)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
          {[1, 0.92, 0.97, 0.7, 1, 0.85, 0.6].map((w, i) => (
            <div key={i} style={{ height: 14, width: `${w * 100}%`, background: '#b9ae95', borderRadius: 3 }} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** Selo "?" que tampa a manchete até a revelação. */
const Interrogacao: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 8, stiffness: 180 });
  return (
    <div style={{ width: 200, height: 200, borderRadius: '50%', background: cor.ouro, color: cor.tinta, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 170, lineHeight: 1, paddingTop: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', transform: `scale(${p}) rotate(${12 + Math.sin(frame / 6) * 6}deg)` }}>
      ?
    </div>
  );
};

/* 1. Perdeu o prazo? Notícia boa ------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Perdeu o prazo? / *Notícia boa.*" em={a.ini} sobre="Edição extra · 25/11" />
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
      <Cabeca texto="R$ 197 / *acabava hoje.*" em={a.ini} />
      <Em y={680}>
        <Calendario25 em={a.ini} circulo={a.ini + Math.round(len * 0.55)} largura={460} />
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
  const cel = useMola(a.ini - 4, { damping: 15, stiffness: 120 });
  const len = a.fim - a.ini;
  const quando = [a.ini + Math.round(len * 0.4), a.ini + Math.round(len * 0.6), a.ini + Math.round(len * 0.83)];
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <Cabeca texto="Preparatório / *completo.*" em={a.ini} sobre="Concurso · Prefeitura de Palmital" faixa={cor.laranjaVivo} corFaixa={cor.branco} />
      <div style={{ position: 'absolute', left: 575, top: 650, transform: `translateX(${(1 - cel) * 900}px) rotate(4deg)` }}>
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
          <Surge key={t} em={quando[i]} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', borderRadius: 28, background: cor.branco, boxShadow: '0 14px 30px rgba(0,0,0,0.18)' }}>
              <div style={{ flex: 'none', width: 54, height: 54, borderRadius: 16, background: cor.laranjaVivo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 42, lineHeight: 1.05, color: cor.tinta }}>{t}</div>
            </div>
            <Efeito nome="pop" em={quando[i]} volume={0.3} />
          </Surge>
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
      <FechoVivo manchete="Garanta até *5/12.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
