import { ThreeCanvas } from '@remotion/three';
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Aviso, limita, PropsCena } from '../comum';
import { Efeito } from '../componentes';
import { cor, fonte } from '../tema';

// V22 · "O jeito da banca" — um celular 3D de verdade (three.js) num estúdio escuro mostra, tela real por tela real,
// o que o Fuse Aprova faz: descobre o cargo pelo edital, monta a trilha, questões no estilo da FAU, explicação e
// revisão do erro, simulado no formato oficial. Os blocos da tela saem em 3D na hora em que a voz fala deles.

/* ------------------------------------------------------------------ telas */
const TELAS = ['edital-inicio', 'edital-resultado', 'real-trilha', '05-Pergunta', '07-Erro', '11-Simulado'] as const;
type Tela = (typeof TELAS)[number];
const PX_W = 1170;
const PX_H = 2532;

const useTexturas = () => {
  const [tex, setTex] = useState<Record<string, THREE.Texture> | null>(null);
  const [h] = useState(() => delayRender('texturas do V22'));
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const arquivos: [string, string][] = [...TELAS.map((n) => [n, `telas/${n}.png`] as [string, string]), ['logo', 'img/logo-completa.webp']];
    Promise.all(
      arquivos.map(
        ([n, arq]) =>
          new Promise<[string, THREE.Texture]>((ok, falha) =>
            loader.load(
              staticFile(arq),
              (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                t.anisotropy = 8;
                ok([n, t]);
              },
              undefined,
              falha,
            ),
          ),
      ),
    ).then((pares) => {
      setTex(Object.fromEntries(pares));
      continueRender(h);
    });
  }, [h]);
  return tex;
};

/* -------------------------------------------------------------- geometria */
const retangulo = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

/** Forma plana arredondada com UV 0..1 (a ShapeGeometry padrão usa as coordenadas da forma). */
const placa = (w: number, h: number, r: number) => {
  const g = new THREE.ShapeGeometry(retangulo(w, h, r), 16);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
};

const W = 1;
const H = 2.16;
const LOGO_H = 0.42; // altura/largura da logo-completa
const TW = W - 0.07; // tela
const TH = H - 0.07;

/** Um pedaço da tela (em pixels da captura 1170×2532) como placa 3D no mesmo lugar da tela. */
type Corte = { tela: Tela; x: number; y: number; w: number; h: number };
const posCorte = (c: Corte) => ({
  x: ((c.x + c.w / 2) / PX_W) * TW - TW / 2,
  y: TH / 2 - ((c.y + c.h / 2) / PX_H) * TH,
  w: (c.w / PX_W) * TW,
  h: (c.h / PX_H) * TH,
});

const useRecorte = (tex: THREE.Texture, c: Corte) =>
  useMemo(() => {
    const t = tex.clone();
    t.repeat.set(c.w / PX_W, c.h / PX_H);
    t.offset.set(c.x / PX_W, 1 - (c.y + c.h) / PX_H);
    t.needsUpdate = true;
    return t;
  }, [tex, c]);

/* ------------------------------------------------------------ animação base */
const suave = Easing.bezier(0.45, 0, 0.2, 1);
const sai = Easing.bezier(0.16, 1, 0.3, 1);
/** 0→1 entre `de` e `ate`, com curva. */
const p = (f: number, de: number, ate: number, e = suave) => interpolate(f, [de, ate], [0, 1], { ...limita, easing: e });

/** Bloco que descola da tela: sobe em z, cresce e desloca; volta (ou some) em `fim`. */
const Destaque: React.FC<{ tex: THREE.Texture; corte: Corte; em: number; fim: number; z?: number; dx?: number; dy?: number; escala?: number; giro?: number; brilho?: string; treme?: boolean }> = ({
  tex,
  corte,
  em,
  fim,
  z = 0.42,
  dx = 0,
  dy = 0,
  escala = 1.12,
  giro = 0,
  brilho,
  treme,
}) => {
  const frame = useCurrentFrame();
  const mapa = useRecorte(tex, corte);
  const pc = posCorte(corte);
  const geo = useMemo(() => placa(pc.w, pc.h, Math.min(pc.w, pc.h) * 0.1), [pc.w, pc.h]);
  const geoBorda = useMemo(() => placa(pc.w + 0.03, pc.h + 0.03, Math.min(pc.w, pc.h) * 0.12), [pc.w, pc.h]);
  const ida = p(frame, em, em + 16, sai);
  const volta = p(frame, fim - 10, fim);
  const k = ida * (1 - volta);
  if (k <= 0.001) return null;
  const tremor = treme ? Math.sin((frame - em) * 1.9) * 0.025 * Math.max(0, 1 - (frame - em - 14) / 16) * (frame > em + 14 ? 1 : 0) : 0;
  return (
    <group position={[pc.x + dx * k + tremor, pc.y + dy * k, 0.03 + z * k]} rotation={[0, giro * k, 0]} scale={1 + (escala - 1) * k}>
      {/* sombra projetada na tela */}
      <mesh geometry={geoBorda} position={[0.03 * k, -0.05 * k, -z * k + 0.005]}>
        <meshBasicMaterial color="#000" transparent opacity={0.35 * k} depthWrite={false} />
      </mesh>
      {brilho ? (
        <mesh geometry={geoBorda} position={[0, 0, -0.004]}>
          <meshBasicMaterial color={brilho} transparent opacity={0.85 * k} toneMapped={false} />
        </mesh>
      ) : null}
      <mesh geometry={geo}>
        <meshBasicMaterial map={mapa} toneMapped={false} transparent opacity={Math.min(1, k * 1.6)} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ celular */
type Pose = { t: number; ry: number; rx: number; rz: number; x: number; y: number; s: number };

const pose = (f: number, poses: Pose[]) => {
  let i = 0;
  while (i < poses.length - 2 && f > poses[i + 1].t) i++;
  const a = poses[i];
  const b = poses[i + 1];
  const k = p(f, a.t, b.t);
  const mix = (u: number, v: number) => u + (v - u) * k;
  return { ry: mix(a.ry, b.ry), rx: mix(a.rx, b.rx), rz: mix(a.rz, b.rz), x: mix(a.x, b.x), y: mix(a.y, b.y), s: mix(a.s, b.s) };
};

/** Giros completos (troca de tela de costas pra câmera): soma de 2π·progresso de cada giro. */
const giros = (f: number, lista: { t: number; dur: number; dir: number }[]) => lista.reduce((acc, g) => acc + g.dir * Math.PI * 2 * p(f, g.t, g.t + g.dur), 0);

type Tempos = {
  poses: Pose[];
  giros: { t: number; dur: number; dir: number; tela: Tela }[];
  foco: [number, number][]; // intervalos em que a tela escurece para o destaque aparecer
};

const Celular: React.FC<{ tex: Record<string, THREE.Texture>; tempos: Tempos; children: React.ReactNode }> = ({ tex, tempos, children }) => {
  const frame = useCurrentFrame();
  const corpo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(retangulo(W, H, 0.16), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 6, curveSegments: 24 });
    g.translate(0, 0, -0.07);
    return g;
  }, []);
  const geoTela = useMemo(() => placa(TW, TH, 0.13), []);
  const geoCamera = useMemo(() => placa(0.34, 0.5, 0.1), []);
  const geoLogo = useMemo(() => placa(0.8, 0.8 * LOGO_H, 0.02), []);
  const ps = pose(frame, tempos.poses);
  const ry = ps.ry + giros(frame, tempos.giros);
  // a tela muda no meio de cada giro, quando o celular está de costas
  let tela: Tela = TELAS[0];
  for (const g of tempos.giros) if (frame >= g.t + g.dur / 2) tela = g.tela;
  const escuro = tempos.foco.reduce((m, [a, b]) => Math.max(m, p(frame, a, a + 12) * (1 - p(frame, b - 10, b))), 0);
  const flutua = Math.sin(frame / 26) * 0.035;
  return (
    <group position={[ps.x, ps.y + flutua, 0]} rotation={[ps.rx + Math.sin(frame / 47) * 0.025, ry, ps.rz]} scale={ps.s}>
      <mesh geometry={corpo}>
        <meshPhysicalMaterial color="#1a1d25" metalness={0.9} roughness={0.25} clearcoat={1} clearcoatRoughness={0.12} />
      </mesh>
      {/* costas: a logo do Fuse Aprova, que aparece nos giros */}
      <mesh geometry={geoLogo} position={[0, -0.15, -0.0965]} rotation={[0, Math.PI, 0]}>
        <meshBasicMaterial map={tex.logo} transparent toneMapped={false} />
      </mesh>
      {/* módulo de câmera atrás */}
      <mesh geometry={geoCamera} position={[-0.22, 0.72, -0.1]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial color="#2a2e38" metalness={0.8} roughness={0.3} clearcoat={1} />
      </mesh>
      <mesh geometry={geoTela} position={[0, 0, 0.026]}>
        <meshBasicMaterial map={tex[tela]} toneMapped={false} />
      </mesh>
      <mesh geometry={geoTela} position={[0, 0, 0.028]}>
        <meshBasicMaterial color="#070912" transparent opacity={0.55 * escuro} depthWrite={false} />
      </mesh>
      {/* vidro: pega o reflexo das luzes */}
      <mesh geometry={geoTela} position={[0, 0, 0.03]}>
        <meshPhysicalMaterial transparent opacity={0.1} roughness={0.04} metalness={0.1} clearcoat={1} color="#ffffff" depthWrite={false} />
      </mesh>
      {children}
    </group>
  );
};

/* ------------------------------------------------------------- tipografia */
const Titulo: React.FC<{ em: number; fim: number; linhas: string[]; y?: number; tamanho?: number }> = ({ em, fim, linhas, y = 190, tamanho = 84 }) => {
  const frame = useCurrentFrame();
  const fora = p(frame, fim - 8, fim + 2);
  if (frame < em - 2 || fora >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, textAlign: 'center' }}>
      {linhas.map((l, i) => {
        const k = p(frame, em + i * 5, em + i * 5 + 14, sai);
        return (
          <div
            key={i}
            style={{
              fontFamily: fonte.display,
              fontWeight: 800,
              fontSize: tamanho,
              lineHeight: 1.05,
              color: cor.branco,
              opacity: k * (1 - fora),
              transform: `translateY(${(1 - k) * 34 - fora * 20}px)`,
              filter: `blur(${(1 - k) * 8 + fora * 6}px)`,
              textShadow: '0 6px 30px rgba(0,0,0,0.55)',
              whiteSpace: 'nowrap',
            }}
            // *palavra* em laranja
            dangerouslySetInnerHTML={{ __html: l.replace(/\*(.+?)\*/g, `<span style="color:${cor.laranjaVivo};text-shadow:0 0 34px rgba(255,106,31,0.65)">$1</span>`) }}
          />
        );
      })}
    </div>
  );
};

const Selo: React.FC<{ em: number; fim: number; y: number; children: React.ReactNode; fundo?: string }> = ({ em, fim, y, children, fundo = cor.laranjaVivo }) => {
  const frame = useCurrentFrame();
  const k = p(frame, em, em + 12, sai) * (1 - p(frame, fim - 8, fim));
  if (k <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: k, transform: `scale(${0.85 + 0.15 * k})` }}>
      <div style={{ padding: '14px 30px', borderRadius: 999, background: fundo, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 34, letterSpacing: 1, boxShadow: `0 0 40px ${fundo}88`, display: 'flex', alignItems: 'center', gap: 12 }}>
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ fundo */
const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const luz = interpolate(frame, [0, durationInFrames], [30, 70]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #1a2240 0%, #0b0e1a 52%, #04050a 100%)' }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${luz}% 82%, rgba(255,106,31,0.26) 0%, rgba(255,106,31,0) 42%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${100 - luz}% 30%, rgba(34,195,181,0.12) 0%, rgba(34,195,181,0) 40%)` }} />
      {Array.from({ length: 36 }, (_, i) => {
        const x = (i * 73.13) % 100;
        const y0 = (i * 41.7) % 100;
        const y = (y0 - frame * (0.04 + (i % 5) * 0.012) + 100) % 100;
        const t = 2 + (i % 4);
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: t, height: t, borderRadius: '50%', background: i % 3 ? 'rgba(255,255,255,0.35)' : 'rgba(255,140,60,0.6)', filter: 'blur(0.6px)' }} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- recortes */
const C: Record<string, Corte> = {
  capi: { tela: 'edital-inicio', x: 0, y: 0, w: 1170, h: 420 },
  requisitos: { tela: 'edital-resultado', x: 30, y: 225, w: 1110, h: 420 },
  unidade: { tela: 'real-trilha', x: 30, y: 165, w: 1110, h: 370 },
  altA: { tela: '05-Pergunta', x: 20, y: 722, w: 1130, h: 186 },
  altB: { tela: '05-Pergunta', x: 20, y: 916, w: 1130, h: 186 },
  altC: { tela: '05-Pergunta', x: 20, y: 1108, w: 1130, h: 196 },
  altD: { tela: '05-Pergunta', x: 20, y: 1310, w: 1130, h: 186 },
  altE: { tela: '05-Pergunta', x: 20, y: 1504, w: 1130, h: 186 },
  erradaA: { tela: '07-Erro', x: 20, y: 440, w: 1130, h: 180 },
  explicacao: { tela: '07-Erro', x: 0, y: 1590, w: 1170, h: 700 },
  simulado: { tela: '11-Simulado', x: 30, y: 220, w: 1110, h: 740 },
};

/* ------------------------------------------------------------------- cena */
export const CenaCelular: React.FC<PropsCena> = ({ falas, duracao }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const tex = useTexturas();
  const [a, b, c, d, e, f] = falas;
  const meioB = b.ini + Math.round((b.fim - b.ini) * 0.52);

  const tempos: Tempos = useMemo(
    () => ({
      poses: [
        { t: 0, ry: -1.5, rx: 0.5, rz: -0.25, x: 0.2, y: -3.2, s: 0.92 },
        { t: a.ini + 24, ry: -0.42, rx: 0.1, rz: -0.06, x: 0.05, y: -0.14, s: 0.92 },
        { t: b.ini - 10, ry: 0.32, rx: 0.06, rz: 0.04, x: -0.05, y: -0.14, s: 0.92 },
        { t: meioB, ry: -0.3, rx: 0.08, rz: -0.03, x: 0.05, y: -0.14, s: 0.92 },
        { t: c.ini - 6, ry: 0.28, rx: 0.05, rz: 0.03, x: -0.06, y: -0.14, s: 0.92 },
        { t: d.ini - 6, ry: -0.26, rx: 0.07, rz: -0.03, x: 0.05, y: -0.14, s: 0.92 },
        { t: e.ini - 6, ry: 0.24, rx: 0.05, rz: 0.03, x: -0.04, y: -0.14, s: 0.92 },
        { t: f.ini, ry: -0.2, rx: 0.06, rz: -0.02, x: 0, y: -0.14, s: 0.92 },
        { t: f.ini + 40, ry: 0, rx: 0.02, rz: 0, x: 0, y: 0.25, s: 0.72 },
        { t: duracao, ry: 0.08, rx: 0.02, rz: 0, x: 0, y: 0.28, s: 0.7 },
      ],
      giros: [
        { t: b.ini - 12, dur: 22, dir: 1, tela: 'edital-resultado' },
        { t: meioB - 10, dur: 22, dir: -1, tela: 'real-trilha' },
        { t: c.ini - 12, dur: 22, dir: 1, tela: '05-Pergunta' },
        { t: d.ini - 12, dur: 22, dir: -1, tela: '07-Erro' },
        { t: e.ini - 12, dur: 22, dir: 1, tela: '11-Simulado' },
        { t: f.ini - 6, dur: 26, dir: -1, tela: 'real-trilha' },
      ],
      foco: [
        [a.ini + 26, b.ini - 12],
        [b.ini + 12, meioB - 10],
        [meioB + 14, c.ini - 12],
        [c.ini + 12, d.ini - 12],
        [d.ini + 12, e.ini - 12],
        [e.ini + 12, f.ini - 6],
      ],
    }),
    [a.ini, b.ini, meioB, c.ini, d.ini, e.ini, f.ini, duracao],
  );

  const alternativas = ['altA', 'altB', 'altC', 'altD', 'altE'];
  const luzX = Math.sin(frame / 38) * 2.4;
  const marca = p(frame, f.ini + 26, f.ini + 44, sai);
  const lenD = d.fim - d.ini;
  const lenE = e.fim - e.ini;

  return (
    <AbsoluteFill>
      <Fundo />
      {tex ? (
        <ThreeCanvas width={width} height={height} camera={{ position: [0, 0.05, 5.4], fov: 38 }} gl={{ antialias: true }}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[2.5, 3, 4]} intensity={1.5} />
          <pointLight position={[luzX, -1.4, 1.6]} intensity={20} color="#FF6A1F" distance={8} />
          <pointLight position={[2.6, 1.8, -1.2]} intensity={16} color="#22C3B5" distance={8} />
          <pointLight position={[-2.6, 1.2, -1]} intensity={10} color="#FF6A1F" distance={7} />
          <Celular tex={tex} tempos={tempos}>
            {/* 1 · Descubra seu cargo: a Capi e o balão saem da tela */}
            <Destaque tex={tex['edital-inicio']} corte={C.capi} em={a.ini + 30} fim={b.ini - 12} z={0.5} dy={0.08} escala={1.12} />
            {/* 2 · você atende aos requisitos → a trilha do seu cargo */}
            <Destaque tex={tex['edital-resultado']} corte={C.requisitos} em={b.ini + 14} fim={meioB - 10} z={0.5} escala={1.14} brilho="#34D399" />
            <Destaque tex={tex['real-trilha']} corte={C.unidade} em={meioB + 16} fim={c.ini - 12} z={0.5} escala={1.14} />
            {/* 3 · questões no estilo da FAU: as alternativas descolam uma a uma, a C fica em destaque */}
            {alternativas.map((n, i) => (
              <Destaque
                key={n}
                tex={tex['05-Pergunta']}
                corte={C[n]}
                em={c.ini + 14 + i * 5}
                fim={d.ini - 12}
                z={n === 'altC' ? 0.62 : 0.3 + i * 0.02}
                dx={n === 'altC' ? 0 : i % 2 ? 0.06 : -0.06}
                escala={n === 'altC' ? 1.16 : 1.04}
                brilho={n === 'altC' ? cor.laranjaVivo : undefined}
              />
            ))}
            {/* 4 · errou: a alternativa errada treme, a explicação sobe */}
            <Destaque tex={tex['07-Erro']} corte={C.erradaA} em={d.ini + 12} fim={d.ini + Math.round(lenD * 0.42)} z={0.45} escala={1.12} brilho={cor.vermelho} treme />
            <Destaque tex={tex['07-Erro']} corte={C.explicacao} em={d.ini + Math.round(lenD * 0.34)} fim={e.ini - 12} z={0.55} dy={0.32} escala={1.14} />
            {/* 5 · simulado no formato oficial */}
            <Destaque tex={tex['11-Simulado']} corte={C.simulado} em={e.ini + 14} fim={f.ini - 6} z={0.55} dy={-0.05} escala={1.16} brilho="#8B5CF6" />
          </Celular>
        </ThreeCanvas>
      ) : null}

      {/* títulos (sem máscara: a linha entra inteira) */}
      <Titulo em={a.ini} fim={b.ini - 10} linhas={['*49 cargos.*', 'Qual é o seu?']} />
      <Titulo em={b.ini + 2} fim={meioB - 8} linhas={['Pelo *edital*,', 'você descobre.']} />
      <Titulo em={meioB + 2} fim={c.ini - 10} linhas={['E a trilha', 'do *seu cargo.*']} />
      <Titulo em={c.ini + 2} fim={d.ini - 10} linhas={['+ de *10 mil* questões', 'no estilo da FAU.']} tamanho={78} />
      <Titulo em={d.ini + 2} fim={e.ini - 10} linhas={['Errou?', 'Explicação *na hora.*']} />
      <Titulo em={e.ini + 2} fim={f.ini - 8} linhas={['Simulado no', '*formato oficial.*']} />

      <Selo em={a.ini + 40} fim={b.ini - 12} y={1572}>
        Prefeitura de Palmital · edital 01/2026
      </Selo>
      <Selo em={d.ini + Math.round(lenD * 0.7)} fim={e.ini - 12} y={1572} fundo={cor.vermelho}>
        ↺ Volta na sua revisão
      </Selo>
      <Selo em={e.ini + Math.round(lenE * 0.45)} fim={f.ini - 6} y={1572} fundo={cor.roxo}>
        40 questões · 4 horas
      </Selo>

      {/* fecho: o celular sobe e a marca aparece embaixo */}
      {marca > 0 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: marca, transform: `translateY(${(1 - marca) * 40}px)` }}>
          <Img src={staticFile('img/logo-completa.webp')} style={{ height: 190, filter: 'drop-shadow(0 18px 40px rgba(255,106,31,0.35))' }} />
          <div style={{ padding: '14px 30px', borderRadius: 999, background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 0 40px rgba(255,106,31,0.5)' }}>
            Preparatório · Prefeitura de Palmital
          </div>
        </div>
      ) : null}

      <Efeito nome="whoosh" em={a.ini} volume={0.4} />
      {[b.ini - 12, meioB - 10, c.ini - 12, d.ini - 12, e.ini - 12, f.ini - 6].map((t) => (
        <Efeito key={t} nome="whoosh" em={t} volume={0.32} />
      ))}
      {[a.ini + 30, b.ini + 14, meioB + 16, c.ini + 24, e.ini + 14].map((t) => (
        <Efeito key={t} nome="pop" em={t} volume={0.3} />
      ))}
      <Efeito nome="ding" em={f.ini + 30} volume={0.4} />
      <Aviso />
    </AbsoluteFill>
  );
};
