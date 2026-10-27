import { sql, type SQL } from 'drizzle-orm';
import type { BancoDados, Transacao } from '@fuse/db';

export type Db = BancoDados | Transacao;

export const iso = (d: Date): string => d.toISOString();
export const isoOuNull = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/**
 * Data como parâmetro de `sql` cru. O postgres.js de produção recusa `Date` solto
 * (ERR_INVALID_ARG_TYPE); o PGlite dos testes aceita, então o erro só aparecia em produção
 * (auditoria PIE R5-05). Use sempre isto para datas dentro de sql`...`.
 */
export const dataSql = (d: Date): SQL => sql`${d.toISOString()}::timestamptz`;

/** Linhas de um `db.execute` (postgres.js devolve array; PGlite devolve `{ rows }`). */
export function linhas<T>(res: unknown): T[] {
  const r = res as { rows?: T[] };
  return Array.isArray(res) ? (res as T[]) : (r.rows ?? []);
}

export async function consultar<T>(db: Db, query: SQL): Promise<T[]> {
  return linhas<T>(await db.execute(query));
}

/** `= any(array)` com uuid[] tipado (inArray com lista vazia quebra; isto não). */
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function emUuids(coluna: SQL | unknown, ids: readonly string[]): SQL {
  for (const id of ids) if (!RE_UUID.test(id)) throw new Error('uuid inválido');
  return sql`${coluna} = any(${sql.raw(`'{${ids.join(',')}}'`)}::uuid[])`;
}

export function contar(n: unknown): number {
  return Number(n ?? 0);
}

/** Agrupa uma lista por chave. */
export function agrupar<T, K extends string>(lista: readonly T[], chave: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of lista) {
    const k = chave(item);
    const l = m.get(k);
    if (l) l.push(item);
    else m.set(k, [item]);
  }
  return m;
}
