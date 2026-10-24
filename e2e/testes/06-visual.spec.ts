/**
 * Regressão visual das 13 telas desenhadas em 390×844 (D1/D11). A primeira execução grava a
 * linha de base em testes/__capturas__/ (pnpm e2e:atualizar); as seguintes comparam com
 * tolerância de 2% (maxDiffPixelRatio 0.02). O relatório lado a lado com Telas_referencia/
 * sai em relatorio-visual/index.html (pnpm e2e:relatorio).
 *
 * Determinismo: banco novo, relógio fixo (API e navegador), sorteio com semente fixa,
 * mesmo nome/e-mail/CPF; avatares (cor pelo id), contagem do Pix e tempo da lição ficam
 * mascarados, e o confete (canvas aleatório) fica oculto.
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  API,
  alternativa,
  avancarRelogio,
  botaoFeedback,
  confirmarPagamento,
  definirRelogio,
  questaoPorEnunciado,
  letraErrada,
  semente,
} from './apoio.js';

const DIA = 24 * 3600_000;
const CSS_CAPTURA = fileURLToPath(new URL('./captura.css', import.meta.url));

async function estabilizar(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((i) =>
        i.complete ? null : new Promise((ok) => i.addEventListener('load', ok, { once: true })),
      ),
    );
  });
}

async function foto(page: Page, nome: string, mascaras: Locator[] = []) {
  await estabilizar(page);
  const opcoes = {
    mask: [page.getByRole('img', { name: /^Avatar de/ }), ...mascaras],
    maskColor: '#C8C8C8',
    // O confete é um canvas aleatório por cima da tela inteira.
    stylePath: CSS_CAPTURA,
    animations: 'disabled' as const,
    caret: 'hide' as const,
  };
  const base = test.info().snapshotPath(`${nome}.png`, { kind: 'screenshot' });
  if (!existsSync(base)) {
    // Sistema sem linha de base (ex.: 1ª execução no Linux do CI): grava a de agora e segue.
    await mkdir(path.dirname(base), { recursive: true });
    await page.waitForTimeout(300);
    await page.screenshot({ ...opcoes, path: base });
    test.info().annotations.push({ type: 'linha de base criada', description: base });
    return;
  }
  await expect(page).toHaveScreenshot(`${nome}.png`, opcoes);
}

test.describe.configure({ mode: 'serial' });

test('Visual: as 13 telas em 390×844', async ({ page }) => {
  test.setTimeout(180_000);
  await definirRelogio(page, '2026-12-01T09:00:00-03:00');
  await semente(page.request, 'visual');

  // 01 Boas-vindas
  await page.goto('/');
  await foto(page, '01_Boas_vindas');

  // 02 Cadastro
  await page.getByRole('button', { name: 'Começar agora' }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await foto(page, '02_Cadastro');

  await page.getByLabel('Nome completo').fill('Marina Souza');
  await page.getByLabel('E-mail').fill('marina.visual@teste.com');
  await page.getByLabel('Celular').fill('42998765432');
  await page.getByLabel('CPF').fill('52998224725');
  await page.getByLabel('Senha', { exact: true }).fill('senha-forte-123');
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole('button', { name: 'Criar conta e ir para o pagamento' }).click();

  // 03 Pagamento Pix (contagem e copia e cola mascarados: dependem do tempo e do id da cobrança)
  await expect(page).toHaveURL(/\/pagamento$/);
  await expect(page.getByAltText(/QR Code do Pix/)).toBeVisible();
  await foto(page, '03_Pagamento_Pix', [
    page.getByText(/Expira em/),
    page.getByLabel('Pix copia e cola'),
  ]);

  expect((await confirmarPagamento(page.request, 'marina.visual@teste.com')).status()).toBe(200);
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
  await page.getByRole('radio', { name: /^Agente Administrativo/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Agora não' }).click();

  // 04 Início
  await expect(page).toHaveURL(/\/aprender$/);
  await foto(page, '04_Inicio');

  // 05 Questão (alternativa selecionada), 06 Acerto, 07 Erro
  await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
  const dica = page.getByRole('button', { name: 'ENTENDI, VAMOS LÁ' });
  await expect(page.locator('#enunciado').or(dica)).toBeVisible();
  if (await dica.isVisible()) await dica.click();
  let q = await questaoPorEnunciado(
    page.request,
    (await page.locator('#enunciado').innerText()).trim(),
  );
  await alternativa(page, q.gabarito).click();
  await foto(page, '05_Questao');
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeVisible();
  await foto(page, '06_Resposta_correta');
  await page.getByRole('button', { name: 'CONTINUAR' }).click();

  await expect(page.getByText('Questão 2 de 5')).toBeVisible();
  q = await questaoPorEnunciado(
    page.request,
    (await page.locator('#enunciado').innerText()).trim(),
  );
  await alternativa(page, letraErrada(q.gabarito)).click();
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  await expect(page.getByRole('button', { name: 'ENTENDI' })).toBeVisible();
  await foto(page, '07_Resposta_incorreta');
  await page.getByRole('button', { name: 'ENTENDI' }).click();

  for (let i = 3; i <= 5; i++) {
    await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
    q = await questaoPorEnunciado(
      page.request,
      (await page.locator('#enunciado').innerText()).trim(),
    );
    await alternativa(page, q.gabarito).click();
    await page.getByRole('button', { name: 'VERIFICAR' }).click();
    await botaoFeedback(page).click();
  }

  // 08 Treino concluído (tempo mascarado) e 09 Constância (ofensiva)
  await expect(page.getByText('Lição concluída!')).toBeVisible();
  await foto(page, '08_Treino_concluido', [
    page.getByText('TEMPO', { exact: true }).locator('xpath=preceding-sibling::*[1]'),
  ]);
  await page.getByRole('button', { name: 'CONTINUAR' }).click();
  await expect(page.getByRole('heading', { name: /dia de ofensiva!/ })).toBeVisible();
  await foto(page, '09_Constancia');
  await page.getByRole('button', { name: 'CONTINUAR' }).click();
  await expect(page).toHaveURL(/\/aprender$/);

  // No dia seguinte: 10 Revisar (com a questão errada), 11 Liga, 12 Perfil, 13 Simulado
  await avancarRelogio(page, DIA);
  await page.goto('/revisar');
  await expect(page.getByRole('button', { name: 'PRATICAR ERROS' })).toBeVisible();
  await foto(page, '10_Revisao');

  await page.goto('/liga');
  await foto(page, '11_Liga');

  await page.goto('/perfil');
  await foto(page, '12_Perfil');

  await page.goto('/simulado');
  await expect(page.getByRole('button', { name: 'COMEÇAR SIMULADO' })).toBeVisible();
  await foto(page, '13_Simulado');

  // Mantém o relógio da API coerente para quem rodar depois.
  await page.request.post(`${API}/__e2e/semente`, { data: { semente: 'e2e' } });
});
