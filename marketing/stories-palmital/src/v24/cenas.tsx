import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Surge } from '../v8/cinema';
import { FechoVivo, FundoVivo } from '../vivo';

// V24 · quarta 25/11 · "A palavra de uma letra" — um "à" gigante despenca e treme a tela; uma folha de prova com duas
// frases; a caneta vermelha corrige; o truque "volto de, vou a"; a folha de explicação do app; cartão em 6x. Voz Keren.

const CANETA = '#D7263D';
const MAO = "'Segoe Print', 'Comic Sans MS', cursive";

/** "à" gigante que cai do alto e quica; a tela treme no impacto. */
const LetraQueCai: React.FC<{ em: number }> = ({ em: t0 }) => {
  const frame = useCurrentFrame();
  const p = useMola(t0, { damping: 9, stiffness: 160, mass: 1.2 });
  const impacto = frame - t0 - 7;
  const treme = impacto > 0 && impacto < 14 ? Math.sin(impacto * 2.6) * (14 - impacto) * 1.4 : 0;
  const poeira = interpolate(frame, [t0 + 6, t0 + 26], [0, 1], limita);
  return (
    <div style={{ position: 'relative', width: 700, height: 760, transform: `translateX(${treme}px)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 760, lineHeight: 0.8, color: cor.branco, textShadow: '0 30px 0 rgba(0,0,0,0.18)', transform: `translateY(${(1 - p) * -1500}px) rotate(${(1 - p) * -25}deg)` }}>
        à
      </div>
      {[-1, 1].map((lado) =>
        [0, 1, 2].map((i) => (
          <div
            key={`${lado}${i}`}
            style={{
              position: 'absolute',
              left: 350 + lado * (120 + poeira * (180 + i * 60)),
              bottom: 40 + i * 40 * poeira,
              width: 46 - i * 10,
              height: 46 - i * 10,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              opacity: poeira > 0 && poeira < 1 ? 1 - poeira : 0,
            }}
          />
        )),
      )}
      <div style={{ position: 'absolute', left: 120, right: 120, bottom: 20, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', transform: `scaleX(${p})` }} />
      <Efeito nome="pop" em={t0 + 7} volume={0.7} />
    </div>
  );
};

/** Folha de prova pautada com duas frases; a caneta vermelha marca X na primeira e ✓ na segunda. */
const FolhaProva: React.FC<{ entra: number; x?: number; certo?: number }> = ({ entra, x = 99999, certo = 99999 }) => {
  const frame = useCurrentFrame();
  const p = useMola(entra, { damping: 14, stiffness: 120 });
  const tracoX = interpolate(frame, [x, x + 10], [0, 1], limita);
  const tracoC = interpolate(frame, [certo, certo + 10], [0, 1], limita);
  const linha = (letra: string, texto: string, marca: 'x' | 'c', traco: number) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, padding: '34px 30px', borderBottom: '3px solid #C9D8F0' }}>
      <div style={{ width: 76, height: 76, borderRadius: '50%', border: `5px solid ${cor.tinta}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: cor.tinta }}>{letra}</div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.tinta, opacity: marca === 'x' ? 1 - tracoX * 0.45 : 1 }}>{texto}</div>
      <svg width="170" height="170" viewBox="0 0 100 100" style={{ position: 'absolute', right: 10, top: '50%', marginTop: -85, overflow: 'visible' }}>
        {marca === 'x' ? (
          <path d="M15 15 L85 85 M85 15 L15 85" fill="none" stroke={CANETA} strokeWidth="11" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traco} />
        ) : (
          <path d="M10 55 L40 82 L92 18" fill="none" stroke={cor.verde} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traco} />
        )}
      </svg>
    </div>
  );
  return (
    <div style={{ width: 900, background: '#FFFDF7', borderRadius: 18, boxShadow: '0 40px 80px rgba(0,0,0,0.3)', padding: '30px 30px 40px', transform: `translateY(${(1 - p) * 1200}px) rotate(${-2 + (1 - p) * 10}deg)`, borderLeft: `10px solid ${CANETA}` }}>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 4, color: cor.muted, padding: '0 30px 10px' }}>PORTUGUÊS · QUESTÃO 7</div>
      {linha('A', 'Fomos à Curitiba.', 'x', tracoX)}
      {linha('B', 'Fomos a Curitiba.', 'c', tracoC)}
      <Efeito nome="whoosh" em={entra} volume={0.35} />
      <Efeito nome="pop" em={x} volume={0.5} />
      <Efeito nome="ding" em={certo} volume={0.5} />
    </div>
  );
};

/* 1. Uma letra derruba ------------------------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.azul} duracao={duracao}>
      <Cabeca texto="*1 letra* derruba / muita gente." em={a.ini} sobre="Prova de Palmital" tamanho={112} />
      <Em y={720}>
        <LetraQueCai em={a.ini + 2} />
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Qual está certa? ------------------------------------------------------- */
export const CenaProva: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.sol} duracao={duracao}>
      <Cabeca texto="Qual está / *certa?*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.ouro} tamanho={130} />
      <Em y={800}>
        <FolhaProva entra={a.ini - 4} />
      </Em>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 3. Quem marcou a primeira errou ------------------------------------------ */
export const CenaCorrige: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.coral} duracao={duracao}>
      <Cabeca texto="Marcou a A? / *Errou.*" em={a.ini} faixa={cor.branco} corFaixa={CANETA} tamanho={130} />
      <Em y={800}>
        <FolhaProva entra={-60} x={em(a, 0.4)} certo={em(a, 0.8)} />
      </Em>
      <Aviso />
    </FundoVivo>
  );
};

/* 4. O truque: volto de, vou a --------------------------------------------- */
const Par: React.FC<{ quando: number; volto: string; vou: string; crase: boolean }> = ({ quando, volto, vou, crase }) => {
  const p = useMola(quando, { damping: 13, stiffness: 150 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ padding: '24px 30px', borderRadius: 30, background: cor.tinta, fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.branco, whiteSpace: 'nowrap' }}>{volto}</div>
      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={cor.tinta} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
      <div style={{ padding: '24px 30px', borderRadius: 30, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 60, color: cor.tinta, whiteSpace: 'nowrap', boxShadow: '0 16px 30px rgba(0,0,0,0.2)' }}>
        {vou.split('|')[0]}
        <span style={{ color: crase ? cor.laranjaVivo : cor.verde, background: crase ? cor.laranjaSoft : cor.verdeSoft, borderRadius: 14, padding: '0 10px' }}>{vou.split('|')[1]}</span>
        {vou.split('|')[2]}
      </div>
      <Efeito nome="pop" em={quando} volume={0.4} />
    </div>
  );
};

export const CenaRegra: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.lima} duracao={duracao}>
      <Cabeca texto="O truque: / *volto de, vou a.*" em={a.ini} corTexto={cor.tinta} faixa={cor.tinta} corFaixa={cor.branco} tamanho={104} />
      <div style={{ position: 'absolute', left: 0, top: 760, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 70 }}>
        <Par quando={em(a, 0.45)} volto="Volto de" vou="Vou |a| Curitiba" crase={false} />
        <Par quando={em(a, 0.75)} volto="Volto da" vou="Vou |à| Bahia" crase />
        <Surge em={em(a, 0.9)}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 64, color: cor.tinta, textAlign: 'center', background: cor.ouro, padding: '14px 36px', borderRadius: 26 }}>
            Voltou <u>da</u>? Tem crase.
          </div>
        </Surge>
      </div>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/* 5. No app, cada erro vem com a explicação -------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const cel = useMola(a.ini - 6, { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <Cabeca texto="Errou? / *Explicação na hora.*" em={a.ini} sobre="No Fuse Aprova" tamanho={100} />
      <div style={{ position: 'absolute', left: 300, top: 660, transform: `translateY(${(1 - cel) * 1200}px)` }}>
        <CelularApp largura={480} fim={duracao + 30} telas={[{ tipo: 'erro', em: a.ini - 6 }]} />
      </div>
      <Aviso />
    </FundoVivo>
  );
};

/* 6. R$ 197 em 6x no cartão, até 5/12 -------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <Cabeca texto="*R$ 197* / até 5/12." em={a.ini} tamanho={130} />
      <Em x={560} y={700}>
        <Cartao em={a.ini + 4} />
      </Em>
      <Em y={1120}>
        <SeisVezes em={em(a, 0.5)} />
      </Em>
      <ChipData em={em(a, 0.85)} y={1400} texto="Depois de 5/12, R$ 297" fundo={cor.branco} tinta={cor.vermelho} />
      <Efeito nome="whoosh" em={a.ini + 4} volume={0.35} />
      <Efeito nome="ding" em={em(a, 0.5)} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 7. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.turquesa} duracao={duracao}>
      <FechoVivo manchete="Não erre / *a crase.*" em={a.ini} len={40} />
    </FundoVivo>
  );
};
