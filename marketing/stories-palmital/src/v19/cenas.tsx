import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, Icone, useMola } from '../componentes';
import { ChipData, cores, OfertaDupla, Passo, Relogio } from '../contagem';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Manchete, Sobrelinha } from '../v8/cinema';
import { FechoVivo, FundoVivo } from '../vivo';

// V19 · terça 24/11 · "É amanhã" — despertador que toca até 12:00 (abrem as inscrições), amanhã também é o último dia
// do R$ 197 e do 6x no cartão; "não deixa pra última hora": garante hoje, se inscreve amanhã. Voz Keren, batida trap.

/** Despertador: o relógio com dois sinos e pezinhos, que treme enquanto toca. */
const Despertador: React.FC<{ ini: number; fim: number }> = ({ ini, fim }) => {
  const frame = useCurrentFrame();
  const toca = frame >= ini - 10 && frame < fim;
  const giro = toca ? Math.sin(frame * 2.4) * 6 : 0;
  const sino = (lado: number) => (
    <div style={{ position: 'absolute', top: -36, left: lado < 0 ? 20 : 300, width: 120, height: 80, borderRadius: '120px 120px 20px 20px', background: cor.vermelho, transform: `rotate(${lado * 28 + (toca ? Math.sin(frame * 3.1 + lado) * 10 : 0)}deg)`, boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.2)' }} />
  );
  return (
    <div style={{ position: 'relative', width: 440, height: 500, transform: `rotate(${giro}deg)` }}>
      {sino(-1)}
      {sino(1)}
      <div style={{ position: 'absolute', top: 420, left: 70, width: 40, height: 70, borderRadius: 14, background: cor.tinta, transform: 'rotate(25deg)' }} />
      <div style={{ position: 'absolute', top: 420, left: 330, width: 40, height: 70, borderRadius: 14, background: cor.tinta, transform: 'rotate(-25deg)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <Relogio ini={ini} fim={fim} de={7} />
      </div>
      {toca
        ? [0, 1, 2].map((i) => {
            const f = ((frame + i * 6) % 18) / 18;
            return (
              <div key={i} style={{ position: 'absolute', left: i === 1 ? 470 : -60, top: 120 + i * 40, width: 40 + f * 40, height: 8, borderRadius: 4, background: cor.branco, opacity: 1 - f, transform: `rotate(${i === 1 ? -20 : 20}deg)` }} />
            );
          })
        : null}
    </div>
  );
};

/* 1. É amanhã: ao meio-dia abrem as inscrições ---------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>Inscrições · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="É *amanhã!*" atraso={a.ini} tamanho={150} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={640}>
        <Despertador ini={a.ini} fim={b.ini + Math.round((b.fim - b.ini) * 0.3)} />
      </Em>
      <ChipData em={b.ini + Math.round((b.fim - b.ini) * 0.3)} y={1230} texto="Quarta · 25/11 · 12h" fundo={cor.branco} tinta={cor.vermelho} />
      <ChipData em={b.ini + Math.round((b.fim - b.ini) * 0.6)} y={1340} texto="Abrem as inscrições" fundo={cor.tinta} tamanho={34} />
      <Efeito nome="whoosh" em={a.ini} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. E amanhã também é o último dia do R$ 197 ---------------------------- */
export const CenaDuas: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Preparatório · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="E amanhã / tem *mais:*" atraso={a.ini} tamanho={110} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <OfertaDupla
        rotuloHoje="Último dia: amanhã · 25/11"
        rotuloDepois="Quinta · 26/11"
        tPreco={b.ini + Math.round((b.fim - b.ini) * 0.35)}
        tSeis={b.ini + Math.round((b.fim - b.ini) * 0.85)}
        tDepois={c.ini + 4}
        topo={660}
      />
      <Aviso />
    </FundoVivo>
  );
};

/* 3. 6x sem juros no cartão só até amanhã -------------------------------- */
export const CenaCartao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="No cartão, / *só até amanhã.*" atraso={a.ini} tamanho={104} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} />
      </div>
      <Em x={560} y={680}>
        <Cartao em={a.ini + 6} />
      </Em>
      <Em y={1080}>
        <div style={{ filter: 'drop-shadow(0 10px 0 rgba(0,0,0,0.12))' }}>
          <SeisVezes em={a.ini + Math.round(len * 0.4)} />
        </div>
      </Em>
      <ChipData em={a.ini + Math.round(len * 0.75)} y={1330} texto="Parcelamento até 25/11" />
      <Efeito nome="whoosh" em={a.ini + 6} volume={0.35} />
      <Efeito nome="ding" em={a.ini + Math.round(len * 0.4)} volume={0.45} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. Não deixa pra última hora: garante hoje, se inscreve amanhã ---------- */
export const CenaHoje: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const pisca = Math.floor(frame / 8) % 2 === 0;
  const relogio = useMola(a.ini + 4, { damping: 11, stiffness: 180 });
  const sai = interpolate(frame, [b.ini - 2, b.ini + 12], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="Não deixa pra / *última hora.*" atraso={a.ini} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={interpolate(sai, [0, 1], [880, 690])}>
        <div style={{ transform: `scale(${interpolate(relogio, [0, 1], [0.3, 1]) * interpolate(sai, [0, 1], [1, 0.55])})`, opacity: Math.min(1, relogio * 2), padding: '30px 60px', borderRadius: 40, background: '#14161C', boxShadow: '0 30px 60px rgba(0,0,0,0.35)' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 220, lineHeight: 1, color: cor.coral, letterSpacing: 6, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 40px ${cor.coral}` }}>
            23<span style={{ opacity: pisca ? 1 : 0.15 }}>:</span>59
          </div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 80, top: 900, display: 'flex', flexDirection: 'column', gap: 44 }}>
        <Passo em={b.ini + 6} rotulo="Hoje" texto="Garanta o Fuse Aprova por R$ 197" corRotulo={cor.laranjaVivo} icone={<Icone nome="icone-acerto" tamanho={90} />} />
        <Passo em={b.ini + Math.round((b.fim - b.ini) * 0.5)} rotulo={'Amanhã\n12h'} texto="Faça a inscrição já estudando" corRotulo={cor.roxo} icone={<Icone nome="icone-calendario" tamanho={90} />} />
      </div>
      <Efeito nome="pop" em={a.ini + 4} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 0, top: 210, width: 1080, display: 'flex', justifyContent: 'center' }}>
        <Sobrelinha atraso={a.ini - 6}>Preparatório · Prefeitura de Palmital</Sobrelinha>
      </div>
      <FechoVivo manchete="É *amanhã.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
