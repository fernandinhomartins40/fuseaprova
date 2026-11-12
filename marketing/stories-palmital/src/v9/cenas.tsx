import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, Entra, Fundo, Icone, Palavras, Rotulo, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Coluna, noite, Traco } from '../v7/cenas';
import { AvisoPersonagem, BlocoOferta, Fechamento, Personagem, QuestaoAbstrata, useSaida, VitrineApp } from '../v8/pecas';

// V9 · "Duas escolhas" — a mesma prova, duas pessoas: quem esperou o edital e quem começou antes
const julia = { cabelo: '#5A3420', camisa: '#7C8DB5', longo: true, pele: '#E0A97E' };
const marcos = { cabelo: '#1F1712', camisa: cor.laranja, pele: '#9C6644' };
const LX = 290; // centro da coluna da Júlia
const RX = 790; // centro da coluna do Marcos

/** Divisória vertical e rótulos fixos das duas colunas. */
const Divisao: React.FC = () => (
  <div style={{ position: 'absolute', left: 539, top: 300, width: 2, height: 1250, background: 'rgba(255,255,255,0.18)' }} />
);

const Caixa: React.FC<{ x: number; y: number; em: number; fundo: string; children: React.ReactNode }> = ({ x, y, em, fundo, children }) => (
  <Em x={x} y={y}>
    <Entra atraso={em} de="zoom">
      <div style={{ width: 430, padding: '22px 24px', borderRadius: 26, background: fundo, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, lineHeight: 1.12, color: cor.branco, textAlign: 'center' }}>
        {children}
      </div>
    </Entra>
  </Em>
);

/* 1. Gancho ------------------------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 1100, cor: 'rgba(255,194,51,0.16)' }}>
      <Coluna>
        <Rotulo atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Rotulo>
        <div style={{ height: 30 }} />
        <Palavras texto="Duas pessoas. / Só *uma* chega / preparada." atraso={a.ini} passo={3} tamanho={108} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
      </Coluna>
      <Em x={LX} y={940}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini + 14} />
      </Em>
      <Em x={RX} y={940}>
        <Personagem nome="Marcos" pessoa={marcos} em={a.ini + 22} />
      </Em>
      <Em y={1300}>
        <Entra atraso={b.ini + 16} de="zoom">
          <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={36}>
            Qual das duas? Vê até o fim ↓
          </Chip>
        </Entra>
        <div style={{ height: 18 }} />
        <AvisoPersonagem texto="Personagens ilustrativos" />
      </Em>
      <Efeito nome="pop" em={b.ini + 16} volume={0.35} />
    </Fundo>
  );
};

/* 2. A escolha: esperar × começar agora --------------------------------- */
export const CenaEscolha: React.FC<PropsCena> = ({ falas }) => {
  const frame = useCurrentFrame();
  const [a, b] = falas;
  const dias = Math.round(interpolate(frame, [b.ini + 20, b.fim + 10], [0, 120], { ...limita, easing: (t) => 1 - (1 - t) ** 2 }));
  return (
    <Fundo {...noite}>
      <Divisao />
      <Em x={LX} y={290}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini - 6} tamanho={230} />
      </Em>
      <Em x={RX} y={290}>
        <Personagem nome="Marcos" pessoa={marcos} em={b.ini - 6} tamanho={230} />
      </Em>
      <Caixa x={LX} y={700} em={a.ini + 10} fundo="rgba(255,255,255,0.14)">
        “Vou esperar
        <br />o edital”
      </Caixa>
      <Caixa x={RX} y={700} em={b.ini + 4} fundo={cor.verdeSombra}>
        Começou agora
        <br />
        15 min por dia
      </Caixa>
      <Em x={LX} y={980}>
        <Entra atraso={a.ini + 24}>
          <div style={{ textAlign: 'center', fontFamily: fonte.corpo, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.7)' }}>Dias de treino</div>
          <div style={{ textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: 'rgba(255,255,255,0.45)' }}>0</div>
        </Entra>
      </Em>
      <Em x={RX} y={980}>
        <Entra atraso={b.ini + 14}>
          <div style={{ textAlign: 'center', fontFamily: fonte.corpo, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>Dias de treino</div>
          <div style={{ textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: cor.ouro }}>{dias}</div>
        </Entra>
      </Em>
      <Em x={RX} y={1300}>
        <Entra atraso={b.ini + 30}>
          <Chip fundo="rgba(255,255,255,0.14)" tamanho={30} icone="icone-acerto">
            No estilo da FAU
          </Chip>
        </Entra>
      </Em>
      <Efeito nome="pop" em={b.ini + 4} volume={0.35} />
    </Fundo>
  );
};

/* 3. O edital sai -------------------------------------------------------- */
export const CenaEdital: React.FC<PropsCena> = ({ falas }) => {
  const [a, b, c] = falas;
  const faixa = useMola(a.ini, { damping: 13, stiffness: 160 });
  const frame = useCurrentFrame();
  const pouco = interpolate(frame, [b.ini, b.ini + 30], [0.5, 0.1], limita);
  const muito = interpolate(frame, [c.ini, c.ini + 30], [0.2, 1], limita);
  return (
    <Fundo {...noite}>
      <Divisao />
      <Em y={260}>
        <div
          style={{
            width: 936,
            padding: '26px 34px',
            borderRadius: 30,
            background: 'rgba(245,246,250,0.95)',
            transform: `translateY(${(1 - faixa) * -400}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
          }}
        >
          <Icone nome="icone-calendario" tamanho={80} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 24, color: cor.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Simulação · agora</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 50, lineHeight: 1.05, color: cor.tinta }}>Edital publicado!</div>
          </div>
        </div>
      </Em>
      <Em x={LX} y={560}>
        <Personagem nome="Júlia" pessoa={{ ...julia, humor: frame >= b.ini + 10 ? 'triste' : 'neutro' }} em={-20} tamanho={240} />
      </Em>
      <Em x={RX} y={560}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: frame >= c.ini + 10 ? 'feliz' : 'neutro' }} em={-20} tamanho={240} />
      </Em>
      {[
        { x: LX, em: b.ini, v: pouco, tinta: cor.vermelho, texto: 'Poucas semanas pra tudo' },
        { x: RX, em: c.ini, v: muito, tinta: cor.verde, texto: 'Meses de treino' },
      ].map((l) => (
        <Em key={l.x} x={l.x} y={1060}>
          <Entra atraso={l.em}>
            <div style={{ width: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <div style={{ width: '100%', height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                <div style={{ width: `${l.v * 100}%`, height: '100%', background: l.tinta, borderRadius: 15 }} />
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 54, lineHeight: 1.1, color: cor.branco, textAlign: 'center' }}>{l.texto}</div>
            </div>
          </Entra>
        </Em>
      ))}
      <Efeito nome="ding" em={a.ini} volume={0.5} />
      <Efeito nome="pop" em={c.ini} volume={0.35} />
    </Fundo>
  );
};

/* 4. Dia da prova -------------------------------------------------------- */
export const CenaProva: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo de="#151A2B" para="#1B2A45" manchas={['rgba(29,111,224,0.3)', 'rgba(255,106,31,0.2)']}>
      <Divisao />
      <Em y={250}>
        <Rotulo atraso={a.ini - 6}>Dia da prova</Rotulo>
      </Em>
      <Em x={LX} y={380}>
        <Personagem nome="Júlia" pessoa={{ ...julia, humor: 'triste' }} em={a.ini - 4} tamanho={190} />
      </Em>
      <Em x={RX} y={380}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: 'feliz' }} em={b.ini - 4} tamanho={190} />
      </Em>
      <Em x={LX} y={780}>
        <Entra atraso={a.ini + 6}>
          <QuestaoAbstrata largura={420} marca={{ em: a.ini + 40, certo: false }} />
        </Entra>
      </Em>
      <Em x={RX} y={780}>
        <Entra atraso={b.ini}>
          <QuestaoAbstrata largura={420} marca={{ em: b.ini + 16, certo: true }} />
        </Entra>
      </Em>
      <Em x={LX} y={1350}>
        <Entra atraso={a.ini + 44}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: '#FFB4B4' }}>“Nunca vi assim”</div>
        </Entra>
      </Em>
      <Em x={RX} y={1350}>
        <Entra atraso={b.ini + 20}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, color: '#9BE7B4' }}>“Já treinei isso”</div>
        </Entra>
      </Em>
    </Fundo>
  );
};

/* 5. Virada -------------------------------------------------------------- */
export const CenaVirada: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const sai = useSaida(b.ini - 2);
  return (
    <Fundo de="#0E0F16" para="#1A1D2B" manchas={['rgba(255,106,31,0.3)']}>
      {frame < b.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Coluna>
            <div style={{ height: 320 }} />
            <Palavras texto="A diferença não / foi *inteligência.*" atraso={a.ini} passo={3} tamanho={108} alinhamento="left" fundoDestaque={cor.branco} corDestaque={cor.tinta} />
          </Coluna>
        </AbsoluteFill>
      ) : (
        <Sequence from={b.ini - 2} layout="none">
          <Coluna>
            <div style={{ height: 240 }} />
            <Palavras texto="Foi começar *antes* / e treinar do / *jeito certo.*" passo={3} tamanho={110} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
            <Traco em={30} largura={300} />
          </Coluna>
          <Efeito nome="whoosh" em={0} volume={0.4} />
        </Sequence>
      )}
    </Fundo>
  );
};

/* 6. Produto ------------------------------------------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas }) => (
  <Fundo {...noite} halo={{ x: 800, y: 1000, cor: 'rgba(255,106,31,0.22)' }}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </Fundo>
);

/* 7. Oferta -------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas }) => (
  <Fundo de="#1A1220" para="#3A1608" manchas={['rgba(255,106,31,0.5)', 'rgba(255,194,51,0.25)']} halo={{ x: 540, y: 1150, cor: 'rgba(255,106,31,0.3)' }}>
    <BlocoOferta fala={falas[0]} motivo="Pra ninguém ficar / de fora por causa / do *valor:*" />
  </Fundo>
);

/* 8. Fecho: e você? ------------------------------------------------------ */
export const CenaFecho: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 700, cor: 'rgba(255,194,51,0.16)' }}>
      <Coluna>
        <Palavras texto="E você? Vai ser / a *Júlia* ou o *Marcos?*" atraso={a.ini - 4} passo={3} tamanho={92} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
      </Coluna>
      <Em x={LX} y={640}>
        <Personagem nome="Júlia" pessoa={julia} em={a.ini + 8} tamanho={150} />
      </Em>
      <Em x={RX} y={640}>
        <Personagem nome="Marcos" pessoa={{ ...marcos, humor: 'feliz' }} em={a.ini + 14} tamanho={150} />
      </Em>
      <Fechamento em={b.ini - 4} y={980} pergunta="Comenta: Júlia ou Marcos? 👇" />
    </Fundo>
  );
};
