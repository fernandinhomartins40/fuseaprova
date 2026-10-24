/**
 * Classificação dos certames FAU a partir do nome (puro), com as mesmas categorias de
 * dados/catalogo_fau.json: tipo, município, regime, ano e relevância para Palmital.
 */
import { chaveComparacao, tituloProprio } from '../util/texto.js';

export const TIPOS_CERTAME = [
  'Prefeitura',
  'Câmara',
  'Consórcio de saúde',
  'Residência em saúde',
  'Previdência municipal',
  'Ensino superior',
  'Autarquia / empresa pública',
  'Processo seletivo / outro',
] as const;
export type TipoCertame = (typeof TIPOS_CERTAME)[number];

export const REGIMES = ['Estatutário', 'Celetista / emprego público', 'Processo seletivo'] as const;
export type Regime = (typeof REGIMES)[number] | '';

/** Mesmo formato de `CertameCatalogo` (packages/db/src/seed/catalogo.ts). */
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

/** Ano a partir do qual prefeituras e câmaras são prioridade 1 (PRD 7.4). */
export const ANO_RELEVANCIA = 2022;

export function tipoDoCertame(nome: string): TipoCertame {
  const k = chaveComparacao(nome);
  if (/\bRESIDENCIA\b/.test(k)) return 'Residência em saúde';
  if (/\bCAMARA MUNICIPAL\b/.test(k) || /^CAMARA\b/.test(k)) return 'Câmara';
  if (/\bCONSORCIO\b|^CIS\b|\bCIS ?[A-Z]+\b|\bCONIMS\b|\bCIRUSPAR\b|\bCISPAR\b/.test(k)) {
    return 'Consórcio de saúde';
  }
  if (/\bPREVIDENCIA\b|\bFUNPREV\b|PREV\b/.test(k) && !/\bPREFEITURA\b/.test(k)) {
    return 'Previdência municipal';
  }
  if (/\bPREFEITURA\b/.test(k)) return 'Prefeitura';
  if (
    /\bUNIVERSIDADE\b|\bINSTITUTO FEDERAL\b|\bIFPR\b|\bUNIOESTE\b|\bUNICENTRO\b|\bFACULDADE\b/.test(
      k,
    )
  ) {
    return 'Ensino superior';
  }
  if (
    /\bAUTARQUIA\b|\bEMPRESA\b|\bCOMPANHIA\b|\bAGENCIA\b|\bSAMAE\b|\bSERVICO AUTONOMO\b|\bFUNDACAO\b|\bORGAO GESTOR\b|\bOGMO\b|\bJUNTA COMERCIAL\b|\bE PARANA\b|\bEMDUR\b|\bSANEAMENTO\b/.test(
      k,
    )
  ) {
    return 'Autarquia / empresa pública';
  }
  return 'Processo seletivo / outro';
}

/** Município de prefeituras e câmaras ("PREFEITURA MUNICIPAL DE BOM JESUS DO SUL- PSS" → "Bom Jesus do Sul"). */
export function municipioDoCertame(nome: string, tipo: TipoCertame = tipoDoCertame(nome)): string {
  if (tipo !== 'Prefeitura' && tipo !== 'Câmara') return '';
  const m =
    /(?:PREFEITURA|C[ÂA]MARA)(?:\s+MUNICIPAL)?(?:\s+D[EOA]S?)?\s+(.+?)(?:\s*[-–—]|\s+\d|\s+EDITAL\b|\s*\(|$)/i.exec(
      nome.toUpperCase(),
    );
  const bruto = m?.[1]?.trim() ?? '';
  return bruto ? tituloProprio(bruto) : '';
}

export function regimeDoCertame(nome: string): Regime {
  const k = chaveComparacao(nome);
  if (/\bESTATUTARIO\b|\bEFETIVO\b/.test(k)) return 'Estatutário';
  if (/\bCELETISTA\b|\bEMPREGO\b/.test(k)) return 'Celetista / emprego público';
  if (/\bPSS\b|\bPROCESSO SELETIVO\b|\bTESTE SELETIVO\b/.test(k)) return 'Processo seletivo';
  return '';
}

/** Ano pela data da prova; sem data, o último ano (20xx) citado no nome ou no slug da página. */
export function anoDoCertame(nome: string, dataProvaBr: string | null, url = ''): number | null {
  const d = dataProvaBr ? /(\d{2})\/(\d{2})\/(\d{4})/.exec(dataProvaBr) : null;
  if (d) return Number(d[3]);
  const slug = decodeURIComponentSeguro(url.split('/').filter(Boolean).pop() ?? '');
  for (const fonte of [nome, slug]) {
    const anos = [...fonte.matchAll(/(20\d{2})(?!\d)/g)].map((m) => Number(m[1]));
    if (anos.length) return anos[anos.length - 1]!;
  }
  return null;
}

function decodeURIComponentSeguro(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function relevanciaPalmital(tipo: string, ano: number | null): boolean {
  return (tipo === 'Prefeitura' || tipo === 'Câmara') && ano !== null && ano >= ANO_RELEVANCIA;
}

/** Monta a linha no formato do catálogo a partir do que a listagem mostra. */
export function paraCertameCatalogo(c: {
  nome: string;
  dataProva: string | null;
  url: string;
}): CertameCatalogo {
  const tipo = tipoDoCertame(c.nome);
  const ano = anoDoCertame(c.nome, c.dataProva, c.url);
  return {
    nome: c.nome,
    tipo,
    municipio: municipioDoCertame(c.nome, tipo),
    regime: regimeDoCertame(c.nome),
    data_prova: c.dataProva,
    ano,
    pagina_fau: c.url,
    relevancia_palmital: relevanciaPalmital(tipo, ano),
  };
}
