import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, Em, PropsCena } from '../comum';
import { Confetes, Efeito, useMola } from '../componentes';
import { ChipData, cores } from '../contagem';
import { Cabeca, em, FechoPalmital, ItemCheck } from '../campanha/Cabeca';
import { CelularApp } from '../campanha/CelularApp';
import type { TipoTela } from '../venda/telas';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Surge } from '../v8/cinema';
import { FundoVivo, type PaletaViva } from '../vivo';

// V47/V48 · "As 5 coisas" — painel de largada com cinco luzes: cada benefício acende uma; a 5ª fica dourada com "?"
// até a revelação, quando as cinco ficam verdes (largada: começar leva um minuto). Mesmas cenas para as duas vozes.

const VERDE = '#22C55E';

/** Painel de largada: `acesas` luzes ligadas (a última acende no quadro `em`); todas verdes a partir de `verde`. */
const Luzes: React.FC<{ acesas: number; em?: number; verde?: number; tam?: number }> = ({ acesas, em: t0 = -99, verde = 99999, tam = 150 }) => {
  const frame = useCurrentFrame();
  const pop = useMola(t0, { damping: 9, stiffness: 200 });
  const largada = frame >= verde;
  const pulso = 0.5 + 0.5 * Math.sin(frame / 5);
  return (
    <div style={{ display: 'flex', gap: tam * 0.18, padding: tam * 0.2, borderRadius: tam * 0.36, background: 'linear-gradient(180deg, #2A2E36, #101216)', border: `${tam * 0.06}px solid #3B414C`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), 0 0 0 4px #15171B, 0 40px 80px rgba(0,0,0,0.45)' }}>
      {[0, 1, 2, 3, 4].map((k) => {
        const acesa = largada || k < acesas - 1 || (k === acesas - 1 && frame >= t0);
        const c = largada ? VERDE : k === 4 ? cor.ouro : cor.laranjaVivo;
        const misterio = k === 4 && !acesa;
        const s = !largada && k === acesas - 1 ? interpolate(pop, [0, 1], [1.3, 1]) : 1;
        return (
          <div
            key={k}
            style={{
              width: tam,
              height: tam,
              borderRadius: '50%',
              transform: `scale(${s})`,
              background: acesa ? `radial-gradient(circle at 36% 30%, rgba(255,255,255,0.85) 0 9%, transparent 38%), ${c}` : 'radial-gradient(circle at 38% 32%, #4A4F5A, #1B1D22 70%)',
              boxShadow: acesa ? `0 0 ${tam * 0.45}px ${c}, inset 0 -${tam * 0.06}px ${tam * 0.1}px rgba(0,0,0,0.3)` : misterio ? `0 0 0 ${tam * 0.05}px ${cor.ouro}, 0 0 ${tam * 0.35 * pulso}px ${cor.ouro}` : `inset 0 ${tam * 0.05}px ${tam * 0.1}px rgba(0,0,0,0.6)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: tam * 0.5,
              color: acesa ? 'rgba(255,255,255,0.95)' : misterio ? cor.ouro : 'rgba(255,255,255,0.22)',
              textShadow: acesa ? '0 3px 0 rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {misterio ? '?' : k + 1}
          </div>
        );
      })}
    </div>
  );
};

/* 1. Cinco coisas que quem estuda sozinho não faz --------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const p = useMola(a.ini - 8, { damping: 14, stiffness: 110 });
  const selo = useMola(em(a, 0.62), { damping: 9, stiffness: 190 });
  return (
    <FundoVivo paleta={cores.roxo} duracao={duracao}>
      <Cabeca texto="*5 coisas* que quem / estuda sozinho não faz." em={a.ini} tamanho={92} />
      <Em y={820}>
        <div style={{ transform: `perspective(1600px) rotateX(${8 + (1 - p) * 40}deg) scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: Math.min(1, p * 2) }}>
          <Luzes acesas={0} />
        </div>
      </Em>
      <div style={{ position: 'absolute', left: 600, top: 1000, padding: '14px 26px', borderRadius: 22, background: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: cor.roxoSombra, transform: `rotate(-5deg) scale(${selo})`, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}>
        A 5ª surpreende
      </div>
      <div style={{ position: 'absolute', left: 120, top: 1080 }}>
        <Surge em={em(a, 0.3)}>
          <Img src={staticFile('img/capi-acenando.webp')} style={{ height: 520, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.35))' }} />
        </Surge>
      </div>
      <Efeito nome="whoosh" em={a.ini - 8} volume={0.35} />
      <Efeito nome="pop" em={em(a, 0.62)} volume={0.5} />
      <Aviso />
    </FundoVivo>
  );
};

/* 2 a 5. Um benefício por cena: luz que acende, o app e os itens ao lado ------ */
type Tela = { tipo: TipoTela; em: number };
const cenaBeneficio = (n: number, paleta: PaletaViva, titulo: string, telas: (f: PropsCena['falas']) => Tela[], itens: (f: PropsCena['falas']) => { texto: string; em: number }[]): React.FC<PropsCena> => {
  const Cena: React.FC<PropsCena> = ({ falas, duracao }) => {
    const [a] = falas;
    const frame = useCurrentFrame();
    const cel = useMola(a.ini - 4, { damping: 14, stiffness: 110 });
    return (
      <FundoVivo paleta={paleta} duracao={duracao}>
        <Cabeca texto={titulo} em={a.ini} tamanho={104} />
        <Em y={660}>
          <Luzes acesas={n} em={a.ini + 2} tam={76} />
        </Em>
        <div style={{ position: 'absolute', left: 560, top: 760, transform: `translateX(${(1 - cel) * 900}px) translateY(${Math.sin(frame / 22) * 8}px) rotate(4deg)` }}>
          <CelularApp largura={430} fim={duracao + 30} telas={telas(falas)} />
        </div>
        <div style={{ position: 'absolute', left: 50, top: 820, width: 480, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {itens(falas).map((it) => (
            <ItemCheck key={it.texto} texto={it.texto} em={it.em} tamanho={38} />
          ))}
        </div>
        <Efeito nome="ding" em={a.ini + 2} volume={0.45} />
        <Aviso />
      </FundoVivo>
    );
  };
  return Cena;
};

export const CenaUm = cenaBeneficio(
  1,
  cores.azul,
  '*1.* Só o que cai / no seu cargo.',
  ([a]) => [{ tipo: 'cargo', em: a.ini - 4 }, { tipo: 'trilha', em: em(a, 0.5) }],
  ([a]) => [
    { texto: 'Só o seu cargo', em: em(a, 0.25) },
    { texto: 'Trilha montada pelo edital', em: em(a, 0.6) },
  ],
);

export const CenaDois = cenaBeneficio(
  2,
  cores.laranja,
  '*2.* +10 mil questões / no estilo da FAU.',
  ([a]) => [{ tipo: 'questao', em: a.ini - 4 }],
  ([a]) => [
    { texto: '+10 mil questões', em: em(a, 0.2) },
    { texto: 'No estilo da FAU', em: em(a, 0.4) },
    { texto: 'A banca da prova de Palmital', em: em(a, 0.65) },
  ],
);

export const CenaTres = cenaBeneficio(
  3,
  cores.coral,
  '*3.* Errou? / *Entende o porquê.*',
  ([a, b]) => [{ tipo: 'erro', em: a.ini - 4 }, { tipo: 'revisao', em: b.ini - 4 }],
  ([a, b]) => [
    { texto: 'Explicação em cada questão', em: em(a, 0.45) },
    { texto: 'Mini-aula do tema', em: em(a, 0.75) },
    { texto: 'O erro volta no dia certo', em: b.ini + 4 },
  ],
);

export const CenaQuatro = cenaBeneficio(
  4,
  cores.turquesa,
  '*4.* Simulado no / *formato da prova.*',
  ([a]) => [{ tipo: 'simulado', em: a.ini - 4 }],
  ([a, b]) => [
    { texto: 'Treino no formato da FAU', em: em(a, 0.15) },
    { texto: '40 questões · 4 horas', em: em(a, 0.55) },
    { texto: 'Modo treino: aos pouquinhos', em: em(a, 0.8) },
    { texto: '10 min por dia, no celular', em: b.ini },
  ],
);

/* 6. E a 5ª? Começar leva um minuto: largada verde e a tela de pagamento ------- */
export const CenaCinco: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const revela = b.ini + 4;
  const depois = frame >= b.ini;
  const cel = useMola(em(b, 0.15), { damping: 14, stiffness: 110 });
  return (
    <FundoVivo paleta={depois ? cores.roxo : cores.sol} duracao={duracao}>
      <div key={depois ? 1 : 0}>
        <Cabeca texto={depois ? '*5.* Começar leva / *1 minuto.*' : 'E a *5ª*?'} em={depois ? b.ini : a.ini} tamanho={depois ? 104 : 150} corTexto={depois ? cor.branco : cor.tinta} />
      </div>
      {depois ? (
        <>
          <Em y={660}>
            <Luzes acesas={4} verde={revela} tam={76} />
          </Em>
          <div style={{ position: 'absolute', left: 70, top: 780, transform: `translateY(${(1 - cel) * 1200 + Math.sin(frame / 22) * 8}px) rotate(-4deg)` }}>
            <CelularApp largura={430} fim={duracao + 30} telas={[{ tipo: 'pagamento', em: em(b, 0.15) }]} />
          </div>
          <div style={{ position: 'absolute', left: 540, top: 880, width: 490, display: 'flex', flexDirection: 'column', gap: 26 }}>
            <ItemCheck texto="Pix: acesso na hora" em={em(b, 0.3)} tamanho={40} de="direita" />
            <ItemCheck texto="Cartão: acesso na hora" em={em(b, 0.42)} tamanho={40} de="direita" />
            <ItemCheck texto="No cartão, até 6x sem juros" em={em(b, 0.7)} tamanho={40} de="direita" />
          </div>
          <Confetes inicio={revela} />
        </>
      ) : (
        <>
          <Em y={780}>
            <Luzes acesas={4} />
          </Em>
          <div style={{ position: 'absolute', left: 330, top: 960 }}>
            <Surge em={a.ini}>
              <Img src={staticFile('img/capi-constancia.webp')} style={{ height: 520, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.3))' }} />
            </Surge>
          </div>
        </>
      )}
      <Efeito nome="ding" em={revela} volume={0.55} />
      <Aviso corTexto={depois ? undefined : 'rgba(45,47,54,0.85)'} />
    </FundoVivo>
  );
};

/* 7. 6x de R$ 32,83, 7 dias de garantia, R$ 197 até 5/12 --------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const fim = frame >= c.ini;
  return (
    <FundoVivo paleta={cores.laranja} duracao={duracao}>
      <div key={fim ? 1 : 0}>
        <Cabeca texto={fim ? '*R$ 197* / só até 5/12.' : '*R$ 197* / em até 6x.'} em={fim ? c.ini : a.ini} tamanho={110} />
      </div>
      <Em x={560} y={760}>
        <Cartao em={a.ini - 4} />
      </Em>
      <Em y={1130}>
        <SeisVezes em={a.ini + 6} />
      </Em>
      <ChipData em={b.ini} y={1380} texto="7 dias de garantia · 100% de volta" fundo={cor.branco} tinta={cor.verde} tamanho={44} />
      <ChipData em={em(c, 0.55)} y={1500} texto="Depois de 5/12, R$ 297" fundo={cor.branco} tinta={cor.vermelho} tamanho={44} />
      <Efeito nome="whoosh" em={a.ini - 4} volume={0.35} />
      <Efeito nome="pop" em={b.ini} volume={0.45} />
      <Efeito nome="ding" em={c.ini} volume={0.45} />
      <Aviso />
    </FundoVivo>
  );
};

/* 8. Fecho ------------------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={cores.magenta} duracao={duracao}>
      <FechoPalmital manchete="Corre: / *link na bio.*" em={a.ini} len={a.fim - a.ini} />
    </FundoVivo>
  );
};
