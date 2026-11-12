import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, Icone, useMola } from '../componentes';
import type { Linha } from '../linhaDoTempo';
import { cor, fonte } from '../tema';
import { Centro, FundoCinema, Manchete, paletas, Sobrelinha, Surge } from './cinema';
import { AvisoPersonagem, BlocoOferta, CelularEdital, Fechamento, Personagem, QuestaoAbstrata, useSaida, VitrineApp } from './pecas';

// V8 · "A notificação" — a pessoa se vê recebendo o edital sem ter começado; a Ana é a história; o app é a saída
const ana = { cabelo: '#3B2417', camisa: cor.teal, longo: true };

/* 1. Gancho: a notificação do edital ------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const cel = useMola(0, { damping: 18, stiffness: 90 });
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Em y={250}>
        <div style={{ transform: `translateY(${(1 - cel) * 900}px) rotate(${(1 - cel) * 6}deg)` }}>
          <CelularEdital em={a.ini + 6} largura={540} />
        </div>
      </Em>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 52%, rgba(6,8,16,0.96) 74%)' }} />
      <div style={{ position: 'absolute', left: 72, top: 1320, width: 936 }}>
        <Manchete texto="E você ainda / *não começou?*" atraso={b.ini - 2} tamanho={104} faixa={cor.vermelho} />
      </div>
    </FundoCinema>
  );
};

/* 2. História: a Ana deixou para depois --------------------------------- */
const passos = [
  { icone: 'icone-relogio', texto: 'Esperou o edital sair' },
  { icone: 'icone-portugues', texto: 'Apostila genérica, de todas as bancas' },
  { icone: 'icone-simulados', texto: 'Na prova, um jeito de cobrar que nunca treinou' },
];

export const CenaHistoria: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, , , d] = falas;
  const frame = useCurrentFrame();
  return (
    <FundoCinema paleta={paletas.alerta} duracao={duracao}>
      <Centro topo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, marginTop: 20 }}>
          <Personagem nome="Ana" pessoa={{ ...ana, humor: frame >= d.ini + 30 ? 'triste' : 'neutro' }} em={a.ini - 6} tamanho={210} />
          <Surge em={a.ini + 8} de="esquerda">
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 58, lineHeight: 1.04, color: cor.branco }}>
              Quer passar em
              <br />
              <span style={{ color: cor.ouro }}>Palmital</span>
            </div>
            <div style={{ height: 10 }} />
            <AvisoPersonagem />
          </Surge>
        </div>
        <div style={{ position: 'relative', marginTop: 56, paddingLeft: 48 }}>
          <div style={{ position: 'absolute', left: 47, top: 40, width: 4, height: interpolate(frame, [falas[1].ini, d.ini + 10], [0, 250], limita), background: 'rgba(255,255,255,0.25)' }} />
          {passos.map((p, i) => {
            const ruim = i === 2;
            return (
              <Surge key={p.texto} em={falas[i + 1].ini - 4} de="esquerda">
                <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 30, marginLeft: -48 }}>
                  <div style={{ flex: 'none', width: 96, height: 96, borderRadius: 28, background: ruim ? cor.vermelho : 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icone nome={p.icone} tamanho={62} />
                  </div>
                  <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, lineHeight: 1.1, color: ruim ? '#FFB4B4' : cor.branco, width: 760 }}>{p.texto}</div>
                </div>
              </Surge>
            );
          })}
        </div>
      </Centro>
      <Em y={1060}>
        <Surge em={d.ini + 6}>
          <div style={{ transform: 'rotate(-3deg)' }}>
            <QuestaoAbstrata largura={600} marca={{ em: d.ini + 40, certo: false }} />
          </div>
        </Surge>
      </Em>
      {falas.slice(1).map((f) => (
        <Efeito key={f.ini} nome="pop" em={f.ini - 4} volume={0.3} />
      ))}
    </FundoCinema>
  );
};

/* 3. Virada: não é estudar mais, é treinar no jeito da banca ------------ */
export const CenaVirada: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const sai = useSaida(b.ini - 2);
  const frame = useCurrentFrame();
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      {frame < b.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Centro>
            <Manchete texto="Estudou muito. / Mas *tarde*, e do / *jeito errado.*" atraso={a.ini} tamanho={106} faixa={cor.vermelho} />
          </Centro>
        </AbsoluteFill>
      ) : (
        <Sequence from={b.ini - 2} layout="none">
          <Centro>
            <Sobrelinha>O que ninguém te conta</Sobrelinha>
            <Manchete texto="Quem passa não é / quem estuda *mais.*" tamanho={94} faixa={cor.branco} corFaixa={cor.tinta} />
            <div style={{ height: 70 }} />
            <Manchete texto="É quem treina / no *jeito da banca.*" atraso={c.ini - b.ini} tamanho={112} />
          </Centro>
          <Efeito nome="whoosh" em={0} volume={0.4} />
          <Efeito nome="ding" em={c.ini - b.ini + 10} volume={0.4} />
        </Sequence>
      )}
    </FundoCinema>
  );
};

/* 4. Produto: o app aparece pela primeira vez --------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <VitrineApp ini={b.ini} fim={b.fim} logo={a.ini + 2} />
    </FundoCinema>
  );
};

/* 5. Oferta com o motivo antes do preço e a data-limite ----------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.oferta} duracao={duracao}>
    <BlocoOferta falas={falas} motivo="Pro dinheiro não ser / motivo pra *esperar* / o edital:" />
  </FundoCinema>
);

/* 6. Fecho: a mesma notificação, agora com meses de treino --------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const sai = useSaida(c.ini - 2);
  return (
    <FundoCinema paleta={frame < c.ini - 2 ? paletas.verde : paletas.noite} duracao={duracao}>
      {frame < c.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Em y={250}>
            <Surge em={a.ini - 8}>
              <CelularEdital em={a.ini + 4} largura={500}>
                <div style={{ position: 'absolute', left: -80, right: -80, top: 700, display: 'flex', justifyContent: 'center' }}>
                  <Surge em={b.ini + 2}>
                    <Chip fundo={cor.verde} tamanho={46}>
                      ✓ Você já treinou por meses
                    </Chip>
                  </Surge>
                </div>
              </CelularEdital>
            </Surge>
          </Em>
          <Efeito nome="ding" em={b.ini + 2} volume={0.45} />
        </AbsoluteFill>
      ) : (
        <Sequence from={c.ini - 2} layout="none">
          <div style={{ position: 'absolute', left: 72, top: 360, width: 936 }}>
            <Manchete texto="Começa *antes.*" tamanho={140} />
          </div>
          <Fechamento em={8} y={720} pergunta="Qual cargo você vai tentar? Comenta 👇" />
        </Sequence>
      )}
    </FundoCinema>
  );
};

/** Barra fixa no topo: o tempo até a prova escorre na história e volta cheio quando o app entra. */
export const criarContagem = (linha: Linha): React.FC =>
  function Contagem() {
    const frame = useCurrentFrame();
    const cena = (n: string) => linha.cenas.find((c) => c.nome === n)!;
    const fimHistoria = cena('historia').inicio + cena('historia').duracao;
    const produto = cena('produto').inicio + 20;
    const marca = cena('marca').inicio;
    const depois = frame >= produto;
    const valor = depois ? interpolate(frame, [produto, produto + 24], [0.06, 1], limita) : interpolate(frame, [10, fimHistoria], [1, 0.06], limita);
    const tinta = depois ? cor.verde : valor > 0.4 ? cor.laranjaVivo : cor.vermelho;
    const some = interpolate(frame, [marca - 10, marca], [1, 0], limita) * interpolate(frame, [0, 8], [0, 1], limita);
    return (
      <div style={{ position: 'absolute', left: 72, right: 72, top: 176, opacity: some, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 24, letterSpacing: 2, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          {depois ? 'Começando antes do edital' : 'Tempo até a prova'}
        </div>
        <div style={{ flex: 1, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
          <div style={{ width: `${valor * 100}%`, height: '100%', borderRadius: 8, background: tinta, boxShadow: `0 0 18px ${tinta}` }} />
        </div>
      </div>
    );
  };
