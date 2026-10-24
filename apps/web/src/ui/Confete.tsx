import { useEffect, useRef } from 'react';
import s from './Confete.module.css';

const CORES = ['#FF6A16', '#008A92', '#FFC233', '#00545D', '#C9874A', '#1D6FE0'];

/** Confete em canvas por 1,2 s. Não roda com prefers-reduced-motion. */
export function Confete({ duracaoMs = 1200 }: { duracaoMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const pecas = Array.from({ length: 90 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 60,
      y: h * 0.32,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      tam: 6 + Math.random() * 6,
      cor: CORES[Math.floor(Math.random() * CORES.length)]!,
    }));
    const inicio = performance.now();
    let quadro = 0;
    function desenhar(agora: number) {
      const t = agora - inicio;
      ctx!.clearRect(0, 0, w, h);
      const alfa = t > duracaoMs - 300 ? Math.max(0, (duracaoMs - t) / 300) : 1;
      ctx!.globalAlpha = alfa;
      for (const p of pecas) {
        p.vy += 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.r);
        ctx!.fillStyle = p.cor;
        ctx!.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
        ctx!.restore();
      }
      if (t < duracaoMs) quadro = requestAnimationFrame(desenhar);
      else ctx!.clearRect(0, 0, w, h);
    }
    quadro = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadro);
  }, [duracaoMs]);
  return <canvas ref={ref} className={s.confete} aria-hidden="true" />;
}
