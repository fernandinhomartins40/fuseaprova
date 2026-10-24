import { expect, test, type Page } from '@playwright/test';
import {
  alternativa,
  alunoPago,
  avancarRelogio,
  definirRelogio,
  gabaritoDe,
  letraErrada,
  novaConta,
} from './apoio.js';

interface Detalhe {
  estado: string;
  questoes: { numero: number; bloco: string }[];
}

async function detalhe(page: Page): Promise<Detalhe> {
  const id = page.url().split('/simulado/')[1]!;
  return (await (await page.request.get(`/api/simulados/${id}`)).json()) as Detalhe;
}

const PESO_ESPECIFICOS = 2.8;
const PESO_COMUNS = 2.0;

/** Responde a questão da tela (certo ou errado) e devolve o bloco dela. */
async function responder(page: Page, certo: boolean): Promise<string> {
  const chip = (
    await page
      .getByText(/^\d+\. /)
      .first()
      .innerText()
  ).trim();
  const enunciado = (await page.locator('[class*="_enunciado_"]').innerText()).trim();
  const g = await gabaritoDe(page.request, enunciado);
  const salvar = page.waitForResponse((r) => /\/api\/simulados\/[^/]+\/resposta$/.test(r.url()));
  await alternativa(page, certo ? g : letraErrada(g)).click();
  expect((await salvar).status()).toBe(200);
  return chip;
}

test.describe('Simulado', () => {
  test.beforeEach(async ({ page }) => {
    await definirRelogio(page, '2026-11-10T09:00:00-03:00');
  });

  test('iniciar, responder, entregar e ver o resultado com os pesos 2,0 e 2,8', async ({
    page,
  }) => {
    await alunoPago(page, novaConta('simulado'));
    await page.goto('/simulado');
    await expect(page.getByRole('list', { name: 'Distribuição das questões' })).toContainText(
      /5.*PORTUGUÊS.*5.*MAT\/RL.*5.*C\. GERAIS.*25.*ESPECÍFICOS/s,
    );
    await page.getByRole('button', { name: 'COMEÇAR SIMULADO' }).click();
    await expect(page).toHaveURL(/\/simulado\/[0-9a-f-]{36}$/);
    const timer = page.getByRole('timer', { name: 'Tempo restante' });
    await expect(timer).toContainText(/(4:00:00|3:59:\d\d|03:59:\d\d|04:00:00)/);

    // 40 questões: 5/5/5/25 (Agente Administrativo, sem edital).
    const d = await detalhe(page);
    expect(d.questoes).toHaveLength(40);
    const porBloco = d.questoes.reduce<Record<string, number>>(
      (a, q) => ({ ...a, [q.bloco]: (a[q.bloco] ?? 0) + 1 }),
      {},
    );
    expect(porBloco).toEqual({ portugues: 5, matematica: 5, gerais: 5, especificos: 25 });

    // Q1–Q3 certas, Q4 errada; depois Q16 e Q17 (específicos) certas. O resto fica em branco.
    let esperado = 0;
    const blocoDe = (n: number) => d.questoes.find((q) => q.numero === n)!.bloco;
    for (let n = 1; n <= 17; n++) {
      if (n <= 4 || n >= 16) {
        const certo = n !== 4;
        await responder(page, certo);
        if (certo) esperado += blocoDe(n) === 'especificos' ? PESO_ESPECIFICOS : PESO_COMUNS;
      }
      if (n < 17) await page.getByRole('button', { name: 'PRÓXIMA' }).click();
    }
    expect(blocoDe(16)).toBe('especificos');
    expect(esperado).toBeCloseTo(3 * 2.0 + 2 * 2.8, 5);

    await page.getByRole('button', { name: 'ENTREGAR PROVA' }).click();
    await expect(page.getByRole('dialog')).toContainText('Você deixou 34 questões em branco');
    await page.getByRole('button', { name: 'ENTREGAR', exact: true }).click();

    await expect(page.getByText('Desempenho por bloco')).toBeVisible();
    const pontos = esperado.toLocaleString('pt-BR', { minimumFractionDigits: 1 });
    await expect(page.getByText(`${pontos} de 100,0 pontos`)).toBeVisible();
    await expect(page.getByText(/5 de 40 acertos/)).toBeVisible();
    await expect(page.getByText(/2\/25 · 5,6 pts/)).toBeVisible();
    await expect(page.getByText(/3\/5 · 6,0 pts/)).toBeVisible();
  });

  test('o cronômetro é do servidor e a entrega é automática ao fim das 4 h', async ({ page }) => {
    await alunoPago(page, novaConta('simauto'));
    await page.goto('/simulado');
    await page.getByRole('button', { name: 'COMEÇAR SIMULADO' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
    await responder(page, true);
    const url = page.url();

    await avancarRelogio(page, 4 * 3600_000 + 60_000);
    await page.goto(url);
    await expect(page.getByText('Entregue automaticamente quando o tempo acabou.')).toBeVisible();
    await expect(page.getByText(/1 de 40 acertos/)).toBeVisible();
    expect((await detalhe(page)).estado).toBe('entregue');
  });
});
