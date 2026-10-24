import { defineConfig } from 'vitest/config';
import { resolveFuseNode } from '../../vitest.shared';

export default defineConfig({
  ...resolveFuseNode,
  test: {
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
