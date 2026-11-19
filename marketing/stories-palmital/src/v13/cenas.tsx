import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Manchete, Sobrelinha, Surge } from '../v8/cinema';
import { VitrineApp } from '../v8/pecas';
import { Calendario25, FechoVivo, FundoVivo, OfertaViva, vivas } from '../vivo';

// V13 · "Dia 25 abre a inscrição. E você?" — campanha colorida: inscrição é formulário, a vaga é o estudo;
// quem começa agora chega na inscrição estudando; R$ 197 em 6x até 25/11, sobe para R$ 297. Voz Lucas.

/* 1. Gancho: dia 25 abrem as inscrições --------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={vivas.sol} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4} tinta={cor.tinta}>
          Concurso · Prefeitura de Palmital
        </Sobrelinha>
        <Manchete texto="Dia *25* abrem / as inscrições." atraso={a.ini} tamanho={124} corTexto={cor.tinta} faixa={cor.laranjaVivo} />
      </div>
      <Em y={700}>
        <Calendario25 em={a.ini + 6} circulo={a.ini + Math.round(len * 0.3)} largura={440} />
      </Em>
      <Em y={1440}>
        <Surge em={a.ini + Math.round(len * 0.6)}>
          <Chip fundo={cor.tinta} tamanho={36}>
            Inscrições de 25/11 a 27/12
          </Chip>
        </Surge>
      </Em>
      <Aviso corTexto="rgba(45,47,54,0.85)" />
    </FundoVivo>
  );
};

/** Formulário de inscrição (genérico, sem marca de órgão). */
const Formulario: React.FC = () => (
  <div style={{ width: 360, padding: 34, borderRadius: 30, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}>
    <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 38, color: cor.tinta }}>Inscrição</div>
    {['Nome', 'CPF', 'Cargo'].map((c) => (
      <div key={c} style={{ marginTop: 18 }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 20, color: cor.muted }}>{c}</div>
        <div style={{ height: 34, borderRadius: 10, border: '3px solid #E3E5EA', marginTop: 6 }} />
      </div>
    ))}
    <div style={{ marginTop: 24, height: 54, borderRadius: 16, background: cor.verde, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      ENVIAR
    </div>
  </div>
);

const LIVROS = [
  { t: 'Específicos', c: cor.coral, w: 520 },
  { t: 'Conhecimentos gerais', c: cor.roxo, w: 480 },
  { t: 'Matemática', c: cor.azul, w: 500 },
  { t: 'Português', c: cor.laranjaVivo, w: 460 },
];

/* 2. Virada: inscrição é formulário; quem decide a vaga é o estudo -------- */
export const CenaVirada: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const encolhe = interpolate(frame, [b.ini - 4, b.ini + 12], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  return (
    <FundoVivo paleta={vivas.turquesa} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Manchete texto="A inscrição é só / um *formulário.*" atraso={a.ini} tamanho={92} faixa={cor.branco} corFaixa={cor.tealSombra} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: interpolate(encolhe, [0, 1], [360, 70]),
          top: interpolate(encolhe, [0, 1], [640, 1060]),
          transform: `scale(${interpolate(encolhe, [0, 1], [1, 0.62])}) rotate(${-4 + encolhe * -4}deg)`,
          transformOrigin: '0 0',
        }}
      >
        <Surge em={a.ini + 10}>
          <Formulario />
        </Surge>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 560, width: 936, opacity: encolhe }}>
        <Manchete texto="Quem decide a vaga / é o *estudo.*" atraso={b.ini} tamanho={92} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 380, top: 900, width: 600, height: 620 }}>
        {LIVROS.map((l, i) => {
          const p = useMola(b.ini + 8 + i * 6, { damping: 12, stiffness: 150 });
          return (
            <div
              key={l.t}
              style={{
                position: 'absolute',
                left: (600 - l.w) / 2 + (i % 2 ? 18 : -14),
                bottom: i * 112,
                width: l.w,
                height: 100,
                borderRadius: 18,
                background: l.c,
                boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.18), 0 16px 30px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 30,
                fontFamily: fonte.display,
                fontWeight: 800,
                fontSize: 38,
                color: cor.branco,
                transform: `translateY(${(1 - p) * -900}px) rotate(${(i % 2 ? 2 : -2) * p}deg)`,
                opacity: Math.min(1, p * 3),
              }}
            >
              {l.t}
            </div>
          );
        })}
      </div>
      <Efeito nome="whoosh" em={b.ini - 4} volume={0.35} />
      {LIVROS.map((l, i) => (
        <Efeito key={l.t} nome="pop" em={b.ini + 14 + i * 6} volume={0.22} />
      ))}
    </FundoVivo>
  );
};

/* 3. Tempo: agora → 25/11 → prova em 21/02 -------------------------------- */
const MARCOS = [
  { quando: 'Agora', o: 'você começa a estudar', cor: cor.ouro },
  { quando: '25/11', o: 'abrem as inscrições', cor: cor.branco },
  { quando: '21/02', o: 'prova objetiva', cor: cor.laranjaVivo },
];

export const CenaTempo: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const enche = interpolate(frame, [b.ini, b.ini + 40], [0, 0.5], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  const selo = useMola(b.ini + 40, { damping: 11, stiffness: 200 });
  const topo = 640;
  const altura = 760;
  return (
    <FundoVivo paleta={vivas.roxo} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Prova objetiva</Sobrelinha>
        <Manchete texto="21 de *fevereiro.*" atraso={a.ini} tamanho={116} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 150, top: topo, width: 20, height: altura, borderRadius: 10, background: 'rgba(255,255,255,0.22)' }}>
        <div style={{ width: '100%', height: `${enche * 100}%`, borderRadius: 10, background: cor.ouro, boxShadow: `0 0 24px ${cor.ouro}` }} />
      </div>
      {MARCOS.map((m, i) => (
        <div key={m.quando} style={{ position: 'absolute', left: 116, top: topo + (i * altura) / 2 - 44 }}>
          <Surge em={a.ini + 10 + i * 10} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: m.cor, border: '8px solid rgba(255,255,255,0.9)', boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }} />
              <div>
                <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 86, lineHeight: 1, color: cor.branco }}>{m.quando}</div>
                <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.85)' }}>{m.o}</div>
              </div>
            </div>
          </Surge>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 560,
          top: topo + altura / 2 - 150,
          transform: `rotate(-6deg) scale(${interpolate(selo, [0, 1], [2, 1])})`,
          opacity: Math.min(1, selo * 3),
          background: cor.verde,
          color: cor.branco,
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: 46,
          padding: '14px 30px',
          borderRadius: 24,
          boxShadow: '0 16px 30px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ já estudando
      </div>
      <Efeito nome="ding" em={b.ini + 40} volume={0.45} />
    </FundoVivo>
  );
};

/* 4. O app --------------------------------------------------------------- */
export const CenaApp: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoVivo paleta={vivas.laranja} duracao={duracao}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </FundoVivo>
);

/* 5. Oferta -------------------------------------------------------------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const len = a.fim - a.ini;
  return (
    <FundoVivo paleta={vivas.petroleo} duracao={duracao}>
      <OfertaViva
        sobrelinha="Preço de agora"
        titulo="Acesso completo / por *R$ 197*"
        tTitulo={a.ini + Math.round(len * 0.3)}
        tCartao={a.ini + Math.round(len * 0.6)}
        tSeis={b.ini + 14}
        tSobe={c.ini}
      />
    </FundoVivo>
  );
};

/* 6. Fecho --------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoVivo paleta={vivas.sol} duracao={duracao}>
      <FechoVivo manchete="Comece antes / do dia *25.*" em={a.ini} len={a.fim - a.ini} tinta={cor.tinta} />
    </FundoVivo>
  );
};
