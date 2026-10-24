import type { BancoDados, Transacao } from '@fuse/db';

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
