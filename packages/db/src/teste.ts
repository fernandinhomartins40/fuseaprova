/**
 * Helpers para testes (API, worker, coletor): banco PGlite em memória, já migrado.
 *
 * Com TESTE_DATABASE_URL (ex.: postgres://fuse:fuse@localhost:5432/postgres), cada chamada
 * cria um banco novo nesse Postgres real e usa o driver de produção (postgres.js). O PGlite
 * aceita coisas que o postgres.js recusa (ex.: Date solto em sql cru, auditoria PIE R5-05);
 * o CI roda a suíte da API dos dois jeitos.
 *
 *   import { criarBancoTeste } from '@fuse/db/teste';
 *   const banco = await criarBancoTeste({ seed: true });
 *   // … banco.db.select().from(schema.questoes) …
 *   await banco.fechar();
 */
import { sql } from 'drizzle-orm';
import { conectar, conectarPglite, migrar, type BancoDados, type Conexao } from './cliente.js';
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

/** Banco novo e vazio no Postgres de TESTE_DATABASE_URL. */
async function bancoNovoNoPostgres(url: string): Promise<Conexao> {
  const nome = `teste_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = conectar(url);
  try {
    await admin.db.execute(sql.raw(`create database ${nome}`));
  } finally {
    await admin.fechar();
  }
  const alvo = new URL(url);
  alvo.pathname = `/${nome}`;
  return conectar(alvo.toString());
}

/** Cria um banco (PGlite em memória ou Postgres real) com todas as migrações aplicadas. */
export async function criarBancoTeste(opcoes: OpcoesBancoTeste = {}): Promise<BancoTeste> {
  const urlReal = process.env.TESTE_DATABASE_URL;
  const conexao = urlReal ? await bancoNovoNoPostgres(urlReal) : conectarPglite();
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
