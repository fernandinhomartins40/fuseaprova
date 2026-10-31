/**
 * Anotações pessoais nas questões (D28). Guarda: exigirAcesso.
 *
 * Isolamento: toda leitura e escrita filtra por `usuario_id` do próprio aluno e pelo concurso
 * ativo dele. Só dá para anotar questão que o aluno já respondeu, então o detalhe pode mostrar o
 * gabarito e a explicação sem entregar nada que ele ainda não viu.
 */
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { Anotacao } from '@fuse/shared/api';
import type { Usuario } from '../contexto.js';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { carregarQuestoes } from '../servicos/questoes.js';
import { contar, iso, type Db } from '../util.js';

const { anotacoes, questoes, disciplinas, assuntos, tentativas } = schema;

/** Teto por aluno e concurso, contra abuso (uma anotação por questão). */
export const LIMITE_ANOTACOES = 5000;
const TAMANHO_RESUMO = 160;

function concursoAtivo(u: Usuario): string {
  if (!u.concursoId) throw falha('conflito', 'Escolha um concurso para usar as anotações.');
  return u.concursoId;
}

function daMinha(u: Usuario, concursoId: string, questaoId: string) {
  return and(
    eq(anotacoes.usuarioId, u.id),
    eq(anotacoes.concursoId, concursoId),
    eq(anotacoes.questaoId, questaoId),
  );
}

function paraAnotacao(a: typeof anotacoes.$inferSelect): Anotacao {
  return {
    questaoId: a.questaoId,
    texto: a.texto,
    criadoEm: iso(a.criadoEm),
    atualizadoEm: iso(a.atualizadoEm),
  };
}

async function buscar(db: Db, u: Usuario, questaoId: string) {
  const [a] = await db.select().from(anotacoes).where(daMinha(u, concursoAtivo(u), questaoId));
  return a ?? null;
}

function resumir(texto: string): string {
  const limpo = texto.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
  return limpo.length > TAMANHO_RESUMO ? `${limpo.slice(0, TAMANHO_RESUMO - 1)}…` : limpo;
}

export function rotasAnotacoes(r: Registrador): void {
  r.rota('anotacaoObter', async ({ usuario, params, deps }) => {
    const a = await buscar(deps.db, usuario, params.id);
    return { anotacao: a ? paraAnotacao(a) : null };
  });

  r.rota('anotacaoSalvar', async ({ usuario, params, corpo, deps, agora }) => {
    const concursoId = concursoAtivo(usuario);
    return deps.db.transaction(async (tx) => {
      const [q] = await tx.select({ id: questoes.id }).from(questoes).where(eq(questoes.id, params.id));
      if (!q) throw falha('nao_encontrado', 'Questão não encontrada.');
      const [respondeu] = await tx
        .select({ id: tentativas.id })
        .from(tentativas)
        .where(and(eq(tentativas.usuarioId, usuario.id), eq(tentativas.questaoId, q.id)))
        .limit(1);
      if (!respondeu) throw falha('conflito', 'Responda a questão antes de anotar.');
      const existente = await buscar(tx, usuario, q.id);
      if (!existente) {
        const [n] = await tx
          .select({ n: count() })
          .from(anotacoes)
          .where(and(eq(anotacoes.usuarioId, usuario.id), eq(anotacoes.concursoId, concursoId)));
        if (contar(n?.n) >= LIMITE_ANOTACOES) {
          throw falha('conflito', `Você chegou ao limite de ${LIMITE_ANOTACOES} anotações. Apague algumas para continuar.`);
        }
      }
      const [a] = await tx
        .insert(anotacoes)
        .values({ usuarioId: usuario.id, concursoId, questaoId: q.id, texto: corpo.texto, criadoEm: agora, atualizadoEm: agora })
        .onConflictDoUpdate({
          target: [anotacoes.usuarioId, anotacoes.concursoId, anotacoes.questaoId],
          set: { texto: corpo.texto, atualizadoEm: agora },
        })
        .returning();
      return { anotacao: paraAnotacao(a!) };
    });
  });

  r.rota('anotacaoExcluir', async ({ usuario, params, deps }) => {
    await deps.db.delete(anotacoes).where(daMinha(usuario, concursoAtivo(usuario), params.id));
  });

  r.rota('anotacoes', async ({ usuario, deps }) => {
    const concursoId = concursoAtivo(usuario);
    const rows = await deps.db
      .select({ a: anotacoes, enunciado: questoes.enunciado, d: disciplinas, s: { id: assuntos.id, nome: assuntos.nome } })
      .from(anotacoes)
      .innerJoin(questoes, eq(questoes.id, anotacoes.questaoId))
      .innerJoin(disciplinas, eq(disciplinas.id, questoes.disciplinaId))
      .innerJoin(assuntos, eq(assuntos.id, questoes.assuntoId))
      .where(and(eq(anotacoes.usuarioId, usuario.id), eq(anotacoes.concursoId, concursoId)))
      .orderBy(desc(anotacoes.atualizadoEm), sql`${anotacoes.questaoId}`)
      .limit(LIMITE_ANOTACOES);
    return {
      anotacoes: rows.map((x) => ({
        ...paraAnotacao(x.a),
        disciplina: { id: x.d.id, slug: x.d.slug, nome: x.d.nome, cor: x.d.cor },
        assunto: x.s,
        resumo: resumir(x.enunciado),
      })),
    };
  });

  r.rota('anotacaoDetalhe', async ({ usuario, params, deps }) => {
    const a = await buscar(deps.db, usuario, params.id);
    if (!a) throw falha('nao_encontrado', 'Anotação não encontrada.');
    const q = (await carregarQuestoes(deps.db, [a.questaoId])).get(a.questaoId);
    if (!q) throw falha('nao_encontrado', 'Questão não encontrada.');
    return {
      anotacao: paraAnotacao(a),
      questao: q.aluno,
      correcao: { gabarito: q.gabarito, explicacao: q.explicacao, dicaBolso: q.dicaBolso },
    };
  });
}
