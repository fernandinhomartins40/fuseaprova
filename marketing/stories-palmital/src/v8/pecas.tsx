import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { AcaoBio, Aviso, Em, limita, tremida } from '../comum';
import { Celular, Chip, Efeito, Entra, Icone, useMola } from '../componentes';
import { Manchete, Surge } from './cinema';
import type { Fala } from '../linhaDoTempo';
import { cor, fonte } from '../tema';
import { Cartao, SeisVezes } from '../v7/cenas';

// Peças dos vídeos V8–V10 (gancho → história → virada → produto → oferta com motivo → fecho)

type Humor = 'neutro' | 'triste' | 'feliz';

/** Pessoa ilustrada simples (personagem fictícia), com três expressões. */
export const Pessoa: React.FC<{ cabelo: string; camisa: string; pele?: string; longo?: boolean; humor?: Humor; tamanho?: number }> = ({
  cabelo,
  camisa,
  pele = '#C98B5E',
  longo = false,
  humor = 'neutro',
  tamanho = 200,
}) => {
  const boca = { neutro: 'M88 108 L112 108', triste: 'M86 113 Q100 101 114 113', feliz: 'M84 103 Q100 120 116 103' }[humor];
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 200 200">
      {longo ? <path d="M60 78 L52 150 L78 150 L74 92 Z M140 78 L148 150 L122 150 L126 92 Z" fill={cabelo} /> : null}
      <path d="M28 200 C30 152 62 136 100 136 C138 136 170 152 172 200 Z" fill={camisa} />
      <rect x="88" y="112" width="24" height="30" rx="8" fill={pele} />
      <circle cx="100" cy="86" r="42" fill={pele} />
      <path d="M57 86 C55 52 78 38 100 38 C124 38 146 52 143 86 C132 66 114 60 100 60 C86 60 68 66 57 86 Z" fill={cabelo} />
      <circle cx="85" cy="90" r="4.5" fill={cor.tinta} />
      <circle cx="115" cy="90" r="4.5" fill={cor.tinta} />
      {humor === 'triste' ? <path d="M77 78 L92 82 M123 78 L108 82" stroke={cor.tinta} strokeWidth="4" strokeLinecap="round" /> : null}
      <path d={boca} stroke={cor.tinta} strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </svg>
  );
};

/** Avatar em círculo com nome e o aviso de que é personagem. */
export const Personagem: React.FC<{
  nome: string;
  pessoa: React.ComponentProps<typeof Pessoa>;
  em: number;
  fundo?: string;
  tamanho?: number;
  selo?: React.ReactNode;
}> = ({ nome, pessoa, em, fundo = 'rgba(255,255,255,0.12)', tamanho = 220, selo }) => (
  <Surge em={em}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: tamanho, height: tamanho, borderRadius: '50%', background: fundo, overflow: 'hidden', border: '6px solid rgba(255,255,255,0.85)' }}>
        <div style={{ position: 'absolute', left: 0, bottom: -tamanho * 0.04 }}>
          <Pessoa {...pessoa} tamanho={tamanho} />
        </div>
      </div>
      {selo}
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52, lineHeight: 1, color: cor.branco }}>{nome}</div>
    </div>
  </Surge>
);

export const AvisoPersonagem: React.FC<{ texto?: string }> = ({ texto = 'Personagem ilustrativa' }) => (
  <div style={{ fontFamily: fonte.corpo, fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{texto}</div>
);

/** Celular na tela de bloqueio: hora grande e espaço para notificações. */
export const CelularBloqueio: React.FC<{ largura?: number; children?: React.ReactNode }> = ({ largura = 500, children }) => {
  const borda = largura * 0.035;
  const altura = (largura - borda * 2) * (2532 / 1170) + borda * 2;
  return (
    <div style={{ width: largura, height: altura, borderRadius: largura * 0.13, background: '#15161A', padding: borda, boxShadow: '0 40px 80px rgba(0,0,0,0.45)' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: largura * 0.1,
          overflow: 'hidden',
          background: `linear-gradient(170deg, #2B3A67 0%, ${cor.azulNoite} 45%, #0B0F1E 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: largura * 0.2,
        }}
      >
        <div style={{ fontFamily: fonte.corpo, fontWeight: 700, fontSize: largura * 0.05, color: 'rgba(255,255,255,0.8)' }}>terça-feira</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 700, fontSize: largura * 0.24, lineHeight: 1, color: cor.branco }}>07:42</div>
        <div style={{ height: largura * 0.08 }} />
        {children}
        <div style={{ position: 'absolute', top: largura * 0.025, left: '50%', width: largura * 0.28, height: largura * 0.07, marginLeft: -largura * 0.14, borderRadius: 999, background: '#15161A' }} />
      </div>
    </div>
  );
};

/** Notificação que desce do topo da tela de bloqueio. O selo deixa claro que é uma simulação. */
export const Notificacao: React.FC<{ em: number; largura: number; titulo: string; texto: string; selo?: string }> = ({ em, largura, titulo, texto, selo = 'Simulação' }) => {
  const p = useMola(em, { damping: 14, stiffness: 170 });
  return (
    <div
      style={{
        width: largura * 0.92,
        borderRadius: largura * 0.06,
        background: 'rgba(245,246,250,0.94)',
        padding: largura * 0.045,
        transform: `translateY(${(1 - p) * -260}px)`,
        opacity: Math.min(1, p * 2),
        boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: largura * 0.025 }}>
        <Icone nome="icone-calendario" tamanho={largura * 0.075} />
        <div style={{ flex: 1, fontFamily: fonte.corpo, fontWeight: 800, fontSize: largura * 0.04, color: cor.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Concursos · agora</div>
        <div style={{ background: cor.ouro, color: cor.tinta, fontFamily: fonte.corpo, fontWeight: 900, fontSize: largura * 0.036, padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase' }}>{selo}</div>
      </div>
      <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: largura * 0.078, lineHeight: 1.1, color: cor.tinta, marginTop: largura * 0.025 }}>{titulo}</div>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 700, fontSize: largura * 0.062, lineHeight: 1.25, color: cor.tinta, marginTop: 6 }}>{texto}</div>
    </div>
  );
};

/** Celular com a notificação "edital publicado" (simulação), que treme quando ela chega. */
export const CelularEdital: React.FC<{ em: number; largura?: number; children?: React.ReactNode }> = ({ em, largura = 500, children }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'relative', transform: `translateX(${tremida(frame - em - 4) * 14}px)` }}>
      <CelularBloqueio largura={largura}>
        <Notificacao em={em} largura={largura} titulo="Concurso Prefeitura de Palmital" texto="Edital publicado. A prova é daqui a poucas semanas." />
      </CelularBloqueio>
      {children}
      <Efeito nome="ding" em={em} volume={0.5} />
    </div>
  );
};

/** Cartão de questão genérico (linhas cinza, sem texto inventado), com marca de erro ou acerto. */
export const QuestaoAbstrata: React.FC<{ marca?: { em: number; certo: boolean }; largura?: number; titulo?: string }> = ({ marca, largura = 440, titulo = 'Questão de prova' }) => {
  const m = useMola(marca?.em ?? 9999, { damping: 9, stiffness: 200 });
  return (
    <div style={{ position: 'relative', width: largura, padding: 28, borderRadius: 28, background: cor.branco, boxShadow: '0 24px 50px rgba(0,0,0,0.35)' }}>
      <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 22, letterSpacing: 3, color: cor.teal, textTransform: 'uppercase' }}>{titulo}</div>
      {[0.95, 0.8, 0.6].map((w, k) => (
        <div key={k} style={{ height: 13, width: `${w * 100}%`, borderRadius: 7, background: '#E5E7EB', marginTop: k ? 11 : 18 }} />
      ))}
      {['A', 'B', 'C', 'D'].map((l) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, border: '3px solid #E5E7EB', fontFamily: fonte.corpo, fontWeight: 900, fontSize: 20, color: cor.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>
          <div style={{ height: 12, flex: 1, borderRadius: 6, background: '#EEF0F3' }} />
        </div>
      ))}
      {marca ? (
        <div
          style={{
            position: 'absolute',
            right: -24,
            top: -24,
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: marca.certo ? cor.verde : cor.vermelho,
            color: cor.branco,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonte.display,
            fontWeight: 800,
            fontSize: 70,
            transform: `scale(${interpolate(m, [0, 1], [2, 1])})`,
            opacity: Math.min(1, m * 3),
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          {marca.certo ? '✓' : '✕'}
        </div>
      ) : null}
      {marca ? <Efeito nome={marca.certo ? 'ding' : 'pop'} em={marca.em} volume={0.45} /> : null}
    </div>
  );
};

/** O app como solução: recursos à esquerda, o celular troca de tela junto com eles. */
const recursos = [
  { titulo: '10.000+ questões no estilo da FAU', tela: 'real-acerto' },
  { titulo: 'Lições curtas, na ordem certa', tela: 'real-trilha' },
  { titulo: 'O que você erra volta na revisão', tela: 'real-revisao' },
  { titulo: 'Simulado igual à prova', tela: 'real-simulado' },
];

export const VitrineApp: React.FC<{ ini: number; fim: number; logo?: number }> = ({ ini, fim, logo }) => {
  const frame = useCurrentFrame();
  const quando = recursos.map((_, i) => ini + Math.round((i / recursos.length) * (fim - ini)));
  const atual = Math.max(0, quando.filter((q) => frame >= q).length - 1);
  const cel = useMola(ini - 6, { damping: 16, stiffness: 110 });
  const l = useMola(logo ?? -99, { damping: 14 });
  return (
    <>
      {logo !== undefined ? (
        <Em y={250}>
          <div style={{ background: cor.branco, borderRadius: 32, padding: '20px 40px', transform: `scale(${interpolate(l, [0, 1], [0.6, 1])})`, opacity: Math.min(1, l * 2) }}>
            <Img src={staticFile('img/logo-completa.webp')} style={{ width: 420, display: 'block' }} />
          </div>
        </Em>
      ) : null}
      <div style={{ position: 'absolute', left: 72, top: logo !== undefined ? 620 : 420, width: 500 }}>
        {recursos.map((r, i) => (
          <Surge key={r.titulo} em={quando[i]} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 40, opacity: i === atual ? 1 : 0.55 }}>
              <div style={{ flex: 'none', width: 56, height: 56, borderRadius: 16, background: i === atual ? cor.laranjaVivo : 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, lineHeight: 1.08, color: cor.branco }}>{r.titulo}</div>
            </div>
          </Surge>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 620, top: logo !== undefined ? 600 : 420, transform: `translateX(${(1 - cel) * 1000}px) rotate(4deg)` }}>
        <Celular tela={recursos[atual].tela} largura={400} />
      </div>
      {quando.slice(1).map((q) => (
        <Efeito key={q} nome="pop" em={q} volume={0.3} />
      ))}
    </>
  );
};

/** Folha de calendário com a data-limite do parcelamento. */
export const CartaoData: React.FC<{ em: number }> = ({ em }) => {
  const p = useMola(em, { damping: 15, stiffness: 140 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 120}px)` }}>
      <div style={{ width: 230, borderRadius: 30, overflow: 'hidden', background: cor.branco, boxShadow: '0 24px 50px rgba(0,0,0,0.4)', transform: `rotate(${interpolate(p, [0, 1], [-14, -4])}deg)` }}>
        <div style={{ background: cor.vermelho, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 4, textAlign: 'center', padding: '10px 0' }}>NOV</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 140, lineHeight: 1.05, color: cor.tinta, textAlign: 'center' }}>25</div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 26, color: cor.muted, textAlign: 'center', paddingBottom: 14 }}>quarta-feira</div>
      </div>
      <div>
        <div style={{ fontFamily: fonte.corpo, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.8)' }}>Parcelamento em 6x</div>
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 76, lineHeight: 1.02, color: cor.branco }}>
          só até
          <br />
          <span style={{ color: cor.ouro }}>25/11</span>
        </div>
      </div>
    </div>
  );
};

/** Oferta com o motivo antes do preço: motivo → cartão → 6x sem juros; na 2ª fala, a data-limite. */
export const BlocoOferta: React.FC<{ falas: Fala[]; motivo: string }> = ({ falas, motivo }) => {
  const [a, b] = falas;
  const frame = useCurrentFrame();
  const len = a.fim - a.ini;
  const t = (f: number) => a.ini + Math.round(f * len);
  const sobe = interpolate(frame, [b.ini - 6, b.ini + 10], [0, 1], { ...limita, easing: (x) => 1 - (1 - x) ** 3 });
  return (
    <>
      <div style={{ position: 'absolute', left: 72, top: 270, width: 936, opacity: 1 - sobe * 0.6, transform: `translateY(${-sobe * 20}px)` }}>
        <Manchete texto={motivo} atraso={a.ini} tamanho={74} faixa={cor.ouro} corFaixa={cor.tinta} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: `translateY(${-sobe * 150}px) scale(${1 - sobe * 0.18})`, transformOrigin: '50% 40%' }}>
        <Em x={560} y={660}>
          <Cartao em={t(0.4)} />
        </Em>
        <Em y={1080}>
          <SeisVezes em={t(0.68)} />
        </Em>
      </div>
      <Em y={1180}>
        <CartaoData em={b.ini + 2} />
      </Em>
      <Efeito nome="whoosh" em={t(0.4)} volume={0.35} />
      <Efeito nome="ding" em={t(0.68)} volume={0.45} />
      <Efeito nome="pop" em={b.ini + 2} volume={0.45} />
    </>
  );
};

/** Fecho: botão + link na bio, pergunta para comentar e o aviso legal. */
export const Fechamento: React.FC<{ em: number; y?: number; pergunta: string }> = ({ em, y = 860, pergunta }) => (
  <>
    <AcaoBio em={em} y={y} texto="Quero começar antes" fundo={cor.laranjaVivo} sombra={cor.laranjaSombra} corBio={cor.azulNoite} />
    <Em y={y + 330}>
      <Entra atraso={em + 16}>
        <Chip fundo="rgba(255,255,255,0.14)" tamanho={36}>
          {pergunta}
        </Chip>
      </Entra>
    </Em>
    <Aviso />
  </>
);

/** Some aos poucos ao chegar em `ate` (troca de "tempo" dentro da cena). */
export const useSaida = (ate: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [ate - 8, ate], [1, 0], limita);
};
