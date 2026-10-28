/**
 * Regras puras da operação (S-09): quando um job está atrasado pela agenda, a idade do backup e
 * a leitura do ULTIMO_BACKUP. Usadas pela API (/super/sistema) e pelo worker (job de alertas),
 * para os dois dizerem a mesma coisa.
 */
import { MS_HORA, MS_MINUTO } from './datas.js';

/**
 * Maior intervalo esperado entre duas execuções de um cron de 5 campos (minuto hora …). Cobre os
 * formatos da agenda do worker: `*` (todo minuto), `*\/n` (a cada n min), minuto fixo com hora
 * `*` (de hora em hora) e hora fixa (diário). Qualquer outro formato conta como diário.
 */
export function intervaloDoCron(cron: string): number {
  const [minuto = '', hora = ''] = cron.trim().split(/\s+/);
  if (hora === '*') {
    if (minuto === '*') return MS_MINUTO;
    const passo = /^\*\/(\d+)$/.exec(minuto);
    if (passo) return Number(passo[1]) * MS_MINUTO;
    return MS_HORA;
  }
  return 24 * MS_HORA;
}

/** Folga sobre o intervalo antes de chamar de atrasado: o próprio intervalo, entre 4 min e 2 h. */
export function folgaDoIntervalo(intervaloMs: number): number {
  return Math.min(Math.max(intervaloMs, 4 * MS_MINUTO), 2 * MS_HORA);
}

/**
 * Atrasado = a última execução (início) é mais velha que o intervalo da agenda mais a folga.
 * Sem execução nenhuma não é "atrasado" (é "nunca rodou"): `esperadaAte` fica null.
 */
export function situacaoDoJob(
  ultimaEm: Date | null,
  cron: string,
  agora: Date,
): { atrasado: boolean; esperadaAte: Date | null } {
  if (!ultimaEm) return { atrasado: false, esperadaAte: null };
  const intervalo = intervaloDoCron(cron);
  const esperadaAte = new Date(ultimaEm.getTime() + intervalo + folgaDoIntervalo(intervalo));
  return { atrasado: agora.getTime() > esperadaAte.getTime(), esperadaAte };
}

/** Horas (com 1 casa) entre `de` e `agora`. */
export function idadeEmHoras(de: Date, agora: Date): number {
  return Math.round(((agora.getTime() - de.getTime()) / MS_HORA) * 10) / 10;
}

export interface UltimoBackup {
  /** Quando o último backup bem-sucedido terminou. */
  em: Date | null;
  /** Caminho do dump. */
  caminho: string | null;
  /** `arquivos=ok|falhou` (o tar dos uploads); null sem a marca ou com `arquivos=ausente`. */
  arquivosOk: boolean | null;
}

/**
 * Lê o ULTIMO_BACKUP gravado pelo infra/backup/backup.sh: `<data ISO> <caminho> [arquivos=ok]`.
 * Aceita o fuso com ou sem dois-pontos (`-0300` ou `-03:00`).
 */
export function lerUltimoBackup(texto: string): UltimoBackup {
  const [data = '', caminho, ...resto] = texto.trim().split(/\s+/);
  const iso = data.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const em =
    /^\d{4}-\d{2}-\d{2}T/.test(iso) && !Number.isNaN(new Date(iso).getTime())
      ? new Date(iso)
      : null;
  const marca = resto.find((r) => r.startsWith('arquivos='));
  return {
    em,
    caminho: caminho ?? null,
    arquivosOk: marca === 'arquivos=ok' ? true : marca === 'arquivos=falhou' ? false : null,
  };
}
