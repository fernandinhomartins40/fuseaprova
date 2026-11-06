import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { BarraPercentual, Conta, Grafia, ModoVideoaula, Silabas } from '../aulas';
import { limita, PropsCena } from '../comum';
import { Chip, Efeito, Entra, Palavras, Rotulo } from '../componentes';
import { Fala, montarLinha, Narracao } from '../linhaDoTempo';
import { cor, fonte } from '../tema';
import { criarVideo } from '../Video';

// Videoaula montada só com dados: roteiros/<slug>.json traz as falas e os blocos de cada cena.
// No celular a folha mostra o vídeo com ~290 pt de largura, por isso as letras são grandes.
const ESCALA = 1.2;
// Fundo parado de propósito: mancha e ponto em movimento gastam bits em todo quadro (docs/videoaulas/PLANO.md §4).

/** Quando o bloco entra: `fala` diz em qual clipe; `em` é uma palavra daquela fala ou uma fração da duração. */
type Tempo = { fala?: number; em?: string | number };
type Bloco = Tempo & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type CenaDados = { tipo?: 'resumo'; linhas?: string[]; blocos?: Bloco[] };
export type Roteiro = { materia: string; falas: Record<string, string[]>; cenas: Record<string, CenaDados> };

const PALETA: Record<string, [string, string][]> = {
  portugues: [[cor.roxoNoite, cor.azulNoite], ['#5B2BC4', cor.azulNoite], [cor.azulNoite, '#2A1A6E']],
  matematica: [['#0B6E6A', cor.azulNoite], [cor.azulNoite, '#0B5F7A'], ['#0E7F5C', '#10306B']],
  especificos: [[cor.tealSombra, cor.azulNoite], [cor.azulNoite, cor.tealSombra]],
  gerais: [['#8A3B0B', cor.azulNoite], [cor.azulNoite, '#7A3A12']],
};

const Fundo: React.FC<{ de: string; para: string; children: React.ReactNode }> = ({ de, para, children }) => (
  <AbsoluteFill style={{ background: `linear-gradient(165deg, ${de} 0%, ${para} 100%)` }}>
    <AbsoluteFill style={{ paddingTop: 110, paddingBottom: 200, paddingLeft: 60, paddingRight: 60, alignItems: 'center', justifyContent: 'center', gap: 44 }}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Trecho com *destaque* dourado e ~risco~ vermelho. */
const Trecho: React.FC<{ texto: string; riscoEm: number }> = ({ texto, riscoEm }) => {
  const frame = useCurrentFrame();
  const risco = interpolate(frame, [riscoEm, riscoEm + 12], [0, 1], limita);
  return (
    <>
      {texto.split(/(\*[^*]+\*|~[^~]+~)/).map((p, i) =>
        p.startsWith('*') ? (
          <span key={i} style={{ background: cor.ouro, borderRadius: 12, padding: '0 12px' }}>{p.slice(1, -1)}</span>
        ) : p.startsWith('~') ? (
          <span key={i} style={{ position: 'relative', color: cor.vermelho }}>
            {p.slice(1, -1)}
            <span style={{ position: 'absolute', left: -4, right: -4, top: '52%', height: 7, borderRadius: 4, background: cor.vermelho, transformOrigin: 'left', transform: `scaleX(${risco})` }} />
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

const Cartao: React.FC<{ titulo: string; texto?: string; atraso: number; fonteTitulo?: number; corTitulo: string }> = ({ titulo, texto, atraso, fonteTitulo = 48, corTitulo }) => (
  <Entra atraso={atraso} distancia={50}>
    <div style={{ background: cor.branco, borderRadius: 26, padding: '20px 30px', boxShadow: '0 8px 0 rgba(0,0,0,0.18)' }}>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: fonteTitulo * ESCALA, lineHeight: 1.12, color: corTitulo }}>{titulo}</div>
      {texto ? <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 46, lineHeight: 1.22, color: cor.tinta, marginTop: 4 }}>{texto}</div> : null}
    </div>
  </Entra>
);

const criarCena = (nome: string, dados: CenaDados, textos: string[], paleta: [string, string][], indice: number, corTitulo: string): React.FC<PropsCena> =>
  function Cena({ falas }) {
    const [de, para] = paleta[indice % paleta.length];
    const quando = (t: Tempo, base: Tempo = {}) => {
      const i = t.fala ?? base.fala ?? 0;
      const f: Fala = falas[i];
      const em = t.em ?? (t.fala === undefined ? base.em : undefined) ?? 0;
      const fracao = typeof em === 'string' ? textos[i].indexOf(em) / textos[i].length : em;
      return Math.round(f.ini + fracao * (f.fim - f.ini));
    };

    if (dados.tipo === 'resumo') {
      return (
        <Fundo de={de} para={para}>
          <Entra atraso={falas[0].ini - 4} de="zoom">
            <Chip fundo={cor.ouro} texto={cor.tinta} icone="icone-dica">Resumo</Chip>
          </Entra>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
            {(dados.linhas ?? []).map((l, i, todas) => (
              <Cartao key={i} titulo={l} corTitulo={cor.tinta} atraso={Math.round(falas[0].ini + 12 + (i / todas.length) * (falas[0].fim - falas[0].ini))} />
            ))}
          </div>
          <Entra atraso={falas[1].ini} de="zoom">
            <Chip fundo={cor.verde} icone="icone-acerto" tamanho={38}>Volte para a questão</Chip>
          </Entra>
          <Efeito nome="ding" em={falas[1].ini} volume={0.3} />
        </Fundo>
      );
    }

    return (
      <Fundo de={de} para={para}>
        {(dados.blocos ?? []).map((b, i) => {
          const t = quando(b);
          switch (b.tipo) {
            case 'rotulo':
              return <Rotulo key={i} atraso={t}>{b.texto}</Rotulo>;
            case 'palavras':
              return <Palavras key={i} texto={b.texto} atraso={t} passo={2} tamanho={(b.tamanho ?? 84) * ESCALA} />;
            case 'chip':
              return (
                <Entra key={i} atraso={t} de="zoom">
                  <Chip fundo={b.fundo === 'coral' ? cor.coral : b.fundo === 'verde' ? cor.verde : cor.ouro} texto={b.fundo ? cor.branco : cor.tinta} icone={b.icone} tamanho={b.tamanho ?? 34}>
                    {b.texto}
                  </Chip>
                  <Efeito nome="pop" em={t} volume={0.3} />
                </Entra>
              );
            case 'frase':
              return (
                <Entra key={i} atraso={t} distancia={50} style={{ width: '100%' }}>
                  {b.legenda ? <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>{b.legenda}</div> : null}
                  <div style={{ background: cor.branco, borderRadius: 26, padding: '24px 30px', fontFamily: fonte.display, fontWeight: 700, fontSize: (b.tamanho ?? 54) * ESCALA, lineHeight: 1.25, color: cor.tinta, textAlign: 'center', boxShadow: '0 8px 0 rgba(0,0,0,0.18)' }}>
                    <Trecho texto={b.texto} riscoEm={t + 16} />
                  </div>
                </Entra>
              );
            case 'cartoes':
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${b.colunas ?? 1}, 1fr)`, gap: 20, width: '100%' }}>
                  {b.itens.map((c: Bloco, k: number) => (
                    <Cartao key={k} titulo={c.titulo} texto={c.texto} corTitulo={corTitulo} fonteTitulo={b.fonteTitulo} atraso={quando(c, b) + (c.fala === undefined && c.em === undefined ? k * 8 : 0)} />
                  ))}
                </div>
              );
            case 'passos':
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
                  {b.itens.map((c: Bloco, k: number) => (
                    <Entra key={k} atraso={quando(c, b)} distancia={50}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: cor.branco, borderRadius: 26, padding: '20px 28px', boxShadow: '0 8px 0 rgba(0,0,0,0.18)' }}>
                        <div style={{ flex: 'none', width: 68, height: 68, borderRadius: '50%', background: corTitulo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</div>
                        <div style={{ fontFamily: fonte.display, fontWeight: 700, fontSize: 56, lineHeight: 1.15, color: cor.tinta }}>{c.titulo}</div>
                      </div>
                    </Entra>
                  ))}
                </div>
              );
            case 'comparacao':
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
                  {b.itens.map((c: Bloco, k: number) => (
                    <Grafia key={k} texto={c.texto} certo={c.certo} em={quando(c, b)} tamanho={(b.tamanho ?? 72) * ESCALA} />
                  ))}
                </div>
              );
            case 'conta':
              return (
                <Conta key={i} em={t} tamanho={Math.min((b.tamanho ?? 68) * ESCALA, 950 / (0.52 * b.texto.length + 1.2))} fundo={b.destaque ? cor.ouro : cor.branco}>
                  {b.texto}
                </Conta>
              );
            case 'silabas':
              return (
                <Silabas
                  key={i}
                  silabas={b.silabas}
                  forte={b.forte ?? -1}
                  em={t}
                  forteEm={b.forteEm !== undefined ? quando({ fala: b.forteFala ?? b.fala ?? 0, em: b.forteEm }) : undefined}
                  contarEm={b.contarEm !== undefined ? quando({ fala: b.contarFala ?? b.fala ?? 0, em: b.contarEm }) : undefined}
                  tamanho={(b.tamanho ?? 92) * ESCALA}
                />
              );
            case 'barra':
              return <BarraPercentual key={i} em={t} partes={b.partes} largura={b.largura ?? 900} altura={b.altura ?? 120} />;
            default:
              throw new Error(`${nome}: bloco desconhecido ${b.tipo}`);
          }
        })}
      </Fundo>
    );
  };

/** Composição de uma videoaula a partir do roteiro e das durações da narração. */
export const criarVideoaula = (roteiro: Roteiro, narracao: Narracao) => {
  const ordem = Object.keys(roteiro.falas);
  const linha = montarLinha(narracao, ordem, {}, false);
  const paleta = PALETA[roteiro.materia];
  const corTitulo = roteiro.materia === 'portugues' ? cor.roxoSombra : roteiro.materia === 'matematica' ? '#0B6E6A' : cor.tealSombra;
  const componentes = Object.fromEntries(
    ordem.map((nome, i) => [nome, criarCena(nome, roteiro.cenas[nome], roteiro.falas[nome], paleta, i, corTitulo)]),
  );
  const Video = ModoVideoaula(
    criarVideo({ linha, componentes, transicoes: [slide({ direction: 'from-right' }), fade()], trilha: `audio/${roteiro.materia}/trilha.wav` }),
  );
  return { linha, Video };
};
