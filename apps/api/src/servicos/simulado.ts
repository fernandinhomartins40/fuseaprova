/**
 * Simulado no padrão FAU (PRD 5.14): relógio no servidor, entrega automática ao fim das 4 h
 * (verificada em toda leitura e por uma varredura periódica da API).
 */
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  calcularNota,
  diaSP,
  DISTRIBUICAO_PADRAO,
  montarSimulado,
  msRestantesSimulado,
  NOMES_DISCIPLINA,
  ORDEM_BLOCOS,
  PESOS_PADRAO,
  questoesEmBranco,
  simuladoExpirado,
  terminoDoSimulado,
  xpDoSimulado,
  type SlugDisciplina,
} from '@fuse/shared';
import { seloSimulado, type SimuladoAndamento, type SimuladoResultado } from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { falha } from '../http/erros.js';
import { iso, type Db } from '../util.js';
import {
  aplicarRevisao,
  creditarXp,
  registrarOfensivaSeContou,
  travarUsuario,
  verificarConquistas,
} from './progresso.js';
import { carregarQuestoes, emOrdem, questaoVisivel } from './questoes.js';
import { concursoDoUsuario, modoEdital } from './usuario.js';

const { simulados, cargos, questoes, disciplinas, secoes, unidades, sessoesEstudo, tentativas } =
  schema;

export type Simulado = typeof schema.simulados.$inferSelect;

async function cargoDoSimulado(db: Db, id: string) {
  const [c] = await db
    .select({ id: cargos.id, nome: cargos.nome })
    .from(cargos)
    .where(eq(cargos.id, id));
  return c ?? { id, nome: 'Cargo' };
}

function distribuicaoDe(s: Simulado) {
  const d = s.distribuicao;
  return {
    dist: {
      portugues: d.portugues,
      matematica: d.matematica,
      gerais: d.gerais,
      especificos: d.especificos,
    },
    pesos: d.pesos ?? PESOS_PADRAO,
  };
}

/** Assuntos que saem do simulado no modo edital (só aparecem em seções "Fora do edital"). */
async function assuntosForaDoEdital(db: Db, concursoId: string): Promise<string[]> {
  const rows = await db
    .select({
      assuntoId: secoes.assuntoId,
      dentro: sql<boolean>`bool_or(coalesce(${secoes.noEdital}, true))`,
    })
    .from(secoes)
    .innerJoin(unidades, eq(unidades.id, secoes.unidadeId))
    .where(eq(unidades.concursoId, concursoId))
    .groupBy(secoes.assuntoId);
  return rows.filter((r) => !r.dentro).map((r) => r.assuntoId);
}

export async function criarSimulado(
  deps: Deps,
  u: Usuario,
  cargoId: string,
  agora: Date,
): Promise<SimuladoAndamento> {
  const { db } = deps;
  await entregarExpirados(deps, u.id, agora);
  const [aberto] = await db
    .select()
    .from(simulados)
    .where(and(eq(simulados.usuarioId, u.id), isNull(simulados.entregueEm)))
    .orderBy(desc(simulados.iniciadoEm))
    .limit(1);
  if (aberto) return andamento(db, aberto, agora);

  const concurso = await concursoDoUsuario(db, u);
  const [cargo] = await db
    .select()
    .from(cargos)
    .where(and(eq(cargos.id, cargoId), eq(cargos.ativo, true)));
  if (!cargo || (concurso && cargo.concursoId !== concurso.id)) {
    throw falha('validacao', 'Escolha um cargo da lista.', {
      cargoId: 'Escolha um cargo da lista.',
    });
  }
  const edital = concurso ? modoEdital(concurso) : false;
  const fora = edital && concurso ? await assuntosForaDoEdital(db, concurso.id) : [];
  const dist = edital
    ? cargo.distribuicao
    : {
        ...DISTRIBUICAO_PADRAO,
        ...(cargo.distribuicao.pesos ? { pesos: cargo.distribuicao.pesos } : {}),
      };

  const cands = await db
    .select({ id: questoes.id, slug: disciplinas.slug })
    .from(questoes)
    .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
    .where(
      and(
        questaoVisivel(),
        fora.length
          ? sql`${questoes.assuntoId} <> all(${sql.raw(`'{${fora.join(',')}}'`)}::uuid[])`
          : undefined,
        sql`(${disciplinas.slug} <> 'especificos' or ${questoes.areas} @> array[${cargo.area}]::text[])`,
      ),
    )
    // Ordem estável: o sorteio depende só do rng, não da ordem física das linhas.
    .orderBy(asc(questoes.id));
  const porBloco: Partial<Record<SlugDisciplina, string[]>> = {};
  for (const c of cands) (porBloco[c.slug] ??= []).push(c.id);
  const montagem = montarSimulado(porBloco, dist, deps.rng);
  if (!montagem.ok) {
    const falta = montagem.faltando
      .map((f) => `${NOMES_DISCIPLINA[f.bloco]}: ${f.disponiveis} de ${f.necessarias}`)
      .join('; ');
    throw falha(
      'questoes_insuficientes',
      `Ainda não há questões suficientes para o simulado deste cargo (${falta}).`,
    );
  }
  const [s] = await db
    .insert(simulados)
    .values({
      usuarioId: u.id,
      cargoId: cargo.id,
      questoes: montagem.questoes,
      distribuicao: dist,
      respostas: {},
      iniciadoEm: agora,
      terminaEm: terminoDoSimulado(agora),
    })
    .returning();
  return andamento(db, s!, agora);
}

export async function andamento(db: Db, s: Simulado, agora: Date): Promise<SimuladoAndamento> {
  const mapa = await carregarQuestoes(db, s.questoes);
  const { dist } = distribuicaoDe(s);
  return {
    estado: 'andamento',
    id: s.id,
    cargo: await cargoDoSimulado(db, s.cargoId),
    iniciadoEm: iso(s.iniciadoEm),
    terminaEm: iso(s.terminaEm),
    agora: iso(agora),
    msRestantes: msRestantesSimulado(s.terminaEm, agora),
    distribuicao: dist,
    questoes: emOrdem(s.questoes, mapa).map((q, i) => ({
      numero: i + 1,
      bloco: q.disciplina,
      questao: q.aluno,
    })),
    respostas: s.respostas,
  };
}

export async function resultado(db: Db, s: Simulado): Promise<SimuladoResultado> {
  const mapa = await carregarQuestoes(db, s.questoes);
  const { dist, pesos } = distribuicaoDe(s);
  const lista = emOrdem(s.questoes, mapa).map((q, i) => {
    const letra = s.respostas[q.aluno.id]?.letra ?? null;
    const anulada = q.status === 'anulada';
    return {
      numero: i + 1,
      bloco: q.disciplina,
      questao: q.aluno,
      resposta: letra,
      acertou: anulada || letra === q.gabarito,
      anulada,
      gabarito: q.gabarito,
      explicacao: q.explicacao,
      dicaBolso: q.dicaBolso,
    };
  });
  const acertosPorBloco = s.acertosPorBloco ?? contarPorBloco(lista);
  const nota = calcularNota(acertosPorBloco, dist, pesos);
  const fim = s.entregueEm ?? s.terminaEm;
  return {
    estado: 'entregue',
    id: s.id,
    cargo: await cargoDoSimulado(db, s.cargoId),
    iniciadoEm: iso(s.iniciadoEm),
    entregueEm: iso(fim),
    entregaAutomatica: s.entregaAutomatica,
    tempoGastoMs: Math.max(
      0,
      Math.min(fim.getTime(), s.terminaEm.getTime()) - s.iniciadoEm.getTime(),
    ),
    pontos: s.pontos ?? nota.pontos,
    pontosMaximos: nota.pontosMaximos,
    percentual: nota.percentual,
    aprovado: nota.aprovado,
    selo: seloSimulado(nota.aprovado),
    acertos: nota.acertos,
    totalQuestoes: nota.totalQuestoes,
    porBloco: nota.porBloco.map((b) => ({ ...b, nome: NOMES_DISCIPLINA[b.bloco] })),
    xpGanho: s.xpGanho,
    questoes: lista,
  };
}

function contarPorBloco(lista: { bloco: SlugDisciplina; acertou: boolean }[]) {
  const r = Object.fromEntries(ORDEM_BLOCOS.map((b) => [b, 0])) as Record<SlugDisciplina, number>;
  for (const q of lista) if (q.acertou) r[q.bloco]++;
  return r;
}

/** Corrige e fecha o simulado: nota 2,0/2,8, XP, erros na revisão, ofensiva. Idempotente. */
export async function entregar(
  deps: Deps,
  usuarioId: string,
  simuladoId: string,
  agora: Date,
  automatica: boolean,
): Promise<Simulado> {
  return deps.db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(simulados)
      .where(and(eq(simulados.id, simuladoId), eq(simulados.usuarioId, usuarioId)))
      .for('update');
    if (!s) throw falha('nao_encontrado', 'Simulado não encontrado.');
    if (s.entregueEm) return s;
    const u = await travarUsuario(tx, usuarioId);
    // Entrega automática registra o fim no término das 4 h.
    const entregueEm = automatica ? s.terminaEm : agora;
    const mapa = await carregarQuestoes(tx, s.questoes);
    const { dist, pesos } = distribuicaoDe(s);
    const corrigidas = emOrdem(s.questoes, mapa).map((q) => {
      const letra = s.respostas[q.aluno.id]?.letra ?? null;
      const anulada = q.status === 'anulada';
      return { q, letra, anulada, bloco: q.disciplina, acertou: anulada || letra === q.gabarito };
    });
    const acertosPorBloco = contarPorBloco(corrigidas);
    const nota = calcularNota(acertosPorBloco, dist, pesos);
    const xp = xpDoSimulado(nota.acertos, nota.aprovado);

    // As respostas viram tentativas (domínio, estatísticas) numa sessão de estudo do tipo simulado.
    const respondidas = corrigidas.filter((c) => c.letra && !c.anulada);
    const [sessao] = await tx
      .insert(sessoesEstudo)
      .values({
        usuarioId,
        tipo: 'simulado',
        questoes: s.questoes,
        iniciadaEm: s.iniciadoEm,
        concluidaEm: entregueEm,
        xpGanho: xp.total,
        acertos: nota.acertos,
        total: s.questoes.length,
      })
      .returning({ id: sessoesEstudo.id });
    if (respondidas.length) {
      await tx.insert(tentativas).values(
        respondidas.map((c) => ({
          usuarioId,
          questaoId: c.q.aluno.id,
          sessaoEstudoId: sessao!.id,
          resposta: c.letra!,
          acertou: c.acertou,
          respondidaEm: entregueEm,
        })),
      );
    }
    // Todos os erros entram na fila de revisão (respondidas erradas).
    for (const c of respondidas)
      await aplicarRevisao(tx, usuarioId, c.q.aluno.id, c.acertou, entregueEm);

    const [atualizado] = await tx
      .update(simulados)
      .set({
        entregueEm,
        entregaAutomatica: automatica,
        pontos: nota.pontos,
        acertosPorBloco,
        xpGanho: xp.total,
      })
      .where(eq(simulados.id, s.id))
      .returning();
    await creditarXp(tx, u, xp.itens, agora, { simuladoId: s.id });
    await registrarOfensivaSeContou(tx, u, diaSP(entregueEm));
    await verificarConquistas(tx, u, agora);
    return atualizado!;
  });
}

/** Entrega os simulados do aluno (ou de todos) cujo tempo acabou. */
export async function entregarExpirados(
  deps: Deps,
  usuarioId: string | null,
  agora: Date,
): Promise<number> {
  const abertos = await deps.db
    .select({ id: simulados.id, usuarioId: simulados.usuarioId })
    .from(simulados)
    .where(
      and(
        isNull(simulados.entregueEm),
        lte(simulados.terminaEm, agora),
        usuarioId ? eq(simulados.usuarioId, usuarioId) : undefined,
      ),
    );
  for (const s of abertos) await entregar(deps, s.usuarioId, s.id, agora, true);
  return abertos.length;
}

export async function obterSimulado(deps: Deps, u: Usuario, id: string, agora: Date) {
  const [s] = await deps.db
    .select()
    .from(simulados)
    .where(and(eq(simulados.id, id), eq(simulados.usuarioId, u.id)));
  if (!s) throw falha('nao_encontrado', 'Simulado não encontrado.');
  if (!s.entregueEm && simuladoExpirado(s.terminaEm, agora)) {
    return resultado(deps.db, await entregar(deps, u.id, id, agora, true));
  }
  return s.entregueEm ? resultado(deps.db, s) : andamento(deps.db, s, agora);
}

export async function salvarResposta(
  deps: Deps,
  u: Usuario,
  id: string,
  e: {
    questaoId: string;
    letra: SimuladoAndamento['respostas'][string]['letra'];
    revisarDepois?: boolean | undefined;
  },
  agora: Date,
) {
  const expirou = await deps.db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(simulados)
      .where(and(eq(simulados.id, id), eq(simulados.usuarioId, u.id)))
      .for('update');
    if (!s) throw falha('nao_encontrado', 'Simulado não encontrado.');
    if (s.entregueEm) throw falha('simulado_encerrado');
    if (simuladoExpirado(s.terminaEm, agora)) return true;
    if (!s.questoes.includes(e.questaoId))
      throw falha('validacao', 'Essa questão não é deste simulado.');
    const anterior = s.respostas[e.questaoId];
    const respostas = {
      ...s.respostas,
      [e.questaoId]: {
        letra: e.letra,
        revisarDepois: e.revisarDepois ?? anterior?.revisarDepois ?? false,
      },
    };
    await tx.update(simulados).set({ respostas }).where(eq(simulados.id, s.id));
    return {
      ok: true as const,
      msRestantes: msRestantesSimulado(s.terminaEm, agora),
      emBranco: questoesEmBranco(s.questoes, respostas),
    };
  });
  if (expirou === true) {
    await entregar(deps, u.id, id, agora, true);
    throw falha('simulado_encerrado');
  }
  return expirou;
}

export async function historico(deps: Deps, u: Usuario, agora: Date) {
  await entregarExpirados(deps, u.id, agora);
  const lista = await deps.db
    .select()
    .from(simulados)
    .where(eq(simulados.usuarioId, u.id))
    .orderBy(desc(simulados.iniciadoEm));
  const aberto = lista.find((s) => !s.entregueEm);
  const cargosIds = [...new Set(lista.map((s) => s.cargoId))];
  const nomes = cargosIds.length
    ? new Map(
        (
          await deps.db
            .select({ id: cargos.id, nome: cargos.nome })
            .from(cargos)
            .where(inArray(cargos.id, cargosIds))
        ).map((c) => [c.id, c.nome]),
      )
    : new Map<string, string>();
  const cargoDe = (id: string) => ({ id, nome: nomes.get(id) ?? 'Cargo' });
  return {
    emAndamento: aberto
      ? { id: aberto.id, terminaEm: iso(aberto.terminaEm), cargo: cargoDe(aberto.cargoId) }
      : null,
    itens: lista
      .filter((s) => s.entregueEm)
      .map((s) => {
        const { dist, pesos } = distribuicaoDe(s);
        const nota = calcularNota(s.acertosPorBloco ?? {}, dist, pesos);
        return {
          id: s.id,
          cargo: cargoDe(s.cargoId),
          iniciadoEm: iso(s.iniciadoEm),
          entregueEm: iso(s.entregueEm!),
          pontos: nota.pontos,
          percentual: nota.percentual,
          aprovado: nota.aprovado,
          acertos: nota.acertos,
          totalQuestoes: nota.totalQuestoes,
          tempoGastoMs: Math.max(
            0,
            Math.min(s.entregueEm!.getTime(), s.terminaEm.getTime()) - s.iniciadoEm.getTime(),
          ),
        };
      }),
  };
}
