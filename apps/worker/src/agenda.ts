/**
 * Agendamento dos jobs (PRD 8.7 + D13), separado das funções para que elas sejam testáveis.
 * Todos os horários em America/Sao_Paulo. Os horários vêm de `JOBS_WORKER` (@fuse/shared),
 * a mesma lista que o painel /super/sistema mostra. Cada execução fica em `jobs_execucoes`.
 */
import { lt } from 'drizzle-orm';
import { schema, type BancoDados } from '@fuse/db';
import { semanaSP } from '@fuse/shared';
import { JOBS_WORKER, type NomeJobWorker } from '@fuse/shared/api';
import {
  enviarComunicacoes,
  enviarLembretes,
  executarBackup,
  expirarPix,
  fecharLiga,
  limparSessoes,
  resetarVidas,
  verificarOfensivas,
  type EnviadorEmail,
  type EnviadorPush,
} from './jobs/index.js';
import { executarRegistrado, type Log } from './util.js';

export const FUSO = 'America/Sao_Paulo';
/** Execuções guardadas por 30 dias (a fila de comunicação roda a cada minuto). */
const DIAS_EXECUCOES = 30;

export interface DependenciasWorker {
  db: BancoDados;
  push: EnviadorPush | null;
  log: Log;
  agora?: () => Date;
  backupScript?: string | undefined;
  /** D13: e-mail da comunicação (null sem SMTP). */
  email?: EnviadorEmail | null;
  appUrl?: string;
}

export interface DefinicaoJob {
  nome: string;
  /** Expressão cron (minuto hora dia mês dia-da-semana), no fuso de São Paulo. */
  cron: string;
  executar: () => Promise<unknown>;
}

const CRON = Object.fromEntries(JOBS_WORKER.map((j) => [j.nome, j.cron])) as Record<NomeJobWorker, string>;

export function definirJobs(d: DependenciasWorker): DefinicaoJob[] {
  const agora = d.agora ?? (() => new Date());
  const job = (nome: NomeJobWorker, fn: () => Promise<unknown>): DefinicaoJob => ({
    nome,
    cron: CRON[nome],
    executar: () => executarRegistrado(d.db, nome, fn, d.log, agora),
  });
  return [
    job('fechar-liga', () => fecharLiga(d.db, agora(), semanaSP(agora()))),
    job('resetar-vidas', () => resetarVidas(d.db, agora())),
    job('verificar-ofensivas', () => verificarOfensivas(d.db, agora())),
    job('enviar-lembretes', async () =>
      d.push ? enviarLembretes(d.db, d.push, agora(), d.log) : { desligado: 'VAPID não configurado' },
    ),
    job('expirar-pix', () => expirarPix(d.db, agora())),
    job('limpar-sessoes', async () => {
      const r = await limparSessoes(d.db, agora());
      const limite = new Date(agora().getTime() - DIAS_EXECUCOES * 86_400_000);
      const ex = await d.db.delete(schema.jobsExecucoes).where(lt(schema.jobsExecucoes.iniciadoEm, limite)).returning({ id: schema.jobsExecucoes.id });
      return { ...r, execucoes: ex.length };
    }),
    job('backup', () => executarBackup(d.backupScript, d.log)),
    job('enviar-comunicacoes', () =>
      enviarComunicacoes(d.db, { email: d.email ?? null, push: d.push, appUrl: d.appUrl ?? 'http://localhost:5173', log: d.log }, agora()),
    ),
  ];
}
