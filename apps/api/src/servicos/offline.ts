/**
 * Offline (PRD 8.4): pacote com as próximas 3 lições e a revisão vencida (gabarito cifrado,
 * D7) e sync idempotente por id_cliente, com recálculo de tudo no servidor.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { cifrarTexto, gerarChaveOffline, MS_DIA, xpDaResposta } from '@fuse/shared';
import type { PacoteOfflineResposta, SyncEntrada, SyncResposta } from '@fuse/shared/api';
import type { z } from 'zod';
import type { Deps, Usuario } from '../contexto.js';
import { iso, type Db } from '../util.js';
import { dicaDaLicao, finalizarSessao, licaoAbrivel, revisoesVencidas, sortearQuestoesDaLicao } from './estudo.js';
import { aplicarRevisao, creditarXp, ofensivaHoje, travarUsuario } from './progresso.js';
import { carregarQuestoes, emOrdem, type QuestaoCompleta } from './questoes.js';
import { calcularTrilha, tituloDaLicao } from './trilha.js';
import { concursoDoUsuario, revisoesPendentes, vidasAtuais } from './usuario.js';

const { assuntos, licoes, pacotesOffline, revisoes, secoes, sessoesEstudo, tentativas } = schema;

const LIMITE_REVISAO_PACOTE = 200;
const VALIDADE_PACOTE_MS = 7 * MS_DIA;

async function cifrarQuestao(chave: string, q: QuestaoCompleta) {
  const claro = JSON.stringify({ gabarito: q.gabarito, explicacao: q.explicacao, dicaBolso: q.dicaBolso, dica: q.dica });
  return { ...q.aluno, cifrado: await cifrarTexto(chave, q.aluno.id, claro) };
}

export async function montarPacote(deps: Deps, u: Usuario, agora: Date): Promise<PacoteOfflineResposta> {
  const { db } = deps;
  const chave = gerarChaveOffline();
  const t = await calcularTrilha(db, u);
  const licoesPacote: PacoteOfflineResposta['licoes'] = [];
  if (t) {
    const iAtual = t.ordem.findIndex((id) => t.nos.get(id)!.estado === 'atual');
    const proximas = (iAtual < 0 ? [] : t.ordem.slice(iAtual))
      .map((id) => t.nos.get(id)!)
      .filter((n) => n.licao.tipo === 'normal')
      .slice(0, 3);
    for (const n of proximas) {
      const { ids } = await sortearQuestoesDaLicao(
        db,
        u.id,
        { licao: n.licao, secao: n.secao, unidade: n.unidade, secoesDaUnidade: [n.secao] },
        agora,
        deps.rng,
        { semRevisao: true },
      );
      const mapa = await carregarQuestoes(db, ids, { soVisiveis: true });
      const [a] = await db.select().from(assuntos).where(eq(assuntos.id, n.secao.assuntoId));
      licoesPacote.push({
        licao: { id: n.licao.id, titulo: tituloDaLicao(n.licao, n.secao), tipo: n.licao.tipo, tamanho: n.licao.tamanho },
        dica: a ? dicaDaLicao(n.licao, a) : null,
        questoes: await Promise.all(emOrdem(ids, mapa).map((q) => cifrarQuestao(chave, q))),
      });
    }
  }
  const vencidas = (await revisoesVencidas(db, u.id, agora)).slice(0, LIMITE_REVISAO_PACOTE).map((v) => v.questaoId);
  const mapaRev = await carregarQuestoes(db, vencidas, { soVisiveis: true, revisao: new Set(vencidas) });
  const concurso = await concursoDoUsuario(db, u);
  const pacoteId = randomUUID();
  const expiraEm = new Date(agora.getTime() + VALIDADE_PACOTE_MS);
  await db.insert(pacotesOffline).values({ id: pacoteId, usuarioId: u.id, geradoEm: agora, expiraEm });
  return {
    pacoteId,
    geradoEm: iso(agora),
    expiraEm: iso(expiraEm),
    versaoConteudo: concurso?.versaoConteudo ?? 1,
    chave,
    licoes: licoesPacote,
    revisao: await Promise.all(emOrdem(vencidas, mapaRev).map((q) => cifrarQuestao(chave, q))),
  };
}

type Lote = z.output<typeof SyncEntrada>;
type SessaoLote = Lote['sessoes'][number];
type TentativaLote = Lote['tentativas'][number];
type LimiteLicao = { assuntoId: string; tamanho: number };

/** Prende a data do aparelho entre `piso` e `agora` (o relógio do aparelho não é confiável). */
function noIntervalo(d: Date, piso: Date, agora: Date): Date {
  if (d.getTime() > agora.getTime()) return agora;
  return d.getTime() < piso.getTime() ? piso : d;
}

/**
 * Só vale o que o aparelho pode ter feito com um pacote: lição normal liberada na trilha (na
 * ordem em que foi feita), questões do assunto da lição ou revisões vencidas, cada uma uma vez
 * por sessão, e datas entre a geração do pacote e o envio (sem pacote conhecido, vale agora).
 */
export async function sincronizar(deps: Deps, usuario: Usuario, lote: Lote, agora: Date): Promise<SyncResposta> {
  return deps.db.transaction(async (tx) => {
    const u = await travarUsuario(tx, usuario.id);
    const xpAntes = u.xpTotal;
    const aceitas: string[] = [];
    const duplicadas: string[] = [];
    const rejeitadas: SyncResposta['rejeitadas'] = [];

    // 1) Pacotes emitidos para este aluno: o início da janela de datas aceitas.
    const idsPacote = [
      ...new Set([lote.pacoteId, ...lote.sessoes.map((s) => s.pacoteId)].filter((x): x is string => !!x)),
    ];
    const geracao = new Map(
      (idsPacote.length
        ? await tx
            .select({ id: pacotesOffline.id, geradoEm: pacotesOffline.geradoEm })
            .from(pacotesOffline)
            .where(and(eq(pacotesOffline.usuarioId, u.id), inArray(pacotesOffline.id, idsPacote)))
        : []
      ).map((p) => [p.id, p.geradoEm]),
    );
    const pisoDa = (s: SessaoLote) => geracao.get(s.pacoteId ?? lote.pacoteId ?? '') ?? agora;

    // 2) Sessões do lote e de lotes anteriores (idempotentes por id_cliente).
    const sessoesLote = new Map(lote.sessoes.map((s) => [s.idCliente, s]));
    const idsClienteSessao = [...new Set([...sessoesLote.keys(), ...lote.tentativas.map((t) => t.sessaoIdCliente)])];
    const jaGravadas = new Map(
      (idsClienteSessao.length
        ? await tx
            .select()
            .from(sessoesEstudo)
            .where(and(eq(sessoesEstudo.usuarioId, u.id), inArray(sessoesEstudo.idCliente, idsClienteSessao)))
        : []
      ).map((s) => [s.idCliente!, s]),
    );
    const tentativasPorSessao = new Map<string, TentativaLote[]>();
    for (const t of lote.tentativas) {
      tentativasPorSessao.set(t.sessaoIdCliente, [...(tentativasPorSessao.get(t.sessaoIdCliente) ?? []), t]);
    }
    const idsCliente = lote.tentativas.map((t) => t.idCliente);
    const existentes = new Set(
      idsCliente.length
        ? (
            await tx
              .select({ id: tentativas.idCliente })
              .from(tentativas)
              .where(and(eq(tentativas.usuarioId, u.id), inArray(tentativas.idCliente, idsCliente)))
          ).map((x) => x.id)
        : [],
    );
    const mapa = await carregarQuestoes(tx, [...new Set(lote.tentativas.map((t) => t.questaoId))]);
    const vistasNoLote = new Set<string>();
    const licoesNoLote = new Set<string>();

    // 3) Em ordem cronológica: a 2ª lição do pacote só abre depois que a 1ª foi concluída.
    const inicio = (id: string) =>
      sessoesLote.get(id)?.iniciadaEm ?? jaGravadas.get(id)?.iniciadaEm.toISOString() ?? '';
    const ordem = [...idsClienteSessao].sort((a, b) => inicio(a).localeCompare(inicio(b)));

    for (const idCliente of ordem) {
      const off = sessoesLote.get(idCliente);
      let s = jaGravadas.get(idCliente);
      let motivo = 'Sessão desconhecida.';
      if (!s && off) {
        const valida = await validarSessaoOffline(tx, u, off, licoesNoLote);
        if (valida === true) {
          [s] = await tx
            .insert(sessoesEstudo)
            .values({
              usuarioId: u.id,
              tipo: off.tipo,
              licaoId: off.licaoId,
              idCliente,
              iniciadaEm: noIntervalo(new Date(off.iniciadaEm), pisoDa(off), agora),
            })
            .returning();
          if (off.licaoId) licoesNoLote.add(off.licaoId);
        } else {
          motivo = valida;
        }
      }
      const lista = [...(tentativasPorSessao.get(idCliente) ?? [])].sort((a, b) =>
        a.respondidaEm.localeCompare(b.respondidaEm),
      );
      if (!s) {
        for (const t of lista) {
          if (existentes.has(t.idCliente)) duplicadas.push(t.idCliente);
          else rejeitadas.push({ idCliente: t.idCliente, motivo });
        }
        continue;
      }
      const sessao = s;

      let licao: LimiteLicao | null = null;
      if (sessao.tipo === 'licao' && sessao.licaoId) {
        const [l] = await tx
          .select({ assuntoId: secoes.assuntoId, tamanho: licoes.tamanho })
          .from(licoes)
          .innerJoin(secoes, eq(secoes.id, licoes.secaoId))
          .where(eq(licoes.id, sessao.licaoId));
        licao = l ?? null;
      }
      const respondidas = new Set(
        (
          await tx
            .select({ questaoId: tentativas.questaoId })
            .from(tentativas)
            .where(eq(tentativas.sessaoEstudoId, sessao.id))
        ).map((x) => x.questaoId),
      );

      // 4) Tentativas recalculadas com o gabarito do servidor.
      for (const t of lista) {
        if (existentes.has(t.idCliente) || vistasNoLote.has(t.idCliente)) {
          duplicadas.push(t.idCliente);
          continue;
        }
        const q = mapa.get(t.questaoId);
        const recusa = await recusaDaTentativa(tx, u.id, sessao.tipo, licao, respondidas, q, agora);
        if (recusa !== null || !q) {
          rejeitadas.push({ idCliente: t.idCliente, motivo: recusa ?? 'Questão indisponível (retirada do ar).' });
          continue;
        }
        vistasNoLote.add(t.idCliente);
        respondidas.add(q.aluno.id);
        const em = noIntervalo(new Date(t.respondidaEm), sessao.iniciadaEm, agora);
        const acertou = t.resposta === q.gabarito;
        await tx.insert(tentativas).values({
          idCliente: t.idCliente,
          usuarioId: u.id,
          questaoId: q.aluno.id,
          sessaoEstudoId: sessao.id,
          resposta: t.resposta,
          acertou,
          tempoMs: t.tempoMs,
          respondidaEm: em,
          offline: true,
        });
        await aplicarRevisao(tx, u.id, q.aluno.id, acertou, em);
        const xp = xpDaResposta(sessao.tipo, acertou);
        if (xp > 0) await creditarXp(tx, u, [{ tipo: 'acerto', valor: xp }], agora, { sessaoEstudoId: sessao.id });
        aceitas.push(t.idCliente);
      }

      // 5) Sessão concluída no aparelho: bônus, gemas, progresso e ofensiva (uma vez só).
      if (sessao.concluidaEm || !off?.concluidaEm) continue;
      const feitas = await tx
        .select({ questaoId: tentativas.questaoId, acertou: tentativas.acertou })
        .from(tentativas)
        .where(eq(tentativas.sessaoEstudoId, sessao.id));
      if (feitas.length === 0) continue;
      const qs = [...new Set(feitas.map((f) => f.questaoId))];
      await tx
        .update(sessoesEstudo)
        .set({ questoes: qs, total: qs.length, acertos: feitas.filter((f) => f.acertou).length })
        .where(eq(sessoesEstudo.id, sessao.id));
      const concluidaEm = noIntervalo(new Date(off.concluidaEm), sessao.iniciadaEm, agora);
      await finalizarSessao(tx, u, { ...sessao, questoes: qs }, concluidaEm);
    }

    return {
      aceitas,
      duplicadas,
      rejeitadas,
      xpGanho: u.xpTotal - xpAntes,
      me: {
        xpTotal: u.xpTotal,
        gemas: u.gemas,
        vidas: vidasAtuais(u, agora).vidas,
        ofensiva: ofensivaHoje(u, agora),
        revisoesPendentes: await revisoesPendentes(tx, u.id, agora),
      },
    };
  });
}

/** true se a sessão offline pode existir; senão, o motivo da recusa das tentativas dela. */
async function validarSessaoOffline(
  tx: Db,
  u: Usuario,
  s: SessaoLote,
  licoesNoLote: ReadonlySet<string>,
): Promise<true | string> {
  if (s.tipo === 'revisao') return s.licaoId ? 'Sessão de revisão inválida.' : true;
  if (!s.licaoId || licoesNoLote.has(s.licaoId)) return 'Lição indisponível offline.';
  try {
    const c = await licaoAbrivel(tx, u, s.licaoId);
    return c.licao.tipo === 'normal' ? true : 'Lição indisponível offline.';
  } catch {
    return 'Lição indisponível offline.';
  }
}

/** Motivo para recusar a tentativa, ou null se ela vale. */
async function recusaDaTentativa(
  tx: Db,
  usuarioId: string,
  tipo: string,
  licao: LimiteLicao | null,
  respondidas: ReadonlySet<string>,
  q: QuestaoCompleta | undefined,
  agora: Date,
): Promise<string | null> {
  if (!q || !q.visivel || q.gabaritoReal === null) return 'Questão indisponível (retirada do ar).';
  if (respondidas.has(q.aluno.id)) return 'Questão já respondida nesta sessão.';
  if (tipo === 'licao') {
    if (!licao || q.assuntoId !== licao.assuntoId) return 'Questão fora desta lição.';
    return respondidas.size >= licao.tamanho ? 'A lição já tem todas as respostas.' : null;
  }
  if (tipo === 'revisao') {
    const [r] = await tx
      .select({ venceEm: revisoes.venceEm, status: revisoes.status })
      .from(revisoes)
      .where(and(eq(revisoes.usuarioId, usuarioId), eq(revisoes.questaoId, q.aluno.id)));
    return r && r.status === 'ativa' && r.venceEm.getTime() <= agora.getTime() ? null : 'Esta revisão não está vencida.';
  }
  return 'Sessão inválida.';
}
