#!/usr/bin/env node
/**
 * Captura telas reais do app (API simulada) em 1170×2532 para o vídeo.
 *   pnpm --filter @fuse/web dev:mock --port 5180   (em outro terminal)
 *   node scripts/capturar-app.mjs
 * Saída: public/telas/real-*.png
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const aqui = path.dirname(fileURLToPath(import.meta.url));
// usa o Playwright já instalado no app web
const { chromium } = createRequire(path.resolve(aqui, '../../../apps/web/package.json'))('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:5180';
const saida = path.resolve(aqui, '../public/telas');

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  reducedMotion: 'reduce',
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
});
const page = await contexto.newPage();
await mkdir(saida, { recursive: true });

const cenario = (nome) => page.goto(`${BASE}/api/__mock/cenario?nome=${nome}`);
const ir = async (rota) => {
  await page.goto(`${BASE}${rota}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
};
const foto = async (nome) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(saida, `real-${nome}.png`) });
  console.info('ok', nome);
};

await cenario('aluno');
await ir('/aprender');
await foto('inicio');
await page.mouse.move(195, 500);
await page.mouse.wheel(0, 598);
await page.waitForTimeout(700);
await foto('trilha');
await page.mouse.wheel(0, -2000);

await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
await page.getByRole('button', { name: /ENTENDI, VAMOS LÁ/ }).waitFor();
await page.getByRole('button', { name: /ENTENDI, VAMOS LÁ/ }).click();
await page.keyboard.press('2');
await page.getByRole('button', { name: 'VERIFICAR' }).click();
await page.getByRole('button', { name: 'CONTINUAR' }).waitFor();
await foto('acerto');
await page.getByRole('button', { name: 'CONTINUAR' }).click();
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('3');
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  const b = page.getByRole('button', { name: /^(CONTINUAR|ENTENDI)$/ });
  await b.waitFor();
  await b.click();
}
await page.getByText(/Lição concluída!/).waitFor();
await page.getByRole('button', { name: 'CONTINUAR' }).click();
await page.getByText(/de ofensiva!/).waitFor();
await foto('ofensiva');

await cenario('aluno');
await ir('/revisar');
await foto('revisao');

await cenario('aluno');
await ir('/simulado');
await foto('simulado');

await cenario('aluno');
await ir('/liga');
await foto('liga');

await cenario('edital');
await ir('/aprender');
await page.getByRole('dialog').waitFor();
await foto('edital');

await navegador.close();
