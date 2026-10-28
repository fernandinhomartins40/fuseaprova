import { expect, test } from '@playwright/test';
import { API, alunoPago, definirRelogio, emailUnico, entrarPelaUI } from './apoio.js';

test.use({ viewport: { width: 1280, height: 900 } });

test.describe('Conteúdo no painel único (D24)', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-11-17T09:00:00-03:00');
  });

  test('login de admin, painel abre, editar e publicar uma questão', async ({ page }) => {
    const email = emailUnico('admin');
    const senha = 'senha-admin-forte-123';
    await page.request.post(`${API}/__e2e/admin`, {
      data: { email, senha, nome: 'Dona Admin Fuse' },
    });
    // D24: a equipe de conteúdo entra pela página dela e cai direto no /super/conteudo.
    await entrarPelaUI(page, email, senha, '/admin/entrar');
    await expect(page).toHaveURL(/\/super\/conteudo$/);
    await expect(page.getByRole('heading', { name: 'Resumo do conteúdo', exact: true })).toBeVisible();
    await expect(page.getByText('Aprendizagem')).toBeVisible();
    const menu = page.getByRole('navigation', { name: 'Menu do painel de conteúdo' });
    await expect(menu.getByRole('link', { name: 'Pagamentos' })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'Sair' })).toBeVisible();

    // O endereço antigo redireciona para a seção Conteúdo.
    await page.goto('/admin/questoes');
    await expect(page).toHaveURL(/\/super\/conteudo\/questoes$/);
    const link = page.locator('table tbody tr a').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/super\/conteudo\/questoes\/[0-9a-f-]{36}$/);
    const id = page.url().split('/').pop()!;
    const form = page.getByRole('form', { name: 'Editor de questão' });
    await expect(form).toBeVisible();

    // Edita a explicação e volta para rascunho.
    const explicacao = form.getByRole('textbox', { name: 'Explicação' });
    const original = await explicacao.inputValue();
    await explicacao.fill(`${original} Revisada no E2E.`);
    await form.getByRole('combobox', { name: 'Status' }).selectOption('rascunho');
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Questão salva \(versão \d+\)\./)).toBeVisible();

    let q = (await (await page.request.get(`/api/admin/questoes/${id}`)).json()) as {
      status: string;
      explicacao: string;
    };
    expect(q.status).toBe('rascunho');
    expect(q.explicacao).toContain('Revisada no E2E.');

    // Publica de novo, com o texto original. Publicar exige a revisão humana (PRD 7.4).
    await explicacao.fill(original);
    await form.getByRole('combobox', { name: 'Status' }).selectOption('publicada');
    await expect(page.getByText(/1 pendência para publicar/)).toBeVisible();
    await form.getByRole('checkbox', { name: /Revisei esta questão/ }).check();
    await expect(page.getByText('Pronta para publicar')).toBeVisible();
    await form.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Questão salva \(versão \d+\)\./)).toBeVisible();
    await expect
      .poll(async () => {
        q = (await (await page.request.get(`/api/admin/questoes/${id}`)).json()) as typeof q;
        return q.status;
      })
      .toBe('publicada');
    expect(q.explicacao).toBe(original);
  });

  test('sem login dá 401 e aluno sem papel admin recebe 403 nas rotas /admin', async ({ page }) => {
    expect((await page.request.get('/api/admin/painel')).status()).toBe(401);
    await alunoPago(page);
    expect((await page.request.get('/api/admin/painel')).status()).toBe(403);
    expect((await page.request.get('/api/admin/questoes')).status()).toBe(403);
  });
});
