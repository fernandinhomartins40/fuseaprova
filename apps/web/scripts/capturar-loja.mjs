#!/usr/bin/env node
/**
 * Capturas REAIS do app para as fichas da Play Store e da App Store: as 8 telas da ficha em
 * 1170×2532 (390×844 a 3×), contra a API simulada (dev:mock). Uso:
 *   pnpm --filter @fuse/web dev:mock --port 5181   (em outro terminal)
 *   BASE_URL=http://localhost:5181 pnpm --filter @fuse/web capturas:loja
 * Saída: apps/mobile/loja/telas/NN-nome.png (o Codex compõe as imagens da loja a partir delas).
 *
 * O selo do Perfil aparece como no app nativo ("Acesso completo", sem citar o pagamento; D20).
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5181';
const saida = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../mobile/loja/telas');

async function main() {
  await mkdir(saida, { recursive: true });
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => console.error('[erro na página]', e.message));

  const cenario = (nome) => page.goto(`${BASE}/api/__mock/cenario?nome=${nome}`);
  const ir = async (rota) => {
    await page.goto(`${BASE}${rota}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  };
  const foto = async (nome) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(saida, `${nome}.png`) });
    console.info('ok', nome);
  };

  await cenario('aluno');
  await ir('/aprender');
  await foto('01-trilha');

  // Lição: questão → acerto → … → fim → ofensiva
  await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
  await page.getByRole('button', { name: /ENTENDI, VAMOS LÁ/ }).click();
  await page.keyboard.press('2');
  await foto('02-questao');
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  await page.getByRole('button', { name: 'CONTINUAR' }).waitFor();
  await foto('03-acerto');
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
  await foto('06-ofensiva');

  await cenario('aluno');
  await ir('/revisar');
  await foto('04-revisao');

  await ir('/simulado');
  await foto('05-simulado');

  await ir('/liga');
  await foto('07-liga');

  await ir('/perfil');
  await page.getByText(/Acesso completo/).first().evaluate((el) => {
    el.textContent = 'Acesso completo';
  });
  await foto('08-perfil');

  await navegador.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
