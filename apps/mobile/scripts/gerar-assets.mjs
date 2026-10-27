#!/usr/bin/env node
/**
 * Gera os ícones, a notificação e as splashes nativas (Android e iOS) a partir das imagens-fonte
 * de `apps/mobile/assets/` (as que o Codex produz; ver docs/APP-MOBILE.md, seção "Imagens").
 *
 *   pnpm --filter @fuse/mobile assets                 usa as fontes de assets/
 *   pnpm --filter @fuse/mobile assets -- --provisorios  cria fontes PROVISÓRIAS a partir do símbolo
 *                                                    da marca (Fuse_Aprova_Assets_4K) só onde faltam
 *
 * Fontes (PNG, sRGB):
 *   icone.png               1024×1024, opaco, arte de ponta a ponta (iOS e Android antigo)
 *   icone-frente.png        1024×1024, transparente, arte dentro do círculo central de 66%
 *                           (Android adaptativo, camada da frente)
 *   icone-fundo.png         1024×1024, opaco (Android adaptativo, camada de fundo)
 *   icone-monocromatico.png 1024×1024, transparente, silhueta branca no mesmo enquadramento
 *                           da frente (ícone temático do Android 13+)
 *   notificacao.png         96×96, transparente, silhueta 100% branca (barra de status Android)
 *   splash-icone.png        1024×1024, transparente, marca dentro do círculo central de 66%
 *                           (abertura do app; o fundo é a cor creme #FAF8F2)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontes = path.join(raiz, 'assets');
const res = path.join(raiz, 'android/app/src/main/res');
const iosAssets = path.join(raiz, 'ios/App/App/Assets.xcassets');

const CREME = '#FAF8F2';
const VERDE = '#00545D';
const DENSIDADES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const fonte = (nome) => path.join(fontes, nome);

async function salvar(img, destino) {
  mkdirSync(path.dirname(destino), { recursive: true });
  await img.png({ compressionLevel: 9 }).toFile(destino);
}

/* ------------------------------------------------------- fontes provisórias */

async function criarProvisorios() {
  const simbolo = path.resolve(raiz, '../../Fuse_Aprova_Assets_4K/marca/simbolo_capivara_4k.png');
  if (!existsSync(simbolo)) throw new Error(`Símbolo da marca não encontrado: ${simbolo}`);
  mkdirSync(fontes, { recursive: true });
  const centro = async (lado, fracao) =>
    sharp(simbolo)
      .trim()
      .resize(Math.round(lado * fracao), Math.round(lado * fracao), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  const tela = (lado, fundo) => sharp({ create: { width: lado, height: lado, channels: 4, background: fundo } });
  const transparente = { r: 0, g: 0, b: 0, alpha: 0 };
  const criar = async (nome, img) => {
    if (existsSync(fonte(nome))) return;
    await salvar(img, fonte(nome));
    console.log(`  provisório: assets/${nome}`);
  };
  await criar('icone.png', tela(1024, CREME).composite([{ input: await centro(1024, 0.78), gravity: 'center' }]));
  await criar('icone-frente.png', tela(1024, transparente).composite([{ input: await centro(1024, 0.6), gravity: 'center' }]));
  await criar('icone-fundo.png', tela(1024, CREME));
  const silhueta = await sharp(await centro(1024, 0.6)).ensureAlpha().linear([0, 0, 0, 1], [255, 255, 255, 0]).png().toBuffer();
  await criar('icone-monocromatico.png', tela(1024, transparente).composite([{ input: silhueta, gravity: 'center' }]));
  const silhuetaPequena = await sharp(silhueta).resize(88, 88, { fit: 'contain', background: transparente }).png().toBuffer();
  await criar('notificacao.png', tela(96, transparente).composite([{ input: silhuetaPequena, gravity: 'center' }]));
  await criar('splash-icone.png', tela(1024, transparente).composite([{ input: await centro(1024, 0.6), gravity: 'center' }]));
}

/* ---------------------------------------------------------------- Android */

async function android() {
  for (const [d, k] of Object.entries(DENSIDADES)) {
    const pasta = path.join(res, `mipmap-${d}`);
    const lado = Math.round(48 * k);
    const base = sharp(fonte('icone.png')).resize(lado, lado);
    await salvar(base.clone(), path.join(pasta, 'ic_launcher.png'));
    const mascara = Buffer.from(`<svg width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}"/></svg>`);
    await salvar(base.clone().composite([{ input: mascara, blend: 'dest-in' }]), path.join(pasta, 'ic_launcher_round.png'));
    const camada = Math.round(108 * k);
    await salvar(sharp(fonte('icone-frente.png')).resize(camada, camada), path.join(pasta, 'ic_launcher_foreground.png'));
    await salvar(sharp(fonte('icone-fundo.png')).resize(camada, camada).flatten({ background: CREME }), path.join(pasta, 'ic_launcher_background.png'));
    if (existsSync(fonte('icone-monocromatico.png'))) {
      await salvar(sharp(fonte('icone-monocromatico.png')).resize(camada, camada), path.join(pasta, 'ic_launcher_monochrome.png'));
    }
    const notif = Math.round(24 * k);
    await salvar(sharp(fonte('notificacao.png')).resize(notif, notif), path.join(res, `drawable-${d}`, 'ic_stat_fuse.png'));
    // Android 12+: ícone da abertura em 288 dp (o sistema recorta o círculo central de 192 dp).
    const splashIcone = Math.round(288 * k);
    await salvar(sharp(fonte('splash-icone.png')).resize(splashIcone, splashIcone), path.join(res, `drawable-${d}`, 'splash_icone.png'));
  }
  const monocromatico = existsSync(fonte('icone-monocromatico.png'))
    ? '\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>'
    : '';
  const adaptativo = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>${monocromatico}
</adaptive-icon>
`;
  writeFileSync(path.join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), adaptativo);
  writeFileSync(path.join(res, 'mipmap-anydpi-v26/ic_launcher_round.xml'), adaptativo);

  // Splash antiga (Android < 12): mesmas dimensões que o template do Capacitor gerou.
  const pastasSplash = ['drawable', ...['port', 'land'].flatMap((o) => Object.keys(DENSIDADES).map((d) => `drawable-${o}-${d}`))];
  for (const p of pastasSplash) {
    const arquivo = path.join(res, p, 'splash.png');
    if (!existsSync(arquivo)) continue;
    const { width, height } = await sharp(readFileSync(arquivo)).metadata();
    await salvar(await splashEm(width, height), arquivo);
  }
  console.log('  Android: ícones, notificação e splashes gerados');
}

/** Marca centralizada no creme, ocupando ~60% do lado menor. */
async function splashEm(largura, altura) {
  const lado = Math.round(Math.min(largura, altura) * 0.6);
  const marca = await sharp(fonte('splash-icone.png')).resize(lado, lado).png().toBuffer();
  return sharp({ create: { width: largura, height: altura, channels: 4, background: CREME } })
    .composite([{ input: marca, gravity: 'center' }])
    .flatten({ background: CREME });
}

/* -------------------------------------------------------------------- iOS */

async function ios() {
  // App Store: 1024×1024 sem transparência.
  await salvar(
    sharp(fonte('icone.png')).resize(1024, 1024).flatten({ background: CREME }).removeAlpha(),
    path.join(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png'),
  );
  const splash = await (await splashEm(2732, 2732)).png().toBuffer();
  for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await salvar(sharp(splash), path.join(iosAssets, 'Splash.imageset', n));
  }
  console.log('  iOS: AppIcon 1024 e splash 2732 gerados');
}

/* ------------------------------------------------------------------- main */

const faltando = (lista) => lista.filter((n) => !existsSync(fonte(n)));
if (process.argv.includes('--provisorios')) await criarProvisorios();
const obrigatorias = ['icone.png', 'icone-frente.png', 'icone-fundo.png', 'notificacao.png', 'splash-icone.png'];
const falta = faltando(obrigatorias);
if (falta.length) {
  console.error(`Faltam fontes em apps/mobile/assets/: ${falta.join(', ')} (ou rode com --provisorios).`);
  process.exit(1);
}
for (const n of obrigatorias) {
  const m = await sharp(fonte(n)).metadata();
  const esperado = n === 'notificacao.png' ? 96 : 1024;
  if (m.width !== esperado || m.height !== esperado) {
    console.error(`assets/${n} tem ${m.width}×${m.height}; o esperado é ${esperado}×${esperado}.`);
    process.exit(1);
  }
}
if (existsSync(res)) await android();
if (existsSync(iosAssets)) await ios();
console.log(`Pronto. Cores: fundo ${CREME}, marca ${VERDE}.`);
