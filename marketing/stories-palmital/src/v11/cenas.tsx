import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Aviso, Em, limita, PropsCena } from '../comum';
import { Chip, Efeito, useMola } from '../componentes';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';
import { Centro, FundoCinema, Manchete, paletas, Sobrelinha, Surge } from '../v8/cinema';
import { Fechamento, useSaida, VitrineApp } from '../v8/pecas';

// V11 · "Saiu o edital" — notícia → números do edital → pouco tempo → app → última semana a R$ 197 → link
// Feito para ser impulsionado no Instagram: sem promessa de aprovação, sem salário, sem notificação falsa,
// sem brasão ou logo de órgão, com o aviso de que não há vínculo com a banca nem com a prefeitura.

/** Folha de papel com o título do edital e o carimbo "publicado" (sem brasão nem reprodução do documento). */
const FolhaEdital: React.FC<{ em: number; carimbo: number }> = ({ em, carimbo }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 18, stiffness: 90 });
  const c = useMola(carimbo, { damping: 11, stiffness: 220 });
  return (
    <div style={{ position: 'relative', transform: `translateY(${(1 - p) * 1500}px) rotate(${-3 + (1 - p) * 8 + Math.sin(frame / 40) * 0.6}deg)` }}>
      <div style={{ width: 660, padding: '54px 56px', borderRadius: 20, background: '#FBFAF6', boxShadow: '0 50px 90px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: cor.muted, textTransform: 'uppercase' }}>Concurso público</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 58, lineHeight: 1.05, color: cor.tinta, marginTop: 12 }}>
          Edital de abertura
          <br />
          nº 01/2026
        </div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 32, color: cor.teal, marginTop: 14 }}>Palmital · PR</div>
        {[1, 0.92, 0.97, 0.7, 0.88, 0.95, 0.6].map((w, k) => (
          <div key={k} style={{ height: 14, width: `${w * 100}%`, borderRadius: 7, background: '#E7E5DE', marginTop: k ? 16 : 34 }} />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: 70,
          padding: '14px 34px',
          border: `8px solid ${cor.verde}`,
          borderRadius: 18,
          color: cor.verde,
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: 70,
          letterSpacing: 4,
          background: 'rgba(251,250,246,0.85)',
          transform: `rotate(-12deg) scale(${interpolate(c, [0, 1], [2.4, 1])})`,
          opacity: Math.min(1, c * 3),
        }}
      >
        PUBLICADO
      </div>
      <Efeito nome="pop" em={carimbo} volume={0.5} />
    </div>
  );
};

/* 1. Gancho: saiu o edital --------------------------------------------- */
export const CenaGancho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const pulso = 1 + Math.max(0, Math.sin((frame - b.ini) / 6)) * 0.04;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 4}>Concurso · Prefeitura de Palmital</Sobrelinha>
        <Manchete texto="Saiu o / *edital!*" atraso={a.ini} tamanho={150} faixa={cor.laranjaVivo} />
      </div>
      <Em y={880}>
        <FolhaEdital em={a.ini + 4} carimbo={a.ini + 40} />
      </Em>
      <Em y={1500}>
        <Surge em={b.ini}>
          <div style={{ transform: `scale(${pulso})` }}>
            <Chip fundo={cor.ouro} texto={cor.tinta} tamanho={34}>
              Quer trabalhar lá? Fica até o final ↓
            </Chip>
          </div>
        </Surge>
      </Em>
      <Aviso />
    </FundoCinema>
  );
};

/** Folhinha de calendário. */
const Folhinha: React.FC<{ mes: string; dia: string; semana: string; largura?: number }> = ({ mes, dia, semana, largura = 220 }) => (
  <div style={{ width: largura, borderRadius: 28, overflow: 'hidden', background: cor.branco, boxShadow: '0 24px 50px rgba(0,0,0,0.4)' }}>
    <div style={{ background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: largura * 0.15, letterSpacing: 4, textAlign: 'center', padding: '8px 0' }}>{mes}</div>
    <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: largura * 0.6, lineHeight: 1.05, color: cor.tinta, textAlign: 'center' }}>{dia}</div>
    <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: largura * 0.12, color: cor.muted, textAlign: 'center', paddingBottom: 12 }}>{semana}</div>
  </div>
);

/* 2. Os números do edital ------------------------------------------------ */
const niveis = ['Fundamental', 'Médio e técnico', 'Superior'];

export const CenaNumeros: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const conta = Math.round(interpolate(frame, [a.ini, a.ini + 40], [0, 126], { ...limita, easing: (t) => 1 - (1 - t) ** 3 }));
  const len = a.fim - a.ini;
  const barra = interpolate(frame, [b.ini + 10, b.ini + 50], [0, 1], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <FundoCinema paleta={paletas.petroleo} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={a.ini - 6}>O que diz o edital</Sobrelinha>
        <Surge em={a.ini - 2}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 250, lineHeight: 0.9, color: cor.branco, fontVariantNumeric: 'tabular-nums' }}>{conta}</div>
            <div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 86, lineHeight: 1, color: cor.ouro }}>vagas</div>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>+ cadastro reserva</div>
            </div>
          </div>
        </Surge>
        <div style={{ height: 30 }} />
        <Surge em={a.ini + Math.round(len * 0.42)}>
          <Chip fundo={cor.laranjaVivo} tamanho={44}>
            em 49 cargos
          </Chip>
        </Surge>
        <div style={{ display: 'flex', gap: 16, marginTop: 26, flexWrap: 'wrap' }}>
          {niveis.map((n, i) => (
            <Surge key={n} em={a.ini + Math.round(len * (0.6 + i * 0.1))} de="esquerda">
              <Chip fundo="rgba(255,255,255,0.14)" tamanho={34}>
                {n}
              </Chip>
            </Surge>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 1000, width: 936, display: 'flex', alignItems: 'center', gap: 40 }}>
        <Surge em={b.ini - 2} de="esquerda" style={{ flex: 1 }}>
          <div style={{ padding: '34px 36px', borderRadius: 30, background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.18)' }}>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 3, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Inscrições</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 70, lineHeight: 1.1, color: cor.branco, marginTop: 8 }}>25/11 a 27/12</div>
            <div style={{ height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.15)', marginTop: 20, overflow: 'hidden' }}>
              <div style={{ width: `${barra * 100}%`, height: '100%', borderRadius: 7, background: cor.verde, boxShadow: `0 0 18px ${cor.verde}` }} />
            </div>
          </div>
        </Surge>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 1330, width: 936, display: 'flex', alignItems: 'center', gap: 40 }}>
        <Surge em={c.ini - 2}>
          <div style={{ transform: 'rotate(-4deg)' }}>
            <Folhinha mes="FEV" dia="21" semana="domingo" largura={230} />
          </div>
        </Surge>
        <Surge em={c.ini + 8} de="direita">
          <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.8)' }}>Prova objetiva</div>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 92, lineHeight: 1, color: cor.branco }}>
            21/02/<span style={{ color: cor.ouro }}>2027</span>
          </div>
        </Surge>
      </div>
      <Efeito nome="ding" em={a.ini + 40} volume={0.4} />
      <Efeito nome="pop" em={b.ini - 2} volume={0.35} />
      <Efeito nome="pop" em={c.ini - 2} volume={0.4} />
    </FundoCinema>
  );
};

/* 3. Virada: pouco tempo, e o que decide é treinar no jeito da banca ----- */
export const CenaVirada: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const sai = useSaida(b.ini - 2);
  return (
    <FundoCinema paleta={paletas.palco} duracao={duracao}>
      {frame < b.ini - 2 ? (
        <AbsoluteFill style={{ opacity: sai }}>
          <Centro>
            <Manchete texto="Isso dá só uns / *3 meses* / de preparação." atraso={a.ini} tamanho={112} faixa={cor.vermelho} />
            <div style={{ display: 'flex', gap: 12, marginTop: 70 }}>
              {Array.from({ length: 13 }, (_, i) => {
                const acende = interpolate(frame, [a.ini + 14 + i * 3, a.ini + 20 + i * 3], [0, 1], limita);
                return <div key={i} style={{ width: 60, height: 60, borderRadius: 14, background: `rgba(255,106,31,${0.15 + acende * 0.85})`, transform: `scale(${0.7 + acende * 0.3})` }} />;
              })}
            </div>
            <Surge em={a.ini + 56}>
              <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>cerca de 13 semanas até a prova</div>
            </Surge>
          </Centro>
        </AbsoluteFill>
      ) : (
        <Sequence from={b.ini - 2} layout="none">
          <Centro>
            <Sobrelinha>O que faz a diferença</Sobrelinha>
            <Manchete texto="Não é quem / estuda *mais.*" tamanho={100} faixa={cor.branco} corFaixa={cor.tinta} />
            <div style={{ height: 70 }} />
            <Manchete texto="É quem treina / no *jeito da banca.*" atraso={Math.round((b.fim - b.ini) * 0.5)} tamanho={112} />
          </Centro>
          <Efeito nome="whoosh" em={0} volume={0.4} />
          <Efeito nome="ding" em={Math.round((b.fim - b.ini) * 0.5) + 10} volume={0.4} />
        </Sequence>
      )}
    </FundoCinema>
  );
};

/* 4. Produto ------------------------------------------------------------- */
export const CenaProduto: React.FC<PropsCena> = ({ falas, duracao }) => (
  <FundoCinema paleta={paletas.noite} duracao={duracao}>
    <VitrineApp ini={falas[0].ini + 20} fim={falas[0].fim} logo={falas[0].ini} />
  </FundoCinema>
);

/** "Na próxima semana: R$ 297" com a seta para cima. */
const Aumento: React.FC<{ em: number }> = ({ em }) => {
  const p = useMola(em, { damping: 15, stiffness: 140 });
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '30px 44px', borderRadius: 34, background: cor.branco, boxShadow: '0 30px 60px rgba(0,0,0,0.45)', opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 140}px)` }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', background: cor.vermelho, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${Math.sin(frame / 7) * 5}px)` }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: cor.muted, textTransform: 'uppercase' }}>Na próxima semana</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 96, lineHeight: 1, color: cor.vermelho }}>R$ 297</div>
      </div>
    </div>
  );
};

/* 5. Oferta: última semana a R$ 197, 6x sem juros, depois sobe ---------- */
export const CenaOferta: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a, b, c] = falas;
  const frame = useCurrentFrame();
  const sobe = interpolate(frame, [c.ini - 6, c.ini + 10], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  const len = a.fim - a.ini;
  return (
    <FundoCinema paleta={paletas.oferta} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 260, width: 936, opacity: 1 - sobe * 0.55 }}>
        <Sobrelinha atraso={a.ini - 4}>Última semana</Sobrelinha>
        <Manchete texto="Acesso completo / por *R$ 197*" atraso={a.ini + Math.round(len * 0.45)} tamanho={104} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-sobe * 120}px) scale(${1 - sobe * 0.16})`, transformOrigin: '50% 45%' }}>
        <Em x={560} y={830}>
          <Cartao em={a.ini + Math.round(len * 0.7)} />
        </Em>
        <Em y={1200}>
          <SeisVezes em={b.ini + 18} />
        </Em>
      </div>
      <Em y={1420}>
        <Aumento em={c.ini + 2} />
      </Em>
      <Efeito nome="ding" em={a.ini + Math.round(len * 0.45) + 8} volume={0.4} />
      <Efeito nome="whoosh" em={a.ini + Math.round(len * 0.7)} volume={0.35} />
      <Efeito nome="ding" em={b.ini + 18} volume={0.45} />
      <Efeito nome="pop" em={c.ini + 2} volume={0.45} />
    </FundoCinema>
  );
};

/* 6. Fecho --------------------------------------------------------------- */
export const CenaFecho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const [a] = falas;
  return (
    <FundoCinema paleta={paletas.noite} duracao={duracao}>
      <div style={{ position: 'absolute', left: 72, top: 330, width: 936 }}>
        <Manchete texto="Garanta o seu / antes de *subir.*" atraso={a.ini - 4} tamanho={108} faixa={cor.laranjaVivo} />
      </div>
      <Fechamento em={a.ini + 14} y={800} acao="Garantir por R$ 197" pergunta="Qual cargo você vai tentar?" />
    </FundoCinema>
  );
};
