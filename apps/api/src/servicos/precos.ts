/**
 * D23: preços editáveis pelo superadmin e cupons de desconto.
 *
 * - Os preços ficam em `configuracoes` (chave `precos`). Enquanto ninguém salvar pelo painel,
 *   valem PRICE_CENTS e PRICE_ADICIONAL_CENTS do .env.
 * - O valor de cada Pix é calculado aqui, no servidor: preço do concurso (cheio ou adicional) e,
 *   se houver, o cupom (`aplicarCupom`, nunca abaixo do mínimo nem de graça).
 * - Ao mudar um preço ou um cupom, os Pix pendentes cujo valor deixou de ser o certo são
 *   cancelados no Asaas (DELETE /payments/{id}) e marcados vencidos aqui: o aluno gera outro, já
 *   com o valor novo, na próxima vez que abrir o pagamento. Um Pix antigo nunca fica pagável.
 */
import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { aplicarCupom, descreverCupom, formatarReais, normalizarCodigoCupom } from '@fuse/shared';
import { PrecosProduto } from '@fuse/shared/api';
import type { Config } from '../config.js';
import type { Deps } from '../contexto.js';
import { falha } from '../http/erros.js';
import { ErroAsaas } from '../integracoes/asaas.js';
import { dataSql, type Db } from '../util.js';

const { configuracoes, cupons, pedidos } = schema;
export const CHAVE_PRECOS = 'precos';
const CACHE_MS = 10_000;

export type Cupom = typeof cupons.$inferSelect;
type Pedido = typeof pedidos.$inferSelect;

interface LinhaPrecos {
  valores: PrecosProduto;
  atualizadoEm: Date | null;
  atualizadoPor: string | null;
}

let cache: { em: number; db: Db; linha: LinhaPrecos } | null = null;

export function limparCachePrecos(): void {
  cache = null;
}

export function precosPadrao(config: Config): PrecosProduto {
  return { precoCentavos: config.precoCentavos, precoAdicionalCentavos: config.precoAdicionalCentavos, precoDeCentavos: null };
}

/** Preços vigentes: os salvos pelo superadmin ou, sem nada salvo, os do .env. */
export async function lerPrecos(db: Db, config: Config, opcoes: { semCache?: boolean } = {}): Promise<LinhaPrecos> {
  const agora = Date.now();
  if (!opcoes.semCache && cache && cache.db === db && agora - cache.em < CACHE_MS) return cache.linha;
  const [l] = await db.select().from(configuracoes).where(eq(configuracoes.chave, CHAVE_PRECOS));
  const padrao = precosPadrao(config);
  let valores = padrao;
  if (l) {
    const r = PrecosProduto.safeParse({ ...padrao, ...(l.valor as Partial<PrecosProduto>) });
    valores = r.success ? r.data : padrao;
  }
  const linha: LinhaPrecos = { valores, atualizadoEm: l?.atualizadoEm ?? null, atualizadoPor: l?.atualizadoPor ?? null };
  cache = { em: agora, db, linha };
  return linha;
}

export async function salvarPrecos(db: Db, valores: PrecosProduto, porId: string, agora: Date): Promise<void> {
  await db
    .insert(configuracoes)
    .values({ chave: CHAVE_PRECOS, valor: valores, atualizadoEm: agora, atualizadoPor: porId })
    .onConflictDoUpdate({ target: configuracoes.chave, set: { valor: valores, atualizadoEm: agora, atualizadoPor: porId } });
  limparCachePrecos();
}

/* ------------------------------------------------------------------ cupons */

/**
 * Pagos (`usos`), Pix pendentes e reservas de cada cupom. S-12 (C8): a reserva = pagos + Pix
 * pendentes que ainda não expiraram; é ela que conta para o limite de usos.
 */
export async function usosDosCupons(
  db: Db,
  ids: string[],
  agora: Date = new Date(),
): Promise<Map<string, { usos: number; pendentes: number; reservados: number }>> {
  const mapa = new Map(ids.map((id) => [id, { usos: 0, pendentes: 0, reservados: 0 }]));
  if (!ids.length) return mapa;
  const linhas = await db
    .select({
      id: pedidos.cupomId,
      usos: sql<number>`(count(*) filter (where ${pedidos.status} = 'pago'))::int`,
      pendentes: sql<number>`(count(*) filter (where ${pedidos.status} = 'pendente'))::int`,
      vivos: sql<number>`(count(*) filter (where ${pedidos.status} = 'pendente' and ${pedidos.pixExpiraEm} > ${dataSql(agora)}))::int`,
    })
    .from(pedidos)
    .where(and(inArray(pedidos.cupomId, ids), inArray(pedidos.status, ['pago', 'pendente'])))
    .groupBy(pedidos.cupomId);
  for (const l of linhas) {
    const m = l.id ? mapa.get(l.id) : undefined;
    if (!m) continue;
    m.usos = Number(l.usos);
    m.pendentes = Number(l.pendentes);
    m.reservados = m.usos + Number(l.vivos);
  }
  return mapa;
}

/**
 * Reservas do cupom que vêm ANTES de um pedido (ou de um Pix novo, sem `pedido`): todos os pagos
 * e os pendentes não expirados criados antes dele. Sem `pedido`, os pendentes do próprio aluno
 * não contam (ele está trocando o Pix, não pegando outro uso).
 */
async function reservasAntes(
  db: Db,
  cupomId: string,
  agora: Date,
  o: { usuarioId?: string | undefined; pedido?: Pick<Pedido, 'id' | 'criadoEm'> | undefined },
): Promise<number> {
  const antesDoPedido = o.pedido
    ? sql`and (${pedidos.criadoEm}, ${pedidos.id}) < (${dataSql(o.pedido.criadoEm)}, ${o.pedido.id}::uuid)`
    : sql``;
  const doAluno = o.usuarioId && !o.pedido ? sql`and ${pedidos.usuarioId} <> ${o.usuarioId}::uuid` : sql``;
  const semEle = o.pedido ? sql`${pedidos.id} <> ${o.pedido.id}::uuid` : sql`true`;
  const [r] = await db
    .select({ n: count() })
    .from(pedidos)
    .where(
      sql`${pedidos.cupomId} = ${cupomId}::uuid and ${semEle} and (
            ${pedidos.status} = 'pago'
            or (${pedidos.status} = 'pendente' and ${pedidos.pixExpiraEm} > ${dataSql(agora)} ${antesDoPedido} ${doAluno})
          )`,
    );
  return Number(r?.n ?? 0);
}

/**
 * Motivo pelo qual o cupom não vale para este concurso agora (null = vale). Com `pedido`, confere se
 * aquele Pix pendente ainda cabe no limite (os anteriores e os pagos vêm na frente).
 */
export async function motivoCupomInvalido(
  db: Db,
  cupom: Cupom | undefined,
  concursoId: string,
  agora: Date,
  o: { usuarioId?: string | undefined; pedido?: Pick<Pedido, 'id' | 'criadoEm'> | undefined } = {},
): Promise<string | null> {
  if (!cupom || !cupom.ativo) return 'Cupom não encontrado ou desativado.';
  if (cupom.validoAte && cupom.validoAte <= agora) return 'Este cupom já expirou.';
  if (cupom.concursoId && cupom.concursoId !== concursoId) return 'Este cupom não vale para este concurso.';
  if (cupom.limiteUsos !== null && (await reservasAntes(db, cupom.id, agora, o)) >= cupom.limiteUsos) {
    return MENSAGEM_LIMITE_CUPOM;
  }
  return null;
}

export const MENSAGEM_LIMITE_CUPOM =
  'Este cupom já atingiu o limite de usos (contando os Pix gerados com ele que ainda podem ser pagos).';

/** Cupom digitado pelo aluno, já conferido. Inválido = 400 com `campos.cupom`. */
export async function cupomValido(db: Db, codigoBruto: string, concursoId: string, agora: Date, usuarioId?: string): Promise<Cupom> {
  const codigo = normalizarCodigoCupom(codigoBruto);
  const [cupom] = codigo ? await db.select().from(cupons).where(eq(cupons.codigo, codigo)) : [];
  const motivo = await motivoCupomInvalido(db, cupom, concursoId, agora, { usuarioId });
  if (motivo) throw falha('validacao', motivo, { cupom: motivo });
  return cupom!;
}

/**
 * S-12: depois de criar o Pix com cupom, confere a reserva de novo (dois alunos podem ter passado
 * pela conferência ao mesmo tempo). Se este Pix ficou além do limite — vale quem gerou primeiro —
 * ele sai do Asaas, fica vencido e o aluno recebe a mensagem do limite (400). Nunca mexe em Pix pago.
 */
export async function garantirReservaCupom(deps: Deps, pedido: Pedido, agora: Date): Promise<void> {
  if (!pedido.cupomId || !pedido.concursoId) return;
  const [cupom] = await deps.db.select().from(cupons).where(eq(cupons.id, pedido.cupomId));
  if (!cupom || cupom.limiteUsos === null) return;
  if ((await reservasAntes(deps.db, cupom.id, agora, { pedido })) < cupom.limiteUsos) return;
  if (pedido.asaasPaymentId) {
    await deps.asaas.removerCobranca(pedido.asaasPaymentId).catch((e: Error) => {
      deps.log.warn({ pedidoId: pedido.id, erro: e.message }, 'pix além do limite do cupom não foi removido no asaas');
    });
  }
  await deps.db
    .update(pedidos)
    .set({ status: 'vencido', canceladoEm: agora })
    .where(and(eq(pedidos.id, pedido.id), eq(pedidos.status, 'pendente')));
  throw falha('validacao', MENSAGEM_LIMITE_CUPOM, { cupom: MENSAGEM_LIMITE_CUPOM });
}

/* ------------------------------------------------------------- preço final */

export interface PrecoPedido {
  centavos: number;
  /** Preço antes do cupom (null = sem cupom). */
  originalCentavos: number | null;
  /** Preço de concurso adicional (quem já pagou outro). */
  comDesconto: boolean;
  cupom: Cupom | null;
}

/** Preço base (sem cupom): cheio no 1º concurso, adicional para quem já pagou outro. */
export async function precoBase(
  deps: Pick<Deps, 'config'>,
  db: Db,
  usuarioId: string,
  concursoId: string,
): Promise<{ centavos: number; comDesconto: boolean }> {
  const { valores } = await lerPrecos(db, deps.config);
  const [outro] = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(
      and(
        eq(pedidos.usuarioId, usuarioId),
        eq(pedidos.status, 'pago'),
        sql`${pedidos.concursoId} is distinct from ${concursoId}`,
      ),
    )
    .limit(1);
  return outro
    ? { centavos: valores.precoAdicionalCentavos, comDesconto: true }
    : { centavos: valores.precoCentavos, comDesconto: false };
}

export function precoComCupom(base: { centavos: number; comDesconto: boolean }, cupom: Cupom | null): PrecoPedido {
  if (!cupom) return { ...base, originalCentavos: null, cupom: null };
  const { centavos, descontoCentavos } = aplicarCupom(base.centavos, cupom);
  return { centavos, originalCentavos: descontoCentavos ? base.centavos : null, comDesconto: base.comDesconto, cupom };
}

export function descricaoCupom(cupom: Cupom): string {
  return descreverCupom(cupom, formatarReais);
}

/* ------------------------------------------------- sincronização com o Asaas */

/**
 * Cancela no Asaas os Pix pendentes cujo valor não é mais o certo (preço ou cupom mudou) e os
 * marca vencidos. Com `cupomId`, olha só os Pix daquele cupom. Devolve quantos cancelou.
 * Se o Asaas recusar o cancelamento, o pedido continua pendente (para não liberar um Pix que
 * ainda pode ser pago sem registro aqui) e entra no log.
 */
export async function sincronizarPixPendentes(deps: Deps, agora: Date, filtro: { cupomId?: string } = {}): Promise<number> {
  const { db } = deps;
  const pendentes = await db
    .select()
    .from(pedidos)
    .where(
      and(
        eq(pedidos.status, 'pendente'),
        eq(pedidos.metodo, 'asaas'),
        isNotNull(pedidos.asaasPaymentId),
        isNotNull(pedidos.concursoId),
        filtro.cupomId ? eq(pedidos.cupomId, filtro.cupomId) : undefined,
      ),
    );
  let cancelados = 0;
  for (const p of pendentes) {
    const base = await precoBase(deps, db, p.usuarioId, p.concursoId!);
    let cupom: Cupom | null = null;
    let cupomOk = true;
    if (p.cupomId) {
      const [c] = await db.select().from(cupons).where(eq(cupons.id, p.cupomId));
      cupomOk = (await motivoCupomInvalido(db, c, p.concursoId!, agora, { pedido: p })) === null;
      cupom = c ?? null;
    }
    const certo = precoComCupom(base, cupom).centavos;
    if (cupomOk && certo === p.valorCentavos) continue;
    try {
      await deps.asaas.removerCobranca(p.asaasPaymentId!);
    } catch (e) {
      if (!(e instanceof ErroAsaas && e.status === 404)) {
        deps.log.error({ pedidoId: p.id, erro: (e as Error).message }, 'falha ao cancelar pix com preço antigo');
        continue;
      }
    }
    await db.update(pedidos).set({ status: 'vencido', canceladoEm: agora }).where(and(eq(pedidos.id, p.id), eq(pedidos.status, 'pendente')));
    cancelados++;
  }
  if (cancelados) deps.log.info({ cancelados, ...filtro }, 'pix com preço antigo cancelados no asaas');
  return cancelados;
}
