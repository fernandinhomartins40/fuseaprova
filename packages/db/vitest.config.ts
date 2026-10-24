import { defineConfig } from 'vitest/config';
import { resolveFuseNode } from '../../vitest.shared';

export default defineConfig({
  ...resolveFuseNode,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
