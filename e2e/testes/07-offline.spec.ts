import { expect, test } from '@playwright/test';
import {
  alunoPago,
  botaoFeedback,
  definirRelogio,
  novaConta,
  questaoPorEnunciado,
  alternativa,
} from './apoio.js';

// Este teste precisa do service worker (shell em cache) e do pacote offline em IndexedDB.
test.use({ serviceWorkers: 'allow' });

test.describe('PWA offline', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-11-24T09:00:00-03:00');
  });

  test('em modo avião faz a próxima lição; ao voltar a conexão o XP sincroniza sem duplicar', async ({
    page,
    context,
  }) => {
    await alunoPago(page, novaConta('offline'));
    const pacote = page.waitForResponse(
      (r) => r.url().endsWith('/api/offline/pacote') && r.status() === 200,
    );
    await page.goto('/aprender');
    await pacote;
    // Espera o service worker controlar a página (precache do shell pronto).
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20_000 })
      .toBe(true);
    await expect(
      page.getByRole('button', { name: /Começar treino|Continuar treino/ }),
    ).toBeVisible();
    const xp = async () =>
      ((await (await page.request.get('/api/me')).json()) as { xpTotal: number }).xpTotal;
    const xpAntes = await xp();

    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
    const dica = page.getByRole('button', { name: 'ENTENDI, VAMOS LÁ' });
    await expect(page.locator('#enunciado').or(dica)).toBeVisible();
    if (await dica.isVisible()) await dica.click();
    await expect(page.getByText(/Modo offline/)).toBeVisible();

    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Questão ${i} de 5`)).toBeVisible();
      const q = await questaoPorEnunciado(
        page.request,
        (await page.locator('#enunciado').innerText()).trim(),
      );
      await alternativa(page, q.gabarito).click();
      await page.getByRole('button', { name: 'VERIFICAR' }).click();
      await botaoFeedback(page).click();
    }
    await expect(page.getByText(/Lição salva offline/)).toBeVisible();

    // Volta a conexão: a fila sincroniza sozinha.
    const sync = page.waitForResponse((r) => r.url().endsWith('/api/sync/tentativas'));
    await context.setOffline(false);
    const resposta = await sync;
    expect(resposta.status()).toBe(200);
    await expect.poll(async () => xp()).toBe(xpAntes + 65);

    // Reenviar o mesmo lote (mesmos id_cliente) não duplica nada.
    const lote = resposta.request().postDataJSON() as unknown;
    const repetido = await page.request.post('/api/sync/tentativas', { data: lote });
    expect(repetido.status()).toBe(200);
    const r = (await repetido.json()) as { aceitas: unknown[]; xpGanho: number };
    expect(r.aceitas).toHaveLength(0);
    expect(r.xpGanho).toBe(0);
    expect(await xp()).toBe(xpAntes + 65);
  });
});
