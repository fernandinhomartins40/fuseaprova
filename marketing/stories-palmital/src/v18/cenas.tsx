import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { AppPalmital, ChipData, cores, OfertaDupla, Placa } from '../contagem';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { Pessoa } from '../v8/pecas';
import { FechoVivo, FundoVivo } from '../vivo';

// V18 · segunda 23/11 · "Faltam 2 dias" — placa 3→2 e a tela dividida: quem espera a inscrição pra começar ×
// quem começa hoje; na quarta as duas se inscrevem, só uma chega estudando. Voz Davi Andrei, batida funk.

/* 1. Faltam 2 dias -------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="*Faltam*" atraso={a.ini} tamanho={130} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={540}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34 }}>
          <Placa de="3" para="2" em={a.ini + 8} entra={a.ini - 6} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: cor.branco, paddingBottom: 30 }}>dias</div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 72, top: 1140, width: 936 }}>
        <Manchete texto="pras *inscrições.*" atraso={a.ini + Math.round(len * 0.35)} tamanho={92} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <ChipData em={a.ini + Math.round(len * 0.7)} y={1360} texto="Quarta · 25/11 · 12h" fundo={cor.branco} tinta={cor.azul} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2–3. Duas pessoas ------------------------------------------------------- */
const DIAS = ['SEG', 'TER', 'QUA'];

type Tempos = { pessoas: number; espera: number; comeca: number; dias: number; inscrito: number; estudando: number };

const Lado: React.FC<{ x: number; t: Tempos; ativo: boolean }> = ({ x, t, ativo }) => {
  const frame = useCurrentFrame();
  const rotulo = ativo ? 'Começa hoje' : 'Espera abrir';
  const inscrito = useMola(t.inscrito, { damping: 10, stiffness: 200 });
  const apaga = ativo ? 0 : interpolate(frame, [t.estudando, t.estudando + 12], [0, 0.35], limita);
  return (
    <div style={{ position: 'absolute', left: x - 250, top: 590, width: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: 1 - apaga, transform: 'scale(1.12)', transformOrigin: '50% 0' }}>
      <Surge em={t.pessoas + (ativo ? 6 : 0)}>
        <div style={{ width: 250, height: 250, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.22)', border: '7px solid #fff', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, bottom: -10 }}>
            <Pessoa
              tamanho={250}
              cabelo={ativo ? '#3B2416' : '#1E1F25'}
              camisa={ativo ? cor.ouro : cor.azulNoite}
              pele={ativo ? '#B97A50' : '#E0AC84'}
              longo={ativo}
              humor={frame >= t.dias ? (ativo ? 'feliz' : 'neutro') : 'neutro'}
            />
          </div>
        </div>
      </Surge>
      <Surge em={ativo ? t.comeca : t.espera}>
        <div style={{ padding: '16px 30px', borderRadius: 999, background: ativo ? cor.ouro : 'rgba(255,255,255,0.92)', color: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 46, whiteSpace: 'nowrap' }}>
          {rotulo}
        </div>
      </Surge>
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {DIAS.map((d, i) => {
          const marca = useMola(t.dias + i * 10, { damping: 10, stiffness: 220 });
          const ap = useMola((ativo ? t.comeca : t.espera) + 8 + i * 3, { damping: 14 });
          return (
            <div key={d} style={{ width: 130, height: 140, borderRadius: 26, background: cor.branco, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 12px 24px rgba(0,0,0,0.18)', transform: `scale(${ap})` }}>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 2, color: cor.muted }}>{d}</div>
              <div style={{ height: 66, display: 'flex', alignItems: 'center' }}>
                {ativo && i < 2 ? (
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={cor.verde} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scale(${marca})` }}>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : i === 2 ? (
                  <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.laranjaVivo }}>25</div>
                ) : (
                  <div style={{ width: 40, height: 6, borderRadius: 3, background: '#D8DBE0' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ transform: `scale(${interpolate(inscrito, [0, 1], [2, 1])})`, opacity: Math.min(1, inscrito * 3), marginTop: 18, padding: '16px 28px', borderRadius: 24, background: cor.verde, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 42, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        Inscrição feita
      </div>
      {ativo ? (
        <Surge em={t.estudando}>
          <div style={{ marginTop: 10, padding: '18px 30px', borderRadius: 26, background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 44, boxShadow: `0 0 50px ${cor.ouro}`, transform: `rotate(-3deg) scale(${1 + Math.max(0, Math.sin((frame - t.estudando) / 6)) * 0.04})` }}>
            Já chega estudando
          </div>
        </Surge>
      ) : null}
    </div>
  );
};

const Duelo: React.FC<{ t: Tempos; titulo: React.ReactNode; duracao: number }> = ({ t, titulo, duracao }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duracao], [1, 1.03], limita);
  const divide = useMola(t.pessoas - 6, { damping: 16, stiffness: 120 });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(160deg, #FF8A7A 0%, #C23A4A 100%)' }} />
      <div style={{ position: 'absolute', left: 540 + (1 - divide) * 540, top: 0, width: 540, height: 1920, background: 'linear-gradient(160deg, #34D6C6 0%, #0E8F99 100%)' }} />
      <div style={{ position: 'absolute', left: 536, top: 520, width: 8, height: 1060, borderRadius: 4, background: 'rgba(255,255,255,0.85)', opacity: divide }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {titulo}
        <Lado x={270} t={t} ativo={false} />
        <Lado x={810} t={t} ativo />
      </AbsoluteFill>
      <Efeito nome="whoosh" em={t.pessoas - 6} volume={0.35} />
      <Efeito nome="ding" em={t.inscrito} volume={0.4} />
      <Efeito nome="pop" em={t.estudando} volume={0.5} />
      <Aviso />
    </AbsoluteFill>
  );
};

const NUNCA = 99999;

export const CenaDuas: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  return (
    <Duelo
      duracao={duracao}
      t={{ pessoas: a.ini + 6, espera: b.ini + 4, comeca: c.ini + 4, dias: c.ini + 24, inscrito: NUNCA, estudando: NUNCA }}
      titulo={
        <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
          <Manchete texto="Imagina / *duas pessoas.*" atraso={a.ini} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} centro />
        </div>
      }
    />
  );
};

export const CenaQuarta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <Duelo
      duracao={duracao}
      t={{ pessoas: -60, espera: -60, comeca: -60, dias: -60, inscrito: a.ini + 14, estudando: b.ini + Math.round((b.fim - b.ini) * 0.4) }}
      titulo={
        <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
          <Manchete texto="Quarta, *25/11:*" atraso={a.ini - 4} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} centro />
        </div>
      }
    />
  );
};

/* 4. Seja essa pessoa: o preparatório ------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <AppPalmital ini={a.ini} fim={a.fim} titulo="Seja essa / *pessoa.*" tinta={cor.tinta} telas={['real-inicio', 'real-ofensiva']} itens={['Um pouco por dia', 'Direto no celular', 'Feito pro concurso de Palmital']} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. Oferta ---------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Preparatório · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Só até *quarta.*" atraso={a.ini} tamanho={116} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <OfertaDupla rotuloHoje="Até quarta · 25/11" rotuloDepois="Quinta · 26/11" tPreco={a.ini + Math.round(len * 0.2)} tSeis={a.ini + Math.round(len * 0.6)} tDepois={b.ini + 4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <FechoVivo manchete="Faltam / *2 dias.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
