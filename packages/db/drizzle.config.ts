import { defineConfig } from 'drizzle-kit';

// `pnpm --filter @fuse/db generate` gera as migrações SQL em ./drizzle a partir do schema.
// Não precisa de banco para gerar. Para aplicar, use `pnpm --filter @fuse/db migrate`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
});
