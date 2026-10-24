import { expect, test, type Page } from '@playwright/test';
import {
  alunoPago,
  avancarRelogio,
  botaoFeedback,
  comecarLicao,
  definirRelogio,
  novaConta,
  responderLicao,
} from './apoio.js';

const DIA = 24 * 3600_000;

async function pendentes(page: Page): Promise<number> {
  const r = await page.request.get('/api/revisao');
  expect(r.status()).toBe(200);
  return ((await r.json()) as { pendentes: number }).pendentes;
}

/** Sai das telas de fim (fim da sessão e, se for o 1º estudo do dia, ofensiva). */
async function sairDoFim(page: Page) {
  for (let i = 0; i < 3 && /\/(licao|revisar\/praticar)/.test(page.url()); i++) {
    await page.getByRole('button', { name: 'CONTINUAR' }).click();
  }
}

test.describe('Revisão espaçada', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-11-03T09:00:00-03:00');
  });

  test('a questão errada aparece em /revisar no dia seguinte, pode ser praticada e sai após 4 acertos espaçados', async ({
    page,
  }) => {
    await alunoPago(page, novaConta('revisao'));
    await page.goto('/aprender');
    await comecarLicao(page);

    // Erra a 1ª e acerta as outras.
    const errada = await responderLicao(page, false);
    await botaoFeedback(page).click();
    for (let i = 2; i <= 5; i++) {
      await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
      await responderLicao(page, true);
      await botaoFeedback(page).click();
    }
    await expect(page.getByText('Lição concluída!')).toBeVisible();
    await sairDoFim(page);

    // No mesmo dia ainda não vence.
    expect(await pendentes(page)).toBe(0);
    await page.goto('/revisar');
    await expect(page.getByRole('button', { name: 'IR PARA A TRILHA' })).toBeVisible();

    // Etapas: +1, +3, +7 e +15 dias (PRD 6.5).
    for (const [etapa, dias] of [1, 3, 7, 15].entries()) {
      await avancarRelogio(page, dias * DIA);
      expect(await pendentes(page), `etapa ${etapa}`).toBe(1);
      await page.goto('/revisar');
      await expect(page.getByRole('heading', { name: /1 questão/ })).toBeVisible();
      await page.getByRole('button', { name: 'PRATICAR ERROS' }).click();
      const dica = page.getByRole('button', { name: 'ENTENDI, VAMOS LÁ' });
      await expect(page.locator('#enunciado').or(dica)).toBeVisible();
      if (await dica.isVisible()) await dica.click();
      await expect(page.getByText('REVISÃO', { exact: true })).toBeVisible();
      const q = await responderLicao(page, true);
      expect(q.id).toBe(errada.id);
      await page.getByRole('button', { name: 'CONTINUAR' }).click();
      await expect(page.getByText('Revisão concluída!')).toBeVisible();
      await sairDoFim(page);
      expect(await pendentes(page)).toBe(0);
    }

    // Dominada: não volta mais.
    await avancarRelogio(page, 40 * DIA);
    expect(await pendentes(page)).toBe(0);
  });
});
