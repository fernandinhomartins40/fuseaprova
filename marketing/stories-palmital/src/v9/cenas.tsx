import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, Icone, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Centro, FundoCinema, Manchete, paletas, Sobrelinha, Surge } from '../v8/cinema';
import { AvisoPersonagem, BlocoOferta, Fechamento, Personagem, QuestaoAbstrata, useSaida, VitrineApp } from '../v8/pecas';

// V9 · "Duas escolhas" — a mesma prova, duas pessoas: quem esperou o edital e quem começou antes
const julia = { cabelo: '#5A3420', camisa: '#7C8DB5', longo: true, pele: '#E0A97E' };
const marcos = { cabelo: '#1F1712', camisa: cor.laranja, pele: '#9C6644' };
const LX = 290; // centro da coluna da Júlia
const RX = 790; // centro da coluna do Marcos

/** Divisória vertical que cresce do centro. */
const Divisao: React.FC<{ em?: number }> = ({ em = 0 }) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [em, em + 20], [0, 1180], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return <div style={{ position: 'absolute', left: 539, top: 960 - h / 2, width: 2, height: h, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.28), transparent)' }} />;
};

/** Metade da tela tingida: fria para a Júlia, quente para o Marcos. */
const Lados: React.FC<{ forca?: number }> = ({ forca = 1 }) => (
  <>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 1920, background: `linear-gradient(180deg, rgba(120,130,170,${0.1 * forca}), transparent 70%)` }} />
    <div style={{ position: 'absolute', left: 540, top: 0, width: 540, height: 1920, background: `linear-gradient(180deg, rgba(255,106,31,${0.12 * forca}), transparent 70%)` }} />
  </>
);

const Caixa: React.FC<{ x: number; y: number; em: number; fundo: string; children: React.ReactNode }> = ({ x, y, em, fundo, children }) => (
  <Em x={x} y={y}>
    <Surge em={em}>
      <div style={{ width: 440, padding: '24px 26px', borderRadius: 28, background: fundo, border: '2px solid rgba(255,255,255,0.14)', fontFamily: fonte.display, fontWeight: 800, fontSize: 42, lineHeight: 1.12, color: cor.branco, textAlign: 'center' }}>
        {children}
      </div>
    </Surge>
  </Em>
);

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 270, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Duas pessoas. / Só *uma* chega / preparada." atraso={a.ini} tamanho={108} />
      </div>
      <Em x={LX} y={880}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini + 16} tamanho={250} />
      </Em>
      <Em x={RX} y={880}>
        <Personagem nome="Marcos" pessoa={marcos} em={a.ini + 24} tamanho={250} />
      </Em>
      <Em y={1290}>
        <Surge em={b.ini + 14}>
          <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={38}>
            Qual das duas? Vê até o fim ↓
          </Chip>
        </Surge>
        <div style={{ height: 18 }} />
        <AvisoPersonagem texto="Personagens ilustrativos" />
      </Em>
      <Efeito nome="pop" em={b.ini + 14} volume={0.35} />
    </FundoCinema>
  );
};

/* 2. A escolha: esperar × começar agora --------------------------------- */
export const CenaEscolha: React.FC<PropsCena> = ({ falas, duracao }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const dias = Math.round(interpolate(frame, [b.ini + 20, b.fim + 10], [0, 120], { ...limita, easing: (t) => 1 - (1 - t) ** 2 }));
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Lados />
      <Divisao />
      <Em x={LX} y={280}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini - 6} tamanho={240} />
      </Em>
      <Em x={RX} y={280}>
        <Personagem nome="Marcos" pessoa={marcos} em={b.ini - 6} tamanho={240} />
      </Em>
      <Caixa x={LX} y={710} em={a.ini + 10} fundo="rgba(255,255,255,0.10)">
        “Vou esperar
        <br />o edital”
      </Caixa>
      <Caixa x={RX} y={710} em={b.ini + 4} fundo={cor.verdeSombra}>
        Começou agora
        <br />
        15 min por dia
      </Caixa>
      {[
        { x: LX, em: a.ini + 24, valor: 0, tinta: 'rgba(255,255,255,0.4)' },
        { x: RX, em: b.ini + 14, valor: dias, tinta: cor.ouro },
      ].map((l) => (
        <Em key={l.x} x={l.x} y={990}>
          <Surge em={l.em}>
            <div style={{ textAlign: 'center', fontFamily: fonte.corpo, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.75)' }}>Dias de treino</div>
            <div style={{ textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 170, lineHeight: 1, color: l.tinta }}>{l.valor}</div>
          </Surge>
        </Em>
      ))}
      <Em x={RX} y={1300}>
        <Surge em={b.ini + 30}>
          <Chip fundo="rgba(255,255,255,0.14)" tamanho={32} icone="icone-acerto">
            No estilo da FAU
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 4} volume={0.35} />
    </FundoCinema>
  );
};

/* 3. O edital sai -------------------------------------------------------- */
export const CenaEdital: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const faixa = useMola(a.ini, { damping: 16, stiffness: 150 });
  const frame = useCurrentFrame();
  const pouco = interpolate(frame, [b.ini, b.ini + 30], [0.5, 0.1], limita);
  const muito = interpolate(frame, [c.ini, c.ini + 30], [0.2, 1], limita);
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <Lados />
      <Divisao em={10} />
      <Em y={260}>
        <div
          style={{
            width: 936,
            padding: '26px 34px',
            borderRadius: 32,
            background: 'rgba(245,246,250,0.96)',
            transform: `translateY(${(1 - faixa) * -420}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            boxShadow: '0 24px 50px rgba(0,0,0,0.4)',
          }}
        >
          <Icone nome="icone-calendario" tamanho={84} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 26, color: cor.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Simulação · agora</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 56, lineHeight: 1.05, color: cor.tinta }}>Edital publicado!</div>
          </div>
        </div>
      </Em>
      <Em x={LX} y={560}>
        <Personagem nome="Júlia" pessoa={{ ...julia, humor: frame >= b.ini + 10 ? 'triste' : 'neutro' }} em={-20} tamanho={250} />
      </Em>
      <Em x={RX} y={560}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: frame >= c.ini + 10 ? 'feliz' : 'neutro' }} em={-20} tamanho={250} />
      </Em>
      {[
        { x: LX, em: b.ini, v: pouco, tinta: cor.vermelho, texto: 'Poucas semanas pra tudo' },
        { x: RX, em: c.ini, v: muito, tinta: cor.verde, texto: 'Meses de treino' },
      ].map((l) => (
        <Em key={l.x} x={l.x} y={1060}>
          <Surge em={l.em}>
            <div style={{ width: 430, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ width: '100%', height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                <div style={{ width: `${l.v * 100}%`, height: '100%', background: l.tinta, borderRadius: 16, boxShadow: `0 0 20px ${l.tinta}` }} />
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 56, lineHeight: 1.08, color: cor.branco, textAlign: 'center' }}>{l.texto}</div>
            </div>
          </Surge>
        </Em>
      ))}
      <Efeito nome="ding" em={a.ini} volume={0.5} />
      <Efeito nome="pop" em={c.ini} volume={0.35} />
    </FundoCinema>
  );
};

/* 4. Dia da prova -------------------------------------------------------- */
export const CenaProva: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.petroleo} duracao={duracao}>
      <Lados forca={1.4} />
      <Divisao />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center' }}>
        <Sobrelinha atraso={a.ini - 6}>Dia da prova</Sobrelinha>
      </div>
      <Em x={LX} y={360}>
        <Personagem nome="Júlia" pessoa={{ ...julia, humor: 'triste' }} em={a.ini - 4} tamanho={200} />
      </Em>
      <Em x={RX} y={360}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: 'feliz' }} em={b.ini - 4} tamanho={200} />
      </Em>
      <Em x={LX} y={790}>
        <Surge em={a.ini + 6}>
          <QuestaoAbstrata largura={430} marca={{ em: a.ini + 40, certo: false }} />
        </Surge>
      </Em>
      <Em x={RX} y={790}>
        <Surge em={b.ini}>
          <QuestaoAbstrata largura={430} marca={{ em: b.ini + 16, certo: true }} />
        </Surge>
      </Em>
      <Em x={LX} y={1360}>
        <Surge em={a.ini + 44}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: '#FFB4B4' }}>“Nunca vi assim”</div>
        </Surge>
      </Em>
      <Em x={RX} y={1360}>
        <Surge em={b.ini + 20}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, color: '#9BE7B4' }}>“Já treinei isso”</div>
        </Surge>
      </Em>
    </FundoCinema>
  );
};

/* 5. Virada -------------------------------------------------------------- */
export const CenaVirada: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const sai = useSaida(b.ini - 2);
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      {frame < b.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Centro>
            <Manchete texto="A diferença não / foi *inteligência.*" atraso={a.ini} tamanho={108} faixa={cor.branco} corFaixa={cor.tinta} />
          </Centro>
        </AbsoluteFill>
      ) : (
        <Sequence from={b.ini - 2} layout="none">
          <Centro>
            <Manchete texto="Foi começar *antes* / e treinar do / *jeito certo.*" tamanho={112} />
          </Centro>
          <Efeito nome="whoosh" em={0} volume={0.4} />
        </Sequence>
      )}
    </FundoCinema>
  );
};

/* 6. Produto ------------------------------------------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.noite} duracao={duracao}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </FundoCinema>
);

/* 7. Oferta -------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.oferta} duracao={duracao}>
    <BlocoOferta falas={falas} motivo="Pra ninguém ficar / de fora por causa / do *valor:*" />
  </FundoCinema>
);

/* 8. Fecho: e você? ------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 270, width: 936 }}>
        <Manchete texto="E você? Vai ser / a *Júlia* ou o *Marcos?*" atraso={a.ini - 4} tamanho={92} />
      </div>
      <Em x={LX} y={560}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini + 8} tamanho={180} />
      </Em>
      <Em x={RX} y={560}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: 'feliz' }} em={a.ini + 14} tamanho={180} />
      </Em>
      <Fechamento em={b.ini - 4} y={930} pergunta="Comenta: Júlia ou Marcos? 👇" />
    </FundoCinema>
  );
};
