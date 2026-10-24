/**
 * Efeitos de gamificação no servidor (fonte da verdade): XP + liga, gemas, ofensiva,
 * revisão espaçada e conquistas. As regras vêm de @fuse/shared; aqui só se persiste.
 */
import { and, count, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  aplicarRespostaNaRevisao,
  dadosDaConquista,
  diaContaParaOfensiva,
  diaSP,
  diasDaSemana,
  escolherGrupo,
  inicioDoDiaSP,
  novasConquistas,
  proximaMeiaNoiteSP,
  registrarDiaDeEstudo,
  semanaSP,
  somarDias,
  somarXp,
  verificarOfensiva,
  type AtividadeDoDia,
  type CodigoConquista,
  type Dia,
  type ItemXp,
  type ResultadoRegistro,
} from '@fuse/shared';
import type { Usuario } from '../contexto.js';
import { agrupar, contar, type Db } from '../util.js';

const {
  usuarios,
  xpEventos,
  ligasGrupos,
  ligasMembros,
  sessoesEstudo,
  tentativas,
  simulados,
  revisoes,
  conquistasUsuario,
  progressoLicoes,
  licoes,
  secoes,
  unidades,
  disciplinas,
} = schema;

/** Lê o usuário com bloqueio de linha (serializa as escritas do mesmo aluno). */
export async function travarUsuario(tx: Db, id: string): Promise<Usuario> {
  const [u] = await tx.select().from(usuarios).where(eq(usuarios.id, id)).for('update');
  if (!u) throw new Error('usuário não encontrado');
  return u;
}

/* ------------------------------------------------------------------- XP */

export interface RefXp {
  sessaoEstudoId?: string | null;
  simuladoId?: string | null;
}

/**
 * Credita XP: grava os eventos, soma no total e na liga da semana (entra na liga no primeiro
 * ganho de XP da semana, PRD 6.7). Devolve o total creditado.
 */
export async function creditarXp(
  tx: Db,
  u: Pick<Usuario, 'id' | 'concursoId' | 'divisao' | 'xpTotal'>,
  itens: readonly ItemXp[],
  agora: Date,
  ref: RefXp = {},
): Promise<number> {
  const validos = itens.filter((i) => i.valor > 0);
  const total = validos.reduce((s, i) => s + i.valor, 0);
  if (total <= 0) return 0;
  const semana = semanaSP(agora);
  await tx.insert(xpEventos).values(
    validos.map((i) => ({
      usuarioId: u.id,
      tipo: i.tipo,
      valor: i.valor,
      sessaoEstudoId: ref.sessaoEstudoId ?? null,
      simuladoId: ref.simuladoId ?? null,
      criadoEm: agora,
      semana,
    })),
  );
  await tx
    .update(usuarios)
    .set({ xpTotal: sql`${usuarios.xpTotal} + ${total}` })
    .where(eq(usuarios.id, u.id));
  u.xpTotal = somarXp(u.xpTotal, total);
  if (u.concursoId) await somarNaLiga(tx, u.id, u.concursoId, u.divisao, total, semana, agora);
  return total;
}

async function somarNaLiga(
  tx: Db,
  usuarioId: string,
  concursoId: string,
  divisao: Usuario['divisao'],
  xp: number,
  semana: Dia,
  agora: Date,
): Promise<void> {
  const atualizado = await tx
    .update(ligasMembros)
    .set({ xpSemana: sql`${ligasMembros.xpSemana} + ${xp}`, alcancadoEm: agora })
    .where(and(eq(ligasMembros.usuarioId, usuarioId), eq(ligasMembros.semana, semana)))
    .returning({ g: ligasMembros.grupoId });
  if (atualizado.length) return;

  // Entrada: grupo de até 30 do mesmo concurso e divisão (o mais cheio com vaga).
  // Trava os grupos da semana/divisão para duas entradas simultâneas não estourarem 30.
  const grupos = await tx
    .select({ id: ligasGrupos.id })
    .from(ligasGrupos)
    .where(
      and(
        eq(ligasGrupos.semana, semana),
        eq(ligasGrupos.concursoId, concursoId),
        eq(ligasGrupos.divisao, divisao),
        isNull(ligasGrupos.fechadoEm),
      ),
    )
    .for('update');
  let grupoId: string | null = null;
  if (grupos.length) {
    const contagens = await tx
      .select({ id: ligasMembros.grupoId, n: count() })
      .from(ligasMembros)
      .where(inArray(ligasMembros.grupoId, grupos.map((g) => g.id)))
      .groupBy(ligasMembros.grupoId);
    const porId = new Map(contagens.map((c) => [c.id, contar(c.n)]));
    grupoId = escolherGrupo(grupos.map((g) => ({ id: g.id, membros: porId.get(g.id) ?? 0 })));
  }
  if (!grupoId) {
    const [novo] = await tx
      .insert(ligasGrupos)
      .values({ semana, divisao, concursoId, criadoEm: agora })
      .returning({ id: ligasGrupos.id });
    grupoId = novo!.id;
  }
  await tx
    .insert(ligasMembros)
    .values({ grupoId, usuarioId, semana, xpSemana: xp, alcancadoEm: agora })
    .onConflictDoNothing();
}

export async function membroDaSemana(tx: Db, usuarioId: string, agora: Date) {
  const [m] = await tx
    .select()
    .from(ligasMembros)
    .where(and(eq(ligasMembros.usuarioId, usuarioId), eq(ligasMembros.semana, semanaSP(agora))));
  return m ?? null;
}

/* ------------------------------------------------------------ revisão */

/** Aplica uma resposta na fila de revisão do aluno (PRD 6.5). */
export async function aplicarRevisao(
  tx: Db,
  usuarioId: string,
  questaoId: string,
  acertou: boolean,
  agora: Date,
): Promise<void> {
  const [atual] = await tx
    .select()
    .from(revisoes)
    .where(and(eq(revisoes.usuarioId, usuarioId), eq(revisoes.questaoId, questaoId)));
  const item = atual ? { etapa: atual.etapa, venceEm: atual.venceEm, status: atual.status } : null;
  const novo = aplicarRespostaNaRevisao(item, acertou, agora);
  if (!novo) return;
  if (
    item &&
    novo.etapa === item.etapa &&
    novo.status === item.status &&
    novo.venceEm.getTime() === item.venceEm.getTime()
  ) {
    return;
  }
  await tx
    .insert(revisoes)
    .values({ usuarioId, questaoId, etapa: novo.etapa, venceEm: novo.venceEm, status: novo.status, atualizadoEm: agora })
    .onConflictDoUpdate({
      target: [revisoes.usuarioId, revisoes.questaoId],
      set: { etapa: novo.etapa, venceEm: novo.venceEm, status: novo.status, atualizadoEm: agora },
    });
}

/* ------------------------------------------------------------ ofensiva */

/** Atividade que conta para a ofensiva num dia (São Paulo). */
export async function atividadeDoDia(tx: Db, usuarioId: string, dia: Dia): Promise<AtividadeDoDia> {
  const ini = inicioDoDiaSP(dia);
  const fim = inicioDoDiaSP(somarDias(dia, 1));
  const [lic] = await tx
    .select({ n: count() })
    .from(sessoesEstudo)
    .where(
      and(
        eq(sessoesEstudo.usuarioId, usuarioId),
        inArray(sessoesEstudo.tipo, ['licao', 'desafio']),
        gte(sessoesEstudo.concluidaEm, ini),
        lt(sessoesEstudo.concluidaEm, fim),
      ),
    );
  const [rev] = await tx
    .select({ n: count() })
    .from(tentativas)
    .innerJoin(sessoesEstudo, eq(sessoesEstudo.id, tentativas.sessaoEstudoId))
    .where(
      and(
        eq(tentativas.usuarioId, usuarioId),
        eq(sessoesEstudo.tipo, 'revisao'),
        gte(tentativas.respondidaEm, ini),
        lt(tentativas.respondidaEm, fim),
      ),
    );
  const [sim] = await tx
    .select({ n: count() })
    .from(simulados)
    .where(
      and(eq(simulados.usuarioId, usuarioId), gte(simulados.entregueEm, ini), lt(simulados.entregueEm, fim)),
    );
  return { licoesTrilha: contar(lic?.n), questoesRevisao: contar(rev?.n), simulados: contar(sim?.n) };
}

export interface EfeitoOfensiva {
  contou: boolean;
  registro: ResultadoRegistro | null;
  gemasGanhas: number;
}

/**
 * Se o dia `dia` já conta (PRD 6.4), registra na ofensiva e paga os marcos (gemas).
 * Não registra dias anteriores ao último dia coberto (sync offline atrasado).
 */
export async function registrarOfensivaSeContou(tx: Db, u: Usuario, dia: Dia): Promise<EfeitoOfensiva> {
  if (u.ultimoDiaEstudo && dia < u.ultimoDiaEstudo) return { contou: false, registro: null, gemasGanhas: 0 };
  const atividade = await atividadeDoDia(tx, u.id, dia);
  if (!diaContaParaOfensiva(atividade)) return { contou: false, registro: null, gemasGanhas: 0 };
  const reg = registrarDiaDeEstudo(
    { ofensiva: u.ofensiva, recorde: u.ofensivaRecorde, ultimoDia: u.ultimoDiaEstudo, protetores: u.protetores },
    dia,
  );
  if (reg.primeiroDoDia || reg.quebra.protetoresUsados > 0) {
    const gemas = u.gemas + reg.gemasGanhas;
    await tx
      .update(usuarios)
      .set({
        ofensiva: reg.estado.ofensiva,
        ofensivaRecorde: reg.estado.recorde,
        ultimoDiaEstudo: reg.estado.ultimoDia,
        protetores: reg.estado.protetores,
        gemas,
      })
      .where(eq(usuarios.id, u.id));
    u.ofensiva = reg.estado.ofensiva;
    u.ofensivaRecorde = reg.estado.recorde;
    u.ultimoDiaEstudo = reg.estado.ultimoDia;
    u.protetores = reg.estado.protetores;
    u.gemas = gemas;
  }
  return { contou: true, registro: reg, gemasGanhas: reg.primeiroDoDia ? reg.gemasGanhas : 0 };
}

/** Ofensiva exibida hoje (sem gravar): considera dias perdidos sem protetor como zerada. */
export function ofensivaHoje(u: Usuario, agora: Date): number {
  return verificarOfensiva(
    { ofensiva: u.ofensiva, recorde: u.ofensivaRecorde, ultimoDia: u.ultimoDiaEstudo, protetores: u.protetores },
    diaSP(agora),
  ).estado.ofensiva;
}

/** Dias da semana (seg → dom) em que o aluno cumpriu a ofensiva, a partir da atividade gravada. */
export async function semanaDaOfensiva(tx: Db, usuarioId: string, agora: Date) {
  const segunda = semanaSP(agora);
  const dias = diasDaSemana(segunda);
  const ini = inicioDoDiaSP(segunda);
  const fim = proximaMeiaNoiteSP(agora);
  const [sess, revs, sims] = await Promise.all([
    tx
      .select({ em: sessoesEstudo.concluidaEm })
      .from(sessoesEstudo)
      .where(
        and(
          eq(sessoesEstudo.usuarioId, usuarioId),
          inArray(sessoesEstudo.tipo, ['licao', 'desafio']),
          gte(sessoesEstudo.concluidaEm, ini),
          lt(sessoesEstudo.concluidaEm, fim),
        ),
      ),
    tx
      .select({ em: tentativas.respondidaEm })
      .from(tentativas)
      .innerJoin(sessoesEstudo, eq(sessoesEstudo.id, tentativas.sessaoEstudoId))
      .where(
        and(
          eq(tentativas.usuarioId, usuarioId),
          eq(sessoesEstudo.tipo, 'revisao'),
          gte(tentativas.respondidaEm, ini),
          lt(tentativas.respondidaEm, fim),
        ),
      ),
    tx
      .select({ em: simulados.entregueEm })
      .from(simulados)
      .where(and(eq(simulados.usuarioId, usuarioId), gte(simulados.entregueEm, ini), lt(simulados.entregueEm, fim))),
  ]);
  const porDia = (l: { em: Date | null }[]) => agrupar(l.filter((x) => x.em), (x) => diaSP(x.em!));
  const s = porDia(sess);
  const r = porDia(revs);
  const m = porDia(sims);
  const hoje = diaSP(agora);
  return dias.map((dia) => ({
    dia,
    hoje: dia === hoje,
    cumprido: diaContaParaOfensiva({
      licoesTrilha: s.get(dia)?.length ?? 0,
      questoesRevisao: r.get(dia)?.length ?? 0,
      simulados: m.get(dia)?.length ?? 0,
    }),
  }));
}

/** Lições de trilha concluídas hoje (meta diária). */
export async function licoesConcluidasHoje(tx: Db, usuarioId: string, agora: Date): Promise<number> {
  return (await atividadeDoDia(tx, usuarioId, diaSP(agora))).licoesTrilha;
}

/* ----------------------------------------------------------- conquistas */

export async function verificarConquistas(
  tx: Db,
  u: Usuario,
  agora: Date,
): Promise<{ codigo: CodigoConquista; titulo: string; descricao: string }[]> {
  const [lic] = await tx
    .select({ n: count() })
    .from(progressoLicoes)
    .where(and(eq(progressoLicoes.usuarioId, u.id), isNotNull(progressoLicoes.concluidaEm)));
  const [tent] = await tx.select({ n: count() }).from(tentativas).where(eq(tentativas.usuarioId, u.id));
  const [sims] = await tx
    .select({ n: count() })
    .from(simulados)
    .where(and(eq(simulados.usuarioId, u.id), isNotNull(simulados.entregueEm)));
  const [aprov] = await tx
    .select({ n: count() })
    .from(xpEventos)
    .where(and(eq(xpEventos.usuarioId, u.id), eq(xpEventos.tipo, 'simulado_aprovado')));
  const [coroas] = await tx
    .select({ n: count() })
    .from(progressoLicoes)
    .innerJoin(licoes, eq(licoes.id, progressoLicoes.licaoId))
    .innerJoin(secoes, eq(secoes.id, licoes.secaoId))
    .innerJoin(unidades, eq(unidades.id, secoes.unidadeId))
    .innerJoin(disciplinas, eq(disciplinas.id, unidades.disciplinaId))
    .where(
      and(
        eq(progressoLicoes.usuarioId, u.id),
        eq(licoes.tipo, 'desafio'),
        eq(disciplinas.slug, 'portugues'),
        gte(progressoLicoes.melhorPrecisao, 70),
      ),
    );
  const ja = await tx
    .select({ c: conquistasUsuario.codigo })
    .from(conquistasUsuario)
    .where(eq(conquistasUsuario.usuarioId, u.id));
  const novas = novasConquistas(
    {
      licoesConcluidas: contar(lic?.n),
      ofensivaRecorde: u.ofensivaRecorde,
      questoesRespondidas: contar(tent?.n),
      simuladosEntregues: contar(sims?.n),
      simuladosAprovados: contar(aprov?.n),
      unidadesPortuguesCoroadas: contar(coroas?.n),
      divisao: u.divisao,
    },
    ja.map((j) => j.c),
  );
  if (novas.length) {
    await tx
      .insert(conquistasUsuario)
      .values(novas.map((codigo) => ({ usuarioId: u.id, codigo, obtidaEm: agora })))
      .onConflictDoNothing();
  }
  return novas.map((c) => {
    const d = dadosDaConquista(c);
    return { codigo: d.codigo, titulo: d.titulo, descricao: d.descricao };
  });
}

