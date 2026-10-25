import { eq } from 'drizzle-orm';
import { schema, type BancoDados, type Transacao } from '@fuse/db';

export type Db = BancoDados | Transacao;

export interface Log {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

/** Log em JSON de uma linha (sem dados pessoais). */
export const logConsole: Log = {
  info: (o, m) => console.info(JSON.stringify({ nivel: 'info', msg: m, ...o, em: new Date().toISOString() })),
  warn: (o, m) => console.warn(JSON.stringify({ nivel: 'warn', msg: m, ...o, em: new Date().toISOString() })),
  error: (o, m) => console.error(JSON.stringify({ nivel: 'error', msg: m, ...o, em: new Date().toISOString() })),
};

export const logMudo: Log = { info: () => {}, warn: () => {}, error: () => {} };

const emExecucao = new Set<string>();

/** Trava simples: o mesmo job não roda duas vezes ao mesmo tempo. Devolve null se pulou. */
export async function comTrava<T>(nome: string, fn: () => Promise<T>, log: Log = logMudo): Promise<T | null> {
  if (emExecucao.has(nome)) {
    log.warn({ job: nome }, 'job ainda em execução; pulando esta rodada');
    return null;
  }
  emExecucao.add(nome);
  const inicio = Date.now();
  try {
    const r = await fn();
    log.info({ job: nome, ms: Date.now() - inicio, resultado: r }, 'job concluído');
    return r;
  } catch (e) {
    log.error({ job: nome, erro: (e as Error).message }, 'job falhou');
    return null;
  } finally {
    emExecucao.delete(nome);
  }
}

/**
 * D13: roda o job com a trava e grava a execução em `jobs_execucoes` (início, fim, ok,
 * resultado ou erro), para o painel /super/sistema. Um resultado `{ ok: false }` (backup)
 * conta como falha. Se a gravação falhar, o job roda mesmo assim.
 */
export async function executarRegistrado<T>(
  db: Db,
  nome: string,
  fn: () => Promise<T>,
  log: Log = logMudo,
  agora: () => Date = () => new Date(),
): Promise<T | null> {
  if (emExecucao.has(nome)) {
    log.warn({ job: nome }, 'job ainda em execução; pulando esta rodada');
    return null;
  }
  emExecucao.add(nome);
  const inicio = agora();
  let id: string | null = null;
  try {
    const [l] = await db.insert(schema.jobsExecucoes).values({ job: nome, iniciadoEm: inicio }).returning({ id: schema.jobsExecucoes.id });
    id = l?.id ?? null;
  } catch (e) {
    log.warn({ job: nome, erro: (e as Error).message }, 'não foi possível registrar a execução');
  }
  const fim = async (ok: boolean, resultado: unknown, erro: string | null) => {
    if (!id) return;
    try {
      const r = resultado && typeof resultado === 'object' ? (JSON.parse(JSON.stringify(resultado)) as Record<string, unknown>) : resultado === undefined ? null : { valor: resultado };
      await db.update(schema.jobsExecucoes).set({ terminadoEm: agora(), ok, resultado: r, erro }).where(eq(schema.jobsExecucoes.id, id));
    } catch {
      /* o registro é só informativo */
    }
  };
  try {
    const r = await fn();
    const falhou = !!r && typeof r === 'object' && (r as { ok?: unknown }).ok === false;
    await fim(!falhou, r, falhou ? String((r as { erro?: unknown }).erro ?? 'falhou') : null);
    log.info({ job: nome, ms: agora().getTime() - inicio.getTime(), resultado: r }, 'job concluído');
    return r;
  } catch (e) {
    const erro = (e as Error).message;
    await fim(false, null, erro.slice(0, 1000));
    log.error({ job: nome, erro }, 'job falhou');
    return null;
  } finally {
    emExecucao.delete(nome);
  }
}
