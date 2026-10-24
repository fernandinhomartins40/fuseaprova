/**
 * Comandos do PCI Concursos:
 * - `crawler pci:listar --paginas 1-28`: lê as páginas da lista da FAU-Unicentro e faz
 *   upsert em provas_origem (fonte 'pci', mesmo id do seed: UUID v5 de `prova_origem:pci:{url}`);
 * - `crawler pci:baixar <id>`: lê a página da prova, atualiza a prova de origem e baixa caderno
 *   e gabarito QUANDO houver link direto permitido pelo robots.txt. Hoje o PCI libera os
 *   arquivos só depois de um captcha (Cloudflare Turnstile) e o robots.txt proíbe `/*.pdf`:
 *   o coletor para e avisa, sem contornar.
 */
import { sql } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { provasOrigem } from '@fuse/db/schema';
import { linhasProvasOrigem } from '@fuse/db/seed';
import { baixarERegistrar, type ResultadoArquivo } from '../arquivos/armazenamento.js';
import { ErroBloqueio } from '../rede/bloqueio.js';
import type { ClienteHttp } from '../rede/cliente.js';
import {
  type ArquivoPci,
  ehDaFau,
  parseListaPci,
  parsePaginaProvaPci,
  type ProvaPciListada,
  urlDaPaginaPci,
  urlDaProvaPci,
  idDaUrlPci,
} from './parser.js';

/** Linha de provas_origem para uma prova do PCI (mesma regra do seed). */
export function linhaDaProvaPci(p: Pick<ProvaPciListada, 'cargo' | 'ano' | 'orgao' | 'url'>) {
  const [linha] = linhasProvasOrigem({
    certames: [],
    provas_pci_amostra: [{ cargo: p.cargo, ano: p.ano ?? 0, orgao: p.orgao, url: p.url }],
  });
  return { ...linha!, ano: p.ano };
}

export async function upsertProvasPci(db: BancoDados, provas: ProvaPciListada[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < provas.length; i += 100) {
    const lote = provas.slice(i, i + 100).map(linhaDaProvaPci);
    if (!lote.length) continue;
    await db
      .insert(provasOrigem)
      .values(lote)
      .onConflictDoUpdate({
        target: provasOrigem.id,
        set: {
          cargo: sql`excluded.cargo`,
          ano: sql`excluded.ano`,
          orgao: sql`excluded.orgao`,
          uf: sql`coalesce(excluded.uf, ${provasOrigem.uf})`,
          urlPagina: sql`excluded.url_pagina`,
        },
      });
    n += lote.length;
  }
  return n;
}

export interface OpcoesListarPci {
  cliente: ClienteHttp;
  paginas: number[];
  /** Sem banco: só lista. */
  db?: BancoDados;
  log?: (msg: string) => void;
}

export interface ResumoListarPci {
  provas: ProvaPciListada[];
  paginasLidas: number[];
  totalPaginas: number | null;
  gravadas: number;
}

export async function listarPci(o: OpcoesListarPci): Promise<ResumoListarPci> {
  const provas: ProvaPciListada[] = [];
  const vistos = new Set<string>();
  const paginasLidas: number[] = [];
  let total: number | null = null;
  for (const n of o.paginas) {
    if (total !== null && n > total) {
      o.log?.(`PCI: a lista tem ${total} páginas; parei antes da página ${n}.`);
      break;
    }
    const r = await o.cliente.obterTexto(urlDaPaginaPci(n));
    const pagina = parseListaPci(r.corpo);
    total = pagina.totalPaginas ?? total;
    paginasLidas.push(n);
    const daFau = pagina.provas.filter(ehDaFau);
    for (const p of daFau) {
      if (vistos.has(p.id)) continue;
      vistos.add(p.id);
      provas.push(p);
    }
    o.log?.(`PCI página ${n}${total ? `/${total}` : ''}: ${daFau.length} provas.`);
    if (!pagina.provas.length) break;
  }
  const gravadas = o.db ? await upsertProvasPci(o.db, provas) : 0;
  return { provas, paginasLidas, totalPaginas: total, gravadas };
}

export interface OpcoesBaixarPci {
  db: BancoDados;
  cliente: ClienteHttp;
  id: string;
  arquivosDir: string;
  forcar?: boolean;
  log?: (msg: string) => void;
}

export interface ResumoBaixarPci {
  id: string;
  url: string;
  provaOrigemId: string;
  arquivos: ArquivoPci[];
  baixados: (ResultadoArquivo & { nome: string })[];
  avisos: string[];
}

export async function baixarPci(o: OpcoesBaixarPci): Promise<ResumoBaixarPci> {
  const url = urlDaProvaPci(o.id);
  const id = idDaUrlPci(url) || o.id;
  const r = await o.cliente.obterTexto(url, { permitirBloqueio: true });
  const p = parsePaginaProvaPci(r.corpo, r.url);
  if (!p.cargo && !p.arquivos.length) {
    if (p.bloqueio) throw new ErroBloqueio(r.url, p.bloqueio);
    throw new Error(`A página ${url} não parece ser de uma prova do PCI.`);
  }
  const linha = linhaDaProvaPci({ cargo: p.cargo ?? '', ano: p.ano, orgao: p.orgao ?? '', url });
  await upsertProvasPci(o.db, [
    {
      id,
      cargo: p.cargo ?? '',
      ano: p.ano,
      orgao: p.orgao ?? '',
      organizadora: p.organizadora ?? '',
      url,
    },
  ]);

  const avisos: string[] = [];
  if (
    p.arquivos.some((a) => a.tipo === 'gabarito' && a.preliminar) &&
    !p.arquivos.some((a) => a.tipo === 'gabarito' && !a.preliminar)
  ) {
    avisos.push(
      'O PCI só tem o gabarito PRELIMINAR. O PRD exige o definitivo: busque-o na página do certame na FAU.',
    );
  }
  const resumo: ResumoBaixarPci = {
    id,
    url,
    provaOrigemId: linha.id,
    arquivos: p.arquivos,
    baixados: [],
    avisos,
  };

  const diretos = p.arquivos.filter((a) => a.url);
  const semLink = p.arquivos.filter((a) => !a.url);
  for (const a of diretos) {
    if (!(await o.cliente.permitidoPeloRobots(a.url!))) {
      avisos.push(`O robots.txt do PCI não permite baixar ${a.url}.`);
      continue;
    }
    const b = await baixarERegistrar({
      db: o.db,
      cliente: o.cliente,
      url: a.url!,
      fonte: 'pci',
      tipo: a.tipo,
      provaOrigemId: linha.id,
      arquivosDir: o.arquivosDir,
      banca: 'FAU-Unicentro',
      slug: id,
      forcar: o.forcar,
    });
    resumo.baixados.push({ ...b, nome: a.nome });
  }
  if (semLink.length && p.bloqueio) {
    // Não contorna: registra o que foi possível e para com aviso.
    throw Object.assign(new ErroBloqueio(r.url, p.bloqueio), { resumo });
  }
  if (!p.arquivos.length) avisos.push('A página não lista arquivos.');
  return resumo;
}
