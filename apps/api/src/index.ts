/**
 * Servidor da API: `node dist/index.js` (produção) ou `pnpm --filter @fuse/api dev`.
 * Escuta HOST (0.0.0.0) e PORT (3000). Com DATABASE_URL=pglite://… aplica as migrações
 * ao subir (dev sem Docker). Em Postgres, as migrações rodam no serviço `migrate`.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { conectar, migrar } from '@fuse/db';
import { criarApp, entregarExpirados, lerConfig } from './app.js';

const env = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(env)) process.loadEnvFile(env);
process.env.TZ ??= 'America/Sao_Paulo';

const config = lerConfig();
const conexao = conectar(process.env.DATABASE_URL);
if (conexao.tipo === 'pglite') await migrar(conexao);

const app = await criarApp({ db: conexao.db, config });

// Entrega automática dos simulados cujas 4 h acabaram (também verificada em toda leitura).
let varrendo = false;
const varredura = setInterval(() => {
  if (varrendo) return;
  varrendo = true;
  entregarExpirados(app.deps, null, app.deps.relogio.agora())
    .catch((e: Error) => app.log.error({ erro: e.message }, 'falha na entrega automática de simulados'))
    .finally(() => (varrendo = false));
}, 60_000);
varredura.unref();

const encerrar = async (sinal: string) => {
  app.log.info({ sinal }, 'encerrando');
  clearInterval(varredura);
  await app.close();
  await conexao.fechar();
  process.exit(0);
};
process.on('SIGTERM', () => void encerrar('SIGTERM'));
process.on('SIGINT', () => void encerrar('SIGINT'));

await app.listen({ host: config.host, port: config.porta });
