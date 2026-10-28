/**
 * Agendamento dos jobs (PRD 8.7 + D13), separado das funções para que elas sejam testáveis.
 * Todos os horários em America/Sao_Paulo. Os horários vêm de `JOBS_WORKER` (@fuse/shared),
 * a mesma lista que o painel /super/sistema mostra. Cada execução fica em `jobs_execucoes`.
 */
import { lt } from 'drizzle-orm';
import { schema, type BancoDados } from '@fuse/db';
import { JOBS_WORKER, LIMITES_SISTEMA, type NomeJobWorker } from '@fuse/shared/api';
import {
  enviarComunicacoes,
  registrarSinal,
  temComunicacaoNaFila,
  verificarAlertas,
  enviarLembretes,
  executarBackup,
  expirarPix,
  fecharLiga,
  semanaAFechar,
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
  /** S-09: pasta dos backups (ULTIMO_BACKUP) e dos arquivos (disco), para os alertas. */
  backupDir?: string | undefined;
  arquivosDir?: string | undefined;
  /** Versão da imagem do worker (APP_VERSION), mostrada no /super/sistema. */
  versao?: string | null;
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
    job('fechar-liga', () => fecharLiga(d.db, agora(), semanaAFechar(agora()))),
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
      // Lote 2: 5xx guardados por LIMITES_SISTEMA.retencaoErrosDias e baldes de limite vencidos.
      const corteErros = new Date(agora().getTime() - LIMITES_SISTEMA.retencaoErrosDias * 86_400_000);
      const er = await d.db.delete(schema.errosApi).where(lt(schema.errosApi.criadoEm, corteErros)).returning({ id: schema.errosApi.id });
      const li = await d.db.delete(schema.limitesContagem).where(lt(schema.limitesContagem.janelaFim, agora())).returning({ c: schema.limitesContagem.chave });
      return { ...r, execucoes: ex.length, errosApi: er.length, limites: li.length };
    }),
    job('backup', () => executarBackup(d.backupScript, d.log)),
    {
      // S-26: o sinal de vida vai a cada minuto (o painel detecta o worker parado), mas a execução
      // só é registrada em jobs_execucoes quando há comunicação na fila (antes: 76% da tabela).
      nome: 'enviar-comunicacoes',
      cron: CRON['enviar-comunicacoes'],
      executar: async () => {
        try {
          await registrarSinal(d.db, agora(), d.versao ?? null);
        } catch (e) {
          d.log.warn({ erro: (e as Error).message }, 'não foi possível gravar o sinal do worker');
        }
        if (!(await temComunicacaoNaFila(d.db))) return null;
        return executarRegistrado(
          d.db,
          'enviar-comunicacoes',
          () => enviarComunicacoes(d.db, { email: d.email ?? null, push: d.push, appUrl: d.appUrl ?? 'http://localhost:5173', log: d.log }, agora()),
          d.log,
          agora,
        );
      },
    },
    job('alertas', () =>
      verificarAlertas(
        d.db,
        { email: d.email ?? null, appUrl: d.appUrl ?? 'http://localhost:5173', backupDir: d.backupDir, arquivosDir: d.arquivosDir, log: d.log },
        agora(),
      ),
    ),
  ];
}
