import { defineConfig } from 'vitest/config';
import { resolveFuseNode } from '../../vitest.shared';

export default defineConfig({
  ...resolveFuseNode,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // Os testes de gravação criam um PGlite com migrações e seed.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
