import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { AcaoBio, Area, Em, limita, PropsCena } from './comum';
import { Brilhos, Celular, Chip, Efeito, Entra, Fundo, Palavras, SemCapi, useMola } from './componentes';
import { cor, fonte } from './tema';

// Peças das aulas curtas (aula1, aula2...): sílabas, barra de porcentagem, marcas de certo/errado e a chamada.

/** Palavra em cartões de sílaba; a tônica fica dourada em `forteEm` e `contarEm` numera 1-2-3 a partir do fim. */
export const Silabas: React.FC<{
  silabas: string[];
  forte: number;
  em: number;
  forteEm?: number;
  contarEm?: number;
  tamanho?: number;
  corForte?: string;
}> = ({ silabas, forte, em, forteEm, contarEm, tamanho = 84, corForte = cor.ouro }) => {
  const frame = useCurrentFrame();
  const quando = forteEm ?? em + silabas.length * 4 + 8;
  const destaca = useMola(quando, { damping: 9, stiffness: 200 });
  return (
    <div style={{ display: 'flex', gap: tamanho * 0.18 }}>
      {silabas.map((s, i) => {
        const p = useMola(em + i * 4);
        const ehForte = i === forte;
        const ligada = ehForte && frame >= quando;
        const doFim = silabas.length - i;
        const num = contarEm === undefined || doFim > 3 ? 0 : interpolate(frame, [contarEm + (doFim - 1) * 9, contarEm + (doFim - 1) * 9 + 8], [0, 1], limita);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                minWidth: tamanho * 1.7,
                padding: `${tamanho * 0.16}px ${tamanho * 0.22}px`,
                borderRadius: tamanho * 0.3,
                background: ligada ? corForte : cor.branco,
                color: cor.tinta,
                fontFamily: fonte.display,
                fontWeight: 800,
                fontSize: tamanho,
                lineHeight: 1.1,
                textAlign: 'center',
                boxShadow: `0 ${tamanho * 0.1}px 0 ${ligada ? cor.ouroSombra : 'rgba(0,0,0,0.18)'}`,
                opacity: Math.min(1, p * 2),
                transform: `translateY(${(1 - p) * 60 - (ligada ? 18 * destaca : 0)}px) scale(${interpolate(p, [0, 1], [0.6, 1]) * (ligada ? 1 + 0.12 * destaca : 1)})`,
              }}
            >
              {s}
            </div>
            <div
              style={{
                width: tamanho * 0.7,
                height: tamanho * 0.7,
                borderRadius: '50%',
                background: doFim === 3 ? cor.laranja : 'rgba(255,255,255,0.9)',
                color: doFim === 3 ? cor.branco : cor.tinta,
                fontFamily: fonte.corpo,
                fontWeight: 900,
                fontSize: tamanho * 0.36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: num,
                transform: `scale(${num})`,
              }}
            >
              {doFim}
            </div>
          </div>
        );
      })}
      {forteEm !== undefined ? <Efeito nome="pop" em={quando} volume={0.45} /> : null}
    </div>
  );
};

/** Marca redonda de certo (verde) ou errado (vermelho) que bate na tela. */
export const Marca: React.FC<{ certo: boolean; em: number; tamanho?: number }> = ({ certo, em, tamanho = 110 }) => {
  const p = useMola(em, { damping: 9, stiffness: 220 });
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: certo ? cor.verde : cor.vermelho,
        boxShadow: `0 8px 0 ${certo ? cor.verdeSombra : '#9B1C1C'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(1, p * 3),
        transform: `scale(${interpolate(p, [0, 1], [2.2, 1])})`,
      }}
    >
      <svg width={tamanho * 0.55} height={tamanho * 0.55} viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        {certo ? <path d="M4 12.5l5 5L20 6.5" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </div>
  );
};

/** Palavra escrita com marca de certo ou errado ao lado; a errada recebe um risco. */
export const Grafia: React.FC<{ texto: string; certo: boolean; em: number; tamanho?: number }> = ({ texto, certo, em, tamanho = 92 }) => {
  const frame = useCurrentFrame();
  const risco = certo ? 0 : interpolate(frame, [em + 10, em + 22], [0, 1], limita);
  return (
    <Entra atraso={em}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ position: 'relative', fontFamily: fonte.display, fontWeight: 800, fontSize: tamanho, color: cor.branco, opacity: 1 - risco * 0.4 }}>
          {texto}
          <div style={{ position: 'absolute', left: -10, right: -10, top: '52%', height: 10, borderRadius: 5, background: cor.coral, transformOrigin: 'left', transform: `scaleX(${risco})` }} />
        </div>
        <Marca certo={certo} em={em + 8} tamanho={tamanho * 1.05} />
      </div>
      <Efeito nome={certo ? 'ding' : 'pop'} em={em + 8} volume={certo ? 0.3 : 0.5} />
    </Entra>
  );
};

/** Barra de 100% dividida em partes que crescem a partir de `em`, com rótulo dentro de cada uma. */
export const BarraPercentual: React.FC<{
  partes: { pct: number; cor: string; rotulo: string; tinta?: string }[];
  em: number;
  largura?: number;
  altura?: number;
}> = ({ partes, em, largura = 900, altura = 130 }) => {
  const frame = useCurrentFrame();
  const total = partes.reduce((s, p) => s + p.pct, 0);
  let acumulado = 0;
  return (
    <div style={{ display: 'flex', width: largura * (total / 100), maxWidth: 936, height: altura, borderRadius: altura * 0.28, overflow: 'hidden', boxShadow: '0 10px 0 rgba(0,0,0,0.18)' }}>
      {partes.map((p, i) => {
        const ini = em + acumulado * 0.25;
        acumulado += p.pct;
        const c = interpolate(frame, [ini, ini + 16], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
        return (
          <div
            key={i}
            style={{
              width: `${(p.pct / total) * 100 * c}%`,
              background: p.cor,
              color: p.tinta ?? cor.branco,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: altura * 0.42,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {c > 0.6 ? p.rotulo : ''}
          </div>
        );
      })}
    </div>
  );
};

/** Cartão branco de conta ("150 × 0,8 = 120"), grande e centralizado. */
export const Conta: React.FC<{ children: React.ReactNode; em: number; tamanho?: number; fundo?: string }> = ({ children, em, tamanho = 84, fundo = cor.branco }) => (
  <Entra atraso={em} de="zoom">
    <div
      style={{
        padding: `${tamanho * 0.28}px ${tamanho * 0.6}px`,
        borderRadius: tamanho * 0.4,
        background: fundo,
        color: cor.tinta,
        fontFamily: fonte.display,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.1,
        boxShadow: '0 12px 0 rgba(0,0,0,0.16), 0 30px 60px rgba(0,0,0,0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  </Entra>
);

/** Número que conta de `de` até `ate` entre os quadros `ini` e `fim`. */
export const useConta = (de: number, ate: number, ini: number, fim: number) =>
  Math.round(interpolate(useCurrentFrame(), [ini, fim], [de, ate], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));

/** Cena final das aulas: celular com a tela de pergunta, "+10 mil questões" e o botão com "link na bio". */
export const CenaChamadaAula: React.FC<PropsCena & { de: string; para: string; manchas: string[] }> = ({ falas, de, para, manchas }) => {
  const [a, b] = falas;
  const n = useConta(0, 10000, a.ini + 30, a.ini + 70);
  return (
    <Fundo de={de} para={para} manchas={manchas} halo={{ x: 540, y: 1150, cor: 'rgba(255,255,255,0.25)' }}>
      <Area style={{ justifyContent: 'flex-start' }}>
        <Palavras texto="Treine com *questões* / de concurso" atraso={a.ini} passo={3} tamanho={88} />
        <div style={{ height: 20 }} />
        <Entra atraso={a.ini + 26}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 76, color: cor.ouro, textShadow: '0 6px 24px rgba(0,0,0,0.25)' }}>
            +{n.toLocaleString('pt-BR')} no app
          </div>
        </Entra>
      </Area>
      <Em y={640}>
        <Entra atraso={a.ini + 12} distancia={500}>
          <Celular tela="05-Pergunta" largura={320} />
        </Entra>
      </Em>
      <AcaoBio em={b.ini - 4} y={1340} texto="Treinar agora" />
      <Brilhos
        atraso={a.ini + 20}
        pontos={[
          { x: 150, y: 820, t: 60, cor: cor.ouro },
          { x: 880, y: 900, t: 46, cor: cor.branco },
          { x: 860, y: 1250, t: 40, cor: cor.ouro },
        ]}
      />
    </Fundo>
  );
};

/** Fecho da videoaula do app: resumo em linhas "situação → o que fazer" e o convite para voltar à questão. */
export const CenaFechoAula: React.FC<PropsCena & { de: string; para: string; manchas: string[]; linhas: { de: string; para: string }[] }> = ({
  falas,
  de,
  para,
  manchas,
  linhas,
}) => {
  const [a, b] = falas;
  return (
    <Fundo de={de} para={para} manchas={manchas} halo={{ x: 540, y: 900, cor: 'rgba(255,255,255,0.22)' }}>
      <Area style={{ justifyContent: 'center' }}>
        <Entra atraso={a.ini - 4} de="zoom">
          <Chip fundo={cor.ouro} texto={cor.tinta} icone="icone-dica">
            Resumo
          </Chip>
        </Entra>
        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: '100%' }}>
          {linhas.map((l, i) => (
            <Entra key={i} atraso={a.ini + 8 + i * 40}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 24,
                  padding: '26px 34px',
                  borderRadius: 30,
                  background: cor.branco,
                  boxShadow: '0 10px 0 rgba(0,0,0,0.16)',
                  fontFamily: fonte.display,
                  fontWeight: 800,
                  fontSize: 60,
                  lineHeight: 1.1,
                  color: cor.tinta,
                }}
              >
                <span>{l.de}</span>
                <span style={{ color: cor.laranja, whiteSpace: 'nowrap' }}>→ {l.para}</span>
              </div>
            </Entra>
          ))}
        </div>
        <div style={{ height: 70 }} />
        <Entra atraso={b.ini} de="zoom">
          <Chip fundo={cor.verde} icone="icone-acerto" tamanho={38}>
            Volte para a questão
          </Chip>
        </Entra>
      </Area>
      <Efeito nome="ding" em={b.ini} volume={0.3} />
    </Fundo>
  );
};

/** Videoaula do app: sem Capi e com a logo pequena e discreta no canto, por cima de todas as cenas. */
export const ModoVideoaula = (Base: React.FC): React.FC =>
  function Videoaula() {
    return (
      <SemCapi.Provider value>
        <Base />
        <Img src={staticFile('img/logo-completa.webp')} style={{ position: 'absolute', right: 48, bottom: 56, width: 190, opacity: 0.7 }} />
      </SemCapi.Provider>
    );
  };

/** Cabeçalho das aulas: chip com a matéria. */
export const ChipMateria: React.FC<{ icone: string; texto: string; atraso?: number }> = ({ icone, texto, atraso = 2 }) => (
  <Entra atraso={atraso} de="cima">
    <Chip icone={icone}>{texto}</Chip>
  </Entra>
);
