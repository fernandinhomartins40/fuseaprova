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
import type { Db } from '../util.js';

const { configuracoes, cupons, pedidos } = schema;
export const CHAVE_PRECOS = 'precos';
const CACHE_MS = 10_000;

export type Cupom = typeof cupons.$inferSelect;

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

/** Pagamentos confirmados de cada cupom (o que conta para o limite) e Pix pendentes. */
export async function usosDosCupons(db: Db, ids: string[]): Promise<Map<string, { usos: number; pendentes: number }>> {
  const mapa = new Map(ids.map((id) => [id, { usos: 0, pendentes: 0 }]));
  if (!ids.length) return mapa;
  const linhas = await db
    .select({ id: pedidos.cupomId, status: pedidos.status, n: count() })
    .from(pedidos)
    .where(and(inArray(pedidos.cupomId, ids), inArray(pedidos.status, ['pago', 'pendente'])))
    .groupBy(pedidos.cupomId, pedidos.status);
  for (const l of linhas) {
    const m = l.id ? mapa.get(l.id) : undefined;
    if (!m) continue;
    if (l.status === 'pago') m.usos = Number(l.n);
    else m.pendentes = Number(l.n);
  }
  return mapa;
}

/** Motivo pelo qual o cupom não vale para este concurso agora (null = vale). */
export async function motivoCupomInvalido(db: Db, cupom: Cupom | undefined, concursoId: string, agora: Date): Promise<string | null> {
  if (!cupom || !cupom.ativo) return 'Cupom não encontrado ou desativado.';
  if (cupom.validoAte && cupom.validoAte <= agora) return 'Este cupom já expirou.';
  if (cupom.concursoId && cupom.concursoId !== concursoId) return 'Este cupom não vale para este concurso.';
  if (cupom.limiteUsos !== null) {
    const usos = (await usosDosCupons(db, [cupom.id])).get(cupom.id)!.usos;
    if (usos >= cupom.limiteUsos) return 'Este cupom já atingiu o limite de usos.';
  }
  return null;
}

/** Cupom digitado pelo aluno, já conferido. Inválido = 400 com `campos.cupom`. */
export async function cupomValido(db: Db, codigoBruto: string, concursoId: string, agora: Date): Promise<Cupom> {
  const codigo = normalizarCodigoCupom(codigoBruto);
  const [cupom] = codigo ? await db.select().from(cupons).where(eq(cupons.codigo, codigo)) : [];
  const motivo = await motivoCupomInvalido(db, cupom, concursoId, agora);
  if (motivo) throw falha('validacao', motivo, { cupom: motivo });
  return cupom!;
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
      cupomOk = (await motivoCupomInvalido(db, c, p.concursoId!, agora)) === null;
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
