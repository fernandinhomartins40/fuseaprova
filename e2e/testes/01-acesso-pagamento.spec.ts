import { expect, test } from '@playwright/test';
import {
  API,
  cadastrarViaApi,
  confirmarPagamento,
  cpfValido,
  definirRelogio,
  emailUnico,
  novaConta,
} from './apoio.js';

test.describe('Acesso e pagamento Pix', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-10-20T09:00:00-03:00');
  });

  test('cadastro → Pix (QR e copia e cola) → webhook → acesso liberado → onboarding → /aprender', async ({
    page,
  }) => {
    const email = emailUnico('pix');
    await page.goto('/');
    await page.getByRole('button', { name: 'Começar agora' }).click();
    await expect(page).toHaveURL(/\/cadastro$/);

    await page.getByLabel('Nome completo').fill('Marina Souza Lima');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Celular').fill('42998765432');
    await page.getByLabel('CPF').fill(cpfValido(123456789));
    await page.getByLabel('Senha', { exact: true }).fill('senha-forte-123');
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole('button', { name: 'Criar conta e ir para o pagamento' }).click();

    await expect(page).toHaveURL(/\/pagamento$/);
    await expect(page.getByText('R$ 397', { exact: false }).first()).toBeVisible();
    const qr = page.getByAltText('QR Code do Pix de R$ 397,00');
    await expect(qr).toBeVisible();
    expect(await qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    const copiaCola = page.getByLabel('Pix copia e cola');
    await expect(copiaCola).toHaveValue(/^00020126.*br\.gov\.bcb\.pix/);
    await expect(page.getByText(/Expira em \d\d:\d\d/)).toBeVisible();

    // Antes do pagamento, o conteúdo responde 402.
    const trilha = await page.request.get('/api/trilha');
    expect(trilha.status()).toBe(402);

    // Webhook real com o paymentId do Asaas falso. A tela libera sozinha (polling), sem recarregar.
    const inicio = Date.now();
    const w = await confirmarPagamento(page.request, email);
    expect(w.status()).toBe(200);
    await expect(
      page.getByText('Seu acesso está liberado. Agora escolha o seu cargo.'),
    ).toBeVisible({
      timeout: 10_000,
    });
    expect(Date.now() - inicio).toBeLessThan(10_000);

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 10_000 });
    await page.getByRole('radio', { name: /^Agente Administrativo/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Agora não' }).click();

    await expect(page).toHaveURL(/\/aprender$/);
    await expect(
      page.getByRole('button', { name: /Começar treino|Continuar treino/ }),
    ).toBeVisible();
    expect((await page.request.get('/api/trilha')).status()).toBe(200);
  });

  test('sem pagamento: rotas de conteúdo dão 402 e a PWA manda para /pagamento', async ({
    page,
  }) => {
    await cadastrarViaApi(page, novaConta('semPix'));
    for (const rota of [
      '/api/concurso',
      '/api/trilha',
      '/api/revisao',
      '/api/simulados',
      '/api/liga',
      '/api/perfil/estatisticas',
      '/api/offline/pacote',
    ]) {
      const r = await page.request.get(rota);
      expect(r.status(), rota).toBe(402);
      const corpo = (await r.json()) as { erro: string; codigo?: string };
      expect(corpo.erro).toBeTruthy();
    }
    for (const rota of ['/aprender', '/revisar', '/simulado', '/liga', '/perfil']) {
      await page.goto(rota);
      await expect(page, rota).toHaveURL(/\/pagamento$/);
    }
  });

  test('webhook: token errado dá 401 e o repetido 5 vezes não duplica nada', async ({ page }) => {
    const c = novaConta('webhook');
    await cadastrarViaApi(page, c);
    expect((await page.request.post('/api/pagamento/pix')).status()).toBe(200);

    const errado = await confirmarPagamento(page.request, c.email, { token: 'token-errado' });
    expect(errado.status()).toBe(401);
    expect((await page.request.get('/api/trilha')).status()).toBe(402);

    for (let i = 0; i < 5; i++) {
      const r = await confirmarPagamento(page.request, c.email, { idEvento: 'evt_repetido_e2e' });
      expect(r.status()).toBe(200);
    }
    const st = (await (await page.request.get('/api/pagamento/status')).json()) as {
      acesso: boolean;
      status: string;
    };
    expect(st.acesso).toBe(true);
    const p = await page.request.get(`${API}/__e2e/pagamento`, { params: { email: c.email } });
    expect(((await p.json()) as { status: string }).status).toBe('pago');
    // O e-mail de boas-vindas (confirmação do pagamento) sai uma vez só.
    await expect
      .poll(async () => {
        const emails = (await (await page.request.get(`${API}/__e2e/emails`)).json()) as {
          para: string;
        }[];
        return emails.filter((e) => e.para === c.email).length;
      })
      .toBe(1);
  });

  test('estorno (PAYMENT_REFUNDED) revoga o acesso e derruba as sessões', async ({ page }) => {
    const c = novaConta('estorno');
    await cadastrarViaApi(page, c);
    expect((await page.request.post('/api/pagamento/pix')).status()).toBe(200);
    expect((await confirmarPagamento(page.request, c.email)).status()).toBe(200);
    expect((await page.request.get('/api/trilha')).status()).toBe(200);

    const r = await confirmarPagamento(page.request, c.email, { evento: 'PAYMENT_REFUNDED' });
    expect(r.status()).toBe(200);
    expect((await page.request.get('/api/me')).status()).toBe(401);
    await page.goto('/aprender');
    await expect(page).toHaveURL(/\/entrar$/);
  });
});
