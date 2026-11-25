/**
 * Simulado no padrão FAU (PRD 5.14): relógio no servidor, fechamento automático ao fim do tempo
 * (verificado em toda leitura e por uma varredura periódica da API).
 *
 * D48: dois modos. "prova" tem 4 h corridas; no "treino" o tempo só corre com a prova na tela
 * (sinal do app a cada 30 s) e o prazo é de 7 dias. Se o tempo acaba com menos da metade
 * respondida, o simulado fica "não concluído": sem nota e sem revelar o gabarito. Entregar com
 * menos da metade corrige, mas não dá XP, ofensiva nem conquista. O aluno pode descartar.
 */
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  calcularNota,
  diaSP,
  DISTRIBUICAO_PADRAO,
  DURACAO_SIMULADO_MS,
  minimoRespondidas,
  montarSimulado,
  msRestantesDoModo,
  NOMES_DISCIPLINA,
  ORDEM_BLOCOS,
  PESOS_PADRAO,
  prazoDoSimulado,
  questoesEmBranco,
  simuladoExpirado,
  somarTempoTreino,
  xpDoSimulado,
  type ModoSimulado,
  type SlugDisciplina,
} from '@fuse/shared';
import {
  SELO_SITUACAO,
  seloSimulado,
  type SimuladoAndamento,
  type SimuladoResultado,
} from '@fuse/shared/api';
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
import { provasDoCargo } from './foco.js';
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

const respondidasDe = (s: Simulado) => s.questoes.filter((id) => s.respostas[id]?.letra).length;

/** Tempo de tela do treino até agora (limitado às 4 h). */
const usadosAte = (s: Simulado, agora: Date) =>
  s.modo === 'treino'
    ? Math.min(DURACAO_SIMULADO_MS, somarTempoTreino(s.msUsados, s.ultimoSinalEm, agora))
    : s.msUsados;

const restantesDe = (s: Simulado, agora: Date) =>
  msRestantesDoModo(s.modo, s.terminaEm, s.msUsados, agora);

/** Acabou o prazo (4 h na prova, 7 dias no treino) ou as 4 h de tela do treino. */
const acabouOTempo = (s: Simulado, agora: Date) =>
  simuladoExpirado(s.terminaEm, agora) || restantesDe(s, agora) <= 0;

function tempoGastoDe(s: Simulado): number {
  if (s.modo === 'treino') return s.msUsados;
  const fim = s.entregueEm ?? s.terminaEm;
  return Math.max(0, Math.min(fim.getTime(), s.terminaEm.getTime()) - s.iniciadoEm.getTime());
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
  modo: ModoSimulado = 'prova',
): Promise<SimuladoAndamento> {
  await entregarExpirados(deps, u.id, agora);
  // Linha do aluno travada: dois toques em COMEÇAR não abrem 2 simulados (auditoria PIE R3-06).
  return deps.db.transaction(async (db) => {
    await travarUsuario(db, u.id);
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
    // D45: com o edital publicado, só os cargos do edital (como no /me e na escolha do concurso).
    if (edital && cargo.generico) {
      throw falha('validacao', 'O edital saiu: escolha um cargo do edital.', {
        cargoId: 'Escolha um cargo do edital.',
      });
    }
    const fora = edital && concurso ? await assuntosForaDoEdital(db, concurso.id) : [];
    const dist = edital
      ? cargo.distribuicao
      : {
          ...DISTRIBUICAO_PADRAO,
          ...(cargo.distribuicao.pesos ? { pesos: cargo.distribuicao.pesos } : {}),
        };

    const cands = await db
      .select({ id: questoes.id, slug: disciplinas.slug, prova: questoes.provaOrigemId })
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
    // D46: as específicas saem das provas da profissão do cargo; se não bastarem, vale a área inteira.
    // Não depende do foco da trilha: cargo com as questões num tema só (ex.: Fonoaudiólogo) também usa.
    const provas = new Set(await provasDoCargo(db, cargo.nome));
    const daProfissao = cands
      .filter((c) => c.slug === 'especificos' && c.prova !== null && provas.has(c.prova))
      .map((c) => c.id);
    if (daProfissao.length >= dist.especificos) porBloco.especificos = daProfissao;
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
        terminaEm: prazoDoSimulado(modo, agora),
        modo,
        ultimoSinalEm: modo === 'treino' ? agora : null,
      })
      .returning();
    return andamento(db, s!, agora);
  });
}

export async function andamento(db: Db, s: Simulado, agora: Date): Promise<SimuladoAndamento> {
  const mapa = await carregarQuestoes(db, s.questoes);
  const { dist } = distribuicaoDe(s);
  return {
    estado: 'andamento',
    id: s.id,
    cargo: await cargoDoSimulado(db, s.cargoId),
    modo: s.modo,
    iniciadoEm: iso(s.iniciadoEm),
    terminaEm: iso(s.terminaEm),
    agora: iso(agora),
    msRestantes: restantesDe(s, agora),
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
  const { dist, pesos } = distribuicaoDe(s);
  const situacao = s.situacao ?? 'corrigido';
  const base = {
    estado: 'entregue' as const,
    id: s.id,
    cargo: await cargoDoSimulado(db, s.cargoId),
    modo: s.modo,
    situacao,
    respondidas: respondidasDe(s),
    recompensa: s.recompensa,
    iniciadoEm: iso(s.iniciadoEm),
    entregueEm: iso(s.entregueEm ?? s.terminaEm),
    entregaAutomatica: s.entregaAutomatica,
    tempoGastoMs: tempoGastoDe(s),
    xpGanho: s.xpGanho,
  };
  if (situacao !== 'corrigido') {
    // Sem nota e sem as questões: o gabarito do que ficou sem fazer não é revelado.
    const vazia = calcularNota({}, dist, pesos);
    return {
      ...base,
      pontos: 0,
      pontosMaximos: vazia.pontosMaximos,
      percentual: 0,
      aprovado: false,
      selo: SELO_SITUACAO[situacao],
      acertos: 0,
      totalQuestoes: vazia.totalQuestoes,
      porBloco: [],
      questoes: [],
    };
  }
  const mapa = await carregarQuestoes(db, s.questoes);
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
  return {
    ...base,
    pontos: s.pontos ?? nota.pontos,
    pontosMaximos: nota.pontosMaximos,
    percentual: nota.percentual,
    aprovado: nota.aprovado,
    selo: seloSimulado(nota.aprovado),
    acertos: nota.acertos,
    totalQuestoes: nota.totalQuestoes,
    porBloco: nota.porBloco.map((b) => ({ ...b, nome: NOMES_DISCIPLINA[b.bloco] })),
    questoes: lista,
  };
}

function contarPorBloco(lista: { bloco: SlugDisciplina; acertou: boolean }[]) {
  const r = Object.fromEntries(ORDEM_BLOCOS.map((b) => [b, 0])) as Record<SlugDisciplina, number>;
  for (const q of lista) if (q.acertou) r[q.bloco]++;
  return r;
}

/**
 * Fecha o simulado. Idempotente. Se o tempo acabou (automática, ou entrega pedida depois do fim)
 * com menos da metade respondida: "não concluído", sem nota. Senão corrige (nota 2,0/2,8, erros
 * na revisão) e, com metade ou mais respondida, dá XP, ofensiva e conquistas.
 */
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
    const auto = automatica || acabouOTempo(s, agora);
    const msUsados = usadosAte(s, agora);
    // Fim pelo tempo: a prova registra o término das 4 h; o treino, o momento (até o prazo).
    const entregueEm = !auto
      ? agora
      : s.modo === 'prova' || s.terminaEm < agora
        ? s.terminaEm
        : agora;
    const fechamento = { entregueEm, entregaAutomatica: auto, msUsados };
    const recompensa = respondidasDe(s) >= minimoRespondidas(s.questoes.length);
    if (auto && !recompensa) {
      const [fechado] = await tx
        .update(simulados)
        .set({ ...fechamento, situacao: 'nao_concluido', recompensa: false })
        .where(eq(simulados.id, s.id))
        .returning();
      return fechado!;
    }
    const mapa = await carregarQuestoes(tx, s.questoes);
    const { dist, pesos } = distribuicaoDe(s);
    const corrigidas = emOrdem(s.questoes, mapa).map((q) => {
      const letra = s.respostas[q.aluno.id]?.letra ?? null;
      const anulada = q.status === 'anulada';
      return { q, letra, anulada, bloco: q.disciplina, acertou: anulada || letra === q.gabarito };
    });
    const acertosPorBloco = contarPorBloco(corrigidas);
    const nota = calcularNota(acertosPorBloco, dist, pesos);
    const xp = recompensa ? xpDoSimulado(nota.acertos, nota.aprovado) : { total: 0, itens: [] };

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
        ...fechamento,
        situacao: 'corrigido',
        recompensa,
        pontos: nota.pontos,
        acertosPorBloco,
        xpGanho: xp.total,
      })
      .where(eq(simulados.id, s.id))
      .returning();
    if (recompensa) {
      await creditarXp(tx, u, xp.itens, agora, { simuladoId: s.id });
      await registrarOfensivaSeContou(tx, u, diaSP(entregueEm));
      await verificarConquistas(tx, u, agora);
    }
    return atualizado!;
  });
}

/** Fecha sem nota, sem XP e sem revelar o gabarito (D48). Idempotente. */
export async function descartar(
  deps: Deps,
  usuarioId: string,
  simuladoId: string,
  agora: Date,
): Promise<Simulado> {
  return deps.db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(simulados)
      .where(and(eq(simulados.id, simuladoId), eq(simulados.usuarioId, usuarioId)))
      .for('update');
    if (!s) throw falha('nao_encontrado', 'Simulado não encontrado.');
    if (s.entregueEm) return s;
    const [fechado] = await tx
      .update(simulados)
      .set({
        entregueEm: agora,
        situacao: 'descartado',
        recompensa: false,
        msUsados: usadosAte(s, agora),
      })
      .where(eq(simulados.id, s.id))
      .returning();
    return fechado!;
  });
}

/** O treino está na tela: soma o tempo de tela e fecha se as 4 h acabaram. */
export async function sinalSimulado(deps: Deps, u: Usuario, id: string, agora: Date) {
  const r = await deps.db.transaction(async (tx) => {
    const [s] = await tx
      .select()
      .from(simulados)
      .where(and(eq(simulados.id, id), eq(simulados.usuarioId, u.id)))
      .for('update');
    if (!s) throw falha('nao_encontrado', 'Simulado não encontrado.');
    if (s.entregueEm) throw falha('simulado_encerrado');
    const atual = { ...s, msUsados: usadosAte(s, agora) };
    if (s.modo === 'treino')
      await tx
        .update(simulados)
        .set({ msUsados: atual.msUsados, ultimoSinalEm: agora })
        .where(eq(simulados.id, s.id));
    return { expirou: acabouOTempo(atual, agora), msRestantes: restantesDe(atual, agora) };
  });
  if (r.expirou) {
    await entregar(deps, u.id, id, agora, true);
    throw falha('simulado_encerrado');
  }
  return { msRestantes: r.msRestantes };
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
  if (!s.entregueEm && acabouOTempo(s, agora)) {
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
    const msUsados = usadosAte(s, agora);
    if (acabouOTempo({ ...s, msUsados }, agora)) return true;
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
    await tx
      .update(simulados)
      .set({ respostas, ...(s.modo === 'treino' ? { msUsados, ultimoSinalEm: agora } : {}) })
      .where(eq(simulados.id, s.id));
    return {
      ok: true as const,
      msRestantes: restantesDe({ ...s, msUsados }, agora),
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
      ? {
          id: aberto.id,
          terminaEm: iso(aberto.terminaEm),
          cargo: cargoDe(aberto.cargoId),
          modo: aberto.modo,
          msRestantes: restantesDe(aberto, agora),
        }
      : null,
    itens: lista
      .filter((s) => s.entregueEm)
      .map((s) => {
        const { dist, pesos } = distribuicaoDe(s);
        const nota = calcularNota(s.acertosPorBloco ?? {}, dist, pesos);
        return {
          id: s.id,
          cargo: cargoDe(s.cargoId),
          modo: s.modo,
          situacao: s.situacao ?? 'corrigido',
          respondidas: respondidasDe(s),
          iniciadoEm: iso(s.iniciadoEm),
          entregueEm: iso(s.entregueEm!),
          pontos: nota.pontos,
          percentual: nota.percentual,
          aprovado: nota.aprovado,
          acertos: nota.acertos,
          totalQuestoes: nota.totalQuestoes,
          tempoGastoMs: tempoGastoDe(s),
        };
      }),
  };
}
