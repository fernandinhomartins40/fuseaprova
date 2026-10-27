#!/usr/bin/env node
/**
 * Converte a coleção de ícones das trilhas (PNG 512×512 transparente, feita no Codex) em WebP
 * leves para o app. Veja docs/ICONES-TRILHA.md (lista de arquivos e especificação).
 *
 *   pnpm --filter @fuse/web assets:trilha
 *
 * Entrada:  Fuse_Aprova_Assets_4K/trilha/<tema>/<nome>.png
 * Saída:    apps/web/src/assets/trilha/<tema>-<nome>.webp  (192 px; emblema 256 px)
 *
 * Os temas e os nomes são os de src/telas/temaTrilha.ts. O que faltar só é avisado: o nó cai no
 * ícone simples, então dá para entregar a coleção por partes (um tema por vez).
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const origem = path.resolve(aqui, '../../../Fuse_Aprova_Assets_4K/trilha');
const destino = path.resolve(aqui, '../src/assets/trilha');

const TEMAS = [
  'portugues',
  'matematica',
  'gerais',
  'administrativo',
  'saude_medio',
  'saude_superior',
  'educacao',
  'operacional',
  'servicos_gerais',
  'social_juridico',
];
const NOMES = [
  'licao-1',
  'licao-2',
  'licao-3',
  'licao-4',
  'licao-5',
  'licao-6',
  'bau',
  'bau-aberto',
  'trofeu',
  'emblema',
];

if (!existsSync(origem)) {
  console.error(`Pasta não encontrada: ${origem}`);
  process.exit(1);
}
await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });

let feitos = 0;
const faltam = {};
const problemas = [];
for (const tema of TEMAS) {
  for (const nome of NOMES) {
    const arquivo = path.join(origem, tema, `${nome}.png`);
    if (!existsSync(arquivo)) {
      (faltam[tema] ??= []).push(nome);
      continue;
    }
    const meta = await sharp(arquivo).metadata();
    if (meta.width !== 512 || meta.height !== 512) {
      problemas.push(`${tema}/${nome}.png tem ${meta.width}×${meta.height} (esperado 512×512)`);
      continue;
    }
    if (!meta.hasAlpha) {
      problemas.push(`${tema}/${nome}.png não tem fundo transparente`);
      continue;
    }
    const lado = nome === 'emblema' ? 256 : 192;
    await sharp(arquivo)
      .resize(lado, lado, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88, effort: 6, alphaQuality: 100 })
      .toFile(path.join(destino, `${tema}-${nome}.webp`));
    feitos++;
  }
}

const extras = (await readdir(origem, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && !TEMAS.includes(d.name))
  .map((d) => d.name);
console.info(`${feitos} de ${TEMAS.length * NOMES.length} ícones convertidos para src/assets/trilha.`);
for (const [t, n] of Object.entries(faltam)) console.warn(`  falta em ${t}: ${n.join(', ')}`);
for (const p of problemas) console.error(`  PROBLEMA: ${p}`);
if (extras.length) console.warn(`  pastas ignoradas (tema desconhecido): ${extras.join(', ')}`);
process.exit(problemas.length ? 1 : 0);
