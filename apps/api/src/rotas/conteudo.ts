/**
 * GET /concurso, /trilha e /guia/:unidadeId (exigirAcesso).
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  AREAS_CARGO,
  AVISO_EDITAL,
  diaSP,
  diferencaDias,
  NOMES_AREA,
  NOMES_STATUS_CONCURSO,
  type Dia,
} from '@fuse/shared';
import type { ConcursoResposta, GuiaResposta } from '@fuse/shared/api';
import type { Registrador } from '../http/registrar.js';
import { existe } from '../http/erros.js';
import { estruturaDaTrilha, montarTrilhaResposta, secaoNaTrilha, tituloDaLicao } from '../servicos/trilha.js';
import { concursoDoUsuario, modoEdital, siglaConcurso } from '../servicos/usuario.js';
import type { Cargo } from '../servicos/usuario.js';

const { cargos, assuntos } = schema;

export function diasParaProva(dataProva: Dia | null, agora: Date): number | null {
  return dataProva ? Math.max(0, diferencaDias(dataProva, diaSP(agora))) : null;
}

export function cargoResumo(c: Cargo) {
  return {
    id: c.id,
    nome: c.nome,
    area: c.area,
    escolaridade: c.escolaridade,
    vagas: c.vagas,
    generico: c.generico,
    distribuicao: c.distribuicao,
  };
}

export function rotasConteudo(r: Registrador): void {
  r.rota('concurso', async ({ usuario, deps, agora }): Promise<ConcursoResposta> => {
    const c = existe(await concursoDoUsuario(deps.db, usuario), 'Nenhum concurso ativo.');
    const edital = modoEdital(c);
    const lista = await deps.db
      .select()
      .from(cargos)
      .where(and(eq(cargos.concursoId, c.id), eq(cargos.ativo, true), eq(cargos.generico, !edital)))
      .orderBy(asc(cargos.ordem), asc(cargos.nome));
    return {
      id: c.id,
      nome: c.nome,
      sigla: siglaConcurso(c),
      banca: c.banca,
      orgao: c.orgao,
      municipio: c.municipio,
      uf: c.uf,
      ano: c.ano,
      status: c.status,
      statusTexto: NOMES_STATUS_CONCURSO[c.status],
      dataProva: c.dataProva,
      diasParaProva: diasParaProva(c.dataProva, agora),
      links: c.links,
      modoEdital: edital,
      cargos: lista.map(cargoResumo),
      areas: AREAS_CARGO.filter((a) => lista.some((x) => x.area === a)).map((area) => ({
        area,
        nome: NOMES_AREA[area],
        exemplos: lista.filter((x) => x.area === area).map((x) => x.nome),
      })),
      avisoEdital: AVISO_EDITAL,
    };
  });

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
