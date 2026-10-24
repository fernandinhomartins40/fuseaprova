import { schema } from '@fuse/db';
import type { AcaoAuditoria } from '@fuse/shared/api';
import { iso, isoOuNull, type Db } from '../../util.js';
import { cargoResumo } from '../conteudo.js';

const { auditoria } = schema;

/** Toda ação do admin fica registrada (PRD 5.17). */
export async function auditar(
  db: Db,
  adminId: string | null,
  acao: AcaoAuditoria,
  alvo: string | null,
  detalhes: Record<string, unknown> | null,
  agora: Date,
): Promise<void> {
  await db.insert(auditoria).values({ adminId, acao, alvo, detalhes, criadoEm: agora });
}

export function paginacao(q: { pagina: number; porPagina: number }) {
  return { limit: q.porPagina, offset: (q.pagina - 1) * q.porPagina };
}

export function mapConcurso(c: typeof schema.concursos.$inferSelect) {
  return {
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    banca: c.banca,
    orgao: c.orgao,
    municipio: c.municipio,
    uf: c.uf,
    ano: c.ano,
    status: c.status,
    dataProva: c.dataProva,
    links: c.links,
    ativo: c.ativo,
    versaoConteudo: c.versaoConteudo,
    editalPublicadoEm: isoOuNull(c.editalPublicadoEm),
    criadoEm: iso(c.criadoEm),
  };
}

export function mapCargo(c: typeof schema.cargos.$inferSelect) {
  return {
    ...cargoResumo(c),
    concursoId: c.concursoId,
    conteudoProgramatico: c.conteudoProgramatico,
    ordem: c.ordem,
    ativo: c.ativo,
  };
}

export function mapProva(p: typeof schema.provasOrigem.$inferSelect, totalQuestoes: number) {
  return {
    id: p.id,
    banca: p.banca,
    nome: p.nome,
    tipo: p.tipo,
    orgao: p.orgao,
    municipio: p.municipio,
    uf: p.uf,
    ano: p.ano,
    dataProva: p.dataProva,
    cargo: p.cargo,
    nivel: p.nivel,
    urlPagina: p.urlPagina,
    urlCaderno: p.urlCaderno,
    urlGabarito: p.urlGabarito,
    urlRecursos: p.urlRecursos,
    hashPdf: p.hashPdf,
    slugFau: p.slugFau,
    relevanciaPalmital: p.relevanciaPalmital,
    status: p.status,
    situacaoCertame: p.situacaoCertame,
    totalQuestoes,
    criadoEm: iso(p.criadoEm),
  };
}

export function mapLicao(l: typeof schema.licoes.$inferSelect) {
  return {
    id: l.id,
    secaoId: l.secaoId,
    ordem: l.ordem,
    tipo: l.tipo,
    tamanho: l.tamanho,
    titulo: l.titulo,
    dicaTitulo: l.dicaTitulo,
    dicaTexto: l.dicaTexto,
    dicaExemplo: l.dicaExemplo,
  };
}

export function mapSecao(s: typeof schema.secoes.$inferSelect, licoes: (typeof schema.licoes.$inferSelect)[]) {
  return {
    id: s.id,
    unidadeId: s.unidadeId,
    ordem: s.ordem,
    titulo: s.titulo,
    assuntoId: s.assuntoId,
    noEdital: s.noEdital,
    licoes: licoes.map(mapLicao),
  };
}
