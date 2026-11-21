import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, Icone, useMola } from '../componentes';
import { AppPalmital, ChipData, cores, OfertaDupla, Passo, Placa } from '../contagem';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { FechoVivo, FundoVivo } from '../vivo';

// V17 · domingo 22/11 · "Faltam 3 dias" — placa 4→3, "se inscrever é fácil, difícil é chegar preparado" (escada),
// 3 dias = 3 passos, o preparatório, R$ 197 até quarta e R$ 297 na quinta. Voz Jenifer (interior de SP), batida disco.

/* 1. Faltam 3 dias ------------------------------------------------------- */
export const CenaContagem: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="*Faltam*" atraso={a.ini} tamanho={130} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={540}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34 }}>
          <Placa de="4" para="3" em={a.ini + 10} entra={a.ini - 6} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: cor.branco, paddingBottom: 30 }}>dias</div>
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 72, top: 1140, width: 936 }}>
        <Manchete texto="pras *inscrições.*" atraso={b.ini} tamanho={92} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <ChipData em={b.ini + Math.round((b.fim - b.ini) * 0.35)} y={1360} texto="Quarta · 25/11 · 12h" fundo={cor.branco} tinta={cor.roxoNoite} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Se inscrever é fácil. Difícil é chegar preparado. -------------------- */
const DEGRAUS = [cor.laranjaVivo, cor.coral, cor.roxo, cor.azul, cor.teal];

export const CenaFacil: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const check = useMola(a.ini + 14, { damping: 10, stiffness: 220 });
  const sobe = interpolate(frame, [b.ini + 30, b.ini + 60], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="Se inscrever / é *fácil.*" atraso={a.ini} tamanho={104} corTexto={cor.tinta} faixa={cor.branco} corFaixa={cor.verde} />
      </div>
      <div style={{ position: 'absolute', right: 80, top: 300 }}>
        <div style={{ width: 150, height: 150, borderRadius: 34, background: cor.branco, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', transform: `rotate(8deg) scale(${interpolate(check, [0, 1], [0.3, 1])})`, opacity: Math.min(1, check * 3) }}>
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke={cor.verde} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 600, width: 936 }}>
        <Manchete texto="Difícil é chegar / na prova *preparado.*" atraso={b.ini} tamanho={84} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} />
      </div>
      {/* escada que se constrói até a bandeira da prova */}
      {DEGRAUS.map((c, i) => {
        const p = useMola(b.ini + 6 + i * 5, { damping: 12, stiffness: 170 });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 90 + i * 180,
              bottom: 380,
              width: 180,
              height: 120 + i * 110,
              borderRadius: '24px 24px 0 0',
              background: c,
              boxShadow: 'inset 0 -14px 0 rgba(0,0,0,0.15)',
              transform: `scaleY(${p})`,
              transformOrigin: '50% 100%',
            }}
          />
        );
      })}
      <div style={{ position: 'absolute', left: 90 + 4 * 180 + 40, bottom: 380 + 120 + 4 * 110, opacity: interpolate(frame, [b.ini + 30, b.ini + 36], [0, 1], limita) }}>
        <svg width="110" height="150" viewBox="0 0 110 150">
          <rect x="8" y="0" width="10" height="150" rx="5" fill={cor.tinta} />
          <path d="M18 8 L104 30 L18 56 Z" fill={cor.ouro} stroke={cor.tinta} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ position: 'absolute', left: 90 + sobe * 4 * 180 + 30, bottom: 380 + 120 + sobe * 4 * 110 - 4 }}>
        <Surge em={b.ini + 20}>
          <Icone nome="icone-alvo" tamanho={120} />
        </Surge>
      </div>
      <Efeito nome="ding" em={a.ini + 14} volume={0.4} />
      {DEGRAUS.map((_, i) => (
        <Efeito key={i} nome="pop" em={b.ini + 10 + i * 5} volume={0.22} />
      ))}
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. 3 dias, 3 passos ------------------------------------------------------ */
export const CenaPlano: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="3 dias, / *3 passos.*" atraso={a.ini - 4} tamanho={124} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} />
      </div>
      <div style={{ position: 'absolute', left: 80, top: 640, display: 'flex', flexDirection: 'column', gap: 44 }}>
        <Passo em={a.ini + 10} rotulo="Hoje" texto="Descubra seu cargo e o que cai na prova" corRotulo={cor.roxo} icone={<Icone nome="icone-alvo" tamanho={96} />} />
        <Passo em={b.ini + 4} rotulo={'Seg\ne ter'} texto="Português e Matemática: caem pra todos" corRotulo={cor.azul} icone={<Icone nome="icone-portugues" tamanho={96} />} />
        <Passo em={c.ini + 2} rotulo="Qua 25" texto="Inscrição às 12h, já estudando" corRotulo={cor.laranjaVivo} icone={<Icone nome="icone-calendario" tamanho={96} />} />
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 4. O preparatório ------------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <AppPalmital ini={a.ini} fim={a.fim} titulo="Fuse *Aprova*" telas={['real-trilha', 'real-acerto', 'real-revisao']} itens={['Trilha de estudo', 'Questões', 'Revisão do que você erra']} />
    </FundoVivo>
  );
};

/* 5. R$ 197 até quarta, R$ 297 na quinta ---------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.rosa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Preparatório · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Até *quarta:*" atraso={a.ini} tamanho={116} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <OfertaDupla rotuloHoje="Até quarta · 25/11" rotuloDepois="Quinta · 26/11" tPreco={a.ini + Math.round(len * 0.25)} tSeis={a.ini + Math.round(len * 0.6)} tDepois={b.ini + 4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 6. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <AbsoluteFill>
        <FechoVivo manchete="Faltam / *3 dias.*" em={a.ini} len={a.fim - a.ini} tinta={cor.tinta} />
      </AbsoluteFill>
    </FundoVivo>
  );
};
