/** pnpm --filter @fuse/db migrate — aplica as migrações em DATABASE_URL. */
import { conectar, migrar } from '../cliente.js';
import { carregarEnv } from './ambiente.js';

carregarEnv();
const conexao = conectar(process.env.DATABASE_URL, { max: 1 });
try {
  await migrar(conexao);
  console.info('Migrações aplicadas.');
} finally {
  await conexao.fechar();
}
