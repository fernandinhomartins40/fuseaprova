#!/usr/bin/env node
/**
 * Gera as versões leves (WebP 1× e 2×) dos assets 4K de Fuse_Aprova_Assets_4K/ e os ícones
 * da PWA. Os PNGs 4K são só matrizes: nunca são servidos pelo app.
 *
 *   pnpm --filter @fuse/web assets
 *
 * Saídas (comitáveis, pequenas):
 *   src/assets/gerados/*.webp      imagens usadas pelos componentes
 *   src/assets/gerados/index.ts    mapa nome → { x1, x2, largura, altura } (imports do Vite)
 *   public/icons/*.png             ícones da PWA (192, 512, maskable 512, apple 180, favicon 32)
 *
 * Tamanhos (Guia_para_desenvolvimento.md): navegação 24–32 px, cartões 40–64 px,
 * ilustrações 120–240 px, mascote 240–360 px. O tamanho abaixo é o 1× (CSS px, maior lado).
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(aqui, '..');
const origem = path.resolve(web, '../../Fuse_Aprova_Assets_4K');
const destino = path.join(web, 'src/assets/gerados');
const destinoIcones = path.join(web, 'public/icons');

const MARFIM = '#FAF8F2';

/** [arquivo de origem (sem _4k.png), nome de saída, tamanho 1× do maior lado] */
const ASSETS = [
  // Mascote (2730×4096, retrato): 1× com 360 px de altura (~240 de largura).
  ['mascote/mascote_boas_vindas', 'mascote-boas-vindas', 360],
  ['mascote/mascote_estudando', 'mascote-estudando', 360],
  ['mascote/mascote_celebrando', 'mascote-celebrando', 360],
  ['mascote/mascote_explicando', 'mascote-explicando', 360],
  ['mascote/mascote_constancia', 'mascote-constancia', 360],
  ['mascote/mascote_incentivando', 'mascote-incentivando', 360],
  // Marca
  ['marca/logo_completa', 'logo-completa', 240],
  ['marca/logo_tipografia', 'logo-tipografia', 240],
  ['marca/simbolo_capivara', 'simbolo-capivara', 120],
  // Navegação (24–32 px)
  ['icones/icone_inicio', 'nav-inicio', 32],
  ['icones/icone_revisao', 'nav-revisao', 32],
  ['icones/icone_simulados', 'nav-simulados', 32],
  ['icones/icone_liga', 'nav-liga', 32],
  ['icones/icone_perfil', 'nav-perfil', 32],
  // Ícones de cartão (40–64 px)
  ['icones/icone_livro_portugues', 'icone-portugues', 64],
  ['icones/icone_matematica', 'icone-matematica', 64],
  ['icones/icone_conhecimentos_gerais', 'icone-gerais', 64],
  ['icones/icone_especificos_cargo', 'icone-especificos', 64],
  ['icones/icone_revisao', 'icone-revisao', 64],
  ['icones/icone_simulados', 'icone-simulados', 64],
  ['icones/icone_liga', 'icone-liga', 64],
  ['icones/icone_perfil', 'icone-perfil', 64],
  ['icones/icone_alvo', 'icone-alvo', 64],
  ['icones/icone_calendario', 'icone-calendario', 64],
  ['icones/icone_relogio', 'icone-relogio', 64],
  ['icones/icone_xp', 'icone-xp', 64],
  ['icones/icone_progresso', 'icone-progresso', 64],
  ['icones/icone_acerto', 'icone-acerto', 64],
  ['icones/icone_erro', 'icone-erro', 64],
  ['icones/icone_dica', 'icone-dica', 64],
  ['icones/icone_configuracoes', 'icone-configuracoes', 64],
  ['icones/icone_copiar', 'icone-copiar', 64],
  ['icones/icone_cadeado', 'icone-cadeado', 64],
  ['icones/icone_coroa_acesso', 'icone-coroa', 64],
  ['icones/icone_play', 'icone-play', 64],
  ['icones/icone_localizacao', 'icone-localizacao', 64],
  ['icones/icone_visibilidade', 'icone-visibilidade', 64],
  ['icones/icone_pagamento_pix', 'icone-pix', 64],
  ['icones/icone_medalha', 'icone-medalha', 64],
  // Ilustrações (120–240 px)
  ['icones/icone_liga', 'ilustracao-liga', 160],
  ['icones/icone_medalha', 'ilustracao-medalha', 160],
  ['elementos/elemento_confetes', 'elemento-confetes', 240],
  ['elementos/elemento_faisca', 'elemento-faisca', 64],
];

function camel(nome) {
  return nome.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

async function gerarWebp(entrada, saida, maiorLado) {
  const img = sharp(entrada, { limitInputPixels: false });
  const meta = await img.metadata();
  const retrato = (meta.height ?? 1) >= (meta.width ?? 1);
  const redim = retrato ? { height: maiorLado } : { width: maiorLado };
  const info = await sharp(entrada, { limitInputPixels: false })
    .resize({ ...redim, fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: 80, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(saida);
  return info;
}

async function iconePwa(simbolo, saida, tamanho, { maskable = false, fundo = null } = {}) {
  // maskable: zona segura de 80% → o símbolo ocupa ~62% do canvas sobre fundo sólido.
  const escala = maskable ? 0.62 : fundo ? 0.86 : 1;
  const interno = Math.round(tamanho * escala);
  const simboloRed = await sharp(simbolo, { limitInputPixels: false })
    .resize({
      width: interno,
      height: interno,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const base = sharp({
    create: {
      width: tamanho,
      height: tamanho,
      channels: 4,
      background: fundo ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  await base
    .composite([{ input: simboloRed, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(saida);
}

async function main() {
  if (!existsSync(origem)) {
    console.error(`Pasta de origem não encontrada: ${origem}`);
    process.exit(1);
  }
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });
  await mkdir(destinoIcones, { recursive: true });

  const linhasImport = [];
  const linhasMapa = [];
  let total = 0;
  for (const [arquivo, nome, tamanho] of ASSETS) {
    const entrada = path.join(origem, `${arquivo}_4k.png`);
    const i1 = await gerarWebp(entrada, path.join(destino, `${nome}.webp`), tamanho);
    const i2 = await gerarWebp(entrada, path.join(destino, `${nome}@2x.webp`), tamanho * 2);
    total += i1.size + i2.size;
    const v = camel(nome);
    linhasImport.push(
      `import ${v}1 from './${nome}.webp';`,
      `import ${v}2 from './${nome}@2x.webp';`,
    );
    linhasMapa.push(
      `  '${nome}': { x1: ${v}1, x2: ${v}2, largura: ${i1.width}, altura: ${i1.height} },`,
    );
    console.info(
      `${nome.padEnd(24)} ${i1.width}×${i1.height}  ${(i1.size / 1024).toFixed(1)} kB + ${(i2.size / 1024).toFixed(1)} kB`,
    );
  }

  const ts = [
    '// Gerado por scripts/gerar-assets.mjs. Não edite à mão.',
    ...linhasImport,
    '',
    'export interface AssetGerado {',
    '  x1: string;',
    '  x2: string;',
    '  largura: number;',
    '  altura: number;',
    '}',
    '',
    'export const ASSETS = {',
    ...linhasMapa,
    '} as const satisfies Record<string, AssetGerado>;',
    '',
    'export type NomeAsset = keyof typeof ASSETS;',
    '',
  ].join('\n');
  await writeFile(path.join(destino, 'index.ts'), ts);

  const simbolo = path.join(origem, 'marca/simbolo_capivara_4k.png');
  const marfim = { r: 0xfa, g: 0xf8, b: 0xf2, alpha: 1 };
  await iconePwa(simbolo, path.join(destinoIcones, 'icon-192.png'), 192, { fundo: marfim });
  await iconePwa(simbolo, path.join(destinoIcones, 'icon-512.png'), 512, { fundo: marfim });
  await iconePwa(simbolo, path.join(destinoIcones, 'maskable-512.png'), 512, {
    maskable: true,
    fundo: marfim,
  });
  await iconePwa(simbolo, path.join(destinoIcones, 'apple-touch-icon-180.png'), 180, {
    fundo: marfim,
  });
  await iconePwa(simbolo, path.join(destinoIcones, 'favicon-32.png'), 32);

  const arquivos = await readdir(destino);
  console.info(
    `\n${arquivos.length - 1} WebP em src/assets/gerados (${(total / 1024).toFixed(0)} kB no total).`,
  );
  console.info(`Ícones PWA em public/icons (fundo ${MARFIM}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
