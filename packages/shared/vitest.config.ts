import { defineConfig } from 'vitest/config';
import { resolveFuseNode } from '../../vitest.shared';

export default defineConfig({
  ...resolveFuseNode,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
      },
    },
  },
});
