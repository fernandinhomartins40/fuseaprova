/**
 * GET /concurso, /trilha e /guia/:unidadeId (exigirAcesso).
 */
import { inArray } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { ConcursoResposta, GuiaResposta } from '@fuse/shared/api';
import type { Registrador } from '../http/registrar.js';
import { existe } from '../http/erros.js';
import { estruturaDaTrilha, montarTrilhaResposta, secaoNaTrilha, tituloDaLicao } from '../servicos/trilha.js';
import { concursoDoUsuario } from '../servicos/usuario.js';
import { concursoAbertoPorId, montarConcursoResposta } from '../servicos/concursos.js';

const { assuntos } = schema;

export function rotasConteudo(r: Registrador): void {
  r.rota('concurso', async ({ usuario, deps, agora }): Promise<ConcursoResposta> => {
    const c = existe(await concursoDoUsuario(deps.db, usuario), 'Nenhum concurso ativo.');
    return montarConcursoResposta(deps.db, c, agora);
  });

  // Concurso aberto qualquer (para o aluno escolher o cargo antes de acompanhá-lo, D21).
  r.rota('concursoPorId', async ({ params, deps, agora }): Promise<ConcursoResposta> =>
    montarConcursoResposta(deps.db, await concursoAbertoPorId(deps.db, params.id), agora),
  );

  r.rota('trilha', async ({ usuario, deps, agora }) => montarTrilhaResposta(deps.db, usuario, agora));

  r.rota('guia', async ({ usuario, params, deps }): Promise<GuiaResposta> => {
    const estrutura = existe(await estruturaDaTrilha(deps.db, usuario));
    const x = existe(
      estrutura.unidades.find((u) => u.unidade.id === params.unidadeId),
      'Unidade não encontrada.',
    );
    const ids = x.secoes.map((s) => s.secao.assuntoId);
    const listaAssuntos = ids.length ? await deps.db.select().from(assuntos).where(inArray(assuntos.id, ids)) : [];
    const assuntoPorId = new Map(listaAssuntos.map((a) => [a.id, a]));
    return {
      unidade: {
        id: x.unidade.id,
        titulo: x.unidade.titulo,
        disciplina: { id: x.disciplina.id, slug: x.disciplina.slug, nome: x.disciplina.nome, cor: x.disciplina.cor },
      },
      secoes: x.secoes.map(({ secao, licoes }) => {
        const a = assuntoPorId.get(secao.assuntoId);
        const normais = licoes.filter((l) => l.tipo === 'normal');
        const proprias = normais
          .filter((l) => l.dicaTexto?.trim())
          .map((l) => ({
            licaoId: l.id as string | null,
            titulo: l.dicaTitulo?.trim() || tituloDaLicao(l, secao),
            texto: l.dicaTexto!.trim(),
            exemplo: l.dicaExemplo?.trim() || null,
          }));
        const usaAssunto = normais.length === 0 || normais.some((l) => !l.dicaTexto?.trim());
        const doAssunto =
          usaAssunto && a?.dicaTexto?.trim()
            ? [
                {
                  licaoId: null,
                  titulo: a.dicaTitulo?.trim() || a.nome,
                  texto: a.dicaTexto.trim(),
                  exemplo: a.dicaExemplo?.trim() || null,
                },
              ]
            : [];
        return {
          id: secao.id,
          titulo: secao.titulo,
          noEdital: estrutura.edital ? secao.noEdital : null,
          naTrilha: secaoNaTrilha(estrutura, secao),
          dicas: [...doAssunto, ...proprias],
        };
      }),
    };
  });
}
