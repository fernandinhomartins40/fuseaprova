/**
 * Leitura de dados/catalogo_fau.json → linhas de provas_origem.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { idFixo } from './ids.js';

/** dados/catalogo_fau.json na raiz do repositório (vale para src/ e dist/). */
export const CAMINHO_CATALOGO = fileURLToPath(
  new URL('../../../../dados/catalogo_fau.json', import.meta.url),
);

export interface CertameCatalogo {
  nome: string;
  tipo: string;
  municipio: string;
  regime: string;
  data_prova: string | null;
  ano: number | null;
  pagina_fau: string;
  relevancia_palmital: boolean;
}

export interface ProvaPciCatalogo {
  cargo: string;
  ano: number;
  orgao: string;
  url: string;
}

export interface Catalogo {
  certames: CertameCatalogo[];
  provas_pci_amostra?: ProvaPciCatalogo[];
}

export interface LinhaProvaOrigem {
  id: string;
  banca: string;
  nome: string | null;
  tipo: string | null;
  orgao: string;
  municipio: string | null;
  uf: string | null;
  ano: number | null;
  dataProva: string | null;
  cargo: string | null;
  regime: string | null;
  urlPagina: string;
  slugFau: string | null;
  relevanciaPalmital: boolean;
  fonte: 'fau' | 'pci';
}

export async function lerCatalogo(caminho = CAMINHO_CATALOGO): Promise<Catalogo> {
  return JSON.parse(await readFile(caminho, 'utf8')) as Catalogo;
}

/** "26/07/2026" → "2026-07-26". */
export function dataBrParaIso(data: string | null): string | null {
  const m = data ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']);
const SIGLAS = new Set(['PR', 'SC', 'RS', 'SP', 'CIS', 'RS.', 'UEPG', 'IFPR', 'UNICENTRO']);

/** "PREFEITURA MUNICIPAL DE SALGADO FILHO - 2026" → "Prefeitura Municipal de Salgado Filho". */
export function nomeLegivel(nome: string): string {
  const semAno = nome
    .replace(/\s*-\s*(EDITAL\b.*|\d{4}.*)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return semAno
    .split(' ')
    .map((p, i) => {
      if (SIGLAS.has(p.toUpperCase()) || /\d/.test(p)) return p;
      const minus = p.toLocaleLowerCase('pt-BR');
      if (i > 0 && MINUSCULAS.has(minus)) return minus;
      return minus.charAt(0).toLocaleUpperCase('pt-BR') + minus.slice(1);
    })
    .join(' ');
}

/** Órgão exibido no chip de origem ("Prefeitura de Realeza", "Câmara de Irati"). */
export function orgaoDoCertame(c: CertameCatalogo): string {
  if (c.municipio && c.tipo === 'Prefeitura') return `Prefeitura de ${c.municipio}`;
  if (c.municipio && c.tipo === 'Câmara') return `Câmara de ${c.municipio}`;
  return nomeLegivel(c.nome);
}

export function slugDaPagina(url: string): string | null {
  return url.split('/').filter(Boolean).pop() ?? null;
}

/** Converte o catálogo em linhas de provas_origem (ids determinísticos, idempotentes). */
export function linhasProvasOrigem(catalogo: Catalogo): LinhaProvaOrigem[] {
  const certames = catalogo.certames.map<LinhaProvaOrigem>((c) => ({
    id: idFixo(`prova_origem:fau:${c.pagina_fau}:${c.nome}`),
    banca: 'FAU-Unicentro',
    nome: c.nome,
    tipo: c.tipo || null,
    orgao: orgaoDoCertame(c),
    municipio: c.municipio || null,
    // O catálogo não traz a UF. Os marcados com relevância são do Paraná (PRD 7.4);
    // os demais ficam sem UF até o coletor confirmar.
    uf: c.relevancia_palmital ? 'PR' : null,
    ano: c.ano,
    dataProva: dataBrParaIso(c.data_prova),
    cargo: null,
    regime: c.regime || null,
    urlPagina: c.pagina_fau,
    slugFau: slugDaPagina(c.pagina_fau),
    relevanciaPalmital: c.relevancia_palmital,
    fonte: 'fau',
  }));
  const pci = (catalogo.provas_pci_amostra ?? []).map<LinhaProvaOrigem>((p) => {
    const uf = /\/([A-Z]{2})$/.exec(p.orgao)?.[1] ?? null;
    return {
      id: idFixo(`prova_origem:pci:${p.url}`),
      banca: 'FAU-Unicentro',
      nome: null,
      tipo: null,
      orgao: p.orgao.replace(/\/[A-Z]{2}$/, ''),
      municipio: null,
      uf,
      ano: p.ano,
      dataProva: null,
      cargo: p.cargo,
      regime: null,
      urlPagina: p.url,
      slugFau: null,
      relevanciaPalmital: false,
      fonte: 'pci',
    };
  });
  return [...certames, ...pci];
}
