/**
 * /super/sistema, /super/configuracoes, /super/auditoria e /config/publica (D13).
 */
import { readFile, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { schema } from '@fuse/db';
import { idadeEmHoras, lerUltimoBackup, situacaoDoJob } from '@fuse/shared';
import { JOBS_WORKER, LIMITES_SISTEMA, type ExecucaoJob, type SistemaResposta } from '@fuse/shared/api';
import type { Config } from '../../config.js';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { configPublica, lerConfiguracoes, salvarConfiguracoes } from '../../servicos/configuracoes.js';
import { lerPrecos } from '../../servicos/precos.js';
import { comPrazo, consultar, contar, contem, dataSql, iso, isoOuNull, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { ambienteAsaas, testarConexaoAsaas } from './asaas.js';
import { auditarSuper, periodo } from './comum.js';

const { usuarios, auditoria, estadoSistema } = schema;
const INICIADA_EM = new Date();

async function seguro<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const dataOuNull = (v: Date | string | null | undefined): Date | null => (v ? new Date(v) : null);

/** Sinal de vida do worker (gravado a cada minuto pelo próprio worker, S-09). */
export const CHAVE_SINAL_WORKER = 'worker:sinal';

/**
 * Jobs que só registram execução quando há trabalho (S-26): o "atraso" deles conta a partir do
 * último sinal de vida do worker, que roda na mesma agenda.
 */
export const JOBS_SO_COM_TRABALHO: ReadonlySet<string> = new Set(['enviar-comunicacoes']);

interface LinhaJob {
  job: string;
  iniciado_em: Date | string;
  terminado_em: Date | string | null;
  ok: boolean | null;
  erro: string | null;
  ultimo_sucesso: Date | string | null;
  falhas24h: number;
}

/**
 * S-09/S-26: a situação de cada job em 1 consulta (antes eram 3 por job, 29 no total). Atrasado =
 * a última execução passou do intervalo da agenda (`situacaoDoJob`, regra do @fuse/shared).
 */
export async function jobs(db: Db, agora: Date, sinalEm: Date | null): Promise<ExecucaoJob[]> {
  const linhas = await consultar<LinhaJob>(
    db,
    sql`with ult as (
          select distinct on (job) job, iniciado_em, terminado_em, ok, erro
          from jobs_execucoes order by job, iniciado_em desc
        ), agg as (
          select job, max(iniciado_em) filter (where ok) ultimo_sucesso,
                 (count(*) filter (where ok = false and iniciado_em >= ${dataSql(new Date(agora.getTime() - 86_400_000))}))::int falhas24h
          from jobs_execucoes group by job
        )
        select ult.*, agg.ultimo_sucesso, agg.falhas24h from ult join agg using (job)`,
  );
  const porJob = new Map(linhas.map((l) => [l.job, l]));
  const conhecidos: { nome: string; titulo: string; descricao: string | null; cron: string | null }[] = JOBS_WORKER.map((j) => ({
    nome: j.nome,
    titulo: j.titulo,
    descricao: j.descricao,
    cron: j.cron,
  }));
  for (const l of linhas) if (!conhecidos.some((c) => c.nome === l.job)) conhecidos.push({ nome: l.job, titulo: l.job, descricao: null, cron: null });
  return conhecidos.map((j) => {
    const u = porJob.get(j.nome);
    const iniciado = dataOuNull(u?.iniciado_em);
    const terminado = dataOuNull(u?.terminado_em);
    const ref = JOBS_SO_COM_TRABALHO.has(j.nome) && sinalEm && (!iniciado || sinalEm > iniciado) ? sinalEm : iniciado;
    const sit = j.cron ? situacaoDoJob(ref, j.cron, agora) : { atrasado: false, esperadaAte: null };
    const estado: ExecucaoJob['estado'] = !ref ? 'nunca_rodou' : u?.ok === false ? 'falhou' : sit.atrasado ? 'atrasado' : 'ok';
    return {
      job: j.nome,
      nome: j.titulo,
      descricao: j.descricao,
      cron: j.cron,
      estado,
      atrasado: sit.atrasado,
      esperadaAte: isoOuNull(sit.esperadaAte),
      ultima:
        u && iniciado
          ? {
              iniciadoEm: iso(iniciado),
              terminadoEm: isoOuNull(terminado),
              ok: u.ok,
              erro: u.erro,
              ms: terminado ? terminado.getTime() - iniciado.getTime() : null,
            }
          : null,
      ultimoSucessoEm: isoOuNull(dataOuNull(u?.ultimo_sucesso)),
      falhas24h: contar(u?.falhas24h),
    };
  });
}

/* --------------------------------------------- testes reais com cache curto */

const CACHE_TESTE_MS = 5 * 60_000;
type Teste = { estado: 'ok' | 'falhou'; mensagem: string; em: Date; ate: number };
const testesSmtp = new Map<string, Teste>();
const testesAsaas = new WeakMap<object, Teste>();

/**
 * S-09: `verify()` do nodemailer (conecta e autentica, sem enviar e-mail), com prazo de 5 s e
 * cache de 5 min: o polling da tela não abre uma conexão SMTP por minuto.
 */
export async function testarSmtp(smtp: Config['smtp'], agora: Date): Promise<Teste> {
  const chave = `${smtp.host}:${smtp.porta}:${smtp.usuario}`;
  const c = testesSmtp.get(chave);
  if (c && c.ate > Date.now()) return c;
  const t = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.porta === 465,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.senha } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
  let r: Teste;
  try {
    await comPrazo(t.verify(), 6000, 'O servidor SMTP não respondeu em 6 s.');
    r = { estado: 'ok', mensagem: 'Conectou e autenticou no SMTP (teste sem enviar e-mail).', em: agora, ate: Date.now() + CACHE_TESTE_MS };
  } catch (e) {
    r = { estado: 'falhou', mensagem: `O SMTP falhou: ${(e as Error).message.slice(0, 160)}`, em: agora, ate: Date.now() + CACHE_TESTE_MS };
  } finally {
    t.close();
  }
  testesSmtp.set(chave, r);
  return r;
}

async function testarAsaasComCache(deps: Deps, agora: Date): Promise<Teste> {
  const c = testesAsaas.get(deps.asaas);
  if (c && c.ate > Date.now()) return c;
  const t = await testarConexaoAsaas(deps, 5000);
  const r: Teste = { estado: t.ok ? 'ok' : 'falhou', mensagem: t.mensagem, em: agora, ate: Date.now() + CACHE_TESTE_MS };
  testesAsaas.set(deps.asaas, r);
  return r;
}

/** S-09: espaço livre no disco de ARQUIVOS_DIR (o mesmo dos backups na VPS). */
async function disco(caminho: string): Promise<SistemaResposta['disco']> {
  try {
    const s = await statfs(caminho);
    const total = Number(s.blocks) * Number(s.bsize);
    const livre = Number(s.bavail) * Number(s.bsize);
    if (!total) return null;
    const pct = Math.round((livre / total) * 1000) / 10;
    return {
      caminho,
      livreBytes: livre,
      totalBytes: total,
      percentualLivre: pct,
      estado: pct < 3 ? 'falhou' : pct < LIMITES_SISTEMA.discoPercentualMinimo ? 'atencao' : 'ok',
    };
  } catch {
    return null;
  }
}

const fmtHoras = (h: number) => (h >= 48 ? `${Math.floor(h / 24)} dias` : `${Math.round(h)} h`);

export function rotasSuperSistema(r: Registrador): void {
  r.rota('configPublica', async ({ deps }) => {
    const [{ valores }, precos] = await Promise.all([lerConfiguracoes(deps.db, deps.config), lerPrecos(deps.db, deps.config)]);
    return configPublica(valores, precos.valores);
  });

  r.rota('superSistema', async ({ deps, agora }) => {
    const { db, config } = deps;
    const problemas: string[] = [];
    let erroBanco: string | null = null;
    // S-09/S-26: o básico do banco numa consulta só; se falhar, o indicador vira "falhou".
    const [info] =
      (await seguro(() =>
        consultar<{ v: string; b: string | number; n: number; max: string }>(
          db,
          sql`select version() v, pg_database_size(current_database()) b,
                (select count(*)::int from pg_stat_activity where datname = current_database()) n,
                current_setting('max_connections') max`,
        ),
      )) ?? [];
    if (!info) erroBanco = 'O banco de dados não respondeu à consulta de saúde.';
    const [sinal] = (await seguro(() => db.select().from(estadoSistema).where(eq(estadoSistema.chave, CHAVE_SINAL_WORKER)))) ?? [];
    const sinalEm = sinal?.atualizadoEm ?? null;
    const listaJobs = (await seguro(() => jobs(db, agora, sinalEm))) ?? [];
    if (info && !listaJobs.length) erroBanco = 'Não foi possível ler as execuções dos jobs.';
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
    const ub = ultimoBackup ? lerUltimoBackup(ultimoBackup) : null;
    const idade = ub?.em ? idadeEmHoras(ub.em, agora) : null;
    const backupAtrasado = idade !== null && idade > LIMITES_SISTEMA.backupHoras;
    const backupEstado: SistemaResposta['backup']['estado'] =
      backupJob?.ultima?.ok === false || backupAtrasado
        ? 'falhou'
        : !ub?.em
          ? 'nao_configurado'
          : ub.arquivosOk === false
            ? 'atencao'
            : 'ok';
    if (backupJob?.ultima?.ok === false) problemas.push(`O último backup falhou: ${backupJob.ultima.erro ?? 'sem detalhe'}.`);
    if (backupAtrasado) problemas.push(`O último backup bem-sucedido tem ${fmtHoras(idade!)} (o limite é ${LIMITES_SISTEMA.backupHoras} h).`);
    if (!ub?.em) problemas.push('Não há registro de backup bem-sucedido (ULTIMO_BACKUP).');
    if (ub?.arquivosOk === false) problemas.push('O último backup salvou o banco, mas não os arquivos enviados (uploads).');

    // Worker parado: sem sinal (nem execução) há mais de N minutos.
    const ultimaExecucao = listaJobs.reduce<Date | null>((m, j) => {
      const d = j.ultima ? new Date(j.ultima.iniciadoEm) : null;
      return d && (!m || d > m) ? d : m;
    }, null);
    const ultimoSinal = sinalEm && (!ultimaExecucao || sinalEm > ultimaExecucao) ? sinalEm : ultimaExecucao;
    const workerParado = !ultimoSinal || agora.getTime() - ultimoSinal.getTime() > LIMITES_SISTEMA.workerParadoMin * 60_000;
    if (info && workerParado) problemas.push(ultimoSinal ? `O worker não dá sinal desde ${ultimoSinal.toISOString()}.` : 'O worker nunca deu sinal de vida.');
    for (const j of listaJobs) {
      if (j.estado === 'falhou') problemas.push(`O job "${j.nome}" falhou na última execução.`);
      else if (j.estado === 'atrasado') problemas.push(`O job "${j.nome}" está atrasado.`);
    }
    if (erroBanco) problemas.unshift(`Banco: ${erroBanco}`);

    const smtpConfigurado = !!config.smtp.host;
    const smtp = smtpConfigurado ? await testarSmtp(config.smtp, agora) : null;
    if (smtp?.estado === 'falhou') problemas.push(smtp.mensagem);
    const asaasConfigurado = !!config.asaas.apiKey;
    const asaas = asaasConfigurado ? await testarAsaasComCache(deps, agora) : null;
    if (asaas?.estado === 'falhou') problemas.push(`Asaas: ${asaas.mensagem}`);
    const disc = await disco(config.arquivosDir);
    if (disc && disc.estado !== 'ok') problemas.push(`Disco com ${disc.percentualLivre}% livre.`);

    const e24 = (await seguro(async () => {
      const desde = dataSql(new Date(agora.getTime() - 86_400_000));
      const [t] = await consultar<{ n: number; ultima: Date | string | null }>(db, sql`select count(*)::int n, max(criado_em) ultima from erros_api where criado_em >= ${desde}`);
      const por = await consultar<{ rota: string; status: number; n: number }>(
        db,
        sql`select rota, status, count(*)::int n from erros_api where criado_em >= ${desde} group by rota, status order by n desc limit 10`,
      );
      return {
        ultimas24h: contar(t?.n),
        ultimaEm: isoOuNull(dataOuNull(t?.ultima)),
        porRota: por.map((p) => ({ rota: p.rota, status: Number(p.status), quantidade: contar(p.n) })),
      };
    })) ?? { ultimas24h: 0, ultimaEm: null, porRota: [] };
    if (e24.ultimas24h) problemas.push(`${e24.ultimas24h} erro(s) 5xx da API nas últimas 24 h.`);

    const falhou = !!erroBanco || backupEstado === 'falhou' || workerParado || listaJobs.some((j) => j.estado === 'falhou') || smtp?.estado === 'falhou' || disc?.estado === 'falhou';
    const mem = process.memoryUsage();
    const precoCentavos = (await seguro(() => lerPrecos(db, config)))?.valores.precoCentavos ?? config.precoCentavos;
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
        ok: !erroBanco,
        versao: info?.v?.split(' ').slice(0, 2).join(' ') ?? null,
        tamanhoBytes: info ? Number(info.b) : null,
        conexoes: info ? contar(info.n) : null,
        maxConexoes: info ? Number(info.max) : null,
        erro: erroBanco,
      },
      worker: {
        jobs: listaJobs,
        parado: workerParado,
        ultimoSinalEm: isoOuNull(ultimoSinal),
        versao: typeof sinal?.valor?.versao === 'string' ? sinal.valor.versao : null,
      },
      backup: {
        ultimo: ultimoBackup,
        ultimoJob: backupJob?.ultima?.iniciadoEm ?? null,
        ultimoJobOk: backupJob?.ultima?.ok ?? null,
        fonte: `${config.backupDir}/ULTIMO_BACKUP e a tabela jobs_execucoes`,
        aviso,
        estado: backupEstado,
        ultimoEm: isoOuNull(ub?.em),
        idadeHoras: idade,
        atrasado: backupAtrasado,
      },
      smtp: {
        configurado: smtpConfigurado,
        host: config.smtp.host || null,
        estado: smtp?.estado ?? ('nao_configurado' as const),
        mensagem: smtp?.mensagem ?? 'SMTP_HOST não está configurado: nenhum e-mail sai.',
        testadoEm: isoOuNull(smtp?.em),
      },
      asaas: {
        chaveConfigurada: asaasConfigurado,
        ambiente: ambienteAsaas(config.asaas.baseUrl),
        estado: asaas?.estado ?? ('nao_configurado' as const),
        mensagem: asaas?.mensagem ?? 'ASAAS_API_KEY não está configurada no .env da VPS.',
        testadoEm: isoOuNull(asaas?.em),
      },
      push: config.vapid.publica && config.vapid.privada
        ? { configurado: true, estado: 'nao_testado' as const, mensagem: 'Configurado (não testado: só dá para testar enviando um push).' }
        : { configurado: false, estado: 'nao_configurado' as const, mensagem: 'As chaves VAPID não estão configuradas: lembretes e push desligados.' },
      disco: disc,
      erros5xx: e24,
      resumo: { estado: falhou ? ('falhou' as const) : problemas.length ? ('atencao' as const) : ('ok' as const), problemas },
      precoCentavos,
      geradoEm: iso(agora),
    };
  });

  const respostaConfig = async (db: Db, config: Parameters<typeof lerConfiguracoes>[1]) => {
    const l = await lerConfiguracoes(db, config, { semCache: true });
    const [autor] = l.atualizadoPor ? await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, l.atualizadoPor)) : [];
    return { valores: l.valores, atualizadoEm: isoOuNull(l.atualizadoEm), atualizadoPor: autor ?? null, precoCentavos: (await lerPrecos(db, config)).valores.precoCentavos };
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
      // S-22: curingas escapados (antes "%" trazia tudo); pg_trgm no alvo.
      query.alvo ? contem(auditoria.alvo, query.alvo) : undefined,
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
