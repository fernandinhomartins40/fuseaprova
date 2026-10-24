/**
 * Agendamento dos jobs (PRD 8.7), separado das funções para que elas sejam testáveis.
 * Todos os horários em America/Sao_Paulo.
 */
import type { BancoDados } from '@fuse/db';
import { semanaSP } from '@fuse/shared';
import {
  enviarLembretes,
  executarBackup,
  expirarPix,
  fecharLiga,
  limparSessoes,
  resetarVidas,
  verificarOfensivas,
  type EnviadorPush,
} from './jobs/index.js';
import { comTrava, type Log } from './util.js';

export const FUSO = 'America/Sao_Paulo';

export interface DependenciasWorker {
  db: BancoDados;
  push: EnviadorPush | null;
  log: Log;
  agora?: () => Date;
  backupScript?: string | undefined;
}

export interface DefinicaoJob {
  nome: string;
  /** Expressão cron (minuto hora dia mês dia-da-semana), no fuso de São Paulo. */
  cron: string;
  executar: () => Promise<unknown>;
}

export function definirJobs(d: DependenciasWorker): DefinicaoJob[] {
  const agora = d.agora ?? (() => new Date());
  const job = (nome: string, cron: string, fn: () => Promise<unknown>): DefinicaoJob => ({
    nome,
    cron,
    executar: () => comTrava(nome, fn, d.log),
  });
  return [
    job('fechar-liga', '59 23 * * 0', () => fecharLiga(d.db, agora(), semanaSP(agora()))),
    job('resetar-vidas', '0 0 * * *', () => resetarVidas(d.db, agora())),
    job('verificar-ofensivas', '5 0 * * *', () => verificarOfensivas(d.db, agora())),
    job('enviar-lembretes', '*/5 * * * *', async () =>
      d.push ? enviarLembretes(d.db, d.push, agora(), d.log) : { desligado: 'VAPID não configurado' },
    ),
    job('expirar-pix', '*/10 * * * *', () => expirarPix(d.db, agora())),
    job('limpar-sessoes', '0 3 * * *', () => limparSessoes(d.db, agora())),
    job('backup', '30 3 * * *', () => executarBackup(d.backupScript, d.log)),
  ];
}
