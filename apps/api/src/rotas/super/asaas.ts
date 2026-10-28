/**
 * /super/asaas (D13): status da integração, conta, saldo, extrato, estatísticas e o webhook.
 *
 * A conta Asaas é compartilhada com outras aplicações (D14): o extrato só mostra os
 * lançamentos ligados a cobranças do Fuse Aprova, as estatísticas saem dos nossos pedidos e
 * o painel só cria ou altera o webhook cuja URL é a deste app. O saldo é o da conta toda.
 * A chave da API nunca é exibida nem trocada pelo painel (fica no .env da VPS).
 */
import { and, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { ocultarCpf } from '@fuse/shared';
import { EVENTOS_ASAAS_WEBHOOK, type AsaasWebhookResposta, type WebhookAsaasConfig } from '@fuse/shared/api';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { falha } from '../../http/erros.js';
import { ErroAsaas, type AsaasTransacao, type AsaasWebhook } from '../../integracoes/asaas.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { comPrazo, iso } from '../../util.js';
import { auditarSuper, periodo } from './comum.js';

const { pedidos } = schema;

export const NOME_WEBHOOK_APP = 'Fuse Aprova - cobranças Pix';
const COMO_TROCAR_CHAVE =
  'A chave fica só no .env da VPS. Para trocar: ssh na VPS, edite ASAAS_API_KEY (entre aspas simples) e ASAAS_BASE_URL em /root/fuseaprova/deploy/.env e rode "docker compose up -d --force-recreate api worker" em /root/fuseaprova/deploy (docs/DEPLOY.md, seção 1.4).';
const AVISO_SALDO =
  'A conta Asaas é compartilhada com outras aplicações: o saldo é o da conta inteira, não só do Fuse Aprova.';

export function ambienteAsaas(baseUrl: string): 'sandbox' | 'producao' | 'outro' {
  if (/api-sandbox\.asaas\.com|sandbox\.asaas\.com/.test(baseUrl)) return 'sandbox';
  if (/^https:\/\/(api|www)\.asaas\.com\//.test(baseUrl)) return 'producao';
  return 'outro';
}

export const urlWebhookDoApp = (deps: Deps) => `${deps.config.appUrl}/api/webhooks/asaas`;

function semChave(deps: Deps): void {
  if (!deps.config.asaas.apiKey) throw falha('asaas_indisponivel', 'ASAAS_API_KEY não está configurada no .env da VPS.');
}

function asaasFalhou(deps: Deps, e: unknown, onde: string): never {
  if (e instanceof ErroAsaas) {
    deps.log.warn({ onde, erro: e.message }, 'consulta ao Asaas falhou');
    throw falha('asaas_indisponivel', e.status === 401 ? 'O Asaas recusou a chave da API (401). Confira ASAAS_API_KEY no .env.' : undefined);
  }
  throw e;
}

function mapWebhook(w: AsaasWebhook, url: string): WebhookAsaasConfig {
  return {
    id: w.id,
    nome: w.name ?? null,
    url: w.url,
    email: w.email ?? null,
    ativo: w.enabled,
    filaInterrompida: w.interrupted,
    temToken: w.hasAuthToken ?? false,
    tipoEnvio: w.sendType ?? null,
    versaoApi: w.apiVersion ?? null,
    penalizadas: w.penalizedRequestsCount ?? null,
    eventos: w.events ?? [],
    ehDoApp: w.url === url,
  };
}

async function estadoWebhook(deps: Deps): Promise<AsaasWebhookResposta> {
  semChave(deps);
  const url = urlWebhookDoApp(deps);
  let lista;
  try {
    lista = await deps.asaas.listarWebhooks();
  } catch (e) {
    asaasFalhou(deps, e, 'webhooks');
  }
  // Só mostramos os webhooks deste app (a conta é compartilhada; URLs de outras aplicações ficam de fora).
  const nossos = lista.data.filter((w) => w.url === url).map((w) => mapWebhook(w, url));
  return {
    urlEsperada: url,
    tokenLocalConfigurado: !!deps.config.asaas.webhookToken,
    doApp: nossos[0] ?? null,
    todos: nossos,
    eventosRecomendados: [...EVENTOS_ASAAS_WEBHOOK],
  };
}

/** S-20: tempo total de uma consulta longa ao Asaas e de cada chamada (o proxy corta em 60 s). Mutável só nos testes. */
export const TEMPOS_ASAAS = { orcamentoMs: 25_000, prazoChamadaMs: 10_000 };
type CacheExtrato = Map<string, { lidos: AsaasTransacao[]; incompleto: boolean; ate: number }>;
/** Um cache por cliente Asaas (cada app, e cada ambiente de teste, tem o seu). */
const cachesExtrato = new WeakMap<object, CacheExtrato>();
function cacheDoExtrato(deps: Deps): CacheExtrato {
  let c = cachesExtrato.get(deps.asaas);
  if (!c) cachesExtrato.set(deps.asaas, (c = new Map()));
  return c;
}

function paraCentavos(v: number | null | undefined): number {
  return Math.round((v ?? 0) * 100);
}

/**
 * Teste real da conexão (consulta o saldo), com prazo curto. Usado pelo botão "Testar" e pelo
 * /super/sistema (S-09). `ok: null` = sem chave configurada (nada a testar).
 */
export async function testarConexaoAsaas(deps: Deps, prazoMs = TEMPOS_ASAAS.prazoChamadaMs): Promise<{ ok: boolean; ms: number; mensagem: string; configurado: boolean }> {
  const inicio = Date.now();
  if (!deps.config.asaas.apiKey) return { ok: false, ms: 0, mensagem: 'ASAAS_API_KEY não está configurada no .env da VPS.', configurado: false };
  try {
    await comPrazo(deps.asaas.saldo(), prazoMs, `O Asaas não respondeu em ${Math.round(prazoMs / 1000)} s.`);
    return { ok: true, ms: Date.now() - inicio, mensagem: `Conexão com o Asaas (${ambienteAsaas(deps.config.asaas.baseUrl)}) funcionando.`, configurado: true };
  } catch (e) {
    const mensagem = e instanceof ErroAsaas && e.status === 401 ? 'O Asaas recusou a chave (401).' : `Falhou: ${(e as Error).message.slice(0, 160)}`;
    return { ok: false, ms: Date.now() - inicio, mensagem, configurado: true };
  }
}

export function rotasSuperAsaas(r: Registrador): void {
  r.rota('superAsaasStatus', async ({ deps }) => {
    const base = {
      ambiente: ambienteAsaas(deps.config.asaas.baseUrl),
      baseUrl: deps.config.asaas.baseUrl,
      chaveConfigurada: !!deps.config.asaas.apiKey,
      tokenWebhookConfigurado: !!deps.config.asaas.webhookToken,
      urlWebhookEsperada: urlWebhookDoApp(deps),
      comoTrocarChave: COMO_TROCAR_CHAVE,
    };
    if (!deps.config.asaas.apiKey) return { ...base, conta: null, erro: 'ASAAS_API_KEY não está configurada no .env da VPS.' };
    try {
      const c = await deps.asaas.minhaConta();
      return {
        ...base,
        conta: {
          nome: c.name ?? null,
          email: c.email ?? null,
          cpfCnpjOculto: c.cpfCnpj ? (c.cpfCnpj.length === 11 ? ocultarCpf(c.cpfCnpj) : `${c.cpfCnpj.slice(0, 2)}.***.***/****-${c.cpfCnpj.slice(-2)}`) : null,
          tipoPessoa: c.personType ?? null,
          status: c.status ?? null,
          cidade: c.city?.name ? `${c.city.name}${c.city.state ? `/${c.city.state}` : ''}` : null,
        },
        erro: null,
      };
    } catch (e) {
      return { ...base, conta: null, erro: e instanceof ErroAsaas ? e.message.slice(0, 200) : 'Falha de rede.' };
    }
  });

  r.rota('superAsaasTestar', async (ctx) => {
    const { ok, ms, mensagem } = await testarConexaoAsaas(ctx.deps);
    await auditarSuper(ctx, 'asaas.testar', 'asaas', { detalhes: { ok, ms } });
    return { ok, ms, mensagem };
  });

  r.rota('superAsaasSaldo', async ({ deps, agora }) => {
    semChave(deps);
    try {
      const s = await deps.asaas.saldo();
      return { saldoCentavos: paraCentavos(s.balance), consultadoEm: iso(agora), aviso: AVISO_SALDO };
    } catch (e) {
      asaasFalhou(deps, e, 'saldo');
    }
  });

  r.rota('superAsaasExtrato', async ({ query, deps, agora }) => {
    semChave(deps);
    const { de, ate } = periodo(query, agora);
    // Lê as páginas do período (até 20 × 100 lançamentos) e fica só com os do Fuse Aprova.
    // S-20: com orçamento de tempo (bem abaixo dos 60 s do proxy) e cache de 60 s por período,
    // para a troca de página da tela não reler tudo. Estourou o tempo: devolve o que leu,
    // marcado como incompleto ("reduza o período"), em vez de um 504.
    const chaveCache = `${de}|${ate}`;
    const cacheExtrato = cacheDoExtrato(deps);
    const emCache = cacheExtrato.get(chaveCache);
    let lidos: AsaasTransacao[] = [];
    let incompleto = false;
    if (emCache && emCache.ate > Date.now()) {
      ({ lidos, incompleto } = emCache);
    } else {
      const MAX_PAGINAS = 20;
      const inicio = Date.now();
      let offset = 0;
      try {
        for (let pagina = 0; ; pagina++) {
          const restante = TEMPOS_ASAAS.orcamentoMs - (Date.now() - inicio);
          if (pagina >= MAX_PAGINAS || restante <= 1000) {
            incompleto = true;
            break;
          }
          let r;
          try {
            r = await comPrazo(
              deps.asaas.extrato({ startDate: de, finishDate: ate, offset, limit: 100, order: 'desc' }),
              Math.min(TEMPOS_ASAAS.prazoChamadaMs, restante),
              'O Asaas demorou para responder.',
            );
          } catch (e) {
            if (pagina > 0 && !(e instanceof ErroAsaas)) {
              incompleto = true;
              break;
            }
            throw e;
          }
          lidos.push(...r.data);
          if (!r.hasMore || r.data.length === 0) break;
          offset += r.data.length;
        }
      } catch (e) {
        asaasFalhou(deps, e instanceof ErroAsaas ? e : new ErroAsaas((e as Error).message, null), 'extrato');
      }
      for (const [k, v] of cacheExtrato) if (v.ate <= Date.now()) cacheExtrato.delete(k);
      cacheExtrato.set(chaveCache, { lidos, incompleto, ate: Date.now() + 60_000 });
    }
    const ids = [...new Set(lidos.map((t) => t.paymentId).filter((x): x is string => !!x))];
    const nossos = new Set(
      ids.length
        ? (await deps.db.select({ id: pedidos.asaasPaymentId }).from(pedidos).where(inArray(pedidos.asaasPaymentId, ids))).map((x) => x.id)
        : [],
    );
    const filtrados = lidos.filter((t) => t.paymentId && nossos.has(t.paymentId));
    const pagina = filtrados.slice(query.offset, query.offset + query.limit);
    return {
      de,
      ate,
      itens: pagina.map((t) => ({
        id: t.id,
        data: t.date,
        tipo: t.type,
        descricao: t.description ?? null,
        valorCentavos: paraCentavos(t.value),
        // O saldo corrente é o da conta compartilhada: não faz sentido mostrá-lo aqui.
        saldoCentavos: null,
        paymentId: t.paymentId ?? null,
      })),
      temMais: query.offset + query.limit < filtrados.length,
      total: filtrados.length,
      offset: query.offset,
      limit: query.limit,
      examinados: lidos.length,
      incompleto,
    };
  });

  r.rota('superAsaasEstatisticas', async ({ query, deps, agora }) => {
    const { de, ate, inicio, fim } = periodo(query, agora);
    // S-08: agregado no SQL (antes vinha `select *`, com o QR do Pix de cada pedido).
    const linhas = await deps.db
      .select({
        status: pedidos.status,
        cancelado: sql<boolean>`${pedidos.canceladoEm} is not null`,
        quantidade: sql<number>`count(*)::int`,
        valor: sql<string>`coalesce(sum(${pedidos.valorCentavos}), 0)::bigint`,
        liquido: sql<string>`coalesce(sum(coalesce(${pedidos.valorLiquidoCentavos}, ${pedidos.valorCentavos})), 0)::bigint`,
      })
      .from(pedidos)
      .where(and(eq(pedidos.metodo, 'asaas'), isNotNull(pedidos.asaasPaymentId), gte(pedidos.criadoEm, inicio), lt(pedidos.criadoEm, fim)))
      .groupBy(pedidos.status, sql`${pedidos.canceladoEm} is not null`);
    const rotulo = (s: string, cancelado: boolean) =>
      cancelado ? 'CANCELADA' : ({ pendente: 'PENDING', pago: 'RECEIVED', vencido: 'OVERDUE', estornado: 'REFUNDED' } as Record<string, string>)[s] ?? s;
    const grupos = new Map<string, { status: string; quantidade: number; valorCentavos: number; liquidoCentavos: number }>();
    for (const l of linhas) {
      const k = rotulo(l.status, !!l.cancelado);
      const g = grupos.get(k) ?? { status: k, quantidade: 0, valorCentavos: 0, liquidoCentavos: 0 };
      g.quantidade += Number(l.quantidade);
      g.valorCentavos += Number(l.valor);
      g.liquidoCentavos += Number(l.liquido);
      grupos.set(k, g);
    }
    return { de, ate, porStatus: [...grupos.values()].sort((a, b) => b.quantidade - a.quantidade) };
  });

  r.rota('superAsaasWebhook', async ({ deps }) => estadoWebhook(deps));

  r.rota('superAsaasWebhookSalvar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const token = deps.config.asaas.webhookToken;
    if (token.length < 32 || token.length > 255) {
      throw falha('conflito', 'ASAAS_WEBHOOK_TOKEN no .env precisa ter de 32 a 255 caracteres (exigência do Asaas).');
    }
    const antes = await estadoWebhook(deps);
    const url = antes.urlEsperada;
    try {
      if (antes.doApp) {
        await deps.asaas.atualizarWebhook(antes.doApp.id, {
          name: NOME_WEBHOOK_APP,
          url,
          enabled: true,
          interrupted: false,
          authToken: token,
          sendType: 'SEQUENTIALLY',
          events: [...EVENTOS_ASAAS_WEBHOOK],
        });
      } else {
        await deps.asaas.criarWebhook({
          name: NOME_WEBHOOK_APP,
          url,
          email: corpo.email,
          enabled: true,
          interrupted: false,
          apiVersion: 3,
          authToken: token,
          sendType: 'SEQUENTIALLY',
          events: [...EVENTOS_ASAAS_WEBHOOK],
        });
      }
    } catch (e) {
      asaasFalhou(deps, e, 'webhook-salvar');
    }
    const depois = await estadoWebhook(deps);
    const semToken = (w: WebhookAsaasConfig | null) => (w ? { ...w } : null);
    await auditarSuper(ctx, 'asaas.webhook_salvar', 'asaas:webhook', {
      motivo: corpo.motivo,
      antes: { webhook: semToken(antes.doApp) },
      depois: { webhook: semToken(depois.doApp) },
    });
    return depois;
  });

  r.rota('superAsaasWebhookReativar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const antes = await estadoWebhook(deps);
    if (!antes.doApp) throw falha('conflito', 'O webhook do Fuse Aprova ainda não existe no Asaas. Crie-o primeiro.');
    try {
      await deps.asaas.atualizarWebhook(antes.doApp.id, { interrupted: false, enabled: true });
    } catch (e) {
      asaasFalhou(deps, e, 'webhook-reativar');
    }
    const depois = await estadoWebhook(deps);
    await auditarSuper(ctx, 'asaas.webhook_reativar', 'asaas:webhook', {
      motivo: corpo.motivo,
      antes: { ativo: antes.doApp.ativo, filaInterrompida: antes.doApp.filaInterrompida },
      depois: { ativo: depois.doApp?.ativo ?? null, filaInterrompida: depois.doApp?.filaInterrompida ?? null },
    });
    return depois;
  });
}
