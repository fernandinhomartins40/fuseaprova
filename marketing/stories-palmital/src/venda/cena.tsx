import { fade } from '@remotion/transitions/fade';
import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Aviso, PropsCena } from '../comum';
import { Efeito } from '../componentes';
import { montarLinha, Narracao } from '../linhaDoTempo';
import { cor, fonte } from '../tema';
import { Camera, CapiNaMesa, Capi, CEL_Z, Celular, Chave, Mesa, p, sai, Tela, TELA_Y, useTexturas } from '../v22/cenas';
import { criarVideo } from '../Video';
import { TELAS_HTML, TipoTela } from './telas';

// Vídeos de venda (campanha até 05/12): a mesa de estudo 3D do V22, e a cada fala uma tela do app, em HTML de verdade
// (componentes de apps/web), sobe do celular como holograma e se anima. Legenda grande palavra a palavra no topo.

export type Momento = {
  legenda: string; // texto na tela; *palavra* sai em laranja
  tipo: TipoTela;
  capi?: Capi;
  linhas?: string[];
  cor?: string;
  rodape?: string;
};

/** Tela que o celular mostra enquanto o holograma está no ar. */
const TELA_DO_TIPO: Partial<Record<TipoTela, Tela>> = {
  questao: '05-Pergunta',
  erro: '07-Erro',
  revisao: 'real-revisao',
  simulado: 'real-simulado',
  edital: 'edital-pergunta',
  cargo: 'edital-resultado',
  trilha: 'real-trilha',
  licao: '08-Fim',
};

/** Altura aproximada de cada tela (px do app, coluna de 390) para caber entre a legenda e o aviso. */
const ALTURA: Record<TipoTela, number> = {
  questao: 600,
  erro: 700,
  revisao: 540,
  simulado: 430,
  edital: 540,
  cargo: 560,
  trilha: 470,
  licao: 440,
  oferta: 560,
  texto: 200,
  datas: 340,
  garantia: 270,
};

const COR_BRILHO: Record<TipoTela, string> = {
  questao: '#7cc8ff',
  erro: '#F04438',
  revisao: '#5B9BFF',
  simulado: '#A78BFA',
  edital: '#2DD4BF',
  cargo: '#34D399',
  trilha: '#2DD4BF',
  licao: '#FFB020',
  oferta: '#FF7A1A',
  texto: '#FF7A1A',
  datas: '#7cc8ff',
  garantia: '#34D399',
};

/* ------------------------------------------------------------- holograma HTML */
const Holo: React.FC<{ m: Momento; em: number; fim: number; ultimo: boolean }> = ({ m, em, fim, ultimo }) => {
  const frame = useCurrentFrame();
  const ida = p(frame, em, em + 16, sai);
  const volta = ultimo ? 0 : p(frame, fim - 8, fim);
  if (ida <= 0 || volta >= 1) return null;
  const T = TELAS_HTML[m.tipo];
  const h = ALTURA[m.tipo];
  const escala = Math.min(2.15, 1180 / (h + 36));
  const centro = 400 + ((h + 36) * escala) / 2;
  const y = interpolate(ida, [0, 1], [1500, centro]) - volta * 80;
  const brilho = m.cor && m.tipo === 'texto' ? m.cor : COR_BRILHO[m.tipo];
  const balanco = Math.sin((frame + em) / 30) * 3;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540,
        top: y,
        width: 390,
        transform: `translate(-50%, -50%) perspective(1100px) rotateX(${(1 - ida) * 60 + Math.sin(frame / 37) * 2}deg) rotateY(${balanco}deg) scale(${escala * (0.3 + 0.7 * ida)})`,
        opacity: Math.min(1, ida * 1.5) * (1 - volta),
        filter: volta > 0 ? `blur(${volta * 8}px)` : undefined,
      }}
    >
      <div
        className="tela-app"
        style={{
          background: 'var(--fa-bg)',
          borderRadius: 30,
          padding: 18,
          overflow: 'hidden',
          fontFamily: 'var(--fa-font-body)',
          fontWeight: 600,
          color: 'var(--fa-ink)',
          lineHeight: 1.4,
          boxShadow: `0 0 0 3px ${brilho}, 0 0 60px ${brilho}aa, 0 40px 90px rgba(0,0,0,0.6)`,
        }}
      >
        {/* fala curta: acelera a animação interna para ela terminar dentro da janela */}
        <T t={(frame - em) * Math.max(1, 64 / (fim - em))} d={Math.max(64, fim - em)} linhas={m.linhas} cor={m.cor} rodape={m.rodape} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------- legenda */
type Palavra = { w: string; hi: boolean };
const palavras = (legenda: string): Palavra[] => {
  const out: Palavra[] = [];
  let hi = false;
  // "R$" anda colado no número
  for (const bruto of legenda.replace(/R\$ /g, 'R$ ').split(/[ \t\n]+/).filter(Boolean)) {
    let w = bruto;
    const abre = w.startsWith('*');
    if (abre) w = w.slice(1);
    const fecha = w.endsWith('*') || /\*[.,!?:;]*$/.test(w);
    w = w.replace(/\*/g, '');
    out.push({ w, hi: hi || abre });
    if (abre) hi = true;
    if (fecha) hi = false;
  }
  return out;
};

/** Junta as palavras em blocos curtos (até ~16 letras) e reparte o tempo da fala pelo tamanho do texto. */
const blocos = (legenda: string, ini: number, fim: number) => {
  const ps = palavras(legenda);
  const grupos: Palavra[][] = [];
  for (const w of ps) {
    const g = grupos[grupos.length - 1];
    const tam = g ? g.reduce((a, x) => a + x.w.length + 1, 0) : 99;
    if (!g || tam + w.w.length > 16 || g.length >= 4) grupos.push([w]);
    else g.push(w);
  }
  const total = grupos.reduce((a, g) => a + g.reduce((b, x) => b + x.w.length + 1, 0), 0);
  let acc = 0;
  return grupos.map((g) => {
    const em = ini + Math.round(((fim - ini) * acc) / total);
    acc += g.reduce((b, x) => b + x.w.length + 1, 0);
    return { g, em };
  });
};

const Legenda: React.FC<{ legenda: string; ini: number; fim: number; ate: number }> = ({ legenda, ini, fim, ate }) => {
  const frame = useCurrentFrame();
  const bs = useMemo(() => blocos(legenda, ini, fim), [legenda, ini, fim]);
  if (frame < ini - 2 || frame >= ate) return null;
  let i = 0;
  while (i < bs.length - 1 && frame >= bs[i + 1].em) i++;
  const b = bs[i];
  const k = p(frame, b.em - 1, b.em + 6, sai);
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: 150, height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: fonte.display,
          fontWeight: 800,
          fontSize: 96,
          lineHeight: 1.0,
          color: cor.branco,
          WebkitTextStroke: '14px #0a0a12',
          paintOrder: 'stroke fill',
          textShadow: '0 10px 30px rgba(0,0,0,0.6)',
          transform: `scale(${0.7 + 0.3 * k}) rotate(${(1 - k) * -3}deg)`,
          opacity: k,
        }}
      >
        {b.g.map((x, j) => (
          <span key={j} style={{ color: x.hi ? cor.laranjaVivo : undefined }}>
            {x.w}
            {j < b.g.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- cena */
const Feixe: React.FC<{ em: number; fim: number; brilho: string; ultimo: boolean }> = ({ em, fim, brilho, ultimo }) => {
  const frame = useCurrentFrame();
  const k = p(frame, em, em + 16, sai) * (ultimo ? 1 : 1 - p(frame, fim - 8, fim));
  if (k <= 0) return null;
  const topo = 1.25;
  return (
    <mesh position={[0, (TELA_Y + topo) / 2, CEL_Z]}>
      <cylinderGeometry args={[0.85, 0.42, topo - TELA_Y, 32, 1, true]} />
      <meshBasicMaterial color={brilho} opacity={0.12 * k} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  );
};

const LinkNaBio: React.FC<{ em: number }> = ({ em }) => {
  const frame = useCurrentFrame();
  const k = p(frame, em, em + 12, sai);
  if (k <= 0) return null;
  const pulso = 1 + Math.max(0, Math.sin((frame - em) / 5)) * 0.05;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1500, display: 'flex', justifyContent: 'center', opacity: k, transform: `scale(${(0.8 + 0.2 * k) * pulso})` }}>
      <div style={{ padding: '16px 40px', borderRadius: 999, background: cor.laranjaVivo, color: cor.branco, fontFamily: fonte.display, fontWeight: 800, fontSize: 46, boxShadow: '0 0 50px rgba(255,106,31,0.7)' }}>
        👆 Link na bio
      </div>
    </div>
  );
};

const CenaVenda: React.FC<PropsCena & { momentos: Momento[] }> = ({ falas, duracao, momentos }) => {
  const { width, height } = useVideoConfig();
  const tex = useTexturas();
  // o holograma da fala i fica no ar do começo dela até o começo da próxima
  const janelas = falas.map((f, i) => ({ em: Math.max(0, f.ini - 4), fim: i < falas.length - 1 ? falas[i + 1].ini - 2 : duracao + 30 }));

  const chaves: Chave[] = useMemo(() => {
    const ks: Chave[] = [{ t: 0, pos: [1.0, 6.2, 8.4], alvo: [0, 0.6, 0] }];
    falas.forEach((f, i) => {
      const lado = i % 2 ? -1 : 1;
      ks.push({ t: i === 0 ? 22 : f.ini, pos: [0.22 * lado, 4.0 - (i % 3) * 0.06, 7.0 - (i % 3) * 0.15], alvo: [0, 1.2, 0] });
    });
    ks.push({ t: duracao, pos: [0, 4.3, 7.8], alvo: [0, 1.3, 0] });
    return ks;
  }, [falas, duracao]);

  let anterior: Tela = 'real-inicio';
  const trocas = momentos.map((m, i) => {
    anterior = TELA_DO_TIPO[m.tipo] ?? anterior;
    return { t: janelas[i].em, tela: anterior };
  });
  const poses = momentos.map((m, i) => ({ t: falas[i].ini, capi: m.capi ?? (i === momentos.length - 1 ? 'celebrando' : i % 2 ? 'explicando' : 'incentivando') }));
  const ultima = falas[falas.length - 1];

  return (
    <AbsoluteFill style={{ background: '#07080d' }}>
      {/* congela as animações CSS do app: aqui quem anima é o quadro do vídeo */}
      <style>{'.tela-app *, .tela-app *::before, .tela-app *::after { animation: none !important; transition: none !important; }'}</style>
      {tex ? (
        <ThreeCanvas width={width} height={height} camera={{ position: [0, 4, 7], fov: 40 }} gl={{ antialias: true }} shadows>
          <Camera chaves={chaves} />
          <ambientLight intensity={0.16} color="#9fb4ff" />
          <spotLight position={[-1.5, 3.0, -1.7]} target-position={[0.2, 0, 0.3]} angle={0.95} penumbra={0.7} intensity={55} distance={14} decay={1.6} color="#ffb877" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004} />
          <pointLight position={[-1.4, 2.6, -2.6]} intensity={14} distance={6} color="#ff9a55" />
          <directionalLight position={[5, 4, 2]} intensity={0.35} color="#7f9cff" />
          <pointLight position={[2.5, 2.2, 1.5]} intensity={6} distance={7} color="#22C3B5" />
          <Mesa />
          <Celular tex={tex} trocas={trocas} />
          <CapiNaMesa tex={tex} poses={poses} entra={10} />
          {momentos.map((m, i) => (
            <Feixe key={i} em={janelas[i].em} fim={janelas[i].fim} brilho={m.cor && m.tipo === 'texto' ? m.cor : COR_BRILHO[m.tipo]} ultimo={i === momentos.length - 1} />
          ))}
        </ThreeCanvas>
      ) : null}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)' }} />

      {momentos.map((m, i) => (
        <Holo key={i} m={m} em={janelas[i].em} fim={janelas[i].fim} ultimo={i === momentos.length - 1} />
      ))}
      {momentos.map((m, i) => (
        <Legenda key={i} legenda={m.legenda} ini={falas[i].ini} fim={falas[i].fim} ate={i < falas.length - 1 ? falas[i + 1].ini : duracao + 30} />
      ))}
      <LinkNaBio em={ultima.ini + 6} />

      {janelas.map((j, i) => (
        <Efeito key={i} nome="whoosh" em={j.em} volume={i === 0 ? 0.45 : 0.3} />
      ))}
      {falas.map((f, i) => (
        <Efeito key={`p${i}`} nome="pop" em={f.ini + 14} volume={0.22} />
      ))}
      {momentos.map((m, i) => (m.tipo === 'oferta' ? <Efeito key={`d${i}`} nome="ding" em={janelas[i].em + 18} volume={0.35} /> : null))}
      <Aviso />
    </AbsoluteFill>
  );
};

/** Monta um vídeo de venda a partir da narração e dos momentos (um por fala). */
export const criarVenda = (narracao: Narracao, momentos: Momento[], trilha: string) => {
  if (narracao.mesa.length !== momentos.length) throw new Error(`venda: ${narracao.mesa.length} falas e ${momentos.length} momentos`);
  const linha = montarLinha(narracao, ['mesa'], {}, false, { mesa: 40 });
  const Cena: React.FC<PropsCena> = (props) => <CenaVenda {...props} momentos={momentos} />;
  const Video = criarVideo({ linha, componentes: { mesa: Cena }, transicoes: [fade()], trilha });
  return { linha, Video };
};
