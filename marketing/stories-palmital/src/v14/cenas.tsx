import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, Icone, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { CelularTelas } from '../v12/cenas';
import { FechoVivo, FundoVivo, OfertaViva, vivas } from '../vivo';

// V14 · "4 coisas pra fazer antes do dia 25" — lista útil, uma cor por item: cargo (turquesa), 20 min por dia
// (laranja), Português e Matemática (ouro; caem em todos os cargos, Tabelas 9.1 a 9.4), preço de agora (petróleo). Voz Roberta.

const CORES = [cor.turquesa, cor.laranjaVivo, cor.ouro, cor.teal];

/** Selo redondo com o número do item, que entra girando. */
const Numero: React.FC<{ n: number; em: number; fundo: string; tinta?: string }> = ({ n, em, fundo, tinta = cor.tinta }) => {
  const p = useMola(em, { damping: 11, stiffness: 170 });
  return (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: fundo,
        color: tinta,
        border: '8px solid rgba(255,255,255,0.9)',
        boxShadow: '0 16px 30px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonte.display,
        fontWeight: 800,
        fontSize: 100,
        lineHeight: 1,
        transform: `scale(${p}) rotate(${(1 - p) * -180}deg)`,
        marginBottom: 30,
      }}
    >
      {n}
    </div>
  );
};

/* 1. Gancho: 4 coisas antes do dia 25 ------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={vivas.roxo} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="*4 coisas* pra fazer / antes do dia 25" atraso={a.ini} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 150, top: 700, width: 780, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {CORES.map((c, i) => {
          const p = useMola(a.ini + 16 + i * 7, { damping: 12, stiffness: 150 });
          return (
            <div
              key={c}
              style={{
                height: 300,
                borderRadius: 44,
                background: c,
                boxShadow: 'inset 0 -14px 0 rgba(0,0,0,0.15), 0 24px 40px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonte.display,
                fontWeight: 800,
                fontSize: 200,
                color: i === 2 ? cor.tinta : cor.branco,
                transform: `scale(${p}) rotate(${(i % 2 ? 4 : -4) * p}deg)`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      <Em y={1440}>
        <Surge em={a.ini + Math.round(len * 0.62)}>
          <Chip fundo={cor.branco} texto={cor.roxoNoite} tamanho={36}>
            Inscrições abrem em 25/11
          </Chip>
        </Surge>
      </Em>
      {CORES.map((c, i) => (
        <Efeito key={c} nome="pop" em={a.ini + 18 + i * 7} volume={0.25} />
      ))}
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Item 1: descubra seu cargo ------------------------------------------- */
export const CenaUm: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoVivo paleta={vivas.turquesa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 230, width: 936 }}>
        <Numero n={1} em={a.ini - 6} fundo={cor.branco} tinta={cor.tealSombra} />
        <Manchete texto="Descubra / *seu cargo.*" atraso={a.ini} tamanho={110} faixa={cor.branco} corFaixa={cor.tealSombra} />
      </div>
      <Em x={740} y={700}>
        <Surge em={a.ini + 12} de="direita">
          <div style={{ transform: 'rotate(4deg)' }}>
            <CelularTelas telas={[{ tela: 'edital-perfil', em: 0 }, { tela: 'edital-resultado', em: b.ini + 20 }]} largura={380} />
          </div>
        </Surge>
      </Em>
      <div style={{ position: 'absolute', left: 72, top: 900, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'flex-start' }}>
        {['Grátis', 'Sem cadastro', 'Requisitos do edital'].map((t, i) => (
          <Surge key={t} em={b.ini + 6 + i * 8} de="esquerda">
            <Chip fundo={i < 2 ? cor.ouro : cor.branco} texto={cor.tinta} tamanho={i < 2 ? 34 : 26}>
              ✓ {t}
            </Chip>
          </Surge>
        ))}
      </div>
      <Efeito nome="ding" em={b.ini + 6} volume={0.35} />
    </FundoVivo>
  );
};

/* 3. Item 2: 20 minutos por dia ------------------------------------------- */
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const CenaDois: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const arco = interpolate(frame, [a.ini + 14, a.ini + 50], [0, 1 / 3], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  const r = 160;
  const volta = 2 * Math.PI * r;
  return (
    <FundoVivo paleta={vivas.laranja} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 230, width: 936 }}>
        <Numero n={2} em={a.ini - 6} fundo={cor.branco} tinta={cor.laranja} />
        <Manchete texto="Separe *20 minutos* / por dia." atraso={a.ini} tamanho={100} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={720}>
        <Surge em={a.ini + 8}>
          <div style={{ position: 'relative', width: 420, height: 420 }}>
            <svg width="420" height="420" viewBox="0 0 420 420">
              <circle cx="210" cy="210" r={r + 30} fill={cor.branco} />
              <circle cx="210" cy="210" r={r} fill="none" stroke="#FFE3D3" strokeWidth="44" />
              <circle
                cx="210"
                cy="210"
                r={r}
                fill="none"
                stroke={cor.laranjaVivo}
                strokeWidth="44"
                strokeLinecap="round"
                strokeDasharray={`${arco * volta} ${volta}`}
                transform="rotate(-90 210 210)"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 0.9, color: cor.tinta }}>20</div>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 36, color: cor.muted }}>minutos</div>
            </div>
          </div>
        </Surge>
      </Em>
      <div style={{ position: 'absolute', left: 90, top: 1250, width: 900, display: 'flex', justifyContent: 'space-between' }}>
        {DIAS.map((d, i) => {
          const p = useMola(b.ini + 4 + i * 5, { damping: 12, stiffness: 200 });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: '50%',
                  background: p > 0.05 ? cor.verde : 'rgba(255,255,255,0.25)',
                  border: '6px solid rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${0.8 + p * 0.2})`,
                }}
              >
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: p }}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 42, color: cor.branco }}>{d}</div>
            </div>
          );
        })}
      </div>
      <Em y={1470}>
        <Surge em={b.ini + 40}>
          <Chip fundo={cor.tinta} tamanho={34}>
            Pouco, mas todo dia
          </Chip>
        </Surge>
      </Em>
      {DIAS.map((_, i) => (
        <Efeito key={i} nome="pop" em={b.ini + 4 + i * 5} volume={0.18} />
      ))}
    </FundoVivo>
  );
};

/** Cartão branco de matéria com o ícone do app. */
const Materia: React.FC<{ icone: string; nome: string; em: number; giro: number }> = ({ icone, nome, em, giro }) => {
  const p = useMola(em, { damping: 12, stiffness: 140 });
  return (
    <div
      style={{
        width: 400,
        padding: '40px 20px 34px',
        borderRadius: 40,
        background: cor.branco,
        boxShadow: '0 24px 44px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        transform: `translateY(${(1 - p) * 600}px) rotate(${giro * p}deg)`,
      }}
    >
      <Icone nome={icone} tamanho={170} />
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: cor.tinta }}>{nome}</div>
    </div>
  );
};

/* 4. Item 3: Português e Matemática --------------------------------------- */
export const CenaTres: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const selo = useMola(b.ini + 4, { damping: 11, stiffness: 190 });
  return (
    <FundoVivo paleta={vivas.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 230, width: 936 }}>
        <Numero n={3} em={a.ini - 6} fundo={cor.tinta} tinta={cor.ouro} />
        <Manchete texto="Comece por / *Português e Matemática.*" atraso={a.ini} tamanho={86} corTexto={cor.tinta} faixa={cor.laranjaVivo} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', gap: 40 }}>
        <Materia icone="icone-portugues" nome="Português" em={a.ini + 18} giro={-4} />
        <Materia icone="icone-matematica" nome="Matemática" em={a.ini + 26} giro={4} />
      </div>
      <Em y={1260}>
        <div
          style={{
            transform: `rotate(-3deg) scale(${interpolate(selo, [0, 1], [2, 1])})`,
            opacity: Math.min(1, selo * 3),
            background: cor.tinta,
            color: cor.branco,
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 54,
            padding: '20px 44px',
            borderRadius: 30,
            boxShadow: '0 18px 34px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          Caem em <span style={{ color: cor.ouro }}>todos os cargos</span>
        </div>
      </Em>
      <Efeito nome="whoosh" em={a.ini + 18} volume={0.3} />
      <Efeito nome="ding" em={b.ini + 4} volume={0.45} />
    </FundoVivo>
  );
};

/* 5. Item 4: o preço de agora --------------------------------------------- */
export const CenaQuatro: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const lb = b.fim - b.ini;
  return (
    <FundoVivo paleta={vivas.petroleo} duracao={duracao}>
      <OfertaViva
        sobrelinha="4 · Preço de agora"
        titulo="Garanta agora / por *R$ 197*"
        tTitulo={a.ini}
        tCartao={b.ini}
        tSeis={b.ini + Math.round(lb * 0.3)}
        tSobe={c.ini}
      />
    </FundoVivo>
  );
};

/* 6. Fecho --------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={vivas.coral} duracao={duracao}>
      <FechoVivo manchete="Começa *hoje.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
