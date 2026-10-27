import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { condicoesCliente } from '../../vitest.shared';

export default defineConfig({
  plugins: [react()],
  define: { __APP_NATIVO__: 'false' },
  resolve: { conditions: condicoesCliente },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'mock/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
