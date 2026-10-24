#!/usr/bin/env node
/**
 * Captura as telas da PWA em 390×844 contra a API simulada (dev:mock), para comparar com
 * Telas_referencia/. Uso:
 *   pnpm --filter @fuse/web dev:mock --port 5180   (em outro terminal)
 *   pnpm --filter @fuse/web capturas               (BASE_URL=http://localhost:5180)
 * Saída: apps/web/capturas/*.png
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5180';
const saida = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../capturas');
const so = process.argv.slice(2);

async function main() {
  await mkdir(saida, { recursive: true });
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => console.error('[erro na página]', e.message));

  const cenario = (nome) => page.goto(`${BASE}/api/__mock/cenario?nome=${nome}`);
  const ir = async (rota) => {
    await page.goto(`${BASE}${rota}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
  };
  const foto = async (nome, cheia = false) => {
    if (so.length && !so.some((x) => nome.includes(x))) return;
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(saida, `${nome}.png`), fullPage: cheia });
    console.info('ok', nome);
  };

  await cenario('novo');
  await ir('/');
  await foto('01_boas_vindas');
  await ir('/cadastro');
  await foto('02_cadastro');
  await page.getByRole('button', { name: /Criar conta/ }).click();
  await foto('02b_cadastro_erros');
  await ir('/entrar');
  await foto('14_entrar');
  await ir('/recuperar');
  await foto('15_recuperar');
  await ir('/termos');
  await foto('16_termos');

  await cenario('semAcesso');
  await ir('/pagamento');
  await page.getByAltText(/QR Code/).waitFor();
  await foto('03_pagamento');
  await foto('03b_pagamento_inteiro', true);

  await cenario('onboarding');
  await ir('/onboarding');
  await foto('17_onboarding_cargo');

  await cenario('aluno');
  await ir('/aprender');
  await foto('04_inicio');
  await foto('04b_inicio_trilha_inteira', true);
  await ir('/concurso');
  await foto('18_sobre_concurso');

  // Lição: dica → acerto (B) → erro (A) → resto → fim → ofensiva
  await cenario('aluno');
  await ir('/aprender');
  await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
  await page.getByRole('button', { name: /ENTENDI, VAMOS LÁ/ }).waitFor();
  await foto('05a_dica_licao');
  await page.getByRole('button', { name: /ENTENDI, VAMOS LÁ/ }).click();
  await page.keyboard.press('2');
  await foto('05_questao');
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  await page.getByRole('button', { name: 'CONTINUAR' }).waitFor();
  await foto('06_resposta_correta');
  await page.getByRole('button', { name: 'CONTINUAR' }).click();
  await page.keyboard.press('1');
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  await page.getByRole('button', { name: 'ENTENDI' }).waitFor();
  await foto('07_resposta_incorreta');
  await page.getByRole('button', { name: 'ENTENDI' }).click();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('3');
    await page.getByRole('button', { name: 'VERIFICAR' }).click();
    const b = page.getByRole('button', { name: /^(CONTINUAR|ENTENDI)$/ });
    await b.waitFor();
    await b.click();
  }
  await page.getByText(/Lição concluída!/).waitFor();
  await foto('08_treino_concluido');
  await page.getByRole('button', { name: 'CONTINUAR' }).click();
  await page.getByText(/de ofensiva!/).waitFor();
  await foto('09_constancia');

  await cenario('aluno');
  await ir('/revisar');
  await foto('10_revisao');
  await cenario('revisaoVazia');
  await ir('/revisar');
  await foto('10b_revisao_vazia');

  await cenario('aluno');
  await ir('/simulado');
  await foto('11_simulado');
  await page.getByRole('button', { name: 'COMEÇAR SIMULADO' }).click();
  await page.getByRole('timer').waitFor();
  await page.keyboard.press('3');
  await foto('19_simulado_andamento');
  await page.getByRole('button', { name: 'ENTREGAR PROVA' }).click();
  await foto('19b_simulado_entregar');
  await page.getByRole('button', { name: 'ENTREGAR', exact: true }).click();
  await page.getByText('Desempenho por bloco').waitFor();
  await foto('20_simulado_resultado');

  await cenario('aluno');
  await ir('/liga');
  await foto('11_liga');
  await cenario('ligaInicial');
  await ir('/liga');
  await foto('11b_liga_inicial');
  await cenario('ligaResultado');
  await ir('/liga');
  await foto('11c_liga_resultado');

  await cenario('aluno');
  await ir('/perfil');
  await foto('12_perfil');
  await foto('12b_perfil_inteiro', true);
  await ir('/configuracoes');
  await foto('21_configuracoes');

  await cenario('semVidas');
  await ir('/aprender');
  await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
  await page.getByText('Suas vidas acabaram', { exact: true }).waitFor();
  await foto('22_sem_vidas');

  await cenario('edital');
  await ir('/aprender');
  await page.getByRole('dialog').waitFor();
  await foto('23_edital_saiu');

  await cenario('aluno');
  const guia = await page.evaluate(
    async () => (await (await fetch('/api/trilha')).json()).unidades[0].id,
  );
  await ir(`/guia/${guia}`);
  await foto('24_guia');

  await navegador.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
