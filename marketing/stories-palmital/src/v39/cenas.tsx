import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, Icone, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital } from '../campanha/Cabeca';
import { cor, fonte } from '../tema';
import { FundoCinema, paletas } from '../v8/cinema';
import { FundoVivo } from '../vivo';

// V39 · quarta 02/12 · "Faltam 4 dias" — bateria com quatro barras (QUA, QUI, SEX, SÁB) que pisca; o preço que
// acaba; tela inicial de celular com os ícones do app; a bateria recarrega com seis barras de R$ 32,83. Voz Roberta.

const DIAS = ['QUA', 'QUI', 'SEX', 'SÁB'];

/** Bateria deitada com `n` barras; `rotulos` em cada barra; `cheias` barras acesas; pisca a última se `pisca`. */
const Bateria: React.FC<{ barras: number; cheias: number; rotulos: string[]; corBarra: string; pisca?: boolean; largura?: number }> = ({ barras, cheias, rotulos, corBarra, pisca, largura = 880 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'relative', width: largura, height: 360, borderRadius: 50, border: '18px solid #E5E7EB', background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25))', padding: 18, display: 'flex', gap: 14, boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.6), inset 0 10px 30px rgba(0,0,0,0.5), 0 0 0 4px #9CA3AF, 0 40px 80px rgba(0,0,0,0.45)' }}>
      <div style={{ position: 'absolute', left: 24, right: 24, top: 14, height: 60, borderRadius: 30, background: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: -56, top: 108, width: 38, height: 108, borderRadius: '0 18px 18px 0', background: 'linear-gradient(180deg, #FFFFFF, #9CA3AF 55%, #6B7280)', boxShadow: '6px 8px 14px rgba(0,0,0,0.35)' }} />
      {Array.from({ length: barras }, (_, i) => {
        const acesa = i < cheias;
        const piscando = pisca && i === cheias - 1 && Math.floor(frame / 8) % 2 === 0;
        return (
          <div key={i} style={{ flex: 1, borderRadius: 22, background: acesa && !piscando ? `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%, rgba(0,0,0,0.2)), ${corBarra}` : 'rgba(255,255,255,0.08)', boxShadow: acesa && !piscando ? `0 0 26px ${corBarra}, inset 0 2px 0 rgba(255,255,255,0.4)` : 'inset 0 2px 6px rgba(0,0,0,0.4)', textShadow: '0 2px 0 rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: barras > 4 ? 34 : 56, color: acesa && !piscando ? cor.branco : 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1 }}>
            {rotulos[i]}
          </div>
        );
      })}
    </div>
  );
};

/* 1. Faltam 4 dias ---------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const p = useMola(a.ini - 6, { damping: 12, stiffness: 140 });
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Cabeca texto="Só mais 4 dias / *de R$ 197.*" em={a.ini} tamanho={116} faixa={cor.coral} corFaixa={cor.branco} />
      <Em y={860}>
        <div style={{ transform: `scale(${p})` }}>
          <Bateria barras={4} cheias={4} rotulos={DIAS} corBarra={cor.verde} pisca />
        </div>
      </Em>
      <Efeito nome="pop" em={a.ini} volume={0.45} />
      <Aviso />
    </FundoCinema>
  );
};

/* 2. Pro R$ 197 acabar: a bateria descarrega ------------------------------- */
export const CenaAcaba: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cheias = 4 - Math.floor(interpolate(frame, [em(a, 0.3), em(a, 0.95)], [0, 3], limita));
  const corB = cheias > 2 ? cor.ouro : cor.vermelho;
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      <Cabeca texto="Depois de sábado, / *R$ 297.*" em={a.ini} tamanho={110} />
      <Em y={860}>
        <Bateria barras={4} cheias={cheias} rotulos={DIAS} corBarra={corB} pisca />
      </Em>
      <ChipData em={em(a, 0.6)} y={1360} texto="R$ 197 até sábado, 05/12" fundo={cor.vermelho} />
      <Aviso />
    </FundoCinema>
  );
};

/* 3. Tela inicial com os ícones do app ------------------------------------- */
const APPS: [string, string][] = [
  ['icone-alvo', 'Trilha do cargo'],
  ['icone-acerto', 'Questões FAU'],
  ['icone-simulados', 'Simulado oficial'],
  ['icone-revisao', 'Revisão'],
];

export const CenaInclui: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="No *Fuse Aprova:*" em={a.ini} tamanho={120} />
      <div style={{ position: 'absolute', left: 120, top: 640, width: 840, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 50 }}>
        {APPS.map(([ic, t], i) => {
          const q = useMola(em(a, 0.05 + i * 0.22), { damping: 10, stiffness: 170 });
          return (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, transform: `scale(${q})` }}>
              <div style={{ width: 280, height: 280, borderRadius: 70, background: 'linear-gradient(180deg, #FFFFFF, #E9ECF1)', border: '4px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.06), 0 12px 0 rgba(20,40,120,0.35), 0 30px 50px rgba(0,0,0,0.3)' }}>
                <Icone nome={ic} tamanho={180} />
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: cor.branco }}>{t}</div>
              <Efeito nome="pop" em={em(a, 0.05 + i * 0.22)} volume={0.3} />
            </div>
          );
        })}
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Recarrega: 6 barras de R$ 32,83 = R$ 197 ------------------------------ */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const cheias = Math.min(6, Math.floor(interpolate(frame, [a.ini + 2, em(a, 0.8)], [0, 6.99], limita)));
  const cheio = cheias >= 6;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="6x de / *R$ 32,83.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={130} />
      <Em y={820}>
        <div style={{ filter: cheio ? `drop-shadow(0 0 40px ${cor.branco})` : 'none' }}>
          <Bateria barras={6} cheias={cheias} rotulos={Array(6).fill('32,83')} corBarra={cor.verde} />
        </div>
      </Em>
      <Em y={1250}>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: cor.tinta, opacity: cheio ? 1 : 0.2, transform: `scale(${cheio ? 1 : 0.9})` }}>= R$ 197</div>
      </Em>
      <ChipData em={em(a, 0.85)} y={1440} texto="sem juros · até 05/12" fundo={cor.tinta} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Efeito key={i} nome="pop" em={Math.round(a.ini + 2 + ((em(a, 0.8) - a.ini - 2) * (i + 1)) / 7)} volume={0.25} />
      ))}
      <Efeito nome="ding" em={em(a, 0.8)} volume={0.5} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <FechoPalmital manchete="R$ 197 só / *até sábado.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
