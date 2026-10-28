import { expect, test } from '@playwright/test';
import { API, emailUnico, entrarPelaUI } from './apoio.js';

test.use({ viewport: { width: 1280, height: 900 } });

const SENHA = 'senha-equipe-forte-123';

/** D24 (RQ2): cada papel entra só pela sua página; o portal errado recebe o erro genérico. */
test.describe('Logins separados por papel (D24)', () => {
  test('admin e superadmin não entram pelo portal do outro nem pelo do aluno', async ({ page }) => {
    const admin = emailUnico('portal-admin');
    const sup = emailUnico('portal-super');
    await page.request.post(`${API}/__e2e/admin`, { data: { email: admin, senha: SENHA, nome: 'Dona Admin Fuse' } });
    await page.request.post(`${API}/__e2e/superadmin`, { data: { email: sup, senha: SENHA, nome: 'Dono Super Fuse' } });

    for (const [email, pagina] of [
      [admin, '/entrar'],
      [admin, '/super/entrar'],
      [sup, '/entrar'],
      [sup, '/admin/entrar'],
    ] as const) {
      await entrarPelaUI(page, email, SENHA, pagina);
      await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${pagina.replace(/\//g, '\\/')}$`));
    }

    // Pelo portal certo, cada um segue: o admin para o Conteúdo, o superadmin para o 2FA.
    await entrarPelaUI(page, admin, SENHA, '/admin/entrar');
    await expect(page).toHaveURL(/\/super\/conteudo$/);
    await page.context().clearCookies();
    await entrarPelaUI(page, sup, SENHA, '/super/entrar');
    await expect(page).toHaveURL(/\/super\/2fa/);
  });

  test('a página de login da equipe não oferece "Criar conta"', async ({ page }) => {
    for (const pagina of ['/admin/entrar', '/super/entrar']) {
      await page.goto(pagina);
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Criar conta/i })).toHaveCount(0);
    }
  });
});
