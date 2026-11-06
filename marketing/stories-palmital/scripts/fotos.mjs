// Última imagem de cada cena de cada videoaula, para conferir o layout sem renderizar o vídeo inteiro.
// Uso: node scripts/fotos.mjs <lote> <slug> [slug...]  →  videoaulas/_trabalho/quadros/lote-<lote>/<slug>-NN.png
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [lote, ...slugs] = process.argv.slice(2);
const pasta = `../../videoaulas/_trabalho/quadros/lote-${lote}`;
mkdirSync(pasta, { recursive: true });
const serveUrl = await bundle({ entryPoint: resolve('src/index.ts') });
const T = 12;
for (const id of slugs) {
  const narracao = JSON.parse(readFileSync(`src/videoaula/narracao/${id}.json`, 'utf8'));
  const composition = await selectComposition({ serveUrl, id });
  let inicio = 0;
  let n = 0;
  // mesma conta de montarLinha: a foto é o último quadro antes da transição de saída
  for (const clipes of Object.values(narracao)) {
    let f = 8;
    let fim = 0;
    for (const c of clipes) {
      fim = f + Math.ceil(c.segundos * 30);
      f = fim + 3;
    }
    const duracao = fim + 17;
    await renderStill({ composition, serveUrl, frame: inicio + fim + 3, output: `${pasta}/${id}-${String(n++).padStart(2, '0')}.png`, scale: 0.33 });
    inicio += duracao - T;
  }
  console.log(id, n, 'cenas', (composition.durationInFrames / 30).toFixed(1) + 's');
}
