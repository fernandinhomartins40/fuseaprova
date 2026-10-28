/**
 * S-16: limitador persistente (janela fixa) em `limites_contagem`. Ao contrário do
 * @fastify/rate-limit (memória do processo, um contador por rota), sobrevive a deploy e reinício e
 * pode ser compartilhado entre rotas: a chave é livre ("<balde>:<quem>", ex.: "super:u:<id>").
 *
 * Reutilizável: o Lote 1 (logins) pode trocar o balde em memória por `consumirLimite`.
 *
 *   const r = await consumirLimite(db, `login:ip:${ip}`, 20, 15 * MS_MINUTO, agora);
 *   if (!r.permitido) throw falha('limite_requisicoes');
 */
import { eq, lt, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { falha } from '../http/erros.js';
import { consultar, dataSql, type Db } from '../util.js';

const { limitesContagem } = schema;

export interface EstadoLimite {
  /** Tentativas contadas na janela atual (incluindo esta, em `consumirLimite`). */
  n: number;
  /** Fim da janela atual; depois disso a contagem recomeça. */
  janelaFim: Date;
}

export interface ResultadoLimite extends EstadoLimite {
  /** `n <= max`. */
  permitido: boolean;
}

/**
 * Conta uma tentativa no balde `chave` e diz se ainda cabe em `max` por `janelaMs`. É um único
 * `insert … on conflict` (atômico): duas requisições juntas não escapam do limite.
 */
export async function consumirLimite(db: Db, chave: string, max: number, janelaMs: number, agora: Date): Promise<ResultadoLimite> {
  const fim = new Date(agora.getTime() + janelaMs);
  const [r] = await consultar<{ n: number; janela_fim: string | Date }>(
    db,
    sql`insert into limites_contagem as l (chave, n, janela_fim) values (${chave}, 1, ${dataSql(fim)})
        on conflict (chave) do update set
          n = case when l.janela_fim <= ${dataSql(agora)} then 1 else l.n + 1 end,
          janela_fim = case when l.janela_fim <= ${dataSql(agora)} then excluded.janela_fim else l.janela_fim end
        returning n, janela_fim`,
  );
  const n = Number(r?.n ?? 1);
  return { n, janelaFim: new Date(r?.janela_fim ?? fim), permitido: n <= max };
}

/** Estado do balde sem contar nada (null = vazio ou janela vencida). */
export async function lerLimite(db: Db, chave: string, agora: Date): Promise<EstadoLimite | null> {
  const [l] = await db.select().from(limitesContagem).where(eq(limitesContagem.chave, chave));
  if (!l || l.janelaFim <= agora) return null;
  return { n: l.n, janelaFim: l.janelaFim };
}

/** Zera o balde (ex.: depois de um sucesso, quando a regra pedir). */
export async function zerarLimite(db: Db, chave: string): Promise<void> {
  await db.delete(limitesContagem).where(eq(limitesContagem.chave, chave));
}

/** Conta e responde 429 acima do limite. */
export async function exigirLimite(
  db: Db,
  chave: string,
  max: number,
  janelaMs: number,
  agora: Date,
  mensagem?: string,
): Promise<ResultadoLimite> {
  const r = await consumirLimite(db, chave, max, janelaMs, agora);
  if (!r.permitido) throw falha('limite_requisicoes', mensagem);
  return r;
}

/** Apaga os baldes vencidos (o worker chama na limpeza diária). */
export async function limparLimitesVencidos(db: Db, agora: Date): Promise<number> {
  const r = await db.delete(limitesContagem).where(lt(limitesContagem.janelaFim, agora)).returning({ c: limitesContagem.chave });
  return r.length;
}

/** "em 12 minutos" / "em 1 minuto" até `fim`. */
export function minutosAte(fim: Date, agora: Date): string {
  const min = Math.max(1, Math.ceil((fim.getTime() - agora.getTime()) / 60_000));
  return min === 1 ? 'em 1 minuto' : `em ${min} minutos`;
}
