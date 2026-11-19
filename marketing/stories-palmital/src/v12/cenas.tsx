import React from 'react';
import { interpolate, Img, staticFile, useCurrentFrame } from 'remotion';
import { AcaoBio, Aviso, Em, limita, PropsCena } from '../comum';
import { Celular, Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Centro, FundoCinema, Manchete, Sobrelinha, Surge, type Paleta } from '../v8/cinema';

// V12 · "Descubra seu cargo" — ferramenta grátis do edital (D44). Campanha própria: fundos petróleo-ouro,
// ardósia e violeta "IA", ainda dentro da paleta do kit. Telas reais capturadas do site (sem salário).

const paleta = {
  edital: { de: '#052327', para: '#0E5560', luz: 'rgba(255,194,51,0.30)', luz2: 'rgba(34,195,181,0.36)' },
  ardosia: { de: '#121419', para: '#2A2F3D', luz: 'rgba(255,106,31,0.22)', luz2: 'rgba(148,163,184,0.18)' },
  ia: { de: '#140A30', para: '#3B1E8F', luz: 'rgba(139,92,246,0.50)', luz2: 'rgba(34,195,181,0.28)' },
} satisfies Record<string, Paleta>;

/** Celular que troca de tela com um esmaecido. */
const CelularTelas: React.FC<{ telas: { tela: string; em: number }[]; largura?: number }> = ({ telas, largura = 470 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'relative' }}>
      <Celular tela={telas[0].tela} largura={largura} />
      {telas.slice(1).map((t) => (
        <div key={t.tela} style={{ position: 'absolute', inset: 0, opacity: interpolate(frame, [t.em, t.em + 8], [0, 1], limita) }}>
          <Celular tela={t.tela} largura={largura} style={{ boxShadow: 'none' }} />
        </div>
      ))}
    </div>
  );
};

/* 1. Gancho: 49 cargos, qual é o seu? ---------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const escolhido = 24;
  const marca = useMola(b.ini + 4, { damping: 12, stiffness: 180 });
  return (
    <FundoCinema paleta={paleta.edital} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Saiu o edital: / *49 cargos.*" atraso={a.ini} tamanho={124} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 120, top: 720, width: 840, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 22 }}>
        {Array.from({ length: 49 }, (_, i) => {
          const p = interpolate(frame, [a.ini + 10 + i * 0.7, a.ini + 18 + i * 0.7], [0, 1], limita);
          const eu = i === escolhido;
          const apaga = eu ? 1 : 1 - marca * 0.6;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 22,
                background: eu ? `rgba(255,106,31,${0.18 + marca * 0.82})` : 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.18)',
                opacity: p * apaga,
                transform: `scale(${(0.6 + p * 0.4) * (eu ? 1 + marca * 0.35 : 1)})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonte.display,
                fontWeight: 800,
                fontSize: 56,
                color: cor.branco,
                boxShadow: eu ? `0 0 ${40 * marca}px rgba(255,106,31,0.8)` : 'none',
                zIndex: eu ? 2 : 1,
              }}
            >
              {eu && marca > 0.3 ? '?' : ''}
            </div>
          );
        })}
      </div>
      <Em y={1560}>
        <Surge em={b.ini}>
          <Chip fundo={cor.laranjaVivo} tamanho={52}>
            Qual é o seu?
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="ding" em={b.ini + 4} volume={0.45} />
    </FundoCinema>
  );
};

/* 2. Problema: o edital é grande ---------------------------------------- */
const paginas = ['Edital nº 01/2026', 'Tabelas 3.1 a 3.4', 'Anexo I · Requisitos', 'Anexo II · Conteúdo'];

export const CenaProblema: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  return (
    <FundoCinema paleta={paleta.ardosia} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936 }}>
        <Manchete texto="Dezenas de páginas, / tabelas e anexos." atraso={a.ini} tamanho={92} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, height: 760 }}>
        {paginas.map((t, i) => {
          const p = useMola(a.ini + 14 + i * 8, { damping: 16, stiffness: 120 });
          const giro = (i - 1.5) * 7 + Math.sin(frame / 30 + i) * 0.8;
          return (
            <div
              key={t}
              style={{
                position: 'absolute',
                left: 540 - 250 + (i - 1.5) * 70,
                top: 40 + i * 30,
                width: 500,
                height: 640,
                borderRadius: 22,
                background: '#FBFAF6',
                boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
                padding: 40,
                transform: `translateY(${(1 - p) * 1200}px) rotate(${giro}deg)`,
              }}
            >
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 40, color: cor.tinta }}>{t}</div>
              {[1, 0.9, 0.95, 0.7, 0.85, 0.92, 0.6, 0.88, 0.8].map((w, k) => (
                <div key={k} style={{ height: 13, width: `${w * 100}%`, borderRadius: 7, background: '#E7E5DE', marginTop: k ? 16 : 30 }} />
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 72, top: 1440, width: 936 }}>
        <Manchete texto="Será que *você pode* / concorrer?" atraso={b.ini} tamanho={84} faixa={cor.laranjaVivo} />
      </div>
      <Efeito nome="whoosh" em={a.ini + 14} volume={0.35} />
    </FundoCinema>
  );
};

/* 3. A ferramenta: perfil → cargos que combinam ------------------------- */
export const CenaFerramenta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  return (
    <FundoCinema paleta={paleta.edital} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 240, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>Novo · grátis e sem cadastro</Sobrelinha>
        <Manchete texto="*Descubra seu cargo*" atraso={a.ini} tamanho={108} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={560}>
        <Surge em={a.ini + 10}>
          <div style={{ transform: 'rotate(-2deg)' }}>
            <CelularTelas telas={[{ tela: 'edital-inicio', em: 0 }, { tela: 'edital-perfil', em: b.ini }]} largura={470} />
          </div>
        </Surge>
      </Em>
      <Em x={250} y={1150}>
        <Surge em={b.ini + 10} de="esquerda">
          <Chip fundo={cor.branco} texto={cor.tinta} tamanho={34}>
            🎓 Até onde estudou
          </Chip>
        </Surge>
      </Em>
      <Em x={840} y={1300}>
        <Surge em={b.ini + 34} de="direita">
          <Chip fundo={cor.branco} texto={cor.tinta} tamanho={34}>
            🚗 Tem CNH?
          </Chip>
        </Surge>
      </Em>
      <Em y={1520}>
        <Surge em={c.ini}>
          <Chip fundo={cor.laranjaVivo} tamanho={40}>
            Cargos que combinam com você
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 10} volume={0.3} />
      <Efeito nome="pop" em={b.ini + 34} volume={0.3} />
      <Efeito nome="ding" em={c.ini} volume={0.4} />
    </FundoCinema>
  );
};

/* 4. Requisitos com o trecho do edital → resultado ---------------------- */
export const CenaRequisitos: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const selo = useMola(b.ini + 6, { damping: 11, stiffness: 200 });
  return (
    <FundoCinema paleta={paleta.ardosia} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="Requisito por requisito, / com o *trecho do edital.*" atraso={a.ini} tamanho={78} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <Em y={560}>
        <Surge em={a.ini - 2}>
          <CelularTelas telas={[{ tela: 'edital-requisito', em: 0 }, { tela: 'edital-resultado', em: b.ini }]} largura={470} />
        </Surge>
      </Em>
      <Em x={800} y={1400}>
        <div
          style={{
            background: cor.verde,
            color: cor.branco,
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 50,
            padding: '18px 36px',
            borderRadius: 26,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            transform: `rotate(-6deg) scale(${interpolate(selo, [0, 1], [2, 1])})`,
            opacity: Math.min(1, selo * 3),
            whiteSpace: 'nowrap',
          }}
        >
          ✓ Na hora
        </div>
      </Em>
      <Efeito nome="ding" em={b.ini + 6} volume={0.45} />
    </FundoCinema>
  );
};

/* 5. Pergunte ao edital (IA) -------------------------------------------- */
export const CenaIa: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const brilho = 0.6 + Math.sin(frame / 8) * 0.4;
  return (
    <FundoCinema paleta={paleta.ia} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6} tinta={cor.turquesa}>
          Com inteligência artificial
        </Sobrelinha>
        <Manchete texto="Pergunte / ao *edital.*" atraso={a.ini} tamanho={120} faixa={cor.turquesa} corFaixa={cor.tinta} />
      </div>
      <Em x={720} y={640}>
        <Surge em={a.ini + 4}>
          <CelularTelas telas={[{ tela: 'edital-pergunta', em: 0 }]} largura={420} />
        </Surge>
      </Em>
      <Em x={250} y={1010}>
        <Surge em={b.ini + 6} de="esquerda">
          <div style={{ width: 380, padding: '26px 28px', borderRadius: 28, background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.22)' }}>
            <div style={{ fontSize: 60, opacity: brilho }}>✨</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, lineHeight: 1.1, color: cor.branco, marginTop: 6 }}>Responde com o texto oficial</div>
          </div>
        </Surge>
      </Em>
      <Em x={250} y={1340}>
        <Surge em={b.ini + 40} de="esquerda">
          <Chip fundo={cor.turquesa} texto={cor.tinta} tamanho={34}>
            e mostra o item
          </Chip>
        </Surge>
      </Em>
      <Efeito nome="pop" em={b.ini + 6} volume={0.35} />
      <Efeito nome="ding" em={b.ini + 40} volume={0.35} />
    </FundoCinema>
  );
};

/* 6. Fecho: grátis + Fuse Aprova feito sob medida pro concurso ---------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const len = b.fim - b.ini;
  const logo = useMola(b.ini + Math.round(len * 0.2), { damping: 14, stiffness: 130 });
  return (
    <FundoCinema paleta={paleta.edital} duracao={duracao}>
      <Centro alinhar="center">
        <Surge em={a.ini - 4}>
          <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={40}>
            Grátis e sem cadastro
          </Chip>
        </Surge>
        <div style={{ height: 56 }} />
        <Manchete texto="Pra estudar pro / concurso de Palmital:" atraso={b.ini} tamanho={78} centro />
        <div style={{ height: 30 }} />
        <div style={{ transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`, opacity: Math.min(1, logo * 2), background: cor.branco, borderRadius: 40, padding: '26px 48px', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
          <Img src={staticFile('img/logo-completa.webp')} style={{ height: 170, display: 'block' }} />
        </div>
        <div style={{ height: 26 }} />
        <Surge em={b.ini + Math.round(len * 0.35)}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 54, color: cor.ouro, textAlign: 'center' }}>feito sob medida pra Palmital</div>
        </Surge>
      </Centro>
      <AcaoBio em={b.ini + Math.round(len * 0.62)} y={1360} texto="Descubra seu cargo" fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.tealSombra} />
      <Aviso />
      <Efeito nome="ding" em={b.ini + Math.round(len * 0.2)} volume={0.4} />
    </FundoCinema>
  );
};
