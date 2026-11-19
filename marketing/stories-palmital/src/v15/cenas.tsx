import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { Calendario25, FechoVivo, FundoVivo, vivas } from '../vivo';

// V15 · "Faz a conta" — só a oferta, em números grandes e um fundo de cor por frase: R$ 197 hoje, 6x sem juros
// (R$ 32,83, no cartão até 25/11), sobe para R$ 297 na próxima semana (sem preço riscado), inscrições em 25/11. Voz Raquel.

/** Número que quica ao entrar. */
const Quica: React.FC<{ em: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ em, children, style }) => {
  const p = useMola(em, { damping: 9, stiffness: 190, mass: 0.8 });
  return <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.2, 1])})`, opacity: Math.min(1, p * 3), ...style }}>{children}</div>;
};

const TECLAS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '=', '+'];

/** Calculadora colorida que entra girando. */
const Calculadora: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 13, stiffness: 110 });
  return (
    <div
      style={{
        width: 460,
        padding: 34,
        borderRadius: 50,
        background: cor.tinta,
        boxShadow: '0 40px 70px rgba(0,0,0,0.3)',
        transform: `translateY(${(1 - p) * 900}px) rotate(${(1 - p) * 120 - 6 + Math.sin(frame / 25) * 1.5}deg)`,
      }}
    >
      <div style={{ height: 130, borderRadius: 24, background: '#E9F7EF', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 28px', fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.tinta }}>
        197
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 26 }}>
        {TECLAS.map((t, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: 22,
              background: i % 4 === 3 ? cor.laranjaVivo : t === '=' ? cor.ouro : '#3F424C',
              color: t === '=' ? cor.tinta : cor.branco,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: 48,
              boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.25)',
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

/* 1. Faz a conta comigo ---------------------------------------------------- */
export const CenaConta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={vivas.laranja} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Manchete texto="Faz a conta / *comigo.*" atraso={a.ini} tamanho={140} faixa={cor.ouro} corFaixa={cor.tinta} centro />
      </div>
      <Em y={740}>
        <Calculadora em={a.ini + 4} />
      </Em>
      <Efeito nome="whoosh" em={a.ini + 4} volume={0.4} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2. Hoje: R$ 197 ---------------------------------------------------------- */
export const CenaPreco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const len = a.fim - a.ini;
  const t0 = a.ini + Math.round(len * 0.45);
  const conta = Math.round(interpolate(frame, [t0, t0 + 30], [0, 197], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));
  return (
    <FundoVivo paleta={vivas.turquesa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Hoje</Sobrelinha>
        <Manchete texto="O Fuse Aprova / sai por:" atraso={a.ini} tamanho={96} />
      </div>
      <Em y={660}>
        <Quica em={t0 - 4}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 110, color: cor.ouro, marginTop: 50 }}>R$</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 340, lineHeight: 1, color: cor.branco, fontVariantNumeric: 'tabular-nums', textShadow: '0 16px 0 rgba(0,0,0,0.15)' }}>{conta}</div>
          </div>
        </Quica>
      </Em>
      <Em y={1080}>
        <Surge em={t0 + 30}>
          <Chip fundo={cor.branco} texto={cor.tealSombra} tamanho={34}>
            Acesso completo
          </Chip>
        </Surge>
      </Em>
      <div style={{ position: 'absolute', right: 40, top: 1180 }}>
        <Surge em={t0 + 20} de="direita">
          <Img src={staticFile('img/capi-celebrando.webp')} style={{ height: 380, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.25))' }} />
        </Surge>
      </div>
      <Efeito nome="ding" em={t0 + 30} volume={0.45} />
    </FundoVivo>
  );
};

/* 3. 6x sem juros: R$ 32,83 por mês ---------------------------------------- */
export const CenaParcela: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={vivas.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4} tinta={cor.tinta}>
          No cartão de crédito
        </Sobrelinha>
      </div>
      <Em y={380}>
        <Quica em={a.ini + Math.round(len * 0.25)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 300, lineHeight: 0.9, color: cor.tinta }}>6x</div>
            <div style={{ background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 76, lineHeight: 1, padding: '18px 32px', borderRadius: 26, transform: 'rotate(-4deg)' }}>
              sem
              <br />
              juros
            </div>
          </div>
        </Quica>
      </Em>
      <Em y={820}>
        <Quica em={b.ini + 8}>
          <div style={{ padding: '36px 60px', borderRadius: 48, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 190, lineHeight: 1, color: cor.laranja }}>R$ 32,83</div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 46, color: cor.muted, marginTop: 6 }}>por mês</div>
          </div>
        </Quica>
      </Em>
      <Em y={1340}>
        <Surge em={b.ini + 34}>
          <Chip fundo={cor.tinta} tamanho={34}>
            Parcelamento até 25/11
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={a.ini + Math.round(len * 0.25)} volume={0.45} />
      <Efeito nome="ding" em={b.ini + 8} volume={0.45} />
    </FundoVivo>
  );
};

/* 4. Na próxima semana sobe para R$ 297 ------------------------------------ */
export const CenaSobe: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const frame = useCurrentFrame();
  const len = a.fim - a.ini;
  const t0 = a.ini + Math.round(len * 0.55);
  const seta = useMola(a.ini + 6, { damping: 12, stiffness: 160 });
  return (
    <FundoVivo paleta={vivas.coral} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Manchete texto="Na próxima / *semana:*" atraso={a.ini} tamanho={120} faixa={cor.branco} corFaixa={cor.vermelho} />
      </div>
      <Em y={680}>
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: cor.branco,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 24px 50px rgba(0,0,0,0.25)',
            transform: `translateY(${(1 - seta) * 400 + Math.sin(frame / 7) * 8}px) scale(${seta})`,
          }}
        >
          <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke={cor.vermelho} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </Em>
      <Em y={1000}>
        <Quica em={t0}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 260, lineHeight: 1, color: cor.branco, textShadow: '0 16px 0 rgba(0,0,0,0.15)' }}>R$ 297</div>
        </Quica>
      </Em>
      <Em y={1330}>
        <Surge em={t0 + 26}>
          <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={36}>
            Hoje ainda é R$ 197
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="whoosh" em={a.ini + 6} volume={0.35} />
      <Efeito nome="pop" em={t0} volume={0.5} />
    </FundoVivo>
  );
};

/* 5. Inscrições em 25/11: dá tempo de começar antes ------------------------ */
export const CenaData: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={vivas.roxo} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Abrem as / *inscrições.*" atraso={a.ini} tamanho={116} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={700}>
        <Calendario25 em={a.ini + 4} circulo={a.ini + Math.round(len * 0.5)} largura={400} />
      </Em>
      <Em y={1260}>
        <Surge em={b.ini}>
          <Chip fundo={cor.branco} texto={cor.roxoNoite} tamanho={38}>
            Dá tempo de começar antes
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="ding" em={b.ini} volume={0.4} />
    </FundoVivo>
  );
};

/* 6. Fecho ----------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={vivas.turquesa} duracao={duracao}>
      <FechoVivo manchete="Pelo preço / de *hoje.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
