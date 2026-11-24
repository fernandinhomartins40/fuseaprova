import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { Aviso, limita, PropsCena } from '../comum';
import { Efeito, useMola } from '../componentes';
import { Placa } from '../contagem';
import { cor, fonte } from '../tema';
import { Manchete } from '../v8/cinema';

// V21 · "O pavio" — fundo escuro, um pavio aceso (laranja da marca) que corre o vídeo inteiro e acende cada ideia:
// relógio, Capi, questão, ofensiva, liga, virada, as 4 matérias, "um só caminho" e a logo. Câmera desce junto com a
// faísca. Voz Davi Andrei, calma; trilha leve que cresce.

const H = 1500; // distância entre as estações no "mundo"
const LARANJA = cor.laranjaVivo;
const VIDRO = 'linear-gradient(160deg, rgba(36,44,78,0.92), rgba(16,20,40,0.94))';
const BORDA = 'rgba(255,140,60,0.55)';
const brilho = (forca = 1) => `0 0 ${30 * forca}px rgba(255,106,31,${0.55 * forca}), 0 0 ${90 * forca}px rgba(255,106,31,${0.25 * forca}), 0 40px 80px rgba(0,0,0,0.55)`;
const suave = Easing.bezier(0.65, 0, 0.35, 1);

type P = { x: number; y: number };
const pt = (x: number, y: number): P => ({ x, y });

/* Pavio: curva de Bézier acesa até `p` (0–1), com faísca e fagulhas na ponta ---------------- */
const bezier = (a: P, c1: P, c2: P, b: P, t: number): P => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
};

const Ramo: React.FC<{ a: P; b: P; ini: number; fim: number; lado?: number; c1?: P; c2?: P; id: string }> = ({ a, b, ini, fim, lado, c1, c2, id }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [ini, fim], [0, 1], { ...limita, easing: suave });
  if (p <= 0) return null;
  const dy = b.y - a.y;
  const k1 = c1 ?? pt(lado ?? a.x, a.y + dy * 0.35);
  const k2 = c2 ?? pt(lado ?? b.x, b.y - dy * 0.35);
  const N = 90;
  const pontos = Array.from({ length: Math.max(2, Math.round(N * p) + 1) }, (_, i) => bezier(a, k1, k2, b, Math.min(p, i / N)));
  const d = pontos.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const ponta = pontos[pontos.length - 1];
  const viva = p < 1;
  const pulso = 0.75 + Math.sin(frame / 4) * 0.25;
  return (
    <g>
      <path d={d} stroke={LARANJA} strokeWidth={30} fill="none" strokeLinecap="round" opacity={0.35} filter="url(#borrao)" />
      <path d={d} stroke={LARANJA} strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#FFE2B8" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={ponta.x} cy={ponta.y} r={viva ? 46 : 26 * pulso} fill={LARANJA} opacity={viva ? 0.6 : 0.35} filter="url(#borrao)" />
      <circle cx={ponta.x} cy={ponta.y} r={viva ? 13 : 7} fill="#FFF4DC" />
      {viva
        ? Array.from({ length: 10 }, (_, i) => {
            const f = ((frame * 1.3 + i * 11) % 18) / 18;
            const ang = random(`${id}-${i}-${Math.floor((frame * 1.3 + i * 11) / 18)}`) * Math.PI * 2;
            return <circle key={i} cx={ponta.x + Math.cos(ang) * f * 70} cy={ponta.y + Math.sin(ang) * f * 70 + f * f * 30} r={3.5 * (1 - f) + 1} fill={i % 2 ? '#FFD08A' : LARANJA} opacity={1 - f} />;
          })
        : null}
    </g>
  );
};

/* Peças fixas ------------------------------------------------------------------------------- */
const No: React.FC<{ x: number; y: number; vis?: number; children: React.ReactNode }> = ({ x, y, vis = 1, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: vis }}>{children}</div>
);

/** Entrada 3D: vem de longe e inclinado, assenta quase de frente. */
const Entra3D: React.FC<{ em: number; rx?: number; ry?: number; children: React.ReactNode }> = ({ em, rx = 24, ry = -28, children }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 16, stiffness: 90 });
  const flutua = Math.sin(frame / 40) * 2;
  return (
    <div style={{ perspective: 1500 }}>
      <div
        style={{
          transform: `translateZ(${interpolate(p, [0, 1], [-900, 0])}px) rotateX(${interpolate(p, [0, 1], [rx * 2, rx * 0.3]) + flutua}deg) rotateY(${interpolate(p, [0, 1], [ry * 2, ry * 0.3])}deg)`,
          opacity: Math.min(1, p * 2.5),
          filter: `blur(${Math.max(0, 1 - p * 1.6) * 12}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Explosao: React.FC<{ em: number; tamanho?: number }> = ({ em, tamanho = 900 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [em, em + 26], [0, 1], { ...limita, easing: Easing.out(Easing.cubic) });
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{ position: 'relative', width: 0, height: 0 }}>
      {[0, 0.18].map((atraso) => {
        const q = Math.max(0, (p - atraso) / (1 - atraso));
        return <div key={atraso} style={{ position: 'absolute', left: (-tamanho * q) / 2, top: (-tamanho * q) / 2, width: tamanho * q, height: tamanho * q, borderRadius: '50%', border: `${10 * (1 - q) + 2}px solid ${LARANJA}`, opacity: 1 - q, boxShadow: brilho(1 - q) }} />;
      })}
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: -3, width: tamanho * 0.45 * p, height: 6, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${i % 2 ? '#FFD08A' : LARANJA})`, opacity: 1 - p, transformOrigin: '0 50%', transform: `rotate(${(i * 360) / 14 + 7}deg) translateX(${tamanho * 0.08 * p}px)` }} />
      ))}
    </div>
  );
};

/* Estações ---------------------------------------------------------------------------------- */
const RelogioNeon: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [em, em + 22], [0, 1], { ...limita, easing: suave });
  const giro = Math.max(0, frame - em);
  const c = 2 * Math.PI * 190;
  return (
    <svg width={520} height={520} viewBox="-260 -260 520 520" style={{ overflow: 'visible' }}>
      <circle r={190} fill="rgba(255,106,31,0.06)" stroke={LARANJA} strokeWidth={34} opacity={0.3} strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90)" filter="url(#borrao)" />
      <circle r={190} fill="none" stroke={LARANJA} strokeWidth={10} strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90)" strokeLinecap="round" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={0} y1={-160} x2={0} y2={i % 3 ? -146 : -134} stroke="#FFE2B8" strokeWidth={i % 3 ? 4 : 8} strokeLinecap="round" transform={`rotate(${i * 30})`} opacity={p} />
      ))}
      <g opacity={p}>
        <line x1={0} y1={0} x2={0} y2={-120} stroke="#FFF4DC" strokeWidth={12} strokeLinecap="round" transform={`rotate(${giro * 9})`} />
        <line x1={0} y1={0} x2={0} y2={-78} stroke={LARANJA} strokeWidth={14} strokeLinecap="round" transform={`rotate(${60 + giro * 0.75})`} />
        <circle r={16} fill={LARANJA} />
      </g>
    </svg>
  );
};

const Capi: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 11, stiffness: 140 });
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,31,0.45), rgba(255,106,31,0) 65%)', opacity: p }} />
      <Img src={staticFile('img/capi-acenando.webp')} style={{ height: 620, transform: `scale(${interpolate(p, [0, 1], [0.15, 1])}) translateY(${Math.sin(frame / 18) * 8}px)`, opacity: Math.min(1, p * 3), filter: 'drop-shadow(0 0 26px rgba(255,140,60,0.75)) drop-shadow(0 30px 40px rgba(0,0,0,0.6))' }} />
    </div>
  );
};

const ALTERNATIVAS = [
  ['A', 'Ele saiu à pé.'],
  ['B', 'Pagou à vista.'],
  ['C', 'Ficou cara à cara.'],
];

const Questao: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const marca = useMola(em + 26, { damping: 10, stiffness: 220 });
  const xp = useMola(em + 38, { damping: 12, stiffness: 180 });
  return (
    <Entra3D em={em - 4} rx={18} ry={-30}>
      <div style={{ width: 800, padding: '40px 44px 44px', borderRadius: 40, background: VIDRO, border: `2px solid ${BORDA}`, boxShadow: brilho(0.8), fontFamily: fonte.corpo, color: cor.branco }}>
        <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 999, background: 'rgba(255,106,31,0.18)', color: '#FFB27A', fontWeight: 900, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase' }}>Português · Crase</div>
        <div style={{ marginTop: 22, fontFamily: fonte.display, fontWeight: 800, fontSize: 44, lineHeight: 1.15 }}>Assinale a frase correta quanto ao uso da crase.</div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ALTERNATIVAS.map(([l, t], i) => {
            const certa = i === 1 && frame >= em + 22;
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 22px', borderRadius: 24, background: certa ? 'rgba(255,106,31,0.2)' : 'rgba(255,255,255,0.06)', border: `2px solid ${certa ? LARANJA : 'rgba(255,255,255,0.12)'}`, boxShadow: certa ? brilho(0.6) : 'none' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: certa ? LARANJA : 'rgba(255,255,255,0.1)', fontWeight: 900, fontSize: 28 }}>
                  {certa ? (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `scale(${marca})` }}>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    l
                  )}
                </div>
                <div style={{ fontWeight: 800, fontSize: 38, opacity: certa || frame < em + 22 ? 1 : 0.5 }}>{t}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 16, opacity: Math.min(1, xp * 2), transform: `scale(${interpolate(xp, [0, 1], [0.6, 1])})`, transformOrigin: '0 50%' }}>
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 46, color: '#FFB27A' }}>Isso aí!</div>
          <div style={{ padding: '8px 18px', borderRadius: 14, background: cor.ouro, color: cor.tinta, fontWeight: 900, fontSize: 30 }}>+10 XP</div>
        </div>
      </div>
      <Efeito nome="ding" em={em + 26} volume={0.4} />
    </Entra3D>
  );
};

const Chama: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const p = useMola(em, { damping: 9, stiffness: 160 });
  const t = frame / 5;
  return (
    <svg width={300} height={360} viewBox="-150 -320 300 360" style={{ overflow: 'visible', transform: `scale(${interpolate(p, [0, 1], [0.1, 1])})`, transformOrigin: '50% 100%', opacity: Math.min(1, p * 3) }}>
      <defs>
        <linearGradient id="fogo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF4D0D" />
          <stop offset="1" stopColor="#FFB000" />
        </linearGradient>
      </defs>
      <path d={`M0 20 C-120 20 -130 -90 -70 -170 C-60 -120 -30 -110 -20 -130 C-40 -210 ${10 + Math.sin(t) * 12} -270 ${30 + Math.sin(t) * 14} -300 C40 -220 130 -170 110 -60 C100 0 60 20 0 20 Z`} fill="url(#fogo)" filter="url(#borraoLeve)" />
      <path d={`M0 20 C-120 20 -130 -90 -70 -170 C-60 -120 -30 -110 -20 -130 C-40 -210 ${10 + Math.sin(t) * 12} -270 ${30 + Math.sin(t) * 14} -300 C40 -220 130 -170 110 -60 C100 0 60 20 0 20 Z`} fill="url(#fogo)" />
      <path d={`M0 10 C-60 10 -70 -50 -30 -110 C-20 -80 0 -80 ${6 + Math.sin(t * 1.3) * 8} -150 C40 -100 70 -60 60 -20 C50 5 30 10 0 10 Z`} fill="#FFD84D" />
      <ellipse cx={0} cy={-10} rx={34} ry={40 + Math.sin(t * 1.7) * 4} fill="#FFF6D8" />
    </svg>
  );
};

const Ofensiva: React.FC<{ em: number; len: number }> = ({ em, len }) => {
  const frame = useCurrentFrame();
  const s1 = em + 14;
  const s2 = em + Math.round(len * 0.6);
  const d0 = '001';
  const d1 = '030';
  const d2 = '100';
  const rotulo = useMola(em + 8);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Chama em={em - 6} />
      <div style={{ marginTop: 10, display: 'flex', gap: 16, padding: 18, borderRadius: 34, boxShadow: brilho(0.7), background: 'rgba(255,106,31,0.08)', border: `2px solid ${BORDA}` }}>
        {[0, 1, 2].map((i) =>
          frame < s2 - 1 ? (
            <Placa key={i} de={d0[i]} para={d1[i]} em={d0[i] === d1[i] ? 99999 : s1 + i * 3} entra={em - 4 + i * 3} largura={170} altura={230} />
          ) : (
            <Placa key={i} de={d1[i]} para={d2[i]} em={d1[i] === d2[i] ? 99999 : s2 + i * 3} entra={-999} largura={170} altura={230} />
          ),
        )}
      </div>
      <div style={{ marginTop: 24, fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: '#FFB27A', opacity: rotulo, textShadow: '0 0 24px rgba(255,106,31,0.7)' }}>dias de ofensiva</div>
    </div>
  );
};

const LIGA: [string, string, number][] = [
  ['RT', 'Rafael T.', 1380],
  ['JP', 'Juliana P.', 1215],
  ['LM', 'Lucas M.', 1102],
  ['AC', 'Ana C.', 980],
  ['PH', 'Pedro H.', 905],
];
const AVATAR = ['#2F9E8F', '#C2410C', '#7C3AED', '#B45309', '#0E7490'];

const Liga: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const LINHA = 104;
  const pos = interpolate(frame, [em + 12, em + 52], [5, 2], { ...limita, easing: suave });
  const xp = Math.round(interpolate(frame, [em + 12, em + 52], [860, 1150], limita));
  const linha = (y: number, conteudo: React.ReactNode, voce = false) => (
    <div style={{ position: 'absolute', left: 0, top: y * LINHA, width: '100%', height: LINHA - 14, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', borderRadius: 22, background: voce ? 'rgba(255,106,31,0.22)' : 'rgba(255,255,255,0.06)', border: `2px solid ${voce ? LARANJA : 'rgba(255,255,255,0.1)'}`, boxShadow: voce ? brilho(0.9) : 'none', transform: voce ? 'scale(1.04)' : 'none', zIndex: voce ? 2 : 1 }}>
      {conteudo}
    </div>
  );
  const corpo = (rank: number, sigla: string, nome: string, pontos: number, fundo: string, voce = false) => (
    <>
      <div style={{ width: 44, fontWeight: 900, fontSize: 30, color: voce ? '#FFB27A' : 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{rank}</div>
      <div style={{ width: 62, height: 62, borderRadius: '50%', background: fundo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24 }}>{sigla}</div>
      <div style={{ flex: 1, fontWeight: 800, fontSize: 36 }}>{nome}</div>
      <div style={{ fontWeight: 900, fontSize: 32, color: voce ? '#FFB27A' : 'rgba(255,255,255,0.85)' }}>{pontos.toLocaleString('pt-BR')} XP</div>
    </>
  );
  return (
    <Entra3D em={em - 4} rx={22} ry={24}>
      <div style={{ width: 780, padding: '34px 34px 20px', borderRadius: 40, background: VIDRO, border: `2px solid ${BORDA}`, boxShadow: brilho(0.8), fontFamily: fonte.corpo, color: cor.branco }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Img src={staticFile('img/icone-liga.webp')} style={{ height: 76 }} />
          <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 52 }}>Liga Bronze</div>
        </div>
        <div style={{ position: 'relative', height: LINHA * 6 }}>
          {LIGA.map(([s, n, x], k) => {
            const y = k + Math.min(1, Math.max(0, k + 1 - pos));
            return <React.Fragment key={s}>{linha(y, corpo(Math.round(y) + 1, s, n, x, AVATAR[k]))}</React.Fragment>;
          })}
          {linha(pos, corpo(Math.round(pos) + 1, 'VC', 'Você', xp, LARANJA, true), true)}
        </div>
      </div>
      <Efeito nome="ding" em={em + 52} volume={0.45} />
    </Entra3D>
  );
};

const MATERIAS: [string, string][] = [
  ['icone-portugues', 'Português'],
  ['icone-matematica', 'Matemática'],
  ['icone-gerais', 'Conhecimentos\nGerais'],
  ['icone-especificos', 'Seu cargo'],
];

const Materia: React.FC<{ icone: string; nome: string; acende: number }> = ({ icone, nome, acende }) => {
  const frame = useCurrentFrame();
  const p = useMola(acende, { damping: 12, stiffness: 160 });
  const ligada = frame >= acende;
  return (
    <div style={{ perspective: 1200 }}>
      <div
        style={{
          width: 420,
          height: 320,
          borderRadius: 36,
          background: VIDRO,
          border: `2px solid ${ligada ? LARANJA : 'rgba(255,255,255,0.12)'}`,
          boxShadow: ligada ? brilho(0.9) : '0 30px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          opacity: 0.35 + p * 0.65,
          transform: `rotateX(${interpolate(p, [0, 1], [30, 8])}deg) scale(${interpolate(p, [0, 1], [0.88, 1])})`,
        }}
      >
        <Img src={staticFile(`img/${icone}.webp`)} style={{ height: 130, filter: ligada ? 'drop-shadow(0 0 20px rgba(255,140,60,0.7))' : 'grayscale(0.7) brightness(0.6)' }} />
        <div style={{ fontFamily: fonte.display, fontWeight: 800, fontSize: 44, lineHeight: 1.05, color: cor.branco, textAlign: 'center', whiteSpace: 'pre-line' }}>{nome}</div>
      </div>
      <Efeito nome="pop" em={acende} volume={0.4} />
    </div>
  );
};

/** Logo final: cartão branco com brilho laranja e a pílula do preparatório. Usada também no quadro da marca. */
const Final: React.FC<{ em: number }> = ({ em }) => {
  const p = useMola(em, { damping: 12, stiffness: 140 });
  const pilula = useMola(em + 16, { damping: 14 });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 140 }}>
      <div style={{ position: 'absolute', top: 520, width: 1000, height: 1000, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,31,0.35), rgba(255,106,31,0) 60%)', opacity: p }} />
      <div style={{ padding: '48px 60px', borderRadius: 56, background: cor.branco, boxShadow: brilho(1.2), transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`, opacity: Math.min(1, p * 2.5) }}>
        <Img src={staticFile('img/logo-completa.webp')} style={{ width: 720, display: 'block' }} />
      </div>
      <div style={{ marginTop: 56, padding: '18px 36px', borderRadius: 999, background: LARANJA, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 32, letterSpacing: 2, textTransform: 'uppercase', boxShadow: brilho(0.8), opacity: pilula, transform: `translateY(${(1 - pilula) * 40}px)` }}>
        Preparatório · Prefeitura de Palmital
      </div>
    </AbsoluteFill>
  );
};

/* Fundo e legendas -------------------------------------------------------------------------- */
const Fundo: React.FC<{ cam: number }> = ({ cam }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #18213F 0%, #0B0F1E 55%, #05070F 100%)' }}>
      {Array.from({ length: 46 }, (_, i) => {
        const prof = 0.1 + random(`p${i}`) * 0.35;
        const y = (((random(`y${i}`) * 2400 - cam * prof - frame * 0.6 * prof) % 2400) + 2400) % 2400 - 240;
        return <div key={i} style={{ position: 'absolute', left: random(`x${i}`) * 1080, top: y, width: 3 + prof * 10, height: 3 + prof * 10, borderRadius: '50%', background: i % 3 ? 'rgba(255,190,140,0.5)' : 'rgba(255,106,31,0.6)', opacity: 0.25 + prof, filter: `blur(${prof * 4}px)` }} />;
      })}
    </AbsoluteFill>
  );
};

const Vinheta = () => <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />;

const LEGENDAS = [
  'Poucos *minutos* / por dia.',
  'É só disso que / você *precisa.*',
  'Uma questão / de *cada vez.*',
  'Uma *ofensiva* / pra não perder.',
  'Uma *liga* / pra ganhar.',
  'No dia da prova, / chega *preparado.*',
  'Tudo o que / *cai na prova.*',
  'Um só *caminho.*',
];

/** Sombra escura atrás da legenda, para o pavio não brigar com o texto. */
const FundoLegenda: React.FC<{ ini: number; fim: number }> = ({ ini, fim }) => {
  const frame = useCurrentFrame();
  if (frame < ini - 2 || frame > fim + 2) return null;
  const sai = interpolate(frame, [fim - 8, fim], [1, 0], limita);
  return (
    <div style={{ position: 'absolute', left: 0, top: 120, width: 1080, height: 560, background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(5,7,15,0.85), rgba(5,7,15,0))', opacity: sai }} />
  );
};

const LegendaTexto: React.FC<{ texto: string; ini: number; fim: number; sub?: string }> = ({ texto, ini, fim, sub }) => {
  const frame = useCurrentFrame();
  if (frame < ini - 2 || frame > fim + 2) return null;
  const sai = interpolate(frame, [fim - 8, fim], [1, 0], limita);
  return (
    <div style={{ position: 'absolute', left: 60, top: 250, width: 960, opacity: sai, transform: `translateY(${(1 - sai) * -30}px)`, filter: `blur(${(1 - sai) * 8}px)` }}>
      <Manchete texto={texto} atraso={ini} tamanho={104} faixa={LARANJA} corFaixa={cor.branco} centro />
      {sub ? (
        <div style={{ marginTop: 18, textAlign: 'center', fontFamily: fonte.display, fontWeight: 800, fontSize: 50, color: '#FFB27A', opacity: interpolate(frame, [ini + 20, ini + 34], [0, 1], limita) }}>{sub}</div>
      ) : null}
    </div>
  );
};

/* A cena única ------------------------------------------------------------------------------ */
export const CenaCaminho: React.FC<PropsCena> = ({ falas, duracao }) => {
  const frame = useCurrentFrame();
  const ini = falas.map((f) => f.ini);
  const chega = ini.map((i) => i + 10); // quando a câmera e a faísca chegam à estação
  const cam = ini.slice(1).reduce((s, i) => s + H * interpolate(frame, [i - 12, i + 10], [0, 1], { ...limita, easing: suave }), 0);
  const Y = (k: number, y: number) => k * H + y;
  const vis = (k: number) => interpolate(Math.abs(cam - k * H), [H * 0.25, H * 0.6], [1, 0], limita);

  // âncoras do pavio em cada estação (coordenadas do mundo)
  const A = [pt(540, Y(0, 820)), pt(540, Y(1, 1040)), pt(150, Y(2, 760)), pt(540, Y(3, 900)), pt(930, Y(4, 700)), pt(540, Y(5, 1060)), pt(540, Y(6, 660)), pt(540, Y(7, 1080)), pt(540, Y(8, 1000))];
  const CARTOES = [pt(300, Y(6, 960)), pt(780, Y(6, 960)), pt(300, Y(6, 1320)), pt(780, Y(6, 1320))];
  const len6 = falas[6].fim - falas[6].ini;
  const acende = [0, 0.22, 0.48, 0.72].map((r) => ini[6] + Math.round(len6 * r) + 14);
  const lados = [0, 960, 120, 140, 960, 160, 0, 0, 0];

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Fundo cam={cam} />
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 9 * H + 1920, transformOrigin: `540px ${cam + 960}px`, transform: `translateY(${-cam}px) rotateX(9deg) rotateZ(${Math.sin(frame / 70) * 0.8}deg)` }}>
          <svg width={1080} height={9 * H + 1920} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <defs>
              <filter id="borrao" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
              <filter id="borraoLeve" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="18" />
              </filter>
            </defs>
            <Ramo id="r0" a={pt(-80, 260)} b={A[0]} c1={pt(300, 200)} c2={pt(200, 760)} ini={0} fim={chega[0]} />
            {[1, 2, 3, 4, 5, 6, 8].map((k) => (
              <Ramo key={k} id={`r${k}`} a={A[k - 1]} b={A[k]} lado={lados[k]} ini={ini[k] - 12} fim={chega[k]} />
            ))}
            {CARTOES.map((c, j) => (
              <Ramo key={`d${j}`} id={`d${j}`} a={A[6]} b={c} c1={pt(540, A[6].y + 160)} c2={pt(j % 2 ? 1010 : 70, c.y - 120)} ini={acende[j] - 16} fim={acende[j]} />
            ))}
            {CARTOES.map((c, j) => (
              <Ramo key={`c${j}`} id={`c${j}`} a={c} b={A[7]} c1={pt(j % 2 ? 1010 : 70, c.y + 200)} c2={pt(540, A[7].y - 260)} ini={ini[7] - 12} fim={chega[7]} />
            ))}
          </svg>

          <No x={540} y={Y(0, 1060)} vis={vis(0)}>
            <RelogioNeon em={chega[0] - 6} />
          </No>
          <No x={540} y={Y(1, 1060)} vis={vis(1)}>
            <Capi em={chega[1] - 6} />
          </No>
          <No x={540} y={Y(2, 1110)} vis={vis(2)}>
            <Questao em={chega[2]} />
          </No>
          <No x={540} y={Y(3, 1080)} vis={vis(3)}>
            <Ofensiva em={chega[3]} len={falas[3].fim - falas[3].ini} />
          </No>
          <No x={540} y={Y(4, 1100)} vis={vis(4)}>
            <Liga em={chega[4]} />
          </No>
          <No x={540} y={Y(5, 1060)}>
            <Explosao em={chega[5]} tamanho={1100} />
          </No>
          <No x={540} y={Y(5, 1060)} vis={vis(5)}>
            <div style={{ transform: `scale(${interpolate(frame, [chega[5], chega[5] + 14], [0, 1], { ...limita, easing: Easing.out(Easing.back(2)) })})` }}>
              <div style={{ width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,31,0.35), rgba(255,106,31,0.05) 70%)', border: `6px solid ${LARANJA}`, boxShadow: brilho(1.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#FFF4DC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 14px rgba(255,140,60,0.9))' }}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
            </div>
          </No>
          {CARTOES.map((c, j) => (
            <No key={j} x={c.x} y={c.y} vis={Math.max(vis(6), vis(7) * 0.5)}>
              <Materia icone={MATERIAS[j][0]} nome={MATERIAS[j][1]} acende={acende[j]} />
            </No>
          ))}
          <No x={540} y={A[7].y}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#FFF4DC', boxShadow: brilho(1.6), opacity: interpolate(frame, [chega[7] - 4, chega[7] + 4], [0, 1], limita), transform: `scale(${1 + Math.sin(frame / 5) * 0.12})` }} />
          </No>
          <No x={540} y={A[7].y}>
            <Explosao em={chega[7]} tamanho={600} />
          </No>
        </div>
      </AbsoluteFill>

      {LEGENDAS.map((_, k) => (
        <FundoLegenda key={`f${k}`} ini={ini[k] - 2} fim={(ini[k + 1] ?? duracao) - 8} />
      ))}
      {LEGENDAS.map((t, k) => (
        <LegendaTexto key={k} texto={t} ini={ini[k] - 2} fim={(ini[k + 1] ?? duracao) - 8} sub={k === 7 ? 'até a prova da Prefeitura de Palmital' : undefined} />
      ))}

      {frame >= chega[8] - 2 ? (
        <>
          <AbsoluteFill style={{ background: '#FFF4DC', opacity: interpolate(frame, [chega[8], chega[8] + 3, chega[8] + 14], [0, 0.55, 0], limita) }} />
          <Final em={chega[8]} />
        </>
      ) : null}
      <AbsoluteFill style={{ top: 900 }}>
        <No x={540} y={0}>
          <Explosao em={chega[8]} tamanho={1300} />
        </No>
      </AbsoluteFill>

      <Vinheta />
      <Aviso corTexto="rgba(255,255,255,0.7)" />
      <Efeito nome="whoosh" em={0} volume={0.35} />
      {ini.slice(1).map((i, k) => (
        <Efeito key={k} nome="whoosh" em={i - 12} volume={0.3} />
      ))}
      <Efeito nome="ding" em={chega[0]} volume={0.35} />
      <Efeito nome="pop" em={chega[1] - 4} volume={0.5} />
      <Efeito nome="ding" em={chega[5]} volume={0.45} />
      <Efeito nome="ding" em={chega[8]} volume={0.5} />
    </AbsoluteFill>
  );
};

/* Quadro final: o mesmo fecho, parado, para a transição ficar invisível ----------------------- */
export const CenaLogo: React.FC<PropsCena> = () => (
  <AbsoluteFill>
    <Fundo cam={8 * H} />
    <Final em={-100} />
    <Vinheta />
    <Aviso corTexto="rgba(255,255,255,0.7)" />
  </AbsoluteFill>
);
