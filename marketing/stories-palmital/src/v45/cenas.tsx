import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas, Surge } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V45 · sábado 05/12 · "Hoje à meia-noite" — painel de partidas de aeroporto com ÚLTIMA CHAMADA; cartão de embarque
// com o preço; o painel troca a linha de amanhã para R$ 297; relógio 23:59 com a Capi: a hora é agora. Voz Roberta.

const MONO = "'Consolas', 'Courier New', monospace";

/** Letras de painel que "rolam" antes de assentar (efeito de placa de aeroporto). */
const Letreiro: React.FC<{ texto: string; em: number; corTexto?: string; tamanho?: number }> = ({ texto, em: t0, corTexto = '#FFD54A', tamanho = 44 }) => {
  const frame = useCurrentFrame();
  const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[...texto].map((ch, i) => {
        const pronto = frame >= t0 + i * 1.2 + 6;
        const mostra = ch === ' ' ? ' ' : pronto ? ch : frame < t0 ? ' ' : ALFA[(Math.floor(frame * 1.7) + i * 7) % ALFA.length];
        return (
          <span key={i} style={{ display: 'inline-block', width: tamanho * 0.68, height: tamanho * 1.25, lineHeight: `${tamanho * 1.25}px`, textAlign: 'center', borderRadius: 5, background: 'linear-gradient(180deg, #23262D 50%, #1A1C21 50%)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06), 0 2px 3px rgba(0,0,0,0.5)', fontFamily: MONO, fontWeight: 900, fontSize: tamanho, color: corTexto }}>
            {mostra}
          </span>
        );
      })}
    </span>
  );
};

const Painel: React.FC<{ linhas: { hora: string; texto: string; status: string; corStatus: string; em: number; pisca?: boolean }[] }> = ({ linhas }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: 960, padding: '30px 30px 36px', borderRadius: 30, background: 'linear-gradient(180deg, #2A2E36, #121418)', border: '10px solid #3B414C', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), 0 0 0 4px #15171B, 0 50px 90px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: '#9CA3AF', padding: '0 6px 16px', borderBottom: '2px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
        <span>PARTIDAS</span>
        <span>FUSE APROVA · PALMITAL</span>
      </div>
      {linhas.map((l, i) => {
        const on = !l.pisca || Math.floor(frame / 8) % 2 === 0;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 6px', borderBottom: i < linhas.length - 1 ? '2px solid rgba(255,255,255,0.06)' : 'none' }}>
            <Letreiro texto={l.hora} em={l.em} tamanho={44} />
            <div style={{ flex: 1 }}>
              <Letreiro texto={l.texto} em={l.em + 4} tamanho={44} corTexto="#FFFFFF" />
            </div>
            <div style={{ padding: '8px 16px', borderRadius: 10, background: on ? l.corStatus : 'transparent', border: `3px solid ${l.corStatus}`, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, color: on ? '#fff' : l.corStatus, whiteSpace: 'nowrap', boxShadow: on ? `0 0 24px ${l.corStatus}` : 'none', opacity: frame >= l.em + 10 ? 1 : 0 }}>{l.status}</div>
          </div>
        );
      })}
    </div>
  );
};

/* 1. Última chamada ---------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const p = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Cabeca texto="Última chamada / *pro R$ 197.*" em={a.ini} tamanho={108} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={720}>
        <div style={{ transform: `perspective(1600px) rotateX(${8 + (1 - p) * 40}deg) scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: Math.min(1, p * 2) }}>
          <Painel
            linhas={[
              { hora: '23:59', texto: 'R$ 197 EM 6X', status: 'ÚLTIMA CHAMADA', corStatus: '#F04438', em: a.ini, pisca: true },
              { hora: '00:00', texto: 'R$ 297', status: 'AMANHÃ', corStatus: '#6B7280', em: a.ini + 10 },
            ]}
          />
        </div>
      </Em>
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Cartão de embarque com o preço ------------------------------------------ */
export const CenaPreco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  const carimbo = useMola(em(a, 0.7), { damping: 9, stiffness: 220 });
  const campo = (rotulo: string, valor: string, grande?: boolean) => (
    <div>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: cor.muted }}>{rotulo}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: grande ? 96 : 42, lineHeight: 1.05, color: grande ? cor.laranja : cor.tinta }}>{valor}</div>
    </div>
  );
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="*R$ 197* / em até 6x." em={a.ini} tamanho={124} />
      <Em y={700}>
        <div style={{ position: 'relative', display: 'flex', width: 940, height: 470, transform: `perspective(1600px) rotateX(10deg) rotateZ(${-4 + Math.sin(frame / 30)}deg) translateY(${(1 - p) * 1000}px)`, filter: 'drop-shadow(0 50px 60px rgba(0,0,0,0.4))' }}>
          <div style={{ flex: 1, borderRadius: '30px 0 0 30px', background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 34px', background: `linear-gradient(90deg, ${cor.laranjaVivo}, ${cor.laranja})`, color: '#fff', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4 }}>
              <span>CARTÃO DE EMBARQUE</span>
              <span>✈</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '18px 30px', padding: '26px 34px' }}>
              {campo('DESTINO', 'Prova · 21/02')}
              {campo('CONCURSO', 'Pref. Palmital')}
              {campo('TARIFA', 'R$ 197', true)}
              {campo('PARCELAS', '6x sem juros')}
            </div>
          </div>
          <div style={{ width: 4, background: 'repeating-linear-gradient(180deg, #C9CED6 0 10px, transparent 10px 20px)' }} />
          <div style={{ width: 250, borderRadius: '0 30px 30px 0', background: 'linear-gradient(180deg, #FFFFFF, #F1F3F6)', padding: '70px 26px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {campo('PORTÃO', 'Link na bio')}
            {campo('EMBARQUE', 'Até 23h59')}
            <div style={{ height: 70, background: 'repeating-linear-gradient(90deg, #2D2F36 0 3px, transparent 3px 6px, #2D2F36 6px 10px, transparent 10px 12px)' }} />
          </div>
          <div style={{ position: 'absolute', left: 430, top: 350, padding: '10px 20px', borderRadius: 12, border: `6px solid ${cor.verde}`, color: cor.verde, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, transform: `rotate(-14deg) scale(${interpolate(carimbo, [0, 1], [2.5, 1])})`, opacity: Math.min(1, carimbo * 3), background: 'rgba(255,255,255,0.85)' }}>HOJE</div>
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini - 6} volume={0.35} />
      <Efeito nome="pop" em={em(a, 0.7)} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Amanhã, R$ 297 ---------------------------------------------------------- */
export const CenaAmanha: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Amanhã, / *R$ 297.*" em={a.ini} tamanho={130} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={720}>
        <div style={{ transform: 'perspective(1600px) rotateX(8deg)' }}>
          <Painel
            linhas={[
              { hora: '23:59', texto: 'R$ 197 EM 6X', status: 'ÚLTIMA CHAMADA', corStatus: '#F04438', em: -60, pisca: true },
              { hora: '06/12', texto: 'R$ 297', status: 'DOMINGO', corStatus: '#FFB020', em: a.ini + 2 },
            ]}
          />
        </div>
      </Em>
      <Aviso />
    </FundoCinema>
  );
};

/* 4. A hora é agora: relógio 23:59 com a Capi ------------------------------- */
export const CenaAgora: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const seg = Math.min(59, Math.floor(Math.max(0, frame - a.ini) / 3) + 20);
  const p = useMola(a.ini - 6, { damping: 13, stiffness: 120 });
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="A hora / *é agora.*" em={em(a, 0.55)} tamanho={130} />
      <Em y={700}>
        <div style={{ padding: '40px 60px', borderRadius: 50, background: 'linear-gradient(180deg, #16181D, #050506)', border: '12px solid #4B5563', boxShadow: 'inset 0 0 40px rgba(255,77,61,0.2), 0 0 0 4px #1F2329, 0 50px 90px rgba(0,0,0,0.5)', transform: `scale(${p})` }}>
          <div style={{ fontFamily: MONO, fontWeight: 900, fontSize: 190, lineHeight: 1, color: '#FF4D3D', textShadow: '0 0 20px #FF4D3D, 0 0 50px rgba(255,77,61,0.6)', fontVariantNumeric: 'tabular-nums' }}>
            23:59<span style={{ fontSize: 90, color: '#FF8A7A' }}>:{String(seg).padStart(2, '0')}</span>
          </div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 300, top: 1000 }}>
        <Surge em={em(a, 0.3)}>
          <Img src={staticFile('img/capi-incentivando.webp')} style={{ height: 420, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.35))' }} />
        </Surge>
      </div>
      <ChipData em={em(a, 0.65)} y={1460} texto="Acesso até a prova de 21/02" fundo={cor.branco} tinta={cor.laranja} tamanho={40} />
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <FechoPalmital manchete="Embarque / *até 23h59.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
