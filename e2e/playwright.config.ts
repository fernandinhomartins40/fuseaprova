/**
 * Playwright do Fuse Aprova (D11). Sobe:
 * 1. a API real com PGlite novo em memória, Asaas falso e relógio controlável (servidor.ts, porta 3100);
 * 2. a PWA de produção (vite build + vite preview, porta 4173) com proxy de /api para a API acima.
 * Os testes rodam em série (1 worker), porque o relógio da API é um só.
 *
 *   pnpm e2e                 (na raiz)
 *   E2E_SEM_BUILD=1 pnpm e2e (reaproveita apps/web/dist)
 */
import { defineConfig, devices } from '@playwright/test';

const API = 'http://127.0.0.1:3100';
const WEB = 'http://localhost:4173';
const build = process.env.E2E_SEM_BUILD ? '' : 'pnpm --filter @fuse/web build && ';

export default defineConfig({
  testDir: './testes',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide' },
  },
  // Linha de base por sistema (a fonte renderiza diferente no Windows e no Linux do CI).
  snapshotPathTemplate: '{testDir}/__capturas__/{platform}/{arg}{ext}',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: WEB,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    // O service worker cacheia /api; nos testes a rede é a fonte da verdade.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium' }],
  webServer: [
    {
      command: 'pnpm servidor',
      url: `${API}/api/saude`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      env: { E2E_APP_URL: WEB },
    },
    {
      command: `${build}pnpm --filter @fuse/web exec vite preview --port 4173 --strictPort --host localhost`,
      url: WEB,
      reuseExistingServer: false,
      timeout: 300_000,
      env: { API_URL: API },
    },
  ],
});
