/**
 * `crawler fau:docs <slug>`: baixa os PDFs de edital, gabarito definitivo, respostas aos
 * recursos (e cadernos, se o certame ainda os mostra) da página do certame na FAU.
 */
import { eq, or } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { provasOrigem } from '@fuse/db/schema';
import type { TipoArquivoColeta } from '@fuse/shared';
import { baixarERegistrar, type ResultadoArquivo } from '../arquivos/armazenamento.js';
import type { ClienteHttp } from '../rede/cliente.js';
import { chaveComparacao, similaridade } from '../util/texto.js';
import {
  type DocumentoCertame,
  normalizarUrlCertame,
  parsePaginaCertame,
  URL_FAU_CONCURSO,
} from './parser.js';

export const TIPOS_DOCS_PADRAO: TipoArquivoColeta[] = ['edital', 'gabarito', 'recursos', 'caderno'];

export interface OpcoesDocs {
  db: BancoDados;
  cliente: ClienteHttp;
  slug: string;
  arquivosDir: string;
  tipos?: TipoArquivoColeta[];
  /** Baixa todos os PDFs da página (os não classificados entram como `outro`). */
  todos?: boolean;
  forcar?: boolean;
  log?: (msg: string) => void;
}

export interface ResumoDocs {
  url: string;
  nome: string;
  provaOrigemId: string | null;
  documentos: DocumentoCertame[];
  baixados: (ResultadoArquivo & { titulo: string; tipo: TipoArquivoColeta })[];
  falhas: { titulo: string; url: string; erro: string }[];
  avisos: string[];
}

function variantesDoSlug(slug: string): string[] {
  const s = slug.trim().replace(/^\/+|\/+$/g, '');
  const v = new Set([s]);
  try {
    v.add(decodeURIComponent(s));
  } catch {
    /* slug com % solto */
  }
  try {
    v.add(normalizarUrlCertame(s, URL_FAU_CONCURSO).split('/').pop()!);
  } catch {
    /* ignorado */
  }
  return [...v].filter(Boolean);
}

export async function baixarDocsCertame(o: OpcoesDocs): Promise<ResumoDocs> {
  const slugs = variantesDoSlug(o.slug);
  if (!slugs.length) throw new Error('Informe o slug do certame (ex.: pmsf2026).');
  const linhas = await o.db
    .select({
      id: provasOrigem.id,
      nome: provasOrigem.nome,
      urlPagina: provasOrigem.urlPagina,
      banca: provasOrigem.banca,
    })
    .from(provasOrigem)
    .where(or(...slugs.map((s) => eq(provasOrigem.slugFau, s))));
  const avisos: string[] = [];
  const url = linhas[0]?.urlPagina
    ? normalizarUrlCertame(linhas[0].urlPagina)
    : normalizarUrlCertame(slugs[0]!, URL_FAU_CONCURSO);
  if (!linhas.length) {
    avisos.push(
      `O certame "${o.slug}" não está em provas_origem; rode \`crawler fau:certames\` antes. Os arquivos ficam sem prova ligada.`,
    );
  }

  const pagina = await o.cliente.obterTexto(url);
  const p = parsePaginaCertame(pagina.corpo, pagina.url);
  if (!p.nome && !p.documentos.length) {
    throw new Error(
      `A página ${url} não parece ser de um certame da FAU (sem título nem documentos).`,
    );
  }

  // Página com 2 certames (6 casos no catálogo): liga ao de nome mais parecido.
  let prova = linhas[0] ?? null;
  if (linhas.length > 1) {
    prova =
      linhas.find((l) => chaveComparacao(l.nome ?? '') === chaveComparacao(p.nome)) ??
      [...linhas].sort(
        (a, b) => similaridade(b.nome ?? '', p.nome) - similaridade(a.nome ?? '', p.nome),
      )[0]!;
    avisos.push(
      `A página tem ${linhas.length} certames no banco; os arquivos foram ligados a "${prova.nome}".`,
    );
  }

  const tipos = new Set(o.tipos ?? TIPOS_DOCS_PADRAO);
  const alvo = p.documentos
    .map((d) => ({ ...d, tipo: d.tipo ?? (o.todos ? ('outro' as const) : null) }))
    .filter(
      (d): d is DocumentoCertame & { tipo: TipoArquivoColeta } =>
        d.tipo !== null && (o.todos || tipos.has(d.tipo)),
    );
  if (!alvo.some((d) => d.tipo === 'gabarito'))
    avisos.push('A página não tem GABARITO DEFINITIVO.');

  const resumo: ResumoDocs = {
    url,
    nome: p.nome,
    provaOrigemId: prova?.id ?? null,
    documentos: p.documentos,
    baixados: [],
    falhas: [],
    avisos,
  };
  const slugPasta = prova ? (url.split('/').pop() ?? o.slug) : o.slug;
  for (const d of alvo) {
    try {
      const r = await baixarERegistrar({
        db: o.db,
        cliente: o.cliente,
        url: d.url,
        fonte: 'fau',
        tipo: d.tipo,
        provaOrigemId: prova?.id ?? null,
        arquivosDir: o.arquivosDir,
        banca: prova?.banca ?? 'FAU-Unicentro',
        slug: slugPasta,
        forcar: o.forcar,
      });
      resumo.baixados.push({ ...r, titulo: d.titulo, tipo: d.tipo });
      o.log?.(
        `${r.situacao === 'ja_baixado' ? 'já baixado' : 'baixado'}: ${d.titulo} → ${r.caminho}`,
      );
    } catch (e) {
      const erro = (e as Error).message;
      // Captcha/login/robots: para tudo (não insiste em outros arquivos do mesmo site).
      if ((e as Error).name === 'ErroBloqueio') throw e;
      resumo.falhas.push({ titulo: d.titulo, url: d.url, erro });
      o.log?.(`falhou: ${d.titulo}: ${erro}`);
    }
  }

  // Links da prova (só com 1 certame na página, para não misturar).
  if (prova && linhas.length === 1) {
    const ultimo = (tipo: TipoArquivoColeta) => resumo.baixados.find((b) => b.tipo === tipo);
    const set: Partial<typeof provasOrigem.$inferInsert> = {};
    const gab = ultimo('gabarito');
    const rec = ultimo('recursos');
    const cad = ultimo('caderno');
    if (gab) set.urlGabarito = gab.url;
    if (rec) set.urlRecursos = rec.url;
    if (cad) {
      set.urlCaderno = cad.url;
      set.hashPdf = cad.hash;
    }
    if (Object.keys(set).length)
      await o.db.update(provasOrigem).set(set).where(eq(provasOrigem.id, prova.id));
  }
  return resumo;
}
