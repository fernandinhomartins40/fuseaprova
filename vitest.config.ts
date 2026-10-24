import { defineConfig } from 'vitest/config';

// Configuração raiz: roda os testes de todos os pacotes que têm vitest.config.ts.
// Cada pacote também roda sozinho com `pnpm --filter <pacote> test`.
export default defineConfig({
  test: {
    projects: ['packages/*/vitest.config.ts', 'apps/*/vitest.config.ts'],
  },
});
