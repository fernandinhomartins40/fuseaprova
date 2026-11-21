import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena, SeloBatida } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { ChipData, cores, OfertaDupla, Passo, PlacasPalavra, Relogio } from '../contagem';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { FechoVivo, FundoVivo } from '../vivo';

// V20 · quarta 25/11 · "É hoje" — placas viram H-O-J-E com confete, relógio chega a 12h (abrem as inscrições), as
// datas do edital, último dia do R$ 197 (amanhã R$ 297) e do 6x no cartão; "inscrição feita? agora é estudar".
// Voz Ana Alice, batida funk de festa.

/* 1. É hoje! Ao meio-dia abrem as inscrições ------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = b.fim - b.ini;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 0, top: 250, width: 1080, display: 'flex', justifyContent: 'center' }}>
        <Sobrelinha atraso={a.ini - 8} tinta={cor.tinta}>
          Concurso · Prefeitura de Palmital
        </Sobrelinha>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 360, width: 1080, display: 'flex', justifyContent: 'center' }}>
        <Manchete texto="É" atraso={a.ini - 6} tamanho={120} corTexto={cor.tinta} />
      </div>
      <Em y={600}>
        <PlacasPalavra palavra="HOJE" em={a.ini} />
      </Em>
      <Em y={950}>
        <Relogio ini={b.ini} fim={b.ini + Math.round(len * 0.35)} de={8} tamanho={340} />
      </Em>
      <ChipData em={b.ini + Math.round(len * 0.4)} y={1330} texto="Hoje · 25/11 · 12h" fundo={cor.tinta} />
      <ChipData em={b.ini + Math.round(len * 0.6)} y={1430} texto="Abrem as inscrições" fundo={cor.branco} tinta={cor.laranja} tamanho={34} />
      <Confetes inicio={a.ini + 20} quantidade={70} />
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 2. As datas: inscrições até 27/12, prova objetiva em fevereiro ---------- */
export const CenaInscricao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Anota *aí:*" atraso={a.ini - 2} tamanho={124} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 80, top: 640, display: 'flex', flexDirection: 'column', gap: 44 }}>
        <Passo em={a.ini + 4} rotulo={'25/11\n12h'} texto="Abrem as inscrições, no site da banca" corRotulo={cor.laranjaVivo} />
        <Passo em={a.ini + Math.round(len * 0.45)} rotulo={'27/12\n23h59'} texto="Último dia pra se inscrever" corRotulo={cor.roxo} />
        <Passo em={b.ini + 2} rotulo="21/02" texto="Prova objetiva" corRotulo={cor.vermelho} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 3. Último dia do R$ 197; amanhã R$ 297 ---------------------------------- */
export const CenaUltimo: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Preparatório · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="*Atenção:*" atraso={a.ini} tamanho={120} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <OfertaDupla rotuloHoje="Só hoje · 25/11" rotuloDepois="Amanhã · 26/11" tPreco={a.ini + Math.round(len * 0.4)} tSeis={a.ini + Math.round(len * 0.85)} tDepois={b.ini + 4} />
      <SeloBatida texto="ÚLTIMO DIA" em={a.ini + Math.round(len * 0.3)} x={640} y={330} tamanho={56} giro={6} />
      <Aviso />
    </FundoVivo>
  );
};

/* 4. Último dia pra parcelar em 6x ---------------------------------------- */
export const CenaCartao: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="Último dia / pra *parcelar.*" atraso={a.ini} tamanho={108} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em x={560} y={680}>
        <Cartao em={a.ini + 6} />
      </Em>
      <Em y={1080}>
        <SeisVezes em={a.ini + Math.round(len * 0.45)} />
      </Em>
      <ChipData em={a.ini + Math.round(len * 0.75)} y={1330} texto="No cartão · só hoje, 25/11" fundo={cor.branco} tinta={cor.roxoNoite} />
      <Efeito nome="whoosh" em={a.ini + 6} volume={0.35} />
      <Efeito nome="ding" em={a.ini + Math.round(len * 0.45)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 5. Inscrição feita? Agora é estudar. Garante hoje. ---------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const troca = interpolate(frame, [b.ini - 6, b.ini + 4], [1, 0], limita);
  const marca = useMola(a.ini + 10, { damping: 10, stiffness: 220 });
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      {troca > 0 ? (
        <AbsoluteFill style={{ opacity: troca }}>
          <Em y={560}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '30px 46px', borderRadius: 40, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 110, height: 110, borderRadius: 28, border: `8px solid ${cor.verde}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={cor.verde} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scale(${marca})` }}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 72, color: cor.tinta }}>Inscrição feita?</div>
            </div>
          </Em>
          <div style={{ position: 'absolute', left: 72, top: 760, width: 936 }}>
            <Manchete texto="Agora é / *estudar.*" atraso={a.ini + Math.round((a.fim - a.ini) * 0.45)} tamanho={140} corTexto={cor.tinta} faixa={cor.laranjaVivo} centro />
          </div>
          <div style={{ position: 'absolute', left: 0, top: 1130, width: 1080, display: 'flex', justifyContent: 'center' }}>
            <Surge em={a.ini + Math.round((a.fim - a.ini) * 0.6)}>
              <Img src={staticFile('img/capi-estudando.webp')} style={{ height: 380, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2))' }} />
            </Surge>
          </div>
          <Efeito nome="ding" em={a.ini + 10} volume={0.4} />
        </AbsoluteFill>
      ) : null}
      {frame >= b.ini - 4 ? (
        <>
          <FechoVivo manchete="Garanta / *hoje.*" em={b.ini} len={b.fim - b.ini} tinta={cor.tinta} />
          <Em y={1380}>
            <Surge em={b.ini + Math.round((b.fim - b.ini) * 0.7)}>
              <div style={{ padding: '16px 32px', borderRadius: 999, background: cor.tinta, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase' }}>
                Preparatório · Prefeitura de Palmital
              </div>
            </Surge>
          </Em>
        </>
      ) : (
        <Aviso corTexto="rgba(45,47,54,0.85)" />
      )}
    </FundoVivo>
  );
};
