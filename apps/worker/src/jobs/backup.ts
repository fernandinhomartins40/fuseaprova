/**
 * Backup diário 03:30 (PRD 8.7): executa $BACKUP_SCRIPT (infra/backup/backup.sh, que faz o
 * pg_dump e a rotação de 14 diários e 8 semanais) e registra a falha no log.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { Log } from '../util.js';

export interface ResultadoBackup {
  ok: boolean;
  codigo: number | null;
  ms: number;
  erro?: string;
}

export function executarBackup(
  script: string | undefined,
  log: Log,
  opcoes: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<ResultadoBackup> {
  const inicio = Date.now();
  if (!script || !existsSync(script)) {
    const erro = `Script de backup não encontrado: ${script ?? '(BACKUP_SCRIPT vazio)'}`;
    log.error({ job: 'backup' }, erro);
    return Promise.resolve({ ok: false, codigo: null, ms: 0, erro });
  }
  return new Promise((resolve) => {
    // bash, não sh: o backup.sh usa `set -o pipefail`, mapfile e [[ ]], que o dash (sh do Debian)
    // recusa — o backup diário falhava sempre em produção (auditoria PIE R5-01).
    const filho = spawn(script.endsWith('.sh') ? 'bash' : script, script.endsWith('.sh') ? [script] : [], {
      env: { ...process.env, ...opcoes.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opcoes.timeoutMs ?? 60 * 60_000,
    });
    let saida = '';
    const guardar = (b: Buffer) => {
      saida = (saida + b.toString()).slice(-4000);
    };
    filho.stdout.on('data', guardar);
    filho.stderr.on('data', guardar);
    filho.on('error', (e) => {
      log.error({ job: 'backup', erro: e.message }, 'falha ao executar o backup');
      resolve({ ok: false, codigo: null, ms: Date.now() - inicio, erro: e.message });
    });
    filho.on('close', (codigo) => {
      const ms = Date.now() - inicio;
      if (codigo === 0) {
        log.info({ job: 'backup', ms }, 'backup concluído');
        resolve({ ok: true, codigo, ms });
      } else {
        log.error({ job: 'backup', codigo, saida: saida.slice(-1000) }, 'backup falhou');
        // 3 = o dump do banco foi salvo, mas o tar dos arquivos (uploads) falhou (S-09, R5-11).
        const erro = codigo === 3 ? 'o banco foi salvo, mas a cópia dos arquivos (uploads) falhou' : `código de saída ${codigo}`;
        resolve({ ok: false, codigo, ms, erro });
      }
    });
  });
}
