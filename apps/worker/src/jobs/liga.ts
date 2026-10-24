/**
 * Fechamento semanal da liga (domingo 23:59, PRD 6.7 e 8.7): 3 primeiros sobem, 3 últimos
 * descem (regras em `fecharGrupo`), +50 gemas para quem sobe, e cria os grupos da semana nova.
 */
import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { DIVISOES, fecharGrupo, GEMAS, semanaSP, somarDias, type Dia } from '@fuse/shared';
import type { Db } from '../util.js';

const { ligasGrupos, ligasMembros, usuarios, conquistasUsuario } = schema;

export interface ResultadoFechamento {
  grupos: number;
  subiram: number;
  desceram: number;
  gruposNovos: number;
}

/**
 * Fecha os grupos abertos até a semana `semana` (padrão: a semana corrente, pois o job roda
 * no domingo 23:59). Semanas anteriores esquecidas abertas também são fechadas.
 */
export async function fecharLiga(db: Db, agora: Date, semana: Dia = semanaSP(agora)): Promise<ResultadoFechamento> {
  const abertos = await db
    .select()
    .from(ligasGrupos)
    .where(and(isNull(ligasGrupos.fechadoEm), lte(ligasGrupos.semana, semana)))
    .orderBy(asc(ligasGrupos.semana));
  const r: ResultadoFechamento = { grupos: 0, subiram: 0, desceram: 0, gruposNovos: 0 };
  const proximas = new Map<string, { semana: Dia; concursoId: string; divisao: (typeof DIVISOES)[number] }>();

  for (const g of abertos) {
    await db.transaction(async (tx) => {
      const [trava] = await tx.select().from(ligasGrupos).where(eq(ligasGrupos.id, g.id)).for('update');
      if (!trava || trava.fechadoEm) return;
      const membros = await tx
        .select()
        .from(ligasMembros)
        .where(eq(ligasMembros.grupoId, g.id))
        .orderBy(desc(ligasMembros.xpSemana), asc(ligasMembros.alcancadoEm));
      const resultado = fecharGrupo(membros, g.divisao);
      for (const x of resultado) {
        await tx
          .update(ligasMembros)
          .set({ resultado: x.resultado, posicaoFinal: x.posicao })
          .where(and(eq(ligasMembros.grupoId, g.id), eq(ligasMembros.usuarioId, x.membro.usuarioId)));
        await tx
          .update(usuarios)
          .set({
            divisao: x.novaDivisao,
            ...(x.resultado === 'subiu' ? { gemas: sql`${usuarios.gemas} + ${GEMAS.SUBIR_LIGA}` } : {}),
          })
          .where(eq(usuarios.id, x.membro.usuarioId));
        if (DIVISOES.indexOf(x.novaDivisao) >= DIVISOES.indexOf('ouro')) {
          await tx
            .insert(conquistasUsuario)
            .values({ usuarioId: x.membro.usuarioId, codigo: 'liga_ouro', obtidaEm: agora })
            .onConflictDoNothing();
        }
        if (x.resultado === 'subiu') r.subiram++;
        if (x.resultado === 'desceu') r.desceram++;
        const prox = somarDias(g.semana, 7);
        proximas.set(`${prox}|${g.concursoId}|${x.novaDivisao}`, { semana: prox, concursoId: g.concursoId, divisao: x.novaDivisao });
      }
      await tx.update(ligasGrupos).set({ fechadoEm: agora }).where(eq(ligasGrupos.id, g.id));
      r.grupos++;
    });
  }

  // Grupos novos da semana seguinte (um por concurso e divisão, se ainda não houver).
  for (const p of proximas.values()) {
    const [existe] = await db
      .select({ id: ligasGrupos.id })
      .from(ligasGrupos)
      .where(and(eq(ligasGrupos.semana, p.semana), eq(ligasGrupos.concursoId, p.concursoId), eq(ligasGrupos.divisao, p.divisao)))
      .limit(1);
    if (!existe) {
      await db.insert(ligasGrupos).values({ ...p, criadoEm: agora });
      r.gruposNovos++;
    }
  }
  return r;
}
