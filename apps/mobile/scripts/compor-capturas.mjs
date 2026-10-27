#!/usr/bin/env node
/**
 * Põe as telas REAIS do app (apps/mobile/loja/telas/NN-*.png, 1170×2532, geradas por
 * `pnpm --filter @fuse/web capturas:loja`) dentro do celular das composições das lojas
 * (fundo, título e moldura feitos pelo Codex). Só a área da tela muda.
 *
 *   node scripts/compor-capturas.mjs
 *
 * A moldura tem 3 px e fica na mesma posição em todas as imagens de um formato (medida das
 * composições: borda cinza #9FADAB). Se as composições mudarem, meça de novo.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const telasDir = path.join(raiz, 'loja/telas');

/** Moldura externa (x0, x1, y0, y1 inclusivos) e raio do canto, por formato. */
const FORMATOS = [
  { prefixo: 'play/captura-', w: 1080, h: 1920, x0: 194, x1: 886, y0: 346, y1: 1845, raio: 34 },
  { prefixo: 'appstore/iphone-69-', w: 1320, h: 2868, x0: 150, x1: 1170, y0: 545, y1: 2758, raio: 41 },
  { prefixo: 'appstore/iphone-65-', w: 1284, h: 2778, x0: 147, x1: 1136, y0: 528, y1: 2670, raio: 41 },
];
const BORDA = 3;

const telas = readdirSync(telasDir).filter((f) => /^\d\d-.+\.png$/.test(f)).sort();
if (telas.length !== 8) throw new Error(`Esperadas 8 telas em loja/telas, há ${telas.length}.`);

for (const f of FORMATOS) {
  const left = f.x0 + BORDA;
  const top = f.y0 + BORDA;
  const largura = f.x1 - BORDA - left + 1;
  const altura = f.y1 - BORDA - top + 1;
  const raio = f.raio - BORDA;
  const mascara = Buffer.from(
    `<svg width="${largura}" height="${altura}"><rect width="${largura}" height="${altura}" rx="${raio}" ry="${raio}"/></svg>`,
  );
  for (const [i, nome] of telas.entries()) {
    const destino = path.join(raiz, 'loja', `${f.prefixo}${String(i + 1).padStart(2, '0')}.png`);
    const base = sharp(destino);
    const m = await base.metadata();
    if (m.width !== f.w || m.height !== f.h) throw new Error(`${destino}: ${m.width}×${m.height}`);
    const tela = await sharp(path.join(telasDir, nome))
      .resize(largura, altura, { fit: 'cover', position: 'top' })
      .composite([{ input: mascara, blend: 'dest-in' }])
      .png()
      .toBuffer();
    const saida = await sharp(await base.toBuffer())
      .composite([{ input: tela, left, top }])
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(saida).toFile(destino);
    console.log('ok', path.relative(raiz, destino), '←', nome);
  }
}
