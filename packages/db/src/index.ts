/**
 * @fuse/db — schema Drizzle, cliente (postgres.js ou PGlite) e migrações.
 *
 *   import { conectar, schema } from '@fuse/db';
 *   const { db, fechar } = conectar(process.env.DATABASE_URL);
 *   const lista = await db.select().from(schema.questoes);
 */
export * from './cliente.js';
export * from './schema/index.js';
export { semear, type OpcoesSeed, type ResumoSeed } from './seed/index.js';
export {
  aplicarPacote,
  validarPacote,
  idQuestaoPacote,
  FORMATO_PACOTE,
  MIN_QUESTOES_SECAO,
  type PacoteConteudo,
  type QuestaoPacote,
  type AssuntoPacote,
  type ProvaPacote,
  type ResumoPacote,
} from './conteudo/pacote.js';
