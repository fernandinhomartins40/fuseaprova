/**
 * Painel superadmin (D13) no desktop (1280×800) e no celular (390×844):
 * - primeiro login: o 2FA é obrigatório (QR + código do app), depois o painel abre;
 * - segundo login: pede o código de 6 dígitos de novo;
 * - aprovação manual de um pagamento recebido por fora, com senha e motivo, libera o acesso.
 */
import { expect, request as requisicao, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, avancarRelogio, cpfValido, definirRelogio, emailUnico, entrarPelaUI } from './apoio.js';

const SENHA_SUPER = 'senha-super-forte-123';

async function codigoTotp(request: APIRequestContext, segredo: string): Promise<string> {
  const r = await request.post(`${API}/__e2e/totp`, { data: { segredo } });
  expect(r.ok()).toBeTruthy();
  return ((await r.json()) as { codigo: string }).codigo;
}

/** Aluno com Pix pendente, criado num contexto de API separado (não mexe no cookie do super). */
async function alunoComPixPendente(request: APIRequestContext, base: string) {
  const email = emailUnico('manual');
  const ctx = await requisicao.newContext({ baseURL: base });
  const cad = await ctx.post('/api/auth/cadastro', {
    data: { nome: 'Joana Pereira Dias', email, cpf: cpfValido(), celular: '42998765432', senha: 'senha-aluno-123', aceiteTermos: true },
  });
  expect(cad.status(), await cad.text()).toBe(201);
  const pix = await ctx.post('/api/pagamento/pix');
  expect(pix.status(), await pix.text()).toBe(200);
  await ctx.dispose();
  const p = await request.get(`${API}/__e2e/pagamento`, { params: { email } });
  expect(((await p.json()) as { status: string }).status).toBe('pendente');
  return email;
}

/** Primeiro login: configura o 2FA e chega à visão geral. */
async function primeiroLogin(page: Page, email: string) {
  await page.request.post(`${API}/__e2e/superadmin`, { data: { email, senha: SENHA_SUPER, nome: 'Dono Superadmin Fuse' } });
  await entrarPelaUI(page, email, SENHA_SUPER, '/super/entrar');
  await expect(page).toHaveURL(/\/super\/2fa/);
  await page.getByRole('button', { name: 'Gerar QR code' }).click();
  await expect(page.getByRole('img', { name: 'QR code do app autenticador' })).toBeVisible();
  const segredo = (await page.getByTestId('chave-manual').innerText()).trim();
  await page.getByLabel('Código de 6 dígitos').fill(await codigoTotp(page.request, segredo));
  await page.getByRole('button', { name: 'Ativar' }).click();
  await expect(page.getByTestId('codigos-recuperacao')).toBeVisible();
  await page.getByLabel('Guardei os códigos num lugar seguro').check();
  await page.getByRole('button', { name: 'Ir para o painel' }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 }).last()).toBeVisible();
  await expect(page.getByTestId('kpi-bruta')).toBeVisible();
  return segredo;
}

for (const [nome, viewport] of [
  ['desktop', { width: 1280, height: 800 }],
  ['celular', { width: 390, height: 844 }],
] as const) {
  test.describe(`Superadmin (${nome})`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await definirRelogio(page, '2026-11-20T10:00:00-03:00');
    });

    test('login com 2FA obrigatório e layout do painel', async ({ page }) => {
      const email = emailUnico(`super-${nome}`);
      const segredo = await primeiroLogin(page, email);

      if (nome === 'desktop') {
        const menu = page.getByRole('navigation', { name: 'Menu do superadmin' });
        await expect(menu).toBeVisible();
        await expect(menu.getByText('Superadmin', { exact: true })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Navegação do superadmin' })).toHaveCount(0);
        // Recolhe a sidebar para só ícones e expande de novo.
        await menu.getByRole('button', { name: 'Recolher o menu' }).click();
        await expect(menu.getByRole('button', { name: 'Expandir o menu' })).toBeVisible();
        await menu.getByRole('button', { name: 'Expandir o menu' }).click();
        await menu.getByRole('link', { name: 'Pagamentos', exact: true }).click();
        await expect(page).toHaveURL(/\/super\/pagamentos$/);
        await menu.getByRole('button', { name: 'Sair' }).click();
      } else {
        const nav = page.getByRole('navigation', { name: 'Navegação do superadmin' });
        await expect(nav).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Menu do superadmin' })).toHaveCount(0);
        await nav.getByRole('link', { name: 'Pagamentos' }).click();
        await expect(page).toHaveURL(/\/super\/pagamentos$/);
        await nav.getByRole('button', { name: 'Mais' }).click();
        const folha = page.getByRole('dialog', { name: 'Mais opções' });
        await expect(folha.getByRole('link', { name: 'Equipe' })).toBeVisible();
        await expect(folha.getByRole('link', { name: 'Comunicação' })).toBeVisible();
        await expect(folha.getByRole('link', { name: 'Sistema' })).toBeVisible();
        await folha.getByRole('button', { name: 'Sair' }).click();
      }
      // D24: Sair volta à página de login do superadmin.
      await expect(page).toHaveURL(/\/super\/entrar$/);

      // Segundo login: o código do app é pedido de novo (passo de 30 s seguinte).
      await avancarRelogio(page, 31_000);
      await entrarPelaUI(page, email, SENHA_SUPER, '/super/entrar');
      await expect(page).toHaveURL(/\/super\/2fa/);
      await expect(page.getByRole('heading', { name: 'Digite o código do app' })).toBeVisible();
      await page.getByLabel('Código de 6 dígitos').fill('000000');
      await page.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await page.getByLabel('Código de 6 dígitos').fill(await codigoTotp(page.request, segredo));
      await page.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page).toHaveURL(/\/super$/);
      await expect(page.getByTestId('kpi-bruta')).toBeVisible();
    });

    test('aprovação manual de um pagamento libera o acesso', async ({ page, baseURL }) => {
      await primeiroLogin(page, emailUnico(`super-manual-${nome}`));
      const aluno = await alunoComPixPendente(page.request, baseURL!);

      await page.goto('/super/usuarios');
      const busca = nome === 'desktop' ? page.getByLabel('Buscar', { exact: true }) : page.getByLabel('Buscar por nome, e-mail ou CPF');
      await busca.fill(aluno);
      await page.getByRole('link', { name: /Joana Pereira Dias/ }).first().click();
      await expect(page).toHaveURL(/\/super\/usuarios\/[0-9a-f-]{36}$/);
      if (nome === 'celular') await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();

      // D24: pela ficha, a aprovação é por concurso.
      await page.getByRole('button', { name: /^Aprovar pagamento manual de / }).first().click();
      const folha = page.getByRole('dialog', { name: 'Aprovar pagamento manual' });
      await expect(folha).toBeVisible();
      await folha.getByLabel('Forma do pagamento').selectOption('pix_direto');
      await folha.getByLabel('Observação (motivo, fica na auditoria)').fill('Pix recebido direto na conta da empresa, conferido no extrato.');
      await folha.getByLabel('Referência (opcional)').fill('E2E-PIX-001');
      const aprovar = folha.getByRole('button', { name: 'Aprovar e liberar acesso' });
      await expect(aprovar).toBeDisabled();
      await folha.getByLabel('Sua senha').fill(SENHA_SUPER);
      await aprovar.click();
      await expect(folha.getByText(/Pagamento aprovado manualmente/)).toBeVisible();
      await folha.getByRole('button', { name: 'Fechar' }).last().click();

      await expect(page.getByText('Com concurso liberado', { exact: true })).toBeVisible();
      const p = await page.request.get(`${API}/__e2e/pagamento`, { params: { email: aluno } });
      expect(((await p.json()) as { status: string }).status).toBe('pago');

      // Aparece na lista de pagamentos como manual.
      await page.goto('/super/pagamentos');
      await page.getByLabel(nome === 'desktop' ? 'Buscar' : 'Buscar por nome, e-mail, CPF ou id do Asaas', { exact: true }).fill(aluno);
      // Espera a busca filtrar (só o pedido deste aluno) e confere que ele é manual.
      const itens = nome === 'desktop' ? page.getByRole('table', { name: 'Pagamentos' }).locator('tbody tr') : page.getByRole('list', { name: 'Pagamentos' }).getByRole('listitem');
      await expect(itens).toHaveCount(1);
      const linha =
        nome === 'desktop'
          ? page.getByRole('table', { name: 'Pagamentos' }).getByRole('cell', { name: 'Manual', exact: true })
          : page.getByRole('list', { name: 'Pagamentos' }).getByText(/(^|· )Manual ·/);
      await expect(linha).toBeVisible();
    });
  });
}
