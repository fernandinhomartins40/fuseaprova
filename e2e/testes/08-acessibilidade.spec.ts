/**
 * Axe (axe-core do node_modules, sem CDN) nas telas reais contra a API de teste.
 * Critério do PRD 12: nenhuma violação séria ou crítica.
 */
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import {
  alternativa,
  alunoPago,
  cadastrarViaApi,
  comecarLicao,
  definirRelogio,
  novaConta,
  questaoPorEnunciado,
} from './apoio.js';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');

interface Violacao {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

async function auditar(page: Page, tela: string) {
  await page.waitForLoadState('networkidle');
  await page.addScriptTag({ path: AXE });
  const violacoes = await page.evaluate(async () => {
    const axe = (
      window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: Violacao[] }> } }
    ).axe;
    const r = await axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return r.violations;
  });
  const serias = violacoes.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serias.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
    tela,
  ).toEqual([]);
}

test.describe('Acessibilidade (axe)', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-12-08T09:00:00-03:00');
  });

  test('telas públicas e pagamento sem violações sérias', async ({ page }) => {
    for (const rota of ['/', '/cadastro', '/entrar', '/recuperar', '/termos']) {
      await page.goto(rota);
      await auditar(page, rota);
    }
    await cadastrarViaApi(page, novaConta('axepix'));
    await page.goto('/pagamento');
    await expect(page.getByAltText(/QR Code do Pix/)).toBeVisible();
    await auditar(page, '/pagamento');
  });

  test('telas do aluno e lição sem violações sérias', async ({ page }) => {
    await alunoPago(page, novaConta('axe'));
    for (const rota of [
      '/aprender',
      '/revisar',
      '/simulado',
      '/liga',
      '/perfil',
      '/configuracoes',
    ]) {
      await page.goto(rota);
      await auditar(page, rota);
    }
    await page.goto('/aprender');
    await comecarLicao(page);
    await auditar(page, 'lição: questão');
    const q = await questaoPorEnunciado(
      page.request,
      (await page.locator('#enunciado').innerText()).trim(),
    );
    await alternativa(page, q.gabarito).click();
    await page.getByRole('button', { name: 'VERIFICAR' }).click();
    await expect(page.getByRole('button', { name: 'CONTINUAR' })).toBeVisible();
    await auditar(page, 'lição: feedback');
  });
});
