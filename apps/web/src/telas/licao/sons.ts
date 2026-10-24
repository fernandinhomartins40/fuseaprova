/**
 * Sons originais gerados na hora (Web Audio, sem arquivos de terceiros) e vibração.
 * Desligáveis em Configurações (me.sons).
 */
let ctx: AudioContext | null = null;

function tocar(notas: { f: number; t: number; d: number }[], tipo: OscillatorType) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    const agora = ctx.currentTime;
    for (const n of notas) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = tipo;
      o.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, agora + n.t);
      g.gain.exponentialRampToValueAtTime(0.16, agora + n.t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, agora + n.t + n.d);
      o.connect(g).connect(ctx.destination);
      o.start(agora + n.t);
      o.stop(agora + n.t + n.d + 0.02);
    }
  } catch {
    /* sem áudio */
  }
}

export function somAcerto(ligado: boolean) {
  if (!ligado) return;
  tocar(
    [
      { f: 660, t: 0, d: 0.1 },
      { f: 990, t: 0.08, d: 0.16 },
    ],
    'triangle',
  );
  navigator.vibrate?.(20);
}

export function somErro(ligado: boolean) {
  if (!ligado) return;
  tocar(
    [
      { f: 220, t: 0, d: 0.14 },
      { f: 175, t: 0.12, d: 0.2 },
    ],
    'sine',
  );
  navigator.vibrate?.([40, 60, 40]);
}
