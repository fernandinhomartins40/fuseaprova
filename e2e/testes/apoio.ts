/**
 * Apoio dos testes E2E: controle do relógio e do sorteio da API de teste, pagamento pelo
 * webhook real do Asaas e respostas guiadas pelo gabarito do banco.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = 'http://127.0.0.1:3100';
/** Mesmo token de servidor.ts (só existe no ambiente de teste). */
export const TOKEN_WEBHOOK = 'token-webhook-e2e';
export const SENHA = 'senha-forte-123';
export const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Letra = (typeof LETRAS)[number];

let contador = 0;
export function emailUnico(prefixo: string): string {
  return `${prefixo}.${Date.now().toString(36)}${++contador}@teste.com`;
}

/* ------------------------------------------------------------------ CPF */
function dv(base: string): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
  const r = (soma * 10) % 11;
  return r === 10 ? 0 : r;
}
/** CPF válido a partir de 9 dígitos. */
export function cpfValido(semente = Math.floor(Math.random() * 1e9)): string {
  const base = String(semente % 1e9).padStart(9, '0');
  const d1 = dv(base);
  const d2 = dv(base + d1);
  return `${base}${d1}${d2}`;
}

/* ------------------------------------------------------- relógio/sorteio */
/** Acerta o relógio da API e do navegador (chamar antes do primeiro goto). */
export async function definirRelogio(page: Page, iso: string): Promise<void> {
  const r = await page.request.post(`${API}/__e2e/relogio`, { data: { definir: iso } });
  expect(r.ok()).toBeTruthy();
  await page.clock.install({ time: new Date(iso) });
}

/** Avança o relógio da API e o do navegador. */
export async function avancarRelogio(page: Page, ms: number): Promise<void> {
  const r = await page.request.post(`${API}/__e2e/relogio`, { data: { avancarMs: ms } });
  const { agora } = (await r.json()) as { agora: string };
  await page.clock.setSystemTime(new Date(agora));
}

export async function semente(request: APIRequestContext, s: string): Promise<void> {
  await request.post(`${API}/__e2e/semente`, { data: { semente: s } });
}

/* ---------------------------------------------------------------- conta */
export interface Conta {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
}

export function novaConta(prefixo = 'aluno', nome = 'Marina Souza Lima'): Conta {
  return { nome, email: emailUnico(prefixo), senha: SENHA, cpf: cpfValido() };
}

/** Cadastro pela API (o cookie fica no contexto do navegador). */
export async function cadastrarViaApi(page: Page, c: Conta): Promise<void> {
  const r = await page.request.post('/api/auth/cadastro', {
    data: {
      nome: c.nome,
      email: c.email,
      cpf: c.cpf,
      celular: '42998765432',
      senha: c.senha,
      aceiteTermos: true,
    },
  });
  expect(r.status(), await r.text()).toBe(201);
}

/** Dispara o webhook real PAYMENT_CONFIRMED com o paymentId que o Asaas falso gerou. */
export async function confirmarPagamento(
  request: APIRequestContext,
  email: string,
  opcoes: { evento?: string; idEvento?: string; token?: string } = {},
) {
  const p = await request.get(`${API}/__e2e/pagamento`, { params: { email } });
  expect(p.ok(), await p.text()).toBeTruthy();
  const { paymentId } = (await p.json()) as { paymentId: string };
  return request.post(`${API}/api/webhooks/asaas`, {
    headers: { 'asaas-access-token': opcoes.token ?? TOKEN_WEBHOOK },
    data: {
      id: opcoes.idEvento ?? `evt_${paymentId}_${Date.now()}`,
      event: opcoes.evento ?? 'PAYMENT_CONFIRMED',
      payment: { id: paymentId, status: 'CONFIRMED', billingType: 'PIX', value: 397 },
    },
  });
}

/** Aluno com acesso e onboarding feitos pela API (cargo Agente Administrativo). */
export async function alunoPago(page: Page, c: Conta = novaConta()): Promise<Conta> {
  await cadastrarViaApi(page, c);
  const pix = await page.request.post('/api/pagamento/pix');
  expect(pix.status(), await pix.text()).toBe(200);
  const w = await confirmarPagamento(page.request, c.email);
  expect(w.status()).toBe(200);
  const concurso = (await (await page.request.get('/api/concurso')).json()) as {
    cargos: { id: string; nome: string }[];
  };
  const cargo = concurso.cargos.find((x) => x.nome === 'Agente Administrativo');
  const r = await page.request.patch('/api/me', {
    data: { cargoId: cargo!.id, onboardingConcluido: true },
  });
  expect(r.status(), await r.text()).toBe(200);
  return c;
}

export async function entrarPelaUI(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/* ------------------------------------------------------------- respostas */
export interface DadosQuestao {
  id: string;
  gabarito: Letra;
  explicacao: string | null;
}

export async function questaoPorEnunciado(
  request: APIRequestContext,
  enunciado: string,
): Promise<DadosQuestao> {
  const r = await request.get(`${API}/__e2e/gabarito`, { params: { enunciado } });
  expect(r.ok(), `gabarito de "${enunciado.slice(0, 60)}": ${await r.text()}`).toBeTruthy();
  return (await r.json()) as DadosQuestao;
}

export async function gabaritoDe(request: APIRequestContext, enunciado: string): Promise<Letra> {
  return (await questaoPorEnunciado(request, enunciado)).gabarito;
}

export function letraErrada(g: Letra): Letra {
  return g === 'A' ? 'B' : 'A';
}

/** Alternativa (role=radio) pela letra, dentro de um grupo de alternativas. */
export function alternativa(page: Page, letra: Letra) {
  return page.getByRole('radio', { name: new RegExp(`^${letra}\\) `) });
}

/** Na lição: lê o enunciado, escolhe certo ou errado e clica VERIFICAR. */
export async function responderLicao(
  page: Page,
  certo: boolean,
): Promise<DadosQuestao & { marcada: Letra }> {
  const enunciado = (await page.locator('#enunciado').innerText()).trim();
  const q = await questaoPorEnunciado(page.request, enunciado);
  const marcada = certo ? q.gabarito : letraErrada(q.gabarito);
  await alternativa(page, marcada).click();
  await page.getByRole('button', { name: 'VERIFICAR' }).click();
  return { ...q, marcada };
}

/** Começa a próxima lição da trilha a partir de /aprender (passando pela dica). */
export async function comecarLicao(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Começar treino|Continuar treino/ }).click();
  await expect(page).toHaveURL(/\/licao\//);
  const dica = page.getByRole('button', { name: 'ENTENDI, VAMOS LÁ' });
  const questao = page.locator('#enunciado');
  await expect(dica.or(questao)).toBeVisible();
  if (await dica.isVisible()) await dica.click();
  await expect(questao).toBeVisible();
}

/** Botão da folha de feedback (CONTINUAR no acerto, ENTENDI no erro). */
export function botaoFeedback(page: Page) {
  return page.getByRole('button', { name: /^(CONTINUAR|ENTENDI)$/ });
}
