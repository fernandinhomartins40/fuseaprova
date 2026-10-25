/**
 * Gráfico de barras empilhadas em SVG próprio (sem biblioteca nem CDN), D13.
 * Uma escala só (nunca dois eixos), barras finas com 2 px de folga entre segmentos, eixo e
 * grade discretos, dica ao passar o mouse ou tocar, legenda quando há 2+ séries e a opção
 * "Ver como tabela". Preenche a largura do contêiner.
 */
import { useEffect, useId, useRef, useState } from 'react';
import s from './super.module.css';

export interface Serie {
  nome: string;
  cor: string;
}

export interface Ponto {
  rotulo: string;
  /** Rótulo longo (na dica e na tabela). */
  detalhe: string;
  valores: number[];
}

function teto(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function GraficoBarras(props: {
  titulo: string;
  series: Serie[];
  pontos: Ponto[];
  formatar: (v: number) => string;
  altura?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(720);
  const [foco, setFoco] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const id = useId();

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setLargura(Math.max(280, Math.round(e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = props.altura ?? 220;
  const margem = { esq: 56, dir: 8, topo: 10, base: 26 };
  const larguraPlot = largura - margem.esq - margem.dir;
  const alturaPlot = altura - margem.topo - margem.base;
  const totais = props.pontos.map((p) => p.valores.reduce((a, b) => a + b, 0));
  const max = teto(Math.max(0, ...totais));
  const n = Math.max(1, props.pontos.length);
  const passo = larguraPlot / n;
  const larguraBarra = Math.max(3, Math.min(28, passo * 0.62));
  const y = (v: number) => margem.topo + alturaPlot - (v / max) * alturaPlot;
  const ticks = [0, max / 2, max];
  // No máximo ~8 rótulos no eixo x, para não colidirem.
  const cadaRotulo = Math.ceil(n / Math.max(2, Math.floor(larguraPlot / 70)));
  const vazio = totais.every((t) => t === 0);

  return (
    <figure className={s.grafico} style={{ margin: 0 }} aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <strong style={{ color: 'var(--adm-petroleo)' }}>{props.titulo}</strong>
        <button type="button" className="botao fantasma pequeno" onClick={() => setTabela((t) => !t)} style={{ minHeight: 36, border: 0, background: 'none', color: 'var(--adm-turquesa)', fontWeight: 800, cursor: 'pointer' }}>
          {tabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </figcaption>
      {props.series.length > 1 ? (
        <ul className={s.legenda}>
          {props.series.map((se) => (
            <li key={se.nome}>
              <span className={s.amostra} style={{ background: se.cor }} aria-hidden="true" />
              {se.nome}
            </li>
          ))}
        </ul>
      ) : null}
      {tabela ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela" style={{ width: '100%', borderCollapse: 'collapse' }} aria-label={props.titulo}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Período</th>
                {props.series.map((se) => (
                  <th key={se.nome} style={{ textAlign: 'right' }}>
                    {se.nome}
                  </th>
                ))}
                {props.series.length > 1 ? <th style={{ textAlign: 'right' }}>Total</th> : null}
              </tr>
            </thead>
            <tbody>
              {props.pontos.map((p, i) => (
                <tr key={p.rotulo + i}>
                  <td>{p.detalhe}</td>
                  {p.valores.map((v, j) => (
                    <td key={j} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {props.formatar(v)}
                    </td>
                  ))}
                  {props.series.length > 1 ? <td style={{ textAlign: 'right' }}>{props.formatar(totais[i]!)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={caixa} style={{ position: 'relative' }} onMouseLeave={() => setFoco(null)}>
          <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`${props.titulo}${vazio ? ': sem dados no período' : ''}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={margem.esq} x2={largura - margem.dir} y1={y(t)} y2={y(t)} stroke="#d8e1df" strokeWidth={t === 0 ? 1.5 : 1} strokeDasharray={t === 0 ? undefined : '3 4'} />
                <text x={margem.esq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#4f6d70">
                  {props.formatar(t)}
                </text>
              </g>
            ))}
            {props.pontos.map((p, i) => {
              const cx = margem.esq + passo * i + passo / 2;
              let acumulado = 0;
              const segmentos = p.valores.map((v, j) => {
                if (v <= 0) return null;
                const y0 = y(acumulado);
                acumulado += v;
                const y1 = y(acumulado);
                const topo = j === p.valores.length - 1 || p.valores.slice(j + 1).every((x) => x <= 0);
                // 2 px de folga entre segmentos empilhados.
                const h = Math.max(1, y0 - y1 - (acumulado > v ? 2 : 0));
                return (
                  <rect
                    key={j}
                    x={cx - larguraBarra / 2}
                    y={y1}
                    width={larguraBarra}
                    height={h}
                    rx={topo ? Math.min(4, larguraBarra / 2) : 0}
                    fill={props.series[j]!.cor}
                    opacity={foco === null || foco === i ? 1 : 0.45}
                  />
                );
              });
              return (
                <g key={p.rotulo + i}>
                  {segmentos}
                  {i % cadaRotulo === 0 ? (
                    <text x={cx} y={altura - 8} textAnchor="middle" fontSize="11" fill="#4f6d70">
                      {p.rotulo}
                    </text>
                  ) : null}
                  {/* Área de toque maior que a barra. */}
                  <rect
                    x={margem.esq + passo * i}
                    y={margem.topo}
                    width={passo}
                    height={alturaPlot}
                    fill="transparent"
                    onMouseEnter={() => setFoco(i)}
                    onClick={() => setFoco((f) => (f === i ? null : i))}
                    data-testid="barra"
                  />
                </g>
              );
            })}
          </svg>
          {foco !== null && props.pontos[foco] ? (
            <div
              className={s.dica}
              role="status"
              style={{
                left: `${Math.min(88, Math.max(12, ((margem.esq + passo * foco + passo / 2) / largura) * 100))}%`,
                top: `${(y(totais[foco]!) / altura) * 100}%`,
              }}
            >
              <b>{props.pontos[foco]!.detalhe}</b>
              {props.series.map((se, j) => (
                <div key={se.nome}>
                  {se.nome}: {props.formatar(props.pontos[foco]!.valores[j] ?? 0)}
                </div>
              ))}
              {props.series.length > 1 ? <div>Total: {props.formatar(totais[foco]!)}</div> : null}
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}
