/**
 * /super/sistema, /super/configuracoes, /super/auditoria e /config/publica (D13).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, count, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { JOBS_WORKER, type ExecucaoJob } from '@fuse/shared/api';
import type { Registrador } from '../../http/registrar.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { configPublica, lerConfiguracoes, salvarConfiguracoes } from '../../servicos/configuracoes.js';
import { consultar, contar, iso, isoOuNull, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { ambienteAsaas } from './asaas.js';
import { auditarSuper, periodo } from './comum.js';

const { jobsExecucoes, usuarios, auditoria } = schema;
const INICIADA_EM = new Date();

async function seguro<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function jobs(db: Db, agora: Date): Promise<ExecucaoJob[]> {
  const out: ExecucaoJob[] = [];
  const conhecidos: { nome: string; cron: string | null }[] = JOBS_WORKER.map((j) => ({ nome: j.nome, cron: j.cron }));
  const extras = await db.selectDistinct({ job: jobsExecucoes.job }).from(jobsExecucoes);
  for (const e of extras) if (!conhecidos.some((c) => c.nome === e.job)) conhecidos.push({ nome: e.job, cron: null });
  for (const j of conhecidos) {
    const [ultima] = await db.select().from(jobsExecucoes).where(eq(jobsExecucoes.job, j.nome)).orderBy(desc(jobsExecucoes.iniciadoEm)).limit(1);
    const [sucesso] = await db
      .select({ em: jobsExecucoes.iniciadoEm })
      .from(jobsExecucoes)
      .where(and(eq(jobsExecucoes.job, j.nome), eq(jobsExecucoes.ok, true)))
      .orderBy(desc(jobsExecucoes.iniciadoEm))
      .limit(1);
    const [falhas] = await db
      .select({ n: count() })
      .from(jobsExecucoes)
      .where(and(eq(jobsExecucoes.job, j.nome), eq(jobsExecucoes.ok, false), gte(jobsExecucoes.iniciadoEm, new Date(agora.getTime() - 86_400_000))));
    out.push({
      job: j.nome,
      cron: j.cron,
      ultima: ultima
        ? {
            iniciadoEm: iso(ultima.iniciadoEm),
            terminadoEm: isoOuNull(ultima.terminadoEm),
            ok: ultima.ok,
            erro: ultima.erro,
            ms: ultima.terminadoEm ? ultima.terminadoEm.getTime() - ultima.iniciadoEm.getTime() : null,
          }
        : null,
      ultimoSucessoEm: isoOuNull(sucesso?.em),
      falhas24h: contar(falhas?.n),
    });
  }
  return out;
}

export function rotasSuperSistema(r: Registrador): void {
  r.rota('configPublica', async ({ deps }) => {
    const { valores } = await lerConfiguracoes(deps.db, deps.config);
    return configPublica(valores, deps.config);
  });

  r.rota('superSistema', async ({ deps, agora }) => {
    const { db, config } = deps;
    const [versao] = (await seguro(() => consultar<{ v: string }>(db, sql`select version() v`))) ?? [];
    const [tam] = (await seguro(() => consultar<{ b: string | number }>(db, sql`select pg_database_size(current_database()) b`))) ?? [];
    const [con] =
      (await seguro(() =>
        consultar<{ n: number; max: string }>(db, sql`select count(*)::int n, current_setting('max_connections') max from pg_stat_activity where datname = current_database()`),
      )) ?? [];
    const listaJobs = await jobs(db, agora);
    const backupJob = listaJobs.find((j) => j.job === 'backup');
    let ultimoBackup: string | null = null;
    let aviso: string | null = null;
    try {
      ultimoBackup = (await readFile(join(config.backupDir, 'ULTIMO_BACKUP'), 'utf8')).trim() || null;
    } catch (e) {
      const cod = (e as NodeJS.ErrnoException).code;
      aviso =
        cod === 'EACCES'
          ? 'Sem permissão para ler ULTIMO_BACKUP (o arquivo foi gravado pelo root no host).'
          : `ULTIMO_BACKUP não está visível em ${config.backupDir}. Monte /root/fuseaprova/backups na api (somente leitura).`;
    }
    const mem = process.memoryUsage();
    return {
      api: {
        versao: config.versao,
        imagem: config.imagem,
        ambiente: config.ambiente,
        node: process.version,
        iniciadaEm: iso(INICIADA_EM),
        uptimeS: Math.round(process.uptime()),
        memoriaMb: Math.round(mem.rss / 1024 / 1024),
      },
      banco: {
        ok: !!versao,
        versao: versao?.v?.split(' ').slice(0, 2).join(' ') ?? null,
        tamanhoBytes: tam ? Number(tam.b) : null,
        conexoes: con ? contar(con.n) : null,
        maxConexoes: con ? Number(con.max) : null,
      },
      worker: { jobs: listaJobs },
      backup: {
        ultimo: ultimoBackup,
        ultimoJob: backupJob?.ultima?.iniciadoEm ?? null,
        ultimoJobOk: backupJob?.ultima?.ok ?? null,
        fonte: `${config.backupDir}/ULTIMO_BACKUP e a tabela jobs_execucoes`,
        aviso,
      },
      smtp: { configurado: !!config.smtp.host, host: config.smtp.host || null },
      asaas: { chaveConfigurada: !!config.asaas.apiKey, ambiente: ambienteAsaas(config.asaas.baseUrl) },
      push: { configurado: !!(config.vapid.publica && config.vapid.privada) },
      precoCentavos: config.precoCentavos,
      geradoEm: iso(agora),
    };
  });

  const respostaConfig = async (db: Db, config: Parameters<typeof lerConfiguracoes>[1]) => {
    const l = await lerConfiguracoes(db, config, { semCache: true });
    const [autor] = l.atualizadoPor ? await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, l.atualizadoPor)) : [];
    return { valores: l.valores, atualizadoEm: isoOuNull(l.atualizadoEm), atualizadoPor: autor ?? null, precoCentavos: config.precoCentavos };
  };

  r.rota('superConfiguracoes', async ({ deps }) => respostaConfig(deps.db, deps.config));

  r.rota('superConfiguracoesSalvar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const antes = (await lerConfiguracoes(deps.db, deps.config, { semCache: true })).valores;
    const { motivo, confirmacao: _c, ...valores } = corpo;
    await salvarConfiguracoes(deps.db, valores, usuario.id, agora);
    await auditarSuper(ctx, 'config.salvar', 'configuracoes:produto', { motivo, antes: { ...antes }, depois: { ...valores } });
    return respostaConfig(deps.db, deps.config);
  });

  r.rota('superAuditoria', async ({ query, deps, agora }) => {
    const per = query.de || query.ate ? periodo(query, agora, 3650) : null;
    const onde = and(
      query.acao ? eq(auditoria.acao, query.acao) : undefined,
      query.adminId ? eq(auditoria.adminId, query.adminId) : undefined,
      query.alvo ? ilike(auditoria.alvo, `%${query.alvo}%`) : undefined,
      per ? gte(auditoria.criadoEm, per.inicio) : undefined,
      per ? lt(auditoria.criadoEm, per.fim) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(auditoria).where(onde);
    const lista = await deps.db
      .select({ a: auditoria, nome: usuarios.nome })
      .from(auditoria)
      .leftJoin(usuarios, eq(usuarios.id, auditoria.adminId))
      .where(onde)
      .orderBy(desc(auditoria.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return {
      itens: lista.map((x) => ({
        id: x.a.id,
        admin: x.a.adminId ? { id: x.a.adminId, nome: x.nome ?? '—' } : null,
        acao: x.a.acao,
        alvo: x.a.alvo,
        motivo: x.a.motivo,
        ip: x.a.ip,
        antes: x.a.antes ?? null,
        depois: x.a.depois ?? null,
        detalhes: x.a.detalhes ?? null,
        criadoEm: iso(x.a.criadoEm),
      })),
      total: contar(t?.n),
      pagina: query.pagina,
      porPagina: query.porPagina,
    };
  });
}
