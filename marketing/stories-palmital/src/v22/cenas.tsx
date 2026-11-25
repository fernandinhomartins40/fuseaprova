import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Aviso, limita, PropsCena } from '../comum';
import { Efeito } from '../componentes';
import { cor, fonte } from '../tema';

// V22 · "O jeito da banca" — uma mesa de estudo à noite, em 3D de verdade (three.js): abajur, edital impresso,
// caderno, caneca e o celular deitado, cuja luz banha a mesa. A cada fala, a tela real do app sobe do celular como
// holograma, e a Capi, em pé na mesa, reage. Voz Davi Andrei.

/* ------------------------------------------------------------------ texturas */
export const TELAS = ['edital-inicio', 'edital-resultado', 'real-trilha', '05-Pergunta', '07-Erro', '11-Simulado', 'real-inicio', 'real-revisao', 'real-simulado', 'edital-pergunta', '08-Fim', 'real-acerto'] as const;
export type Tela = (typeof TELAS)[number];
export const CAPIS = ['acenando', 'explicando', 'estudando', 'incentivando', 'celebrando', 'boas-vindas', 'constancia'] as const;
export type Capi = (typeof CAPIS)[number];
const PX_W = 1170;
const PX_H = 2532;

export const useTexturas = () => {
  const [tex, setTex] = useState<Record<string, THREE.Texture> | null>(null);
  const [h] = useState(() => delayRender('texturas do V22'));
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const arquivos: [string, string][] = [
      ...TELAS.map((n) => [n, `telas/${n}.png`] as [string, string]),
      ...CAPIS.map((n) => [`capi-${n}`, `img/capi-${n}.webp`] as [string, string]),
      ['logo', 'img/logo-completa.webp'],
    ];
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

/** Gerador pseudoaleatório fixo: a textura sai igual em todo quadro do render. */
const sorteio = (semente: number) => {
  let s = semente;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

const texturaCanvas = (w: number, h: number, pintar: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  pintar(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const madeira = () => {
  const t = texturaCanvas(1024, 1024, (g) => {
    const r = sorteio(7);
    g.fillStyle = '#4a2c18';
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      const y = r() * 1024;
      const fase = r() * 6;
      const amp = 2 + r() * 9;
      g.strokeStyle = r() < 0.55 ? `rgba(24,12,6,${0.08 + r() * 0.2})` : `rgba(140,90,52,${0.06 + r() * 0.14})`;
      g.lineWidth = 1 + r() * 6;
      g.beginPath();
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 170 + fase) * amp);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
};

const papelEdital = () =>
  texturaCanvas(840, 1188, (g) => {
    const r = sorteio(3);
    g.fillStyle = '#efe9dd';
    g.fillRect(0, 0, 840, 1188);
    g.fillStyle = '#1d1d1d';
    g.textAlign = 'center';
    g.font = 'bold 30px Georgia, serif';
    g.fillText('PREFEITURA MUNICIPAL DE PALMITAL', 420, 110);
    g.font = 'bold 26px Georgia, serif';
    g.fillText('CONCURSO PÚBLICO · EDITAL Nº 01/2026', 420, 160);
    g.fillRect(90, 190, 660, 3);
    g.fillStyle = 'rgba(30,30,30,0.55)';
    let y = 240;
    while (y < 1120) {
      if (r() < 0.12) y += 22; // parágrafo
      const w = r() < 0.15 ? 200 + r() * 300 : 600 + r() * 60;
      g.fillRect(90, y, w, 9);
      y += 26;
    }
  });

/* ---------------------------------------------------------------- geometria */
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

/* ------------------------------------------------------------ animação base */
const suave = Easing.bezier(0.45, 0, 0.2, 1);
export const sai = Easing.bezier(0.16, 1, 0.3, 1);
/** 0→1 entre `de` e `ate`, com curva. */
export const p = (f: number, de: number, ate: number, e = suave) => interpolate(f, [de, ate], [0, 1], { ...limita, easing: e });

type V3 = [number, number, number];
export type Chave = { t: number; pos: V3; alvo: V3 };
const mistura = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Câmera em trilho: interpola posição e alvo entre as chaves, com um respiro de mão. */
export const Camera: React.FC<{ chaves: Chave[] }> = ({ chaves }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  let i = 0;
  while (i < chaves.length - 2 && frame > chaves[i + 1].t) i++;
  const k = p(frame, chaves[i].t, chaves[i + 1].t);
  const pos = mistura(chaves[i].pos, chaves[i + 1].pos, k);
  const alvo = mistura(chaves[i].alvo, chaves[i + 1].alvo, k);
  camera.position.set(pos[0] + Math.sin(frame / 41) * 0.04, pos[1] + Math.sin(frame / 53) * 0.03, pos[2]);
  camera.lookAt(alvo[0], alvo[1], alvo[2]);
  return null;
};

/* ------------------------------------------------------------------ cenário */
export const TELA_Y = 0.13; // altura da tela do celular deitado
export const CEL_Z = 0.35;

export const Mesa: React.FC = () => {
  const frame = useCurrentFrame();
  const madeiraTex = useMemo(madeira, []);
  const edital = useMemo(papelEdital, []);
  const poeira = useMemo(() => {
    const r = sorteio(11);
    return Array.from({ length: 26 }, () => ({ x: -2.4 + r() * 2.8, y: 0.6 + r() * 2.2, z: -2.0 + r() * 1.6, v: 0.002 + r() * 0.004, s: 0.008 + r() * 0.014 }));
  }, []);
  return (
    <group>
      {/* tampo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial map={madeiraTex} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* parede do quarto */}
      <mesh position={[0, 4, -3.4]} receiveShadow>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color="#3a3340" roughness={0.95} />
      </mesh>
      {/* edital impresso, meio torto, embaixo do celular */}
      <mesh rotation={[-Math.PI / 2, 0, 0.22]} position={[-0.9, 0.006, -0.6]} receiveShadow castShadow>
        <planeGeometry args={[2.94, 4.16]} />
        <meshStandardMaterial map={edital} roughness={0.9} />
      </mesh>
      {/* caderno laranja */}
      <group position={[1.9, 0, -1.4]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.14, 3.2]} />
          <meshStandardMaterial color="#1f6f6a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.07, 0]} scale={[0.985, 0.8, 0.99]}>
          <boxGeometry args={[2.4, 0.14, 3.2]} />
          <meshStandardMaterial color="#f3eee4" roughness={0.9} />
        </mesh>
      </group>
      {/* caneta */}
      <mesh position={[0.85, 0.05, 1.05]} rotation={[0, 0.5, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.5, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* caneca com café */}
      <group position={[-1.9, 0, 0.6]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.45, 1.1, 40]} />
          <meshStandardMaterial color="#e9e5df" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.46, 40]} />
          <meshStandardMaterial color="#3a1f10" roughness={0.2} />
        </mesh>
        <mesh position={[0.5, 0.58, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.24, 0.06, 12, 24, Math.PI]} />
          <meshStandardMaterial color="#e9e5df" roughness={0.35} />
        </mesh>
      </group>
      {/* abajur */}
      <group position={[-3.9, 0, -2.4]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.8, 0.16, 40]} />
          <meshStandardMaterial color="#20232b" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0.4, 1.6, 0.3]} rotation={[0.25, 0, -0.28]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.2, 12]} />
          <meshStandardMaterial color="#20232b" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[0.95, 3.15, 0.75]} rotation={[0.55, 0, -0.75]} castShadow>
          <coneGeometry args={[0.65, 0.9, 40, 1, true]} />
          <meshStandardMaterial color="#20232b" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[1.12, 2.95, 0.92]}>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshBasicMaterial color="#fff1d6" toneMapped={false} />
        </mesh>
      </group>
      {/* poeira flutuando no facho do abajur */}
      {poeira.map((q, i) => (
        <mesh key={i} position={[q.x + Math.sin(frame / 60 + i) * 0.08, q.y + ((frame * q.v) % 0.6), q.z]}>
          <sphereGeometry args={[q.s, 6, 6]} />
          <meshBasicMaterial color="#ffd9a8" transparent opacity={0.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Celular deitado na mesa; a tela troca com um clarão quando a voz muda de assunto. */
export const Celular: React.FC<{ tex: Record<string, THREE.Texture>; trocas: { t: number; tela: Tela }[] }> = ({ tex, trocas }) => {
  const frame = useCurrentFrame();
  const W = 1;
  const H = 2.16;
  const corpo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(retangulo(W, H, 0.16), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 6, curveSegments: 24 });
    g.translate(0, 0, -0.07);
    return g;
  }, []);
  const geoTela = useMemo(() => placa(W - 0.07, H - 0.07, 0.13), []);
  let tela: Tela = TELAS[0];
  let clarao = 0;
  for (const tr of trocas) {
    if (frame >= tr.t) tela = tr.tela;
    clarao = Math.max(clarao, p(frame, tr.t - 5, tr.t) * (1 - p(frame, tr.t, tr.t + 10)));
  }
  return (
    <group position={[0, TELA_Y - 0.03, CEL_Z]} rotation={[-Math.PI / 2, 0, -0.12]}>
      <mesh geometry={corpo} castShadow>
        <meshPhysicalMaterial color="#1a1d25" metalness={0.9} roughness={0.25} clearcoat={1} clearcoatRoughness={0.12} />
      </mesh>
      <mesh geometry={geoTela} position={[0, 0, 0.026]}>
        <meshBasicMaterial map={tex[tela]} toneMapped={false} />
      </mesh>
      <mesh geometry={geoTela} position={[0, 0, 0.028]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85 * clarao} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh geometry={geoTela} position={[0, 0, 0.03]}>
        <meshPhysicalMaterial transparent opacity={0.12} roughness={0.04} metalness={0.1} clearcoat={1} color="#ffffff" depthWrite={false} />
      </mesh>
      {/* a luz da tela banha a mesa */}
      <pointLight position={[0, 0, 0.5]} intensity={2.2 + clarao * 6} distance={4} color="#cfe0ff" />
    </group>
  );
};

/* ---------------------------------------------------------------- holograma */
/** Um pedaço da tela (em pixels da captura 1170×2532). */
type Corte = { tela: Tela | 'logo'; x: number; y: number; w: number; h: number };

const useRecorte = (tex: THREE.Texture, c: Corte) =>
  useMemo(() => {
    if (c.tela === 'logo') return tex;
    const t = tex.clone();
    t.repeat.set(c.w / PX_W, c.h / PX_H);
    t.offset.set(c.x / PX_W, 1 - (c.y + c.h) / PX_H);
    t.needsUpdate = true;
    return t;
  }, [tex, c]);

const ADITIVO = { transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending } as const;

/** Sobe do celular, encara a câmera e flutua; o feixe liga a tela ao holograma. */
const Holograma: React.FC<{
  tex: THREE.Texture;
  corte: Corte;
  em: number;
  fim: number;
  largura: number;
  y: number;
  x?: number;
  brilho?: string;
  treme?: boolean;
  feixe?: boolean;
  fundo?: boolean;
}> = ({ tex, corte, em, fim, largura, y, x = 0, brilho = '#7cc8ff', treme, feixe = true, fundo = true }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const mapa = useRecorte(tex, corte);
  const altura = (largura * corte.h) / corte.w;
  const geo = useMemo(() => placa(largura, altura, Math.min(largura, altura) * 0.08), [largura, altura]);
  const halo1 = useMemo(() => placa(largura + 0.05, altura + 0.05, Math.min(largura, altura) * 0.1), [largura, altura]);
  const halo2 = useMemo(() => placa(largura + 0.22, altura + 0.22, Math.min(largura, altura) * 0.2), [largura, altura]);
  const ida = p(frame, em, em + 18, sai);
  const volta = p(frame, fim - 10, fim);
  const k = ida * (1 - volta);
  if (k <= 0.001) return null;
  const tremor = treme ? Math.sin((frame - em) * 1.9) * 0.05 * Math.max(0, 1 - (frame - em - 16) / 18) * (frame > em + 16 ? 1 : 0) : 0;
  const flutua = Math.sin((frame + em) / 22) * 0.025;
  const yAgora = TELA_Y + (y - TELA_Y) * ida + flutua + volta * 0.25;
  const base = yAgora - (altura / 2) * (0.3 + 0.7 * ida);
  return (
    <>
      {feixe && base > TELA_Y + 0.05 ? (
        <mesh position={[x / 2, (TELA_Y + base) / 2, CEL_Z]}>
          <cylinderGeometry args={[largura * 0.42, 0.42, base - TELA_Y, 32, 1, true]} />
          <meshBasicMaterial color={brilho} opacity={0.1 * k} side={THREE.DoubleSide} {...ADITIVO} />
        </mesh>
      ) : null}
      <group position={[x + tremor, yAgora, CEL_Z]} quaternion={camera.quaternion.clone()} scale={0.3 + 0.7 * ida}>
        {fundo ? (
          <>
            <mesh geometry={halo2} position={[0, 0, -0.02]}>
              <meshBasicMaterial color={brilho} opacity={0.16 * k} {...ADITIVO} />
            </mesh>
            <mesh geometry={halo1} position={[0, 0, -0.01]}>
              <meshBasicMaterial color={brilho} opacity={0.75 * k} {...ADITIVO} />
            </mesh>
          </>
        ) : null}
        <mesh geometry={geo}>
          <meshBasicMaterial map={mapa} toneMapped={false} transparent opacity={Math.min(1, k * 1.4)} />
        </mesh>
      </group>
    </>
  );
};

/* ---------------------------------------------------------------------- Capi */
/** A Capi em pé na mesa, sempre de frente para a câmera; troca de pose com um pulinho. */
export const CapiNaMesa: React.FC<{ tex: Record<string, THREE.Texture>; poses: { t: number; capi: Capi }[]; entra: number }> = ({ tex, poses, entra }) => {
  const frame = useCurrentFrame();
  const { camera } = useThree();
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1.4), []);
  const pos: V3 = [1.08, 0, 1.25];
  let atual: Capi = poses[0].capi;
  let pulo = 0;
  for (const q of poses) {
    if (frame >= q.t) atual = q.capi;
    pulo = Math.max(pulo, Math.sin(p(frame, q.t - 2, q.t + 12, (x) => x) * Math.PI));
  }
  const k = p(frame, entra, entra + 16, sai);
  if (k <= 0) return null;
  const altura = 0.95 * k;
  const giro = Math.atan2(camera.position.x - pos[0], camera.position.z - pos[2]);
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <circleGeometry args={[0.36 * k, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh geometry={geo} rotation={[0, giro, 0]} position={[0, (altura * 1.4) / 2 + pulo * 0.12, 0]} scale={[altura * (1 + pulo * 0.04), altura * (1 - pulo * 0.03), 1]}>
        <meshBasicMaterial map={tex[`capi-${atual}`]} transparent alphaTest={0.04} color="#efe6dc" toneMapped={false} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------- tipografia */
const Titulo: React.FC<{ em: number; fim: number; linhas: string[]; y?: number; tamanho?: number }> = ({ em, fim, linhas, y = 170, tamanho = 84 }) => {
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
              textShadow: '0 6px 30px rgba(0,0,0,0.7)',
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
  logo: { tela: 'logo', x: 0, y: 0, w: 1000, h: 420 },
};

/* ------------------------------------------------------------------- cena */
export const CenaCelular: React.FC<PropsCena> = ({ falas, duracao }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const tex = useTexturas();
  const [a, b, c, d, e, f] = falas;
  const meioB = b.ini + Math.round((b.fim - b.ini) * 0.52);
  const lenD = d.fim - d.ini;
  const lenE = e.fim - e.ini;

  // câmera: desce do alto até a mesa e passeia de leve de um lado pro outro a cada assunto
  const chaves: Chave[] = useMemo(
    () => [
      { t: 0, pos: [1.4, 7.5, 8.5], alvo: [0, 0.2, 0] },
      { t: a.ini + 34, pos: [0.2, 4.0, 7.0], alvo: [0, 1.15, 0] },
      { t: b.ini, pos: [-0.2, 3.9, 6.8], alvo: [0, 1.2, 0] },
      { t: c.ini, pos: [0.2, 4.0, 6.7], alvo: [0, 1.25, 0] },
      { t: d.ini, pos: [-0.2, 3.9, 6.6], alvo: [0, 1.25, 0] },
      { t: e.ini, pos: [0.2, 4.0, 6.7], alvo: [0, 1.2, 0] },
      { t: f.ini, pos: [0, 4.1, 7.0], alvo: [0, 1.3, 0] },
      { t: duracao, pos: [0, 4.5, 8.2], alvo: [0, 1.45, 0] },
    ],
    [a.ini, b.ini, c.ini, d.ini, e.ini, f.ini, duracao],
  );

  const trocas = [
    { t: b.ini, tela: 'edital-resultado' as Tela },
    { t: meioB, tela: 'real-trilha' as Tela },
    { t: c.ini, tela: '05-Pergunta' as Tela },
    { t: d.ini, tela: '07-Erro' as Tela },
    { t: e.ini, tela: '11-Simulado' as Tela },
    { t: f.ini, tela: 'real-trilha' as Tela },
  ];
  const poses = [
    { t: a.ini + 30, capi: 'acenando' as Capi },
    { t: b.ini + 6, capi: 'explicando' as Capi },
    { t: c.ini + 6, capi: 'estudando' as Capi },
    { t: d.ini + 6, capi: 'incentivando' as Capi },
    { t: e.ini + 6, capi: 'explicando' as Capi },
    { t: f.ini + 6, capi: 'celebrando' as Capi },
  ];

  const alternativas = ['altA', 'altB', 'altC', 'altD', 'altE'];
  const marca = p(frame, f.ini + 30, f.ini + 46, sai);

  return (
    <AbsoluteFill style={{ background: '#07080d' }}>
      {tex ? (
        <ThreeCanvas width={width} height={height} camera={{ position: [0, 3, 5], fov: 40 }} gl={{ antialias: true }} shadows>
          <Camera chaves={chaves} />
          <ambientLight intensity={0.16} color="#9fb4ff" />
          {/* abajur: luz quente que projeta sombra */}
          <spotLight
            position={[-1.5, 3.0, -1.7]}
            target-position={[0.2, 0, 0.3]}
            angle={0.95}
            penumbra={0.7}
            intensity={55}
            distance={14}
            decay={1.6}
            color="#ffb877"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0004}
          />
          {/* o abajur também clareia a parede */}
          <pointLight position={[-1.4, 2.6, -2.6]} intensity={14} distance={6} color="#ff9a55" />
          {/* luar azulado pela janela, do lado direito */}
          <directionalLight position={[5, 4, 2]} intensity={0.35} color="#7f9cff" />
          <pointLight position={[2.5, 2.2, 1.5]} intensity={6} distance={7} color="#22C3B5" />
          <Mesa />
          <Celular tex={tex} trocas={trocas} />
          <CapiNaMesa tex={tex} poses={poses} entra={a.ini + 26} />

          {/* 1 · 49 cargos: a Capi do app e o balão sobem */}
          <Holograma tex={tex['edital-inicio']} corte={C.capi} em={a.ini + 30} fim={b.ini} largura={1.85} y={1.55} />
          {/* 2 · pelo edital → você atende aos requisitos → a trilha do cargo */}
          <Holograma tex={tex['edital-resultado']} corte={C.requisitos} em={b.ini + 8} fim={meioB} largura={1.85} y={1.55} brilho="#34D399" />
          <Holograma tex={tex['real-trilha']} corte={C.unidade} em={meioB + 8} fim={c.ini} largura={1.85} y={1.55} brilho="#ffb057" />
          {/* 3 · questões no estilo da FAU: as alternativas sobem uma a uma; a C acende */}
          {alternativas.map((n, i) => (
            <Holograma
              key={n}
              tex={tex['05-Pergunta']}
              corte={C[n]}
              em={c.ini + 8 + i * 5}
              fim={d.ini}
              largura={n === 'altC' ? 1.9 : 1.7}
              y={2.15 - i * 0.33}
              x={n === 'altC' ? 0 : i % 2 ? 0.05 : -0.05}
              brilho={n === 'altC' ? cor.laranjaVivo : '#7cc8ff'}
              feixe={i === 4}
              fundo={n === 'altC'}
            />
          ))}
          {/* 4 · errou: a alternativa errada treme em vermelho, a explicação sobe */}
          <Holograma tex={tex['07-Erro']} corte={C.erradaA} em={d.ini + 8} fim={e.ini} largura={1.75} y={2.2} brilho={cor.vermelho} treme feixe={false} />
          <Holograma tex={tex['07-Erro']} corte={C.explicacao} em={d.ini + Math.round(lenD * 0.3)} fim={e.ini} largura={1.75} y={1.3} brilho="#34D399" />
          {/* 5 · simulado no formato oficial */}
          <Holograma tex={tex['11-Simulado']} corte={C.simulado} em={e.ini + 8} fim={f.ini} largura={1.8} y={1.5} brilho="#8B5CF6" />
          {/* 6 · a marca sobe do celular */}
          <Holograma tex={tex.logo} corte={C.logo} em={f.ini + 14} fim={duracao + 30} largura={1.9} y={1.75} brilho={cor.laranjaVivo} fundo={false} />
        </ThreeCanvas>
      ) : null}

      {/* vinheta de cinema */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)' }} />

      <Titulo em={a.ini} fim={b.ini - 4} linhas={['*49 cargos.*', 'Qual é o seu?']} />
      <Titulo em={b.ini + 2} fim={meioB - 4} linhas={['Pelo *edital*,', 'você descobre.']} />
      <Titulo em={meioB + 2} fim={c.ini - 4} linhas={['E a trilha', 'do *seu cargo.*']} />
      <Titulo em={c.ini + 2} fim={d.ini - 4} linhas={['+ de *10 mil* questões', 'no estilo da FAU.']} tamanho={78} />
      <Titulo em={d.ini + 2} fim={e.ini - 4} linhas={['Errou?', 'Explicação *na hora.*']} />
      <Titulo em={e.ini + 2} fim={f.ini - 4} linhas={['Simulado no', '*formato oficial.*']} />

      <Selo em={a.ini + 44} fim={b.ini - 4} y={1470}>
        Prefeitura de Palmital · edital 01/2026
      </Selo>
      <Selo em={d.ini + Math.round(lenD * 0.7)} fim={e.ini - 4} y={1470} fundo={cor.vermelho}>
        ↺ Volta na sua revisão
      </Selo>
      <Selo em={e.ini + Math.round(lenE * 0.45)} fim={f.ini - 4} y={1470} fundo={cor.roxo}>
        40 questões · 4 horas
      </Selo>
      {marca > 0 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1240, display: 'flex', justifyContent: 'center', opacity: marca, transform: `translateY(${(1 - marca) * 30}px)` }}>
          <div style={{ padding: '14px 30px', borderRadius: 999, background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.corpo, fontWeight: 900, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 0 40px rgba(255,106,31,0.5)' }}>
            Preparatório · Prefeitura de Palmital
          </div>
        </div>
      ) : null}

      <Efeito nome="whoosh" em={a.ini} volume={0.35} />
      {[b.ini, meioB, c.ini, d.ini, e.ini, f.ini].map((t) => (
        <Efeito key={t} nome="whoosh" em={t - 6} volume={0.3} />
      ))}
      {[a.ini + 30, b.ini + 8, meioB + 8, c.ini + 18, e.ini + 8].map((t) => (
        <Efeito key={t} nome="pop" em={t} volume={0.28} />
      ))}
      <Efeito nome="ding" em={f.ini + 20} volume={0.4} />
      <Aviso />
    </AbsoluteFill>
  );
};
