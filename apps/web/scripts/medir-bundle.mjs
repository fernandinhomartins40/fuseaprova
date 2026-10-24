#!/usr/bin/env node
/**
 * Mede o bundle inicial (gzip) do build: o que o index.html carrega de cara (script de
 * entrada, modulepreload, CSS e registerSW.js). Critério do PRD 12: < 200 kB gzip.
 *   pnpm --filter @fuse/web build && pnpm --filter @fuse/web tamanho
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
let total = 0;
for (const r of [...new Set(refs)]) {
  const buf = await readFile(path.join(dist, r));
  const gz = gzipSync(buf, { level: 9 }).length;
  total += gz;
  console.info(
    `${r.padEnd(40)} ${(buf.length / 1024).toFixed(1).padStart(7)} kB  gzip ${(gz / 1024).toFixed(1).padStart(6)} kB`,
  );
}
const limite = 200 * 1024;
console.info(
  `\nBundle inicial: ${(total / 1024).toFixed(1)} kB gzip (limite 200 kB) ${total < limite ? 'OK' : 'ACIMA DO LIMITE'}`,
);
process.exit(total < limite ? 0 : 1);
