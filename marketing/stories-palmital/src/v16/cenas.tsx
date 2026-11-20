import React from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { CelularTelas } from '../v12/cenas';
import { FundoCinema, Manchete, paletas, Sobrelinha, Surge } from '../v8/cinema';
import { Calendario25, FechoVivo, FundoVivo, vivas } from '../vivo';

// V16 · "O neurônio leva tempo" — time-lapse real de microscopia (pesquisa pública, recortado sem selos, legenda nem
// áudio do reel de referência) → aprender é criar ligações e repetir fortalece → véspera não dá tempo → app → dia 25.
// Explicação e animações próprias. Voz Lucas.

/** Neurônio desenhado: corpo com brilho e dendritos. */
const Neuronio: React.FC<{ x: number; y: number; tinta?: string; brilho?: number; giro?: number }> = ({ x, y, tinta = cor.turquesa, brilho = 1, giro = 0 }) => (
  <svg width="300" height="300" viewBox="-150 -150 300 300" style={{ position: 'absolute', left: x - 150, top: y - 150, overflow: 'visible', transform: `rotate(${giro}deg)` }}>
    <circle r={70} fill={tinta} opacity={0.18 * brilho} />
    {[0, 55, 120, 175, 235, 300].map((a, i) => {
      const r = (a * Math.PI) / 180;
      const l = 95 + (i % 3) * 18;
      const cx = Math.cos(r) * l;
      const cy = Math.sin(r) * l;
      const r2 = r + 0.5;
      return (
        <g key={a} stroke={tinta} strokeLinecap="round" fill="none">
          <path d={`M0 0 Q ${Math.cos(r + 0.25) * l * 0.5} ${Math.sin(r + 0.25) * l * 0.5} ${cx} ${cy}`} strokeWidth={9} />
          <path d={`M${cx * 0.7} ${cy * 0.7} L ${cx * 0.7 + Math.cos(r2) * 34} ${cy * 0.7 + Math.sin(r2) * 34}`} strokeWidth={5} />
        </g>
      );
    })}
    <circle r={38} fill={tinta} />
    <circle r={16} fill="rgba(255,255,255,0.55)" />
  </svg>
);

/** Ligação curva entre dois pontos: desenha até `progresso`, com espessura e pulsos que correm por ela. */
const Ligacao: React.FC<{ de: [number, number]; para: [number, number]; progresso: number; espessura: number; tinta: string; pulsos?: number[]; tracejada?: boolean }> = ({
  de,
  para,
  progresso,
  espessura,
  tinta,
  pulsos = [],
  tracejada,
}) => {
  const frame = useCurrentFrame();
  const mx = (de[0] + para[0]) / 2;
  const my = Math.min(de[1], para[1]) - 160;
  const d = `M${de[0]} ${de[1]} Q ${mx} ${my} ${para[0]} ${para[1]}`;
  const ponto = (t: number) => [(1 - t) ** 2 * de[0] + 2 * (1 - t) * t * mx + t ** 2 * para[0], (1 - t) ** 2 * de[1] + 2 * (1 - t) * t * my + t ** 2 * para[1]];
  return (
    <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
      <path
        d={d}
        fill="none"
        stroke={tinta}
        strokeWidth={espessura}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={tracejada ? '0.03 0.04' : `${progresso} 1`}
        opacity={tracejada ? progresso : 1}
        style={{ filter: `drop-shadow(0 0 ${espessura}px ${tinta})` }}
      />
      {pulsos.map((p) => {
        const t = interpolate(frame, [p, p + 16], [0, 1], limita);
        if (t <= 0 || t >= 1) return null;
        const [x, y] = ponto(t);
        return <circle key={p} cx={x} cy={y} r={espessura + 12} fill={cor.branco} style={{ filter: `drop-shadow(0 0 18px ${cor.ouro})` }} />;
      })}
    </svg>
  );
};

/* 1. O neurônio real e o relógio ------------------------------------------ */
export const CenaNeuronio: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const anel = useMola(b.ini + 2, { damping: 12, stiffness: 160 });
  const pisca = 0.6 + Math.max(0, Math.sin((frame - b.ini) / 5)) * 0.4;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6} tinta={cor.turquesa}>
          Imagem real · microscópio
        </Sobrelinha>
        <Manchete texto="Isso é um / *neurônio.*" atraso={a.ini} tamanho={120} faixa={cor.turquesa} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 60, top: 640 }}>
        <Surge em={a.ini - 4}>
          <div style={{ width: 960, height: 749, borderRadius: 36, overflow: 'hidden', border: '6px solid rgba(255,255,255,0.85)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <OffthreadVideo src={staticFile('video/neuronio.mp4')} muted playbackRate={0.5} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </Surge>
      </div>
      {/* anel no relógio do vídeo */}
      <div
        style={{
          position: 'absolute',
          left: 690,
          top: 1270,
          width: 320,
          height: 100,
          borderRadius: 30,
          border: `7px solid ${cor.laranjaVivo}`,
          boxShadow: `0 0 30px ${cor.laranjaVivo}`,
          opacity: Math.min(1, anel * 2) * pisca,
          transform: `scale(${interpolate(anel, [0, 1], [1.6, 1])})`,
        }}
      />
      <Em y={1440}>
        <Surge em={c.ini + 4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 36px', borderRadius: 32, background: cor.branco, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, lineHeight: 1, color: cor.laranja }}>≈ 41 horas</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 28, lineHeight: 1.2, color: cor.muted }}>
              de quarta 16h52
              <br />
              a sexta 9h54
            </div>
          </div>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 2} volume={0.4} />
      <Efeito nome="ding" em={c.ini + 4} volume={0.4} />
      <Aviso />
    </FundoCinema>
  );
};

const N1: [number, number] = [250, 1060];
const N2: [number, number] = [830, 1180];
const LIG_DE: [number, number] = [N1[0] + 90, N1[1] - 40];
const LIG_PARA: [number, number] = [N2[0] - 90, N2[1] - 40];

/* 2. Aprender é criar ligações; repetir fortalece -------------------------- */
export const CenaLicao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const len = b.fim - b.ini;
  const pulsos = [0.05, 0.35, 0.65].map((f) => b.ini + Math.round(len * f));
  const progresso = interpolate(frame, [a.ini + 20, a.ini + 70], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 2 });
  const vezes = pulsos.filter((p) => frame >= p + 14).length;
  const espessura = interpolate(vezes, [0, 3], [5, 26]);
  return (
    <FundoCinema paleta={paletas.petroleo} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="Aprender é / criar *ligações.*" atraso={a.ini} tamanho={104} faixa={cor.turquesa} corFaixa={cor.tinta} />
      </div>
      <Ligacao de={LIG_DE} para={LIG_PARA} progresso={progresso} espessura={espessura} tinta={cor.ouro} pulsos={pulsos} />
      <Surge em={a.ini + 6}>
        <AbsoluteFill>
          <Neuronio x={N1[0]} y={N1[1]} brilho={1 + vezes * 0.5} />
          <Neuronio x={N2[0]} y={N2[1]} giro={40} brilho={1 + vezes * 0.5} />
        </AbsoluteFill>
      </Surge>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', justifyContent: 'center', gap: 22 }}>
        {pulsos.map((p, i) => (
          <Surge key={p} em={p + 14}>
            <Chip fundo={i === vezes - 1 ? cor.ouro : 'rgba(255,255,255,0.16)'} texto={i === vezes - 1 ? cor.tinta : cor.branco} tamanho={30}>
              {i + 1}ª vez
            </Chip>
          </Surge>
        ))}
      </div>
      <Em y={1560}>
        <Surge em={pulsos[2] + 18}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 56, color: cor.branco }}>
            Repetiu, <span style={{ color: cor.ouro }}>fortaleceu.</span>
          </div>
        </Surge>
      </Em>
      {pulsos.map((p) => (
        <Efeito key={p} nome="pop" em={p + 14} volume={0.3} />
      ))}
    </FundoCinema>
  );
};

/* 3. Véspera: não dá tempo ------------------------------------------------- */
export const CenaVespera: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const corre = interpolate(frame, [a.ini + 10, a.ini + 26], [0, 0.55], limita);
  const some = interpolate(frame, [b.ini, b.ini + 20], [1, 0], limita);
  const tremor = frame > a.ini + 26 && frame < b.ini + 20 ? Math.sin(frame * 1.7) * 0.5 + 0.5 : 1;
  const x = useMola(b.ini + 6, { damping: 10, stiffness: 200 });
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6} tinta={cor.coral}>
          Estudar tudo de uma vez
        </Sobrelinha>
        <Manchete texto="Tudo na / *véspera?*" atraso={a.ini} tamanho={124} faixa={cor.vermelho} />
      </div>
      <div style={{ opacity: some * tremor + (1 - some) * 0 }}>
        <Ligacao de={LIG_DE} para={LIG_PARA} progresso={corre} espessura={6} tinta={cor.coral} />
      </div>
      <Ligacao de={LIG_DE} para={LIG_PARA} progresso={1 - some} espessura={5} tinta="rgba(255,255,255,0.35)" tracejada />
      <AbsoluteFill>
        <Neuronio x={N1[0]} y={N1[1]} tinta={cor.coral} brilho={0.6} />
        <Neuronio x={N2[0]} y={N2[1]} giro={40} tinta={cor.coral} brilho={0.6} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 540 - 70,
          top: 860,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: cor.vermelho,
          color: cor.branco,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: 90,
          transform: `scale(${x})`,
          boxShadow: '0 16px 30px rgba(0,0,0,0.4)',
        }}
      >
        ✕
      </div>
      <Em y={1440}>
        <Surge em={b.ini + 10}>
          <Chip fundo={cor.branco} texto={cor.vermelho} tamanho={38}>
            Não dá tempo de firmar
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 6} volume={0.45} />
    </FundoCinema>
  );
};

/* 4. O app: um pouco por dia, revisão no tempo certo ----------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  const t = (f: number) => a.ini + Math.round(len * f);
  return (
    <FundoVivo paleta={vivas.turquesa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>No Fuse Aprova</Sobrelinha>
        <Manchete texto="Um pouco / *por dia.*" atraso={t(0.15)} tamanho={116} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em x={760} y={640}>
        <Surge em={a.ini + 6} de="direita">
          <div style={{ transform: 'rotate(4deg)' }}>
            <CelularTelas telas={[{ tela: 'real-trilha', em: 0 }, { tela: 'real-revisao', em: t(0.45) }]} largura={380} />
          </div>
        </Surge>
      </Em>
      <div style={{ position: 'absolute', left: 72, top: 900, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'flex-start' }}>
        {[
          { t: 'Lições curtas', em: t(0.25) },
          { t: 'Revisão do', em: t(0.5) },
          { t: 'que você errou', em: t(0.5) },
          { t: 'No tempo certo', em: t(0.75) },
        ].map((c, i) => (
          <Surge key={c.t} em={c.em + (i === 2 ? 4 : 0)} de="esquerda">
            <Chip fundo={i === 3 ? cor.ouro : cor.branco} texto={cor.tinta} tamanho={30}>
              {i === 2 ? c.t : `✓ ${c.t}`}
            </Chip>
          </Surge>
        ))}
      </div>
      <Efeito nome="pop" em={t(0.25)} volume={0.3} />
      <Efeito nome="pop" em={t(0.5)} volume={0.3} />
      <Efeito nome="ding" em={t(0.75)} volume={0.4} />
    </FundoVivo>
  );
};

/* 5. Fecho: inscrições dia 25, comece antes -------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const troca = interpolate(frame, [b.ini - 6, b.ini + 4], [1, 0], limita);
  return (
    <FundoVivo paleta={vivas.sol} duracao={duracao}>
      {troca > 0 ? (
        <AbsoluteFill style={{ opacity: troca }}>
          <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
            <Sobrelinha atraso={a.ini - 4} tinta={cor.tinta}>
              Concurso · Prefeitura de Palmital
            </Sobrelinha>
            <Manchete texto="Inscrições / no dia *25.*" atraso={a.ini} tamanho={120} corTexto={cor.tinta} faixa={cor.laranjaVivo} />
          </div>
          <Em y={700}>
            <Calendario25 em={a.ini + 4} circulo={a.ini + 30} largura={440} />
          </Em>
        </AbsoluteFill>
      ) : null}
      {frame >= b.ini - 4 ? (
        <>
          <FechoVivo manchete="Dê tempo pro / seu *cérebro.*" em={b.ini} len={b.fim - b.ini} tinta={cor.tinta} />
          <Em y={1380}>
            <Surge em={b.ini + Math.round((b.fim - b.ini) * 0.7)}>
              <Chip fundo={cor.tinta} tamanho={30}>
                R$ 197 · até 6x sem juros no cartão até 25/11
              </Chip>
            </Surge>
          </Em>
        </>
      ) : (
        <Aviso corTexto="rgba(45,47,54,0.85)" />
      )}
    </FundoVivo>
  );
};
