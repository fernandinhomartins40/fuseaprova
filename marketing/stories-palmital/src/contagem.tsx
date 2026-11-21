import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Em, limita } from './comum';
import { Chip, Efeito, useMola } from './componentes';
import { cor, fonte } from './tema';
import { Manchete, Sobrelinha, Surge } from './v8/cinema';
import { CelularTelas } from './v12/cenas';
import { type PaletaViva, vivas } from './vivo';

// Série "contagem regressiva" (V17–V20, de 22 a 25/11): placa de aeroporto que vira o número, oferta "hoje × depois"
// (sem preço riscado) e mais fundos vivos para cada dia ter cara própria.

export const cores = {
  ...vivas,
  rosa: { de: '#FF7EB6', para: '#D6246E', luz: 'rgba(255,214,74,0.42)', tinta: cor.branco },
  lima: { de: '#D2F56A', para: '#4CB84A', luz: 'rgba(255,255,255,0.5)', tinta: cor.tinta },
  azul: { de: '#5AB8FF', para: '#2449D8', luz: 'rgba(255,194,51,0.38)', tinta: cor.branco },
  magenta: { de: '#C35BFF', para: '#7A12B8', luz: 'rgba(34,195,181,0.42)', tinta: cor.branco },
} satisfies Record<string, PaletaViva>;

const Metade: React.FC<{ texto: string; cima: boolean; l: number; h: number; tam: number; style?: React.CSSProperties }> = ({ texto, cima, l, h, tam, style }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: cima ? 0 : h / 2,
      width: l,
      height: h / 2,
      overflow: 'hidden',
      background: cima ? '#2F323B' : '#272A31',
      borderRadius: cima ? `${l * 0.08}px ${l * 0.08}px 0 0` : `0 0 ${l * 0.08}px ${l * 0.08}px`,
      backfaceVisibility: 'hidden',
      ...style,
    }}
  >
    <div style={{ position: 'absolute', left: 0, top: cima ? 0 : -h / 2, width: l, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: tam, lineHeight: 1, color: cor.branco, paddingTop: tam * 0.12 }}>
      {texto}
    </div>
  </div>
);

/** Placa de aeroporto (split-flap): mostra `de` e vira para `para` no quadro `em`, com o "clac" da aba. */
export const Placa: React.FC<{ de: string; para: string; em: number; largura?: number; altura?: number; tamanho?: number; entra?: number }> = ({
  de,
  para,
  em,
  largura = 420,
  altura = 540,
  tamanho,
  entra = em - 20,
}) => {
  const frame = useCurrentFrame();
  const p = useMola(entra, { damping: 13, stiffness: 140 });
  const a1 = interpolate(frame, [em, em + 6], [0, 1], limita);
  const a2 = interpolate(frame, [em + 6, em + 12], [0, 1], limita);
  const tam = tamanho ?? altura * 0.78;
  const m = { l: largura, h: altura, tam };
  return (
    <div style={{ position: 'relative', width: largura, height: altura, perspective: 1600, transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`, opacity: Math.min(1, p * 2), filter: 'drop-shadow(0 34px 40px rgba(0,0,0,0.35))' }}>
      <Metade texto={frame < em ? de : para} cima {...m} />
      <Metade texto={frame < em + 12 ? de : para} cima={false} {...m} />
      {a1 > 0 && a1 < 1 ? <Metade texto={de} cima {...m} style={{ transformOrigin: '50% 100%', transform: `rotateX(${-90 * a1}deg)`, filter: `brightness(${1 - a1 * 0.4})` }} /> : null}
      {a1 >= 1 && a2 < 1 ? <Metade texto={para} cima={false} {...m} style={{ transformOrigin: '50% 0%', transform: `rotateX(${90 * (1 - a2)}deg)`, filter: `brightness(${0.6 + a2 * 0.4})` }} /> : null}
      <div style={{ position: 'absolute', left: 0, top: altura / 2 - 3, width: largura, height: 6, background: 'rgba(0,0,0,0.45)' }} />
      {[0.06, 0.88].map((x) => (
        <div key={x} style={{ position: 'absolute', top: altura / 2 - 14, left: x * largura, width: largura * 0.06, height: 28, borderRadius: 6, background: '#1B1D22' }} />
      ))}
      <Efeito nome="pop" em={em} volume={0.5} />
      <Efeito nome="pop" em={em + 6} volume={0.35} />
    </div>
  );
};

/** Palavra em placas, uma letra por placa, virando em sequência (ex.: HOJE). */
export const PlacasPalavra: React.FC<{ palavra: string; em: number; largura?: number; altura?: number }> = ({ palavra, em, largura = 210, altura = 300 }) => (
  <div style={{ display: 'flex', gap: 18 }}>
    {[...palavra].map((l, i) => (
      <Placa key={i} de=" " para={l} em={em + i * 5} entra={em - 14 + i * 3} largura={largura} altura={altura} />
    ))}
  </div>
);

/** Relógio de parede: ponteiros correm de `de` (horas) até 12:00 entre os quadros `ini` e `fim`. */
export const Relogio: React.FC<{ ini: number; fim: number; de?: number; tamanho?: number; treme?: boolean }> = ({ ini, fim, de = 9, tamanho = 440, treme }) => {
  const frame = useCurrentFrame();
  const p = useMola(ini - 10, { damping: 14, stiffness: 130 });
  const h = interpolate(frame, [ini, fim], [de, 12], { ...limita, easing: (t) => 1 - (1 - t) ** 3 });
  const chegou = frame >= fim;
  const tremor = treme && !chegou ? Math.sin(frame * 2.2) * 3 : 0;
  const ponteiro = (ang: number, comp: number, larg: number, c: string) => (
    <line x1="100" y1="100" x2={100 + Math.sin((ang * Math.PI) / 180) * comp} y2={100 - Math.cos((ang * Math.PI) / 180) * comp} stroke={c} strokeWidth={larg} strokeLinecap="round" />
  );
  return (
    <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.5, 1])}) rotate(${tremor}deg)`, opacity: Math.min(1, p * 2) }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 200 200" style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.3))' }}>
        <circle cx="100" cy="100" r="94" fill={cor.branco} stroke={chegou ? cor.laranjaVivo : cor.tinta} strokeWidth="10" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="100" y1="16" x2="100" y2={i % 3 === 0 ? 32 : 26} stroke={cor.tinta} strokeWidth={i % 3 === 0 ? 6 : 3} strokeLinecap="round" transform={`rotate(${i * 30} 100 100)`} />
        ))}
        <text x="100" y="62" textAnchor="middle" fontFamily="Baloo 2" fontWeight={800} fontSize="26" fill={chegou ? cor.laranjaVivo : cor.tinta}>
          12
        </text>
        {ponteiro((h % 12) * 30, 46, 9, cor.tinta)}
        {ponteiro(((h * 60) % 60) * 6, 68, 5, chegou ? cor.laranjaVivo : cor.coral)}
        <circle cx="100" cy="100" r="8" fill={cor.tinta} />
      </svg>
      <Efeito nome="ding" em={fim} volume={0.45} />
    </div>
  );
};

/** Cartão branco que entra de lado: rótulo colorido + texto (lista de passos). */
export const Passo: React.FC<{ em: number; rotulo: string; texto: string; corRotulo: string; icone?: React.ReactNode; largura?: number }> = ({
  em,
  rotulo,
  texto,
  corRotulo,
  icone,
  largura = 920,
}) => {
  const p = useMola(em, { damping: 13, stiffness: 160 });
  return (
    <div
      style={{
        width: largura,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '34px 36px',
        borderRadius: 36,
        background: cor.branco,
        boxShadow: '0 24px 44px rgba(0,0,0,0.22)',
        transform: `translateX(${(1 - p) * 1200}px) rotate(${(1 - p) * 8}deg)`,
      }}
    >
      <div style={{ flex: 'none', minWidth: 150, padding: '14px 18px', borderRadius: 24, background: corRotulo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 44, lineHeight: 1.05, textAlign: 'center', whiteSpace: 'pre-line' }}>{rotulo}</div>
      <div style={{ flex: 1, fontFamily: fonte.display, fontWeight: 800, fontSize: 54, lineHeight: 1.05, color: cor.tinta }}>{texto}</div>
      {icone}
      <Efeito nome="whoosh" em={em} volume={0.3} />
    </div>
  );
};

/**
 * Oferta "hoje × depois": bilhete grande com R$ 197 (e 6x sem juros no cartão) e, abaixo, o bilhete do preço
 * que vem depois. Sem preço riscado: são dois preços, cada um com a sua data.
 */
export const OfertaDupla: React.FC<{ rotuloHoje: string; rotuloDepois: string; tPreco: number; tSeis: number; tDepois: number; topo?: number }> = ({
  rotuloHoje,
  rotuloDepois,
  tPreco,
  tSeis,
  tDepois,
  topo = 560,
}) => {
  const frame = useCurrentFrame();
  const bilhete = useMola(tPreco, { damping: 11, stiffness: 150 });
  const seis = useMola(tSeis, { damping: 10, stiffness: 200, mass: 0.7 });
  const depois = useMola(tDepois, { damping: 14, stiffness: 150 });
  return (
    <>
      <Em y={topo}>
        <div
          style={{
            width: 860,
            borderRadius: 52,
            background: cor.branco,
            boxShadow: '0 40px 70px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            transform: `scale(${interpolate(bilhete, [0, 1], [0.3, 1])}) rotate(${-3 + Math.sin(frame / 28) * 0.8}deg)`,
            opacity: Math.min(1, bilhete * 2),
          }}
        >
          <div style={{ background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 40, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', padding: '20px 0' }}>{rotuloHoje}</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, padding: '20px 0 0' }}>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 90, color: cor.laranja, marginTop: 40 }}>R$</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 280, lineHeight: 1, color: cor.tinta }}>197</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 36px', transform: `scale(${interpolate(seis, [0, 1], [1.8, 1])})`, opacity: Math.min(1, seis * 3) }}>
            <div style={{ background: cor.tinta, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 52, lineHeight: 1, padding: '18px 34px', borderRadius: 26 }}>
              até 6x sem juros no cartão
            </div>
          </div>
        </div>
      </Em>
      <Em y={topo + 600}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            padding: '22px 40px',
            borderRadius: 32,
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            transform: `translateY(${(1 - depois) * 300}px)`,
            opacity: Math.min(1, depois * 2),
          }}
        >
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: cor.vermelho, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${Math.sin(frame / 7) * 4}px)` }}>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: fonte.corpo, fontWeight: 900, fontSize: 28, letterSpacing: 2, color: cor.muted, textTransform: 'uppercase' }}>{rotuloDepois}</div>
            <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 80, lineHeight: 1, color: cor.vermelho }}>R$ 297</div>
          </div>
        </div>
      </Em>
      <Efeito nome="ding" em={tPreco} volume={0.45} />
      <Efeito nome="pop" em={tSeis} volume={0.45} />
      <Efeito nome="whoosh" em={tDepois} volume={0.35} />
    </>
  );
};

/** Chip de data (ex.: "Quarta · 25/11 · 12h") que entra por baixo, centrado na altura y. */
export const ChipData: React.FC<{ em: number; y: number; texto: string; fundo?: string; tinta?: string; tamanho?: number }> = ({
  em,
  y,
  texto,
  fundo = cor.tinta,
  tinta = cor.branco,
  tamanho = 38,
}) => (
  <Em y={y}>
    <Surge em={em}>
      <Chip fundo={fundo} texto={tinta} tamanho={tamanho}>
        {texto}
      </Chip>
    </Surge>
  </Em>
);

/** Cena do app: título "preparatório pro concurso da Prefeitura de Palmital", celular com telas reais e chips à esquerda. */
export const AppPalmital: React.FC<{ ini: number; fim: number; titulo: string; telas: string[]; itens: string[]; tinta?: string }> = ({ ini, fim, titulo, telas, itens, tinta = cor.branco }) => {
  const passo = (fim - ini) / (itens.length + 1);
  const cel = useMola(ini, { damping: 15, stiffness: 120 });
  return (
    <>
      <div style={{ position: 'absolute', left: 72, top: 250, width: 936 }}>
        <Sobrelinha atraso={ini - 4} tinta={tinta === cor.branco ? cor.ouro : cor.tinta}>
          Preparatório · Prefeitura de Palmital
        </Sobrelinha>
        <Manchete texto={titulo} atraso={ini} tamanho={96} corTexto={tinta} faixa={cor.laranjaVivo} />
      </div>
      <div style={{ position: 'absolute', left: 560, top: 640, transform: `translateX(${(1 - cel) * 900}px) rotate(4deg)` }}>
        <CelularTelas largura={430} telas={telas.map((t, i) => ({ tela: t, em: i === 0 ? 0 : Math.round(ini + i * ((fim - ini) / telas.length)) }))} />
      </div>
      <div style={{ position: 'absolute', left: 50, top: 720, width: 510, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {itens.map((t, i) => (
          <Surge key={t} em={Math.round(ini + passo * (i + 0.6))} de="esquerda">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 24px', borderRadius: 28, background: cor.branco, boxShadow: '0 14px 30px rgba(0,0,0,0.18)' }}>
              <div style={{ flex: 'none', width: 54, height: 54, borderRadius: 16, background: cor.laranjaVivo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cor.branco} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, lineHeight: 1.05, color: cor.tinta }}>{t}</div>
            </div>
          </Surge>
        ))}
      </div>
      {itens.map((t, i) => (
        <Efeito key={t} nome="pop" em={Math.round(ini + passo * (i + 0.6))} volume={0.3} />
      ))}
    </>
  );
};
