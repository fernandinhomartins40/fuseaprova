/**
 * pnpm --filter @fuse/db seed — aplica as migrações e roda o seed (idempotente).
 * SEED_DEV_PUBLICAR=1 publica as questões autorais de exemplo (só em desenvolvimento).
 */
import { conectar, migrar } from '../cliente.js';
import { semear } from '../seed/index.js';
import { carregarEnv } from './ambiente.js';

carregarEnv();
const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
try {
  await migrar(conexao);
  const resumo = await semear(conexao.db, { log: (m) => console.info(`· ${m}`) });
  console.info('Seed concluído:', JSON.stringify({ ...resumo, pendencias: undefined }, null, 2));
  for (const p of resumo.pendencias) console.warn(`TODO: ${p}`);
} finally {
  await conexao.fechar();
}
