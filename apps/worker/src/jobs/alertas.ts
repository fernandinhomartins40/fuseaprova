/**
 * S-09/A-07: alertas por e-mail para os superadmins ativos, a cada 15 min, com o SMTP do .env.
 *
 * Dispara quando: um job falhou na última execução; um job está atrasado pela agenda; o último
 * backup bem-sucedido passou de 26 h (ou o tar dos arquivos falhou); houve rajada de 5xx na API
 * (nos últimos 15 min); o disco de ARQUIVOS_DIR está abaixo do limite. Cada alerta tem um id e não
 * se repete antes de 6 h (estado em `estado_sistema`, chave `alerta:<id>`): sobrevive a reinício.
 *
 * Limite conhecido: o worker parado não consegue alertar sobre si mesmo — isso aparece no
 * /super/sistema (sinal de vida).
 */
import { readFile, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { emailAlertaOperacao, idadeEmHoras, lerUltimoBackup, situacaoDoJob } from '@fuse/shared';
import { JOBS_WORKER, LIMITES_SISTEMA } from '@fuse/shared/api';
import type { Db, Log } from '../util.js';
import type { EnviadorEmail } from './comunicacoes.js';

const { usuarios, estadoSistema } = schema;

export const CHAVE_SINAL_WORKER = 'worker:sinal';
/** Jobs que só registram execução quando há trabalho: o atraso conta pelo sinal de vida. */
const SO_COM_TRABALHO = new Set(['enviar-comunicacoes']);

export interface Alerta {
  id: string;
  texto: string;
}

export interface ResultadoAlertas {
  problemas: number;
  enviados: number;
  repetidos: number;
  destinatarios: number;
  ok?: false;
  erro?: string;
}

const linhas = <T>(res: unknown): T[] => (Array.isArray(res) ? (res as T[]) : ((res as { rows?: T[] }).rows ?? []));
const iso = (d: Date) => `${d.toISOString()}`;

/** Grava o sinal de vida do worker (uma linha, atualizada a cada minuto). */
export async function registrarSinal(db: Db, agora: Date, versao: string | null): Promise<void> {
  await db
    .insert(estadoSistema)
    .values({ chave: CHAVE_SINAL_WORKER, valor: { versao }, atualizadoEm: agora })
    .onConflictDoUpdate({ target: estadoSistema.chave, set: { valor: { versao }, atualizadoEm: agora } });
}

/** Os problemas de agora (sem olhar se já foram avisados). */
export async function coletarAlertas(db: Db, d: { backupDir?: string | undefined; arquivosDir?: string | undefined }, agora: Date): Promise<Alerta[]> {
  const alertas: Alerta[] = [];
  const ult = linhas<{ job: string; iniciado_em: Date | string; ok: boolean | null; erro: string | null }>(
    await db.execute(sql`select distinct on (job) job, iniciado_em, ok, erro from jobs_execucoes order by job, iniciado_em desc`),
  );
  const [sinal] = await db.select().from(estadoSistema).where(eq(estadoSistema.chave, CHAVE_SINAL_WORKER));
  for (const j of JOBS_WORKER) {
    if (j.nome === 'alertas') continue;
    const u = ult.find((x) => x.job === j.nome);
    const iniciado = u ? new Date(u.iniciado_em) : null;
    const ref = SO_COM_TRABALHO.has(j.nome) && sinal && (!iniciado || sinal.atualizadoEm > iniciado) ? sinal.atualizadoEm : iniciado;
    if (u?.ok === false) alertas.push({ id: `job-falhou:${j.nome}`, texto: `O job "${j.titulo}" falhou: ${(u.erro ?? 'sem detalhe').slice(0, 200)}` });
    else if (situacaoDoJob(ref, j.cron, agora).atrasado) alertas.push({ id: `job-atrasado:${j.nome}`, texto: `O job "${j.titulo}" está atrasado (última execução em ${iso(ref!)}).` });
  }

  if (d.backupDir) {
    let texto: string | null = null;
    try {
      texto = await readFile(join(d.backupDir, 'ULTIMO_BACKUP'), 'utf8');
    } catch {
      /* sem registro */
    }
    const ub = texto ? lerUltimoBackup(texto) : null;
    if (!ub?.em) alertas.push({ id: 'backup-sem-registro', texto: `Não há registro de backup bem-sucedido (${d.backupDir}/ULTIMO_BACKUP).` });
    else {
      const h = idadeEmHoras(ub.em, agora);
      if (h > LIMITES_SISTEMA.backupHoras) alertas.push({ id: 'backup-atrasado', texto: `O último backup bem-sucedido tem ${Math.round(h)} h (limite: ${LIMITES_SISTEMA.backupHoras} h).` });
      if (ub.arquivosOk === false) alertas.push({ id: 'backup-arquivos', texto: 'O último backup salvou o banco, mas falhou ao compactar os arquivos enviados (uploads).' });
    }
  }

  const [e] = linhas<{ n: number }>(
    await db.execute(sql`select count(*)::int n from erros_api where criado_em >= ${new Date(agora.getTime() - 15 * 60_000).toISOString()}::timestamptz`),
  );
  const n5xx = Number(e?.n ?? 0);
  if (n5xx >= LIMITES_SISTEMA.rajada5xx) alertas.push({ id: 'rajada-5xx', texto: `A API respondeu ${n5xx} erros 5xx nos últimos 15 minutos.` });

  if (d.arquivosDir) {
    try {
      const s = await statfs(d.arquivosDir);
      const total = Number(s.blocks) * Number(s.bsize);
      const pct = total ? (Number(s.bavail) * Number(s.bsize) * 100) / total : 100;
      if (pct < LIMITES_SISTEMA.discoPercentualMinimo) alertas.push({ id: 'disco', texto: `O disco de ${d.arquivosDir} está com ${pct.toFixed(1)}% livre.` });
    } catch {
      /* sem como medir: o painel mostra */
    }
  }
  return alertas;
}

/**
 * Coleta os problemas, filtra os já avisados há menos de 6 h e manda um e-mail para cada
 * superadmin ativo. Só marca como avisado o que saiu.
 */
export async function verificarAlertas(
  db: Db,
  d: { email: EnviadorEmail | null; appUrl: string; backupDir?: string | undefined; arquivosDir?: string | undefined; log?: Log },
  agora: Date,
): Promise<ResultadoAlertas> {
  const todos = await coletarAlertas(db, d, agora);
  const r: ResultadoAlertas = { problemas: todos.length, enviados: 0, repetidos: 0, destinatarios: 0 };
  if (!todos.length) return r;
  const chaves = todos.map((a) => `alerta:${a.id}`);
  const ja = await db.select().from(estadoSistema).where(inArray(estadoSistema.chave, chaves));
  const limite = agora.getTime() - LIMITES_SISTEMA.repetirAlertaHoras * 3_600_000;
  const novos = todos.filter((a) => {
    const l = ja.find((x) => x.chave === `alerta:${a.id}`);
    return !l || l.atualizadoEm.getTime() <= limite;
  });
  r.repetidos = todos.length - novos.length;
  if (!novos.length) return r;
  if (!d.email) return { ...r, ok: false, erro: `SMTP não configurado: ${novos.length} alerta(s) sem envio.` };
  const supers = await db
    .select({ nome: usuarios.nome, email: usuarios.email })
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'superadmin'), isNull(usuarios.excluidoEm), isNull(usuarios.bloqueadoEm)));
  r.destinatarios = supers.length;
  if (!supers.length) return { ...r, ok: false, erro: 'Nenhum superadmin ativo para receber os alertas.' };
  const falhas: string[] = [];
  for (const s of supers) {
    const m = emailAlertaOperacao({ nome: s.nome, problemas: novos.map((a) => a.texto), painel: `${d.appUrl}/super/sistema` });
    try {
      await d.email.enviar({ para: s.email, ...m });
    } catch (e) {
      falhas.push((e as Error).message.slice(0, 200));
    }
  }
  if (falhas.length === supers.length) return { ...r, ok: false, erro: `Falha do SMTP ao enviar os alertas: ${falhas[0]}` };
  for (const a of novos) {
    await db
      .insert(estadoSistema)
      .values({ chave: `alerta:${a.id}`, valor: { texto: a.texto }, atualizadoEm: agora })
      .onConflictDoUpdate({ target: estadoSistema.chave, set: { valor: { texto: a.texto }, atualizadoEm: agora } });
  }
  r.enviados = novos.length;
  d.log?.info({ alertas: novos.map((a) => a.id), destinatarios: supers.length }, 'alertas enviados');
  return r;
}
