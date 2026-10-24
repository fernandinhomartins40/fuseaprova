/**
 * Cliente de banco.
 *
 * - Produção e dev com Docker: PostgreSQL 16 via postgres.js (`DATABASE_URL=postgres://…`).
 * - Testes e dev sem Docker: PGlite (Postgres em WebAssembly, in-process), com as MESMAS
 *   migrações (docs/DECISOES.md D3). Use `DATABASE_URL=pglite://memoria` (em memória) ou
 *   `DATABASE_URL=pglite://./.pglite` (pasta local persistente).
 *
 * Os dois drivers expõem o mesmo `BancoDados` (PgDatabase do Drizzle com o schema).
 */
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export { schema };
export type Esquema = typeof schema;

/** Tipo do banco usado pela API, worker e coletor (independe do driver). */
export type BancoDados = PgDatabase<PgQueryResultHKT, Esquema, ExtractTablesWithRelations<Esquema>>;

/** Tipo de uma transação (`db.transaction(async (tx) => …)`). */
export type Transacao = PgTransaction<
  PgQueryResultHKT,
  Esquema,
  ExtractTablesWithRelations<Esquema>
>;

/** Pasta das migrações SQL geradas pelo drizzle-kit (vale para src/ e dist/). */
export const PASTA_MIGRACOES = fileURLToPath(new URL('../drizzle', import.meta.url));

export type Conexao =
  | { tipo: 'postgres'; db: BancoDados; sql: postgres.Sql; fechar: () => Promise<void> }
  | { tipo: 'pglite'; db: BancoDados; pg: PGlite; fechar: () => Promise<void> };

export interface OpcoesConexao {
  /** Máximo de conexões no pool (postgres.js). Padrão 10. */
  max?: number;
  /** Mostra o SQL no console. */
  log?: boolean;
}

const PREFIXO_PGLITE = 'pglite://';

/** Abre a conexão a partir de uma URL (padrão: `process.env.DATABASE_URL`). */
export function conectar(url = process.env.DATABASE_URL, opcoes: OpcoesConexao = {}): Conexao {
  if (!url) {
    throw new Error(
      'DATABASE_URL não definida. Use postgres://… ou pglite://memoria (veja .env.example).',
    );
  }
  if (url.startsWith(PREFIXO_PGLITE)) {
    const local = url.slice(PREFIXO_PGLITE.length);
    return conectarPglite(local === 'memoria' || local === '' ? undefined : local, opcoes);
  }
  const sql = postgres(url, {
    max: opcoes.max ?? 10,
    onnotice: () => {},
    // timestamps sempre em UTC na conexão; regras de dia usam America/Sao_Paulo no código.
    connection: { TimeZone: 'UTC' },
  });
  const db = drizzlePostgres(sql, { schema, logger: opcoes.log ?? false }) as unknown as BancoDados;
  return { tipo: 'postgres', db, sql, fechar: () => sql.end({ timeout: 5 }) };
}

/** PGlite em memória (sem `pasta`) ou persistido numa pasta. */
export function conectarPglite(pasta?: string, opcoes: OpcoesConexao = {}): Conexao {
  const pg = new PGlite(pasta);
  const db = drizzlePglite(pg, { schema, logger: opcoes.log ?? false }) as unknown as BancoDados;
  return { tipo: 'pglite', db, pg, fechar: () => pg.close() };
}

/** Aplica as migrações pendentes. */
export async function migrar(conexao: Conexao): Promise<void> {
  const config = { migrationsFolder: PASTA_MIGRACOES };
  if (conexao.tipo === 'pglite') {
    await migratePglite(drizzlePglite(conexao.pg), config);
  } else {
    await migratePostgres(drizzlePostgres(conexao.sql), config);
  }
}
