/**
 * Helpers para testes (API, worker, coletor): banco PGlite em memória, já migrado.
 *
 *   import { criarBancoTeste } from '@fuse/db/teste';
 *   const banco = await criarBancoTeste({ seed: true });
 *   // … banco.db.select().from(schema.questoes) …
 *   await banco.fechar();
 */
import { sql } from 'drizzle-orm';
import { conectarPglite, migrar, type BancoDados, type Conexao } from './cliente.js';
import { semear, type OpcoesSeed, type ResumoSeed } from './seed/index.js';

export interface BancoTeste {
  db: BancoDados;
  conexao: Conexao;
  /** Resumo do seed, se `seed` foi pedido. */
  seed: ResumoSeed | null;
  /** Apaga os dados de todas as tabelas (mantém o schema). */
  limpar: () => Promise<void>;
  fechar: () => Promise<void>;
}

export interface OpcoesBancoTeste {
  /** Roda o seed depois das migrações (true ou opções do seed). */
  seed?: boolean | OpcoesSeed;
}

/** Cria um banco PGlite em memória com todas as migrações aplicadas. */
export async function criarBancoTeste(opcoes: OpcoesBancoTeste = {}): Promise<BancoTeste> {
  const conexao = conectarPglite();
  await migrar(conexao);
  const db = conexao.db;
  let resumo: ResumoSeed | null = null;
  if (opcoes.seed) {
    resumo = await semear(db, opcoes.seed === true ? {} : opcoes.seed);
  }
  return {
    db,
    conexao,
    seed: resumo,
    limpar: () => limparBanco(db),
    fechar: conexao.fechar,
  };
}

/** TRUNCATE em todas as tabelas do schema public, exceto a de migrações. */
export async function limparBanco(db: BancoDados): Promise<void> {
  const linhas = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const tabelas =
    (linhas as unknown as { rows?: { tablename: string }[] }).rows ??
    (linhas as unknown as { tablename: string }[]);
  const nomes = tabelas.map((t) => `"${t.tablename}"`);
  if (nomes.length)
    await db.execute(sql.raw(`truncate ${nomes.join(', ')} restart identity cascade`));
}
