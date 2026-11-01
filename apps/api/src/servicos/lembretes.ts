/**
 * D30: plano de lembretes dos próximos 7 dias (GET /me/lembretes). Guarda: exigirAcesso.
 *
 * O servidor é a fonte da verdade: o texto e a tela de cada notificação saem do progresso real
 * do aluno (revisões vencidas e agendadas, temas fracos, ofensiva, meta do dia e data da prova).
 * O app nativo só agenda os itens como notificações locais no aparelho.
 */
import { and, eq, gt, lte } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  DIAS_PLANO_LEMBRETES,
  diaSP,
  MS_DIA,
  planejarLembretes,
  type Dia,
  type TemaFracoLembrete,
} from '@fuse/shared';
import type { LembretesResposta } from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { iso } from '../util.js';
import { montarDesempenho } from './desempenho.js';
import { licoesConcluidasHoje, ofensivaHoje } from './progresso.js';
import { questaoVisivel } from './questoes.js';
import { concursoDoUsuario } from './usuario.js';

const { revisoes, questoes } = schema;

/** Quantas revisões vencem em cada dia (São Paulo) até o fim do plano. */
async function revisoesPorDia(
  deps: Deps,
  usuarioId: string,
  agora: Date,
): Promise<Record<Dia, number>> {
  const ate = new Date(agora.getTime() + (DIAS_PLANO_LEMBRETES + 1) * MS_DIA);
  const linhas = await deps.db
    .select({ venceEm: revisoes.venceEm })
    .from(revisoes)
    .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
    .where(
      and(
        eq(revisoes.usuarioId, usuarioId),
        eq(revisoes.status, 'ativa'),
        gt(revisoes.venceEm, agora),
        lte(revisoes.venceEm, ate),
        questaoVisivel(),
      ),
    );
  const mapa: Record<Dia, number> = {};
  for (const l of linhas) {
    const d = diaSP(l.venceEm);
    mapa[d] = (mapa[d] ?? 0) + 1;
  }
  return mapa;
}

export async function montarLembretes(
  deps: Deps,
  u: Usuario,
  agora: Date,
): Promise<LembretesResposta> {
  const geradoEm = iso(agora);
  const ativo = u.notificacoes && Boolean(u.lembreteHora);
  if (!ativo) return { ativo: false, itens: [], geradoEm };

  const [desempenho, porDia, feitasHoje, concurso] = await Promise.all([
    montarDesempenho(deps, u, agora),
    revisoesPorDia(deps, u.id, agora),
    licoesConcluidasHoje(deps.db, u.id, agora),
    concursoDoUsuario(deps.db, u),
  ]);
  const temasFracos: TemaFracoLembrete[] = desempenho.temas
    .filter((t) => t.classe === 'fraco')
    .sort((a, b) => (a.dominio ?? 0) - (b.dominio ?? 0))
    .slice(0, 3)
    .map((t) => ({ assuntoId: t.assuntoId, nome: t.nome }));

  const itens = planejarLembretes({
    agora,
    notificacoes: u.notificacoes,
    hora: u.lembreteHora,
    acesso: u.acesso,
    metaCumpridaHoje: feitasHoje >= u.metaDiaria,
    estudouHoje: u.ultimoDiaEstudo === diaSP(agora),
    ofensiva: ofensivaHoje(u, agora),
    revisoesVencidas: desempenho.resumo.revisoesPendentes,
    revisoesPorDia: porDia,
    temasFracos,
    trilhaConcluida: desempenho.resumo.trilhaConcluida,
    dataProva: concurso?.dataProva ?? null,
  });
  return {
    ativo: true,
    itens: itens.map((i) => ({
      tipo: i.tipo,
      quando: iso(i.quando),
      titulo: i.titulo,
      corpo: i.corpo,
      rota: i.rota,
    })),
    geradoEm,
  };
}
