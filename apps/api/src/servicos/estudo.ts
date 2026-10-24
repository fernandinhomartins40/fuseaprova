/**
 * Sessões de estudo: lição de trilha, desafio da unidade e revisão (PRD 5.8–5.13, 6).
 */
import { and, asc, count, eq, lte, max, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  calcularCombo,
  comboVisivel,
  diaSP,
  desafioAprovado,
  fraseOfensiva,
  GEMAS,
  gastarDica,
  montarDesafio,
  montarLicao,
  montarRevisao,
  precisaoPercentual,
  sortearNovas,
  tituloAcerto,
  tituloErro,
  vidasAposResposta,
  xpDaResposta,
  xpDaSessao,
  type Letra,
  type Rng,
  type SlugDisciplina,
} from '@fuse/shared';
import type {
  ConcluirSessaoResposta,
  DicaLicao,
  IniciarSessaoResposta,
  ResponderResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { falha } from '../http/erros.js';
import { iso, isoOuNull, type Db } from '../util.js';
import {
  aplicarRevisao,
  creditarXp,
  licoesConcluidasHoje,
  type EfeitoOfensiva,
  membroDaSemana,
  ofensivaHoje,
  registrarOfensivaSeContou,
  semanaDaOfensiva,
  travarUsuario,
  verificarConquistas,
} from './progresso.js';
import { carregarQuestoes, emOrdem, questaoVisivel } from './questoes.js';
import { calcularTrilha, tituloDaLicao, type Licao, type Secao, type Unidade } from './trilha.js';
import { salvarVidas, vidasAtuais } from './usuario.js';

const {
  questoes,
  tentativas,
  revisoes,
  sessoesEstudo,
  licoes,
  secoes,
  assuntos,
  disciplinas,
  usuarios,
  progressoLicoes,
} = schema;

export type SessaoEstudo = typeof schema.sessoesEstudo.$inferSelect;

/* --------------------------------------------------------------- sorteio */

/** Questões visíveis de um assunto, com quantas vezes o aluno já as viu. */
export async function candidatasDoAssunto(
  db: Db,
  usuarioId: string,
  assuntoId: string,
  area: string | null,
) {
  const vistas = db
    .select({
      questaoId: tentativas.questaoId,
      vezes: count().as('vezes'),
      ultima: max(tentativas.respondidaEm).as('ultima'),
    })
    .from(tentativas)
    .where(eq(tentativas.usuarioId, usuarioId))
    .groupBy(tentativas.questaoId)
    .as('vistas');
  const rows = await db
    .select({ id: questoes.id, vezes: vistas.vezes, ultima: vistas.ultima })
    .from(questoes)
    .leftJoin(vistas, eq(vistas.questaoId, questoes.id))
    .where(
      and(
        eq(questoes.assuntoId, assuntoId),
        questaoVisivel(),
        area ? sql`${questoes.areas} @> array[${area}]::text[]` : undefined,
      ),
    )
    // Ordem estável: o sorteio depende só do rng, não da ordem física das linhas.
    .orderBy(asc(questoes.id));
  return rows.map((r) => ({
    id: r.id,
    vezesRespondida: Number(r.vezes ?? 0),
    ultimaRespostaEm: r.ultima ? new Date(r.ultima as unknown as string) : null,
  }));
}

/** Itens de revisão vencidos (e visíveis), dos mais atrasados para os mais novos. */
export async function revisoesVencidas(
  db: Db,
  usuarioId: string,
  agora: Date,
  disciplina?: SlugDisciplina,
) {
  return db
    .select({ questaoId: revisoes.questaoId, venceEm: revisoes.venceEm })
    .from(revisoes)
    .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
    .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
    .where(
      and(
        eq(revisoes.usuarioId, usuarioId),
        eq(revisoes.status, 'ativa'),
        lte(revisoes.venceEm, agora),
        questaoVisivel(),
        disciplina ? eq(disciplinas.slug, disciplina) : undefined,
      ),
    )
    .orderBy(asc(revisoes.venceEm));
}

export interface ContextoLicao {
  licao: Licao;
  secao: Secao;
  unidade: Unidade;
  /** Seções da unidade que estão na trilha (para o desafio). */
  secoesDaUnidade: Secao[];
}

/** Sorteia as questões de uma lição normal (novas + 1 revisão) ou do desafio. */
export async function sortearQuestoesDaLicao(
  db: Db,
  usuarioId: string,
  c: ContextoLicao,
  agora: Date,
  rng: Rng,
  opcoes: { semRevisao?: boolean } = {},
): Promise<{ ids: string[]; revisao: Set<string> }> {
  const area = c.unidade.area;
  if (c.licao.tipo === 'desafio') {
    const porAssunto = await Promise.all(
      [...new Set(c.secoesDaUnidade.map((s) => s.assuntoId))].map(async (a) =>
        (await candidatasDoAssunto(db, usuarioId, a, area)).map((q) => q.id),
      ),
    );
    return { ids: montarDesafio(porAssunto, rng, c.licao.tamanho), revisao: new Set() };
  }
  const cands = await candidatasDoAssunto(db, usuarioId, c.secao.assuntoId, area);
  const novas = sortearNovas(cands, c.licao.tamanho, rng);
  const vencidas = opcoes.semRevisao
    ? []
    : (await revisoesVencidas(db, usuarioId, agora)).map((v) => v.questaoId);
  const montada = montarLicao({ novas, revisoesVencidas: vencidas, tamanho: c.licao.tamanho, rng });
  return {
    ids: montada.map((m) => m.questaoId),
    revisao: new Set(montada.filter((m) => m.revisao).map((m) => m.questaoId)),
  };
}

export function dicaDaLicao(
  l: Licao,
  a: {
    nome: string;
    dicaTitulo: string | null;
    dicaTexto: string | null;
    dicaExemplo: string | null;
  },
): DicaLicao | null {
  const texto = l.dicaTexto?.trim() || a.dicaTexto?.trim();
  if (!texto) return null;
  return {
    titulo: (l.dicaTexto?.trim() ? l.dicaTitulo : a.dicaTitulo)?.trim() || a.nome,
    texto,
    exemplo: (l.dicaTexto?.trim() ? l.dicaExemplo : a.dicaExemplo)?.trim() || null,
  };
}

/* --------------------------------------------------------------- iniciar */

async function respostaInicio(
  db: Db,
  u: Usuario,
  sessao: SessaoEstudo,
  revisao: Set<string>,
  extra: { licao: IniciarSessaoResposta['licao']; dica: DicaLicao | null },
  agora: Date,
): Promise<IniciarSessaoResposta> {
  const mapa = await carregarQuestoes(db, sessao.questoes, { revisao });
  const vidas = vidasAtuais(u, agora);
  return {
    sessaoId: sessao.id,
    tipo: sessao.tipo,
    licao: extra.licao,
    dica: extra.dica,
    questoes: emOrdem(sessao.questoes, mapa).map((q) => q.aluno),
    gastaVidas: sessao.tipo === 'licao',
    vidas: vidas.vidas,
    proximaVidaEm: isoOuNull(vidas.proximaVidaEm),
    gemas: u.gemas,
    iniciadaEm: iso(sessao.iniciadaEm),
  };
}

/** Lição da trilha que o aluno pode abrir (a atual ou uma concluída). */
export async function licaoAbrivel(db: Db, u: Usuario, licaoId: string): Promise<ContextoLicao> {
  const t = await calcularTrilha(db, u);
  const no = t?.nos.get(licaoId);
  if (!t || !no) {
    const [existe] = await db.select({ id: licoes.id }).from(licoes).where(eq(licoes.id, licaoId));
    if (!existe) throw falha('nao_encontrado', 'Lição não encontrada.');
    throw falha('licao_bloqueada');
  }
  if (!no.podeAbrir) throw falha('licao_bloqueada');
  const secoesDaUnidade = [...t.nos.values()]
    .filter((n) => n.unidade.id === no.unidade.id)
    .map((n) => n.secao)
    .filter((s, i, l) => l.findIndex((x) => x.id === s.id) === i);
  return { licao: no.licao, secao: no.secao, unidade: no.unidade, secoesDaUnidade };
}

export async function iniciarLicao(
  deps: Deps,
  usuario: Usuario,
  licaoId: string,
  agora: Date,
): Promise<IniciarSessaoResposta> {
  const { db } = deps;
  const c = await licaoAbrivel(db, usuario, licaoId);
  if (c.licao.tipo === 'bau') throw falha('conflito', 'Toque no baú para abrir.');
  const tipo = c.licao.tipo === 'desafio' ? 'desafio' : 'licao';
  return db.transaction(async (tx) => {
    const u = await travarUsuario(tx, usuario.id);
    if (tipo === 'licao') {
      const vidas = vidasAtuais(u, agora);
      await salvarVidas(tx, u, vidas);
      if (vidas.vidas <= 0) throw falha('sem_vidas');
    }
    const { ids, revisao } = await sortearQuestoesDaLicao(tx, u.id, c, agora, deps.rng);
    if (ids.length === 0) throw falha('questoes_insuficientes');
    const [sessao] = await tx
      .insert(sessoesEstudo)
      .values({
        usuarioId: u.id,
        tipo,
        licaoId: c.licao.id,
        questoes: ids,
        total: ids.length,
        iniciadaEm: agora,
      })
      .returning();
    const [a] = await tx.select().from(assuntos).where(eq(assuntos.id, c.secao.assuntoId));
    return respostaInicio(
      tx,
      u,
      sessao!,
      revisao,
      {
        licao: {
          id: c.licao.id,
          titulo: tituloDaLicao(c.licao, c.secao),
          tipo: c.licao.tipo,
          tamanho: c.licao.tamanho,
        },
        dica: tipo === 'desafio' || !a ? null : dicaDaLicao(c.licao, a),
      },
      agora,
    );
  });
}

export async function abrirBau(deps: Deps, usuario: Usuario, licaoId: string, agora: Date) {
  const c = await licaoAbrivel(deps.db, usuario, licaoId);
  if (c.licao.tipo !== 'bau') throw falha('conflito', 'Isto não é um baú.');
  return deps.db.transaction(async (tx) => {
    const u = await travarUsuario(tx, usuario.id);
    const [p] = await tx
      .select()
      .from(progressoLicoes)
      .where(and(eq(progressoLicoes.usuarioId, u.id), eq(progressoLicoes.licaoId, licaoId)));
    if (p?.concluidaEm) throw falha('conflito', 'Este baú já foi aberto.');
    await tx
      .insert(progressoLicoes)
      .values({ usuarioId: u.id, licaoId, vezes: 1, concluidaEm: agora, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: [progressoLicoes.usuarioId, progressoLicoes.licaoId],
        set: { vezes: 1, concluidaEm: agora, atualizadoEm: agora },
      });
    const gemas = u.gemas + GEMAS.ABRIR_BAU;
    await tx.update(usuarios).set({ gemas }).where(eq(usuarios.id, u.id));
    return { gemasGanhas: GEMAS.ABRIR_BAU, gemas };
  });
}

export async function iniciarRevisao(
  deps: Deps,
  usuario: Usuario,
  filtro: { disciplina?: SlugDisciplina | undefined; sessaoOrigemId?: string | undefined },
  agora: Date,
): Promise<IniciarSessaoResposta> {
  const { db } = deps;
  let ids: string[];
  if (filtro.sessaoOrigemId) {
    // REVISAR ERROS (n): os erros desta sessão, vencidos ou não.
    const [origem] = await db
      .select()
      .from(sessoesEstudo)
      .where(
        and(eq(sessoesEstudo.id, filtro.sessaoOrigemId), eq(sessoesEstudo.usuarioId, usuario.id)),
      );
    if (!origem) throw falha('nao_encontrado', 'Sessão não encontrada.');
    const erradas = await db
      .selectDistinct({ id: tentativas.questaoId })
      .from(tentativas)
      .innerJoin(questoes, eq(questoes.id, tentativas.questaoId))
      .where(
        and(
          eq(tentativas.sessaoEstudoId, origem.id),
          eq(tentativas.acertou, false),
          questaoVisivel(),
        ),
      );
    const set = new Set(erradas.map((e) => e.id));
    ids = origem.questoes.filter((q) => set.has(q)).slice(0, 10);
  } else {
    ids = montarRevisao(await revisoesVencidas(db, usuario.id, agora, filtro.disciplina));
  }
  if (ids.length === 0)
    throw falha('questoes_insuficientes', 'Nada para revisar hoje. Que tal uma lição nova?');
  const [sessao] = await db
    .insert(sessoesEstudo)
    .values({
      usuarioId: usuario.id,
      tipo: 'revisao',
      questoes: ids,
      total: ids.length,
      sessaoOrigemId: filtro.sessaoOrigemId ?? null,
      iniciadaEm: agora,
    })
    .returning();
  return respostaInicio(db, usuario, sessao!, new Set(ids), { licao: null, dica: null }, agora);
}

/* ------------------------------------------------------------- responder */

async function sessaoAberta(tx: Db, usuarioId: string, sessaoId: string): Promise<SessaoEstudo> {
  const [s] = await tx
    .select()
    .from(sessoesEstudo)
    .where(and(eq(sessoesEstudo.id, sessaoId), eq(sessoesEstudo.usuarioId, usuarioId)))
    .for('update');
  if (!s || s.tipo === 'simulado') throw falha('nao_encontrado', 'Sessão não encontrada.');
  if (s.concluidaEm) throw falha('sessao_encerrada');
  return s;
}

async function tentativasDaSessao(tx: Db, sessaoId: string) {
  return tx
    .select()
    .from(tentativas)
    .where(eq(tentativas.sessaoEstudoId, sessaoId))
    .orderBy(asc(tentativas.respondidaEm), asc(tentativas.id));
}

export interface EntradaResposta {
  questaoId: string;
  resposta: Letra;
  tempoMs: number;
  idCliente?: string | undefined;
}

export async function responder(
  deps: Deps,
  usuario: Usuario,
  sessaoId: string,
  e: EntradaResposta,
  agora: Date,
): Promise<ResponderResposta> {
  return deps.db.transaction(async (tx) => {
    const s = await sessaoAberta(tx, usuario.id, sessaoId);
    if (!s.questoes.includes(e.questaoId))
      throw falha('validacao', 'Essa questão não é desta sessão.');
    const u = await travarUsuario(tx, usuario.id);
    const [q] = emOrdem([e.questaoId], await carregarQuestoes(tx, [e.questaoId]));
    if (!q) throw falha('nao_encontrado', 'Questão não encontrada.');
    let feitas = await tentativasDaSessao(tx, s.id);
    const anterior =
      feitas.find((t) => e.idCliente && t.idCliente === e.idCliente) ??
      feitas.find((t) => t.questaoId === e.questaoId);
    let acertou: boolean;
    let xpGanho = 0;
    if (anterior) {
      // Repetição (mesmo id_cliente ou questão já respondida): devolve o mesmo resultado, sem efeitos.
      acertou = anterior.acertou;
    } else {
      if (s.tipo === 'licao') {
        const v = vidasAtuais(u, agora);
        if (v.vidas <= 0) throw falha('sem_vidas');
      }
      if (q.gabaritoReal === null)
        throw falha('conflito', 'Essa questão foi anulada. Siga para a próxima.');
      acertou = e.resposta === q.gabarito;
      const vidas = vidasAposResposta(
        { vidas: u.vidas, atualizadoEm: u.vidasAtualizadoEm },
        s.tipo,
        acertou,
        agora,
      );
      await salvarVidas(tx, u, vidas);
      const [t] = await tx
        .insert(tentativas)
        .values({
          idCliente: e.idCliente ?? null,
          usuarioId: u.id,
          questaoId: q.aluno.id,
          sessaoEstudoId: s.id,
          resposta: e.resposta,
          acertou,
          usouDica: s.dicasUsadas.includes(q.aluno.id),
          tempoMs: e.tempoMs,
          respondidaEm: agora,
        })
        .returning();
      feitas = [...feitas, t!];
      await aplicarRevisao(tx, u.id, q.aluno.id, acertou, agora);
      xpGanho = xpDaResposta(s.tipo, acertou);
      if (xpGanho > 0) {
        await creditarXp(tx, u, [{ tipo: 'acerto', valor: xpGanho }], agora, {
          sessaoEstudoId: s.id,
        });
      }
      if (acertou) {
        await tx
          .update(sessoesEstudo)
          .set({ acertos: sql`${sessoesEstudo.acertos} + 1` })
          .where(eq(sessoesEstudo.id, s.id));
      }
    }
    // Ordem das respostas: hora e, no empate, a posição da questão na sessão.
    const pos = (id: string) => s.questoes.indexOf(id);
    const ordenadas = [...feitas].sort(
      (a, b) =>
        a.respondidaEm.getTime() - b.respondidaEm.getTime() || pos(a.questaoId) - pos(b.questaoId),
    );
    const combo = calcularCombo(ordenadas.map((t) => t.acertou));
    const vidas = vidasAtuais(u, agora);
    const acertosSessao = feitas.filter((t) => t.acertou).length;
    return {
      acertou,
      gabarito: q.gabarito,
      explicacao: q.explicacao,
      dicaBolso: q.dicaBolso,
      titulo: acertou ? tituloAcerto(u.nome, deps.rng) : tituloErro(q.gabarito),
      xpGanho,
      xpSessao: acertosSessao * xpDaResposta(s.tipo, true),
      combo,
      comboVisivel: comboVisivel(combo),
      vidas: vidas.vidas,
      proximaVidaEm: isoOuNull(vidas.proximaVidaEm),
      semVidas: s.tipo === 'licao' && vidas.vidas <= 0,
      voltaNaRevisao: !acertou,
      respondidas: feitas.length,
      total: s.questoes.length,
    };
  });
}

export async function usarDica(deps: Deps, usuario: Usuario, sessaoId: string, questaoId: string) {
  return deps.db.transaction(async (tx) => {
    const s = await sessaoAberta(tx, usuario.id, sessaoId);
    if (s.tipo === 'desafio') throw falha('conflito', 'O desafio da unidade não tem dica.');
    if (!s.questoes.includes(questaoId))
      throw falha('validacao', 'Essa questão não é desta sessão.');
    const [q] = emOrdem([questaoId], await carregarQuestoes(tx, [questaoId]));
    if (!q?.dica) throw falha('nao_encontrado', 'Essa questão não tem dica.');
    const u = await travarUsuario(tx, usuario.id);
    if (s.dicasUsadas.includes(questaoId)) return { dica: q.dica, gemas: u.gemas };
    const respondida = await tx
      .select({ id: tentativas.id })
      .from(tentativas)
      .where(and(eq(tentativas.sessaoEstudoId, s.id), eq(tentativas.questaoId, questaoId)));
    if (respondida.length) throw falha('conflito', 'Você já respondeu essa questão.');
    const g = gastarDica(u.gemas);
    if (!g.ok) throw falha(g.codigo, g.erro);
    await tx.update(usuarios).set({ gemas: g.gemas }).where(eq(usuarios.id, u.id));
    await tx
      .update(sessoesEstudo)
      .set({ dicasUsadas: sql`array_append(${sessoesEstudo.dicasUsadas}, ${questaoId}::uuid)` })
      .where(eq(sessoesEstudo.id, s.id));
    return { dica: q.dica, gemas: g.gemas };
  });
}

/* --------------------------------------------------------------- concluir */

/**
 * Fecha uma sessão: bônus de XP, gemas, progresso da lição, ofensiva e conquistas.
 * Usado também pelo sync offline (com `agora` = hora da conclusão no aparelho).
 */
export async function finalizarSessao(
  tx: Db,
  u: Usuario,
  s: SessaoEstudo,
  agora: Date,
  opcoes: { diaOfensiva?: string } = {},
): Promise<Omit<ConcluirSessaoResposta, 'ofensiva' | 'liga'> & { contouOfensiva: EfeitoOfensiva }> {
  const feitas = await tentativasDaSessao(tx, s.id);
  const acertos = feitas.filter((t) => t.acertou).length;
  const total = feitas.length;
  const tipo = s.tipo as 'licao' | 'desafio' | 'revisao';
  const resumo = xpDaSessao(tipo, acertos, total);
  const bonus = resumo.itens.filter((i) => i.tipo !== 'acerto');
  await creditarXp(tx, u, bonus, agora, { sessaoEstudoId: s.id });
  let gemasGanhas = 0;
  let coroa = false;
  let tituloLicao: string | null = null;
  if (tipo !== 'revisao') {
    gemasGanhas += GEMAS.CONCLUIR_LICAO;
    if (s.licaoId) {
      const precisao = precisaoPercentual(acertos, total);
      await tx
        .insert(progressoLicoes)
        .values({
          usuarioId: u.id,
          licaoId: s.licaoId,
          vezes: 1,
          melhorPrecisao: precisao,
          concluidaEm: agora,
          atualizadoEm: agora,
        })
        .onConflictDoUpdate({
          target: [progressoLicoes.usuarioId, progressoLicoes.licaoId],
          set: {
            vezes: sql`${progressoLicoes.vezes} + 1`,
            melhorPrecisao: sql`greatest(coalesce(${progressoLicoes.melhorPrecisao}, 0), ${precisao})`,
            concluidaEm: sql`coalesce(${progressoLicoes.concluidaEm}, ${agora.toISOString()}::timestamptz)`,
            atualizadoEm: agora,
          },
        });
      const [l] = await tx
        .select({ licao: licoes, secao: secoes })
        .from(licoes)
        .innerJoin(secoes, eq(secoes.id, licoes.secaoId))
        .where(eq(licoes.id, s.licaoId));
      if (l) tituloLicao = tituloDaLicao(l.licao, l.secao);
    }
    coroa = tipo === 'desafio' && desafioAprovado(acertos, total);
  }
  if (gemasGanhas) {
    await tx
      .update(usuarios)
      .set({ gemas: sql`${usuarios.gemas} + ${gemasGanhas}` })
      .where(eq(usuarios.id, u.id));
    u.gemas += gemasGanhas;
  }
  await tx
    .update(sessoesEstudo)
    .set({ concluidaEm: agora, acertos, total, xpGanho: resumo.total })
    .where(eq(sessoesEstudo.id, s.id));
  const contouOfensiva = await registrarOfensivaSeContou(tx, u, opcoes.diaOfensiva ?? diaSP(agora));
  gemasGanhas += contouOfensiva.gemasGanhas;
  const conquistasNovas = await verificarConquistas(tx, u, agora);
  const tempoMs = Math.max(0, agora.getTime() - s.iniciadaEm.getTime());
  return {
    tipo,
    tituloLicao,
    xpGanho: resumo.total,
    itensXp: resumo.itens,
    acertos,
    total,
    precisao: precisaoPercentual(acertos, total),
    tempoMs,
    erros: [...new Set(feitas.filter((t) => !t.acertou).map((t) => t.questaoId))],
    gemasGanhas,
    gemas: u.gemas,
    xpTotal: u.xpTotal,
    vidas: vidasAtuais(u, agora).vidas,
    conquistasNovas,
    coroa,
    contouOfensiva,
  };
}

export async function concluir(
  deps: Deps,
  usuario: Usuario,
  sessaoId: string,
  agora: Date,
): Promise<ConcluirSessaoResposta> {
  return deps.db.transaction(async (tx) => {
    const s = await sessaoAberta(tx, usuario.id, sessaoId);
    const [n] = await tx
      .select({ n: count() })
      .from(tentativas)
      .where(eq(tentativas.sessaoEstudoId, s.id));
    if (Number(n?.n ?? 0) < s.questoes.length) {
      throw falha('conflito', 'Responda todas as questões antes de concluir.');
    }
    const u = await travarUsuario(tx, usuario.id);
    // A ofensiva pode já ter sido zerada pelo job das 00:05 (ofensiva 0 com dia anterior gravado).
    const jaZerada =
      u.ofensiva === 0 && u.ultimoDiaEstudo !== null && u.ultimoDiaEstudo < diaSP(agora);
    const { contouOfensiva, ...r } = await finalizarSessao(tx, u, s, agora);
    const reg = contouOfensiva.registro;
    const meta = u.metaDiaria;
    const feitasHoje = await licoesConcluidasHoje(tx, u.id, agora);
    const valor = ofensivaHoje(u, agora);
    const membro = await membroDaSemana(tx, u.id, agora);
    return {
      ...r,
      ofensiva: {
        valor,
        recorde: u.ofensivaRecorde,
        mostrarTela: Boolean(reg?.primeiroDoDia),
        marco: reg?.primeiroDoDia ? reg.marco : null,
        protetorUsado: (reg?.quebra.protetoresUsados ?? 0) > 0,
        zerou: Boolean(reg?.primeiroDoDia && (reg.quebra.zerou || jaZerada)),
        frase: fraseOfensiva(valor),
        semana: await semanaDaOfensiva(tx, u.id, agora),
        metaHoje: { feitas: feitasHoje, meta, cumprida: feitasHoje >= meta },
      },
      liga: { entrou: membro !== null, xpSemana: membro?.xpSemana ?? 0 },
    };
  });
}
