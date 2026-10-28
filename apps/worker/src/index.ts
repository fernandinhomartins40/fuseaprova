/**
 * Worker do Fuse Aprova: jobs agendados com node-cron no fuso America/Sao_Paulo.
 *   node dist/index.js            # agenda e fica rodando
 *   node dist/index.js <job>      # roda um job uma vez (ex.: fechar-liga) e sai
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cron from 'node-cron';
import { conectar, migrar } from '@fuse/db';
import { definirJobs, FUSO } from './agenda.js';
import { criarEnviadorSmtp, criarEnviadorWebPush } from './jobs/index.js';
import { logConsole } from './util.js';

const env = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(env)) process.loadEnvFile(env);
process.env.TZ ??= FUSO;

const conexao = conectar(process.env.DATABASE_URL, { max: 3 });
if (conexao.tipo === 'pglite') await migrar(conexao);
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const push =
  VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY
    ? criarEnviadorWebPush({ publica: VAPID_PUBLIC_KEY, privada: VAPID_PRIVATE_KEY, assunto: VAPID_SUBJECT || 'mailto:contato@localhost' })
    : null;
if (!push) logConsole.warn({}, 'VAPID não configurado: lembretes desligados');
// D13: e-mail da comunicação do superadmin (o mesmo SMTP do .env da API).
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const email = SMTP_HOST
  ? criarEnviadorSmtp({
      host: SMTP_HOST,
      porta: Number(SMTP_PORT) || 587,
      usuario: SMTP_USER ?? '',
      senha: SMTP_PASS ?? '',
      remetente: SMTP_FROM || 'Fuse Aprova <nao-responda@localhost>',
    })
  : null;

const jobs = definirJobs({
  db: conexao.db,
  push,
  log: logConsole,
  backupScript: process.env.BACKUP_SCRIPT ?? '/app/infra/backup/backup.sh',
  email,
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  backupDir: process.env.BACKUP_DIR,
  arquivosDir: process.env.ARQUIVOS_DIR,
  versao: process.env.APP_VERSION || process.env.DEPLOY_COMMIT || null,
});

const unico = process.argv[2];
if (unico) {
  const j = jobs.find((x) => x.nome === unico);
  if (!j) {
    console.error(`Job desconhecido: ${unico}. Jobs: ${jobs.map((x) => x.nome).join(', ')}`);
    process.exitCode = 1;
  } else await j.executar();
  await conexao.fechar();
} else {
  const tarefas = jobs.map((j) => cron.schedule(j.cron, () => void j.executar(), { timezone: FUSO, name: j.nome }));
  logConsole.info({ jobs: jobs.map((j) => `${j.nome} (${j.cron})`) }, 'worker iniciado');
  const encerrar = async () => {
    for (const t of tarefas) await t.stop();
    await conexao.fechar();
    process.exit(0);
  };
  process.on('SIGTERM', () => void encerrar());
  process.on('SIGINT', () => void encerrar());
}
