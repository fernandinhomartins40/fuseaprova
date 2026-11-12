import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, Entra, Fundo, Icone, Palavras, Rotulo } from '../componentes';
import type { Linha } from '../linhaDoTempo';
import { cor, fonte } from '../tema';
import { Coluna, noite, Traco } from '../v7/cenas';
import { AvisoPersonagem, BlocoOferta, QuestaoAbstrata, CelularEdital, Fechamento, Personagem, useSaida, VitrineApp } from './pecas';

// V8 · "A notificação" — a pessoa se vê recebendo o edital sem ter começado; a Ana é a história; o app é a saída
const ana = { cabelo: '#3B2417', camisa: cor.teal, longo: true };
const frio = { de: '#151A2B', para: '#2A1530', manchas: ['rgba(220,38,38,0.28)', 'rgba(29,111,224,0.3)', 'rgba(139,92,246,0.25)'] };

/* 1. Gancho: a notificação do edital ------------------------------------ */
export const CenaGancho: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite} halo={{ x: 540, y: 700, cor: 'rgba(255,194,51,0.16)' }}>
      <Em y={270}>
        <Entra atraso={0} de="baixo" distancia={300}>
          <CelularEdital em={a.ini + 8} largura={500} />
        </Entra>
      </Em>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(10,12,22,0.95) 78%)' }} />
      <Em y={1330}>
        <div style={{ width: 936 }}>
          <Palavras texto="E você ainda / *não começou?*" atraso={b.ini} passo={3} tamanho={100} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
        </div>
      </Em>
    </Fundo>
  );
};

/* 2. História: a Ana deixou para depois --------------------------------- */
const passos = [
  { icone: 'icone-relogio', texto: 'Esperou o edital sair' },
  { icone: 'icone-portugues', texto: 'Apostila genérica: tudo de todas as bancas' },
  { icone: 'icone-simulados', texto: 'Na prova: um jeito de cobrar que nunca treinou' },
];

export const CenaHistoria: React.FC<PropsCena> = ({ falas }) => {
  const [a, , , d] = falas;
  const frame = useCurrentFrame();
  return (
    <Fundo {...frio}>
      <Coluna>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
          <Personagem nome="Ana" pessoa={{ ...ana, humor: frame >= d.ini + 20 ? 'triste' : 'neutro' }} em={a.ini - 4} tamanho={200} />
          <Entra atraso={a.ini + 10} de="esquerda">
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 54, lineHeight: 1.05, color: cor.branco }}>
              Quer passar em
              <br />
              <span style={{ color: cor.ouro }}>Palmital</span>
            </div>
            <div style={{ height: 10 }} />
            <AvisoPersonagem />
          </Entra>
        </div>
        <div style={{ height: 60 }} />
        {passos.map((p, i) => {
          const em = falas[i + 1].ini - 4;
          const ruim = i === 2;
          return (
            <Entra key={p.texto} atraso={em} de="esquerda">
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 30, width: 936 }}>
                <div style={{ flex: 'none', width: 96, height: 96, borderRadius: 26, background: ruim ? cor.vermelho : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icone nome={p.icone} tamanho={64} />
                </div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 48, lineHeight: 1.1, color: ruim ? '#FFB4B4' : cor.branco }}>{p.texto}</div>
              </div>
            </Entra>
          );
        })}
      </Coluna>
      <Em y={1090}>
        <Entra atraso={d.ini + 6}>
          <QuestaoAbstrata largura={560} marca={{ em: d.ini + 40, certo: false }} />
        </Entra>
      </Em>
      {falas.slice(1).map((f) => (
        <Efeito key={f.ini} nome="pop" em={f.ini - 4} volume={0.3} />
      ))}
    </Fundo>
  );
};

/* 3. Virada: não é estudar mais, é treinar no jeito da banca ------------ */
export const CenaVirada: React.FC<PropsCena> = ({ falas }) => {
  const [a, b, c] = falas;
  const sai = useSaida(b.ini - 2);
  const frame = useCurrentFrame();
  return (
    <Fundo de="#0E0F16" para="#1A1D2B" manchas={['rgba(255,106,31,0.3)']}>
      {frame < b.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Coluna>
            <div style={{ height: 300 }} />
            <Palavras texto="Estudou muito. / Mas *tarde*, e do / *jeito errado.*" atraso={a.ini} passo={3} tamanho={104} alinhamento="left" fundoDestaque={cor.vermelho} corDestaque={cor.branco} />
          </Coluna>
        </AbsoluteFill>
      ) : (
        <Sequence from={b.ini - 2} layout="none">
          <Coluna>
            <Rotulo corTexto={cor.ouro}>O que ninguém te conta</Rotulo>
            <div style={{ height: 40 }} />
            <Palavras texto="Quem passa não é / quem estuda *mais.*" passo={3} tamanho={96} alinhamento="left" fundoDestaque={cor.branco} corDestaque={cor.tinta} />
            <div style={{ height: 70 }} />
            <Palavras texto="É quem treina / no *jeito da banca.*" atraso={c.ini - b.ini + 2} passo={3} tamanho={110} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
            <Traco em={c.ini - b.ini + 22} largura={300} />
          </Coluna>
          <Efeito nome="whoosh" em={0} volume={0.4} />
          <Efeito nome="ding" em={c.ini - b.ini + 10} volume={0.4} />
        </Sequence>
      )}
    </Fundo>
  );
};

/* 4. Produto: o app aparece pela primeira vez --------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas }) => {
  const [a, b] = falas;
  return (
    <Fundo {...noite} halo={{ x: 800, y: 1000, cor: 'rgba(255,106,31,0.22)' }}>
      <VitrineApp ini={b.ini} fim={b.fim} logo={a.ini + 4} />
    </Fundo>
  );
};

/* 5. Oferta com o motivo antes do preço --------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas }) => (
  <Fundo de="#1A1220" para="#3A1608" manchas={['rgba(255,106,31,0.5)', 'rgba(255,194,51,0.25)']} halo={{ x: 540, y: 1150, cor: 'rgba(255,106,31,0.3)' }}>
    <BlocoOferta fala={falas[0]} motivo="Pro dinheiro não ser / o motivo de *esperar* / o edital:" />
  </Fundo>
);

/* 6. Fecho: a mesma notificação, agora com meses de treino --------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const sai = useSaida(c.ini - 2);
  return (
    <Fundo {...noite} halo={{ x: 540, y: 900, cor: 'rgba(21,128,61,0.3)' }}>
      {frame < c.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Em y={260}>
            <Entra atraso={a.ini - 6} de="zoom">
              <CelularEdital em={a.ini + 4} largura={460}>
                <div style={{ position: 'absolute', left: -60, right: -60, top: 640, display: 'flex', justifyContent: 'center' }}>
                  <Entra atraso={b.ini + 4} de="zoom">
                    <Chip fundo={cor.verde} tamanho={44}>
                      ✓ Você já treinou por meses
                    </Chip>
                  </Entra>
                </div>
              </CelularEdital>
            </Entra>
          </Em>
          <Efeito nome="ding" em={b.ini + 4} volume={0.45} />
        </AbsoluteFill>
      ) : (
        <Sequence from={c.ini - 2} layout="none">
          <Coluna>
            <Palavras texto="Começa *antes.*" passo={3} tamanho={130} alinhamento="left" fundoDestaque={cor.laranjaVivo} corDestaque={cor.branco} />
            <Traco em={14} largura={300} />
          </Coluna>
          <Fechamento em={8} y={640} pergunta="Qual cargo você vai tentar? Comenta 👇" />
        </Sequence>
      )}
    </Fundo>
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
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, letterSpacing: 2, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          {depois ? 'Começando antes do edital' : 'Tempo até a prova'}
        </div>
        <div style={{ flex: 1, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
          <div style={{ width: `${valor * 100}%`, height: '100%', borderRadius: 8, background: tinta }} />
        </div>
      </div>
    );
  };
