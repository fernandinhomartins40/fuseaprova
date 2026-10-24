import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Carrega o .env da raiz do monorepo, se existir (sem sobrescrever o que já veio do ambiente). */
export function carregarEnv(): void {
  const caminho = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(caminho)) process.loadEnvFile(caminho);
}
