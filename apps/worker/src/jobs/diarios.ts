/**
 * Jobs diários e de manutenção (PRD 8.7): vidas para 5 (00:00), ofensivas quebradas e
 * protetores (00:05), expirar Pix (10 min) e limpar sessões (03:00).
 */
import { and, eq, gt, isNotNull, lt, lte, or } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { diaSP, somarDias, VIDAS_MAX, verificarOfensiva } from '@fuse/shared';
import type { Db } from '../util.js';

const { usuarios, pedidos, sessoes, redefinicoesSenha, pacotesOffline } = schema;

/** 00:00 — todo mundo volta para 5 vidas. */
export async function resetarVidas(db: Db, agora: Date): Promise<number> {
  const r = await db
    .update(usuarios)
    .set({ vidas: VIDAS_MAX, vidasAtualizadoEm: agora })
    .where(lt(usuarios.vidas, VIDAS_MAX))
    .returning({ id: usuarios.id });
  return r.length;
}

export interface ResultadoOfensivas {
  verificados: number;
  zeradas: number;
  protetoresUsados: number;
}

/** 00:05 — dia passado sem estudo: consome protetor ou zera a ofensiva (regra `verificarOfensiva`). */
export async function verificarOfensivas(db: Db, agora: Date): Promise<ResultadoOfensivas> {
  const hoje = diaSP(agora);
  const ontem = somarDias(hoje, -1);
  const candidatos = await db
    .select()
    .from(usuarios)
    .where(and(gt(usuarios.ofensiva, 0), isNotNull(usuarios.ultimoDiaEstudo), lt(usuarios.ultimoDiaEstudo, ontem)));
  const r: ResultadoOfensivas = { verificados: candidatos.length, zeradas: 0, protetoresUsados: 0 };
  for (const u of candidatos) {
    const q = verificarOfensiva(
      { ofensiva: u.ofensiva, recorde: u.ofensivaRecorde, ultimoDia: u.ultimoDiaEstudo, protetores: u.protetores },
      hoje,
    );
    if (!q.zerou && q.protetoresUsados === 0) continue;
    // Só grava se nada mudou desde a leitura: se o aluno estudou ou comprou protetor agora
    // (00:05), o valor dele vale e este não o sobrescreve (auditoria PIE R3-04).
    const gravado = await db
      .update(usuarios)
      .set({ ofensiva: q.estado.ofensiva, protetores: q.estado.protetores, ultimoDiaEstudo: q.estado.ultimoDia })
      .where(
        and(
          eq(usuarios.id, u.id),
          eq(usuarios.ofensiva, u.ofensiva),
          eq(usuarios.protetores, u.protetores),
          eq(usuarios.ultimoDiaEstudo, u.ultimoDiaEstudo!),
        ),
      )
      .returning({ id: usuarios.id });
    if (gravado.length === 0) continue;
    if (q.zerou) r.zeradas++;
    r.protetoresUsados += q.protetoresUsados;
  }
  return r;
}

/** A cada 10 min — Pix pendente vencido vira `vencido`. */
export async function expirarPix(db: Db, agora: Date): Promise<number> {
  const r = await db
    .update(pedidos)
    .set({ status: 'vencido' })
    .where(and(eq(pedidos.status, 'pendente'), isNotNull(pedidos.pixExpiraEm), lte(pedidos.pixExpiraEm, agora)))
    .returning({ id: pedidos.id });
  return r.length;
}

/** 03:00 — sessões expiradas, links de senha e pacotes offline usados ou vencidos há mais de 1 dia. */
export async function limparSessoes(
  db: Db,
  agora: Date,
): Promise<{ sessoes: number; redefinicoes: number; pacotes: number }> {
  const s = await db.delete(sessoes).where(lt(sessoes.expiraEm, agora)).returning({ id: sessoes.id });
  const umDia = new Date(agora.getTime() - 24 * 3600_000);
  const rd = await db
    .delete(redefinicoesSenha)
    .where(or(lt(redefinicoesSenha.expiraEm, umDia), and(isNotNull(redefinicoesSenha.usadoEm), lt(redefinicoesSenha.usadoEm, umDia))))
    .returning({ id: redefinicoesSenha.id });
  const pc = await db
    .delete(pacotesOffline)
    .where(lt(pacotesOffline.expiraEm, umDia))
    .returning({ id: pacotesOffline.id });
  return { sessoes: s.length, redefinicoes: rd.length, pacotes: pc.length };
}

