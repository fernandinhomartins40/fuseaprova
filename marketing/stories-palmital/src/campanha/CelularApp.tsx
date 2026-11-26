import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TELAS_HTML, type TipoTela } from '../venda/telas';

// Celular com a tela do app em HTML de verdade (componentes de apps/web/src/ui), animada quadro a quadro.
// `telas` troca de tela no quadro `em` de cada uma; `fim` diz até quando a última fica no ar.

const CONGELA = '.tela-app *, .tela-app *::before, .tela-app *::after { animation: none !important; transition: none !important; }';

export const CelularApp: React.FC<{
  telas: { tipo: TipoTela; em: number; linhas?: string[]; cor?: string; rodape?: string }[];
  fim: number;
  largura?: number;
  style?: React.CSSProperties;
}> = ({ telas, fim, largura = 470, style }) => {
  const frame = useCurrentFrame();
  const borda = largura * 0.035;
  const dentro = largura - borda * 2;
  const altura = dentro * (2532 / 1170) + borda * 2;
  const escala = dentro / 390;
  let i = 0;
  while (i < telas.length - 1 && frame >= telas[i + 1].em) i++;
  const atual = telas[i];
  const ate = i < telas.length - 1 ? telas[i + 1].em : fim;
  const T = TELAS_HTML[atual.tipo];
  const botao = (lado: 'esq' | 'dir', topo: number, alto: number) => (
    <div style={{ position: 'absolute', [lado === 'esq' ? 'left' : 'right']: -largura * 0.012, top: topo, width: largura * 0.016, height: alto, borderRadius: 4, background: 'linear-gradient(90deg, #5b606b, #2a2d33)' }} />
  );
  return (
    <div
      style={{
        position: 'relative',
        width: largura,
        height: altura,
        borderRadius: largura * 0.13,
        padding: borda,
        background: 'linear-gradient(145deg, #5a5f69 0%, #1d1f24 38%, #0e0f12 62%, #3d414a 100%)',
        boxShadow: `0 0 0 2px rgba(255,255,255,0.18) inset, 0 0 0 ${largura * 0.008}px #08090b inset, 0 ${largura * 0.06}px ${largura * 0.12}px rgba(0,0,0,0.38), 0 ${largura * 0.02}px ${largura * 0.03}px rgba(0,0,0,0.3)`,
        ...style,
      }}
    >
      <style>{CONGELA}</style>
      {botao('esq', altura * 0.18, altura * 0.06)}
      {botao('esq', altura * 0.27, altura * 0.1)}
      {botao('dir', altura * 0.24, altura * 0.14)}
      <div style={{ width: '100%', height: '100%', borderRadius: largura * 0.1, overflow: 'hidden', position: 'relative', background: 'var(--fa-bg)', boxShadow: '0 0 0 3px #000' }}>
        <div
          className="tela-app"
          style={{
            width: 390,
            transform: `scale(${escala})`,
            transformOrigin: '0 0',
            padding: '56px 18px 18px',
            fontFamily: 'var(--fa-font-body)',
            fontWeight: 600,
            color: 'var(--fa-ink)',
            lineHeight: 1.4,
          }}
        >
          <T key={i} t={Math.max(0, frame - atual.em) * Math.max(1, 64 / Math.max(1, ate - atual.em))} d={Math.max(64, ate - atual.em)} linhas={atual.linhas} cor={atual.cor} rodape={atual.rodape} />
        </div>
        <div style={{ position: 'absolute', top: largura * 0.025, left: '50%', width: largura * 0.28, height: largura * 0.07, marginLeft: -largura * 0.14, borderRadius: 999, background: '#0b0b0d' }} />
        {/* reflexo do vidro: faixa diagonal suave que desliza devagar */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(115deg, transparent ${20 + Math.sin(frame / 60) * 6}%, rgba(255,255,255,0.16) ${32 + Math.sin(frame / 60) * 6}%, transparent ${44 + Math.sin(frame / 60) * 6}%)` }} />
      </div>
    </div>
  );
};
