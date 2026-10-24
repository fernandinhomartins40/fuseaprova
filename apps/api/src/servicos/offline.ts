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
import { iso } from '../util.js';
import { dicaDaLicao, finalizarSessao, revisoesVencidas, sortearQuestoesDaLicao } from './estudo.js';
import { aplicarRevisao, creditarXp, ofensivaHoje, travarUsuario } from './progresso.js';
import { carregarQuestoes, emOrdem, type QuestaoCompleta } from './questoes.js';
import { calcularTrilha, tituloDaLicao } from './trilha.js';
import { concursoDoUsuario, revisoesPendentes, vidasAtuais } from './usuario.js';

const { assuntos, sessoesEstudo, tentativas, licoes } = schema;

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
  return {
    pacoteId: randomUUID(),
    geradoEm: iso(agora),
    expiraEm: iso(new Date(agora.getTime() + VALIDADE_PACOTE_MS)),
    versaoConteudo: concurso?.versaoConteudo ?? 1,
    chave,
    licoes: licoesPacote,
    revisao: await Promise.all(emOrdem(vencidas, mapaRev).map((q) => cifrarQuestao(chave, q))),
  };
}

type Lote = z.output<typeof SyncEntrada>;

function limitar(d: Date, agora: Date): Date {
  return d.getTime() > agora.getTime() ? agora : d;
}

export async function sincronizar(deps: Deps, usuario: Usuario, lote: Lote, agora: Date): Promise<SyncResposta> {
  return deps.db.transaction(async (tx) => {
    const u = await travarUsuario(tx, usuario.id);
    const xpAntes = u.xpTotal;
    const aceitas: string[] = [];
    const duplicadas: string[] = [];
    const rejeitadas: SyncResposta['rejeitadas'] = [];

    // 1) Sessões offline (idempotentes por id_cliente).
    const sessoesLote = new Map(lote.sessoes.map((s) => [s.idCliente, s]));
    const idsClienteSessao = [...new Set([...sessoesLote.keys(), ...lote.tentativas.map((t) => t.sessaoIdCliente)])];
    for (const s of sessoesLote.values()) {
      let licaoId = s.licaoId;
      if (licaoId) {
        const [l] = await tx.select({ id: licoes.id }).from(licoes).where(eq(licoes.id, licaoId));
        if (!l) licaoId = null;
      }
      await tx
        .insert(sessoesEstudo)
        .values({
          usuarioId: u.id,
          tipo: s.tipo,
          licaoId,
          idCliente: s.idCliente,
          iniciadaEm: limitar(new Date(s.iniciadaEm), agora),
        })
        .onConflictDoNothing();
    }
    const sessoes = idsClienteSessao.length
      ? await tx
          .select()
          .from(sessoesEstudo)
          .where(and(eq(sessoesEstudo.usuarioId, u.id), inArray(sessoesEstudo.idCliente, idsClienteSessao)))
      : [];
    const sessaoPorCliente = new Map(sessoes.map((s) => [s.idCliente!, s]));

    // 2) Tentativas em ordem cronológica, recalculadas com o gabarito do servidor.
    const ordenadas = [...lote.tentativas].sort((a, b) => a.respondidaEm.localeCompare(b.respondidaEm));
    const idsCliente = ordenadas.map((t) => t.idCliente);
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
    const mapa = await carregarQuestoes(tx, [...new Set(ordenadas.map((t) => t.questaoId))]);
    const vistasNoLote = new Set<string>();
    for (const t of ordenadas) {
      if (existentes.has(t.idCliente) || vistasNoLote.has(t.idCliente)) {
        duplicadas.push(t.idCliente);
        continue;
      }
      const s = sessaoPorCliente.get(t.sessaoIdCliente);
      if (!s) {
        rejeitadas.push({ idCliente: t.idCliente, motivo: 'Sessão desconhecida.' });
        continue;
      }
      const q = mapa.get(t.questaoId);
      if (!q || !q.visivel || q.gabaritoReal === null) {
        rejeitadas.push({ idCliente: t.idCliente, motivo: 'Questão indisponível (retirada do ar).' });
        continue;
      }
      vistasNoLote.add(t.idCliente);
      const em = limitar(new Date(t.respondidaEm), agora);
      const acertou = t.resposta === q.gabarito;
      await tx.insert(tentativas).values({
        idCliente: t.idCliente,
        usuarioId: u.id,
        questaoId: q.aluno.id,
        sessaoEstudoId: s.id,
        resposta: t.resposta,
        acertou,
        tempoMs: t.tempoMs,
        respondidaEm: em,
        offline: true,
      });
      await aplicarRevisao(tx, u.id, q.aluno.id, acertou, em);
      const xp = xpDaResposta(s.tipo, acertou);
      if (xp > 0) await creditarXp(tx, u, [{ tipo: 'acerto', valor: xp }], agora, { sessaoEstudoId: s.id });
      aceitas.push(t.idCliente);
    }

    // 3) Sessões concluídas no aparelho: bônus, gemas, progresso e ofensiva (uma vez só).
    for (const s of sessoes) {
      const off = sessoesLote.get(s.idCliente!);
      if (s.concluidaEm || !off?.concluidaEm) continue;
      const feitas = await tx
        .select({ questaoId: tentativas.questaoId, acertou: tentativas.acertou })
        .from(tentativas)
        .where(eq(tentativas.sessaoEstudoId, s.id));
      if (feitas.length === 0) continue;
      const qs = [...new Set(feitas.map((f) => f.questaoId))];
      await tx
        .update(sessoesEstudo)
        .set({ questoes: qs, total: qs.length, acertos: feitas.filter((f) => f.acertou).length })
        .where(eq(sessoesEstudo.id, s.id));
      const concluidaEm = limitar(new Date(off.concluidaEm), agora);
      await finalizarSessao(tx, u, { ...s, questoes: qs }, concluidaEm);
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

