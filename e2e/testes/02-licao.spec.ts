import { expect, test } from '@playwright/test';
import {
  API,
  alternativa,
  alunoPago,
  botaoFeedback,
  comecarLicao,
  definirRelogio,
  novaConta,
  responderLicao,
} from './apoio.js';

test.describe('Lição da trilha', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-10-27T09:00:00-03:00');
  });

  test('lição completa: certo e errado, feedback com explicação, perda de vida, XP 45 e ofensiva', async ({
    page,
  }) => {
    await alunoPago(page);
    await page.goto('/aprender');
    await comecarLicao(page);

    await expect(page.getByText('Questão 1 de 5')).toBeVisible();
    await expect(page.getByRole('img', { name: '5 vidas' })).toBeVisible();
    // VERIFICAR desabilitado até selecionar uma alternativa.
    await expect(page.getByRole('button', { name: 'VERIFICAR' })).toBeDisabled();
    await alternativa(page, 'A').click();
    await expect(page.getByRole('button', { name: 'VERIFICAR' })).toBeEnabled();

    // 1ª: certa.
    const q1 = await responderLicao(page, true);
    const folha = page.getByRole('region', { name: 'Resultado da resposta' });
    await expect(folha).toBeVisible();
    await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeVisible();
    if (q1.explicacao) await expect(folha).toContainText(q1.explicacao.slice(0, 40));
    await expect(page.getByRole('img', { name: '5 vidas' })).toBeVisible();
    await page.getByRole('button', { name: 'CONTINUAR' }).click();

    // 2ª: errada → perde 1 vida, mostra a explicação e o aviso de revisão.
    await expect(page.getByText('Questão 2 de 5')).toBeVisible();
    const q2 = await responderLicao(page, false);
    await expect(page.getByRole('button', { name: 'ENTENDI' })).toBeVisible();
    if (q2.explicacao) await expect(folha).toContainText(q2.explicacao.slice(0, 40));
    await expect(folha).toContainText(/revisão/i);
    await expect(page.getByRole('img', { name: '4 vidas' })).toBeVisible();
    await page.getByRole('button', { name: 'ENTENDI' }).click();

    // 3ª a 5ª: certas.
    for (let i = 3; i <= 5; i++) {
      await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
      await responderLicao(page, true);
      await botaoFeedback(page).click();
    }

    await expect(page.getByRole('status').filter({ hasText: 'Lição concluída!' })).toBeVisible();
    await expect(page.getByText('45 XP')).toBeVisible();
    await expect(page.getByText('80%')).toBeVisible();
    await page.getByRole('button', { name: 'CONTINUAR' }).click();

    await expect(page.getByRole('heading', { name: /1 dia de ofensiva!/ })).toBeVisible();
    await page.getByRole('button', { name: 'CONTINUAR' }).click();
    await expect(page).toHaveURL(/\/aprender$/);

    const me = (await (await page.request.get('/api/me')).json()) as {
      xpTotal?: number;
      xp?: number;
      ofensiva?: number | { valor: number };
      vidas: number;
    };
    expect(me.vidas).toBe(4);
  });

  test('lição perfeita (5 de 5) vale 65 XP', async ({ page }) => {
    await alunoPago(page);
    await page.goto('/aprender');
    await comecarLicao(page);
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
      await responderLicao(page, true);
      await page.getByRole('button', { name: 'CONTINUAR' }).click();
    }
    await expect(page.getByText('65 XP')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('com 0 vidas a lição inicia normalmente: vidas não travam o treino', async ({ page }) => {
    const c = await alunoPago(page, novaConta('semvidas'));
    await page.request.post(`${API}/__e2e/vidas`, { data: { email: c.email, vidas: 0 } });
    await page.goto('/aprender');
    await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
    const dica = page.getByRole('button', { name: 'ENTENDI, VAMOS LÁ' });
    await expect(page.locator('#enunciado').or(dica)).toBeVisible();
    if (await dica.isVisible()) await dica.click();
    await expect(page.getByText('Suas vidas acabaram')).toHaveCount(0);
    await expect(page.locator('#enunciado')).toBeVisible();
  });

  test('a lição inteira é navegável só pelo teclado', async ({ page }) => {
    await alunoPago(page);
    await page.goto('/aprender');
    await comecarLicao(page);
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
      const enunciado = (await page.locator('#enunciado').innerText()).trim();
      const r = await page.request.get(`${API}/__e2e/gabarito`, { params: { enunciado } });
      const { gabarito } = (await r.json()) as { gabarito: 'A' };
      // A tecla da letra seleciona, Enter verifica e Enter de novo continua.
      await page.keyboard.press(gabarito);
      await expect(alternativa(page, gabarito)).toHaveAttribute('aria-checked', 'true');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeVisible();
      await page.keyboard.press('Enter');
    }
    // Fim da lição e ofensiva: o CONTINUAR recebe o foco e o Enter avança.
    await expect(page.getByText('Lição concluída!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /dia de ofensiva!/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/aprender$/);
  });
});
