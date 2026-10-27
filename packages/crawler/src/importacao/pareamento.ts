/**
 * Pareamento de caderno e gabarito baixados do PCI Concursos pelo horário (puro).
 *
 * Cada PDF do PCI traz no rodapé a marca d'água `pcimarkpci <base64>:<base64>`; a segunda
 * parte, decodificada, é a data e a hora do download com segundos ("Sat, 24 Oct 2026
 * 12:28:58 -0300"). Quem baixa o caderno e o gabarito do mesmo concurso em sequência gera
 * arquivos com 1 a 5 segundos de diferença, então o horário liga cada gabarito ao seu caderno
 * mesmo quando o nome do cargo não casa ("MÉDICO OBSTRETA" x "Médico Obstetra").
 *
 * O horário sozinho não basta (o dono pode baixar o gabarito antes ou depois do caderno, e
 * vários cadernos do mesmo município saem em fila): por isso o pareamento só aceita o par
 * quando o concurso (município, número e ano) também confere, se os dois textos o informam.
 */
import { chaveComparacao, limparEspacos, semAcentos } from '../util/texto.js';

export type TipoDocumentoPci = 'caderno' | 'gabarito';

export interface IdentificacaoConcurso {
  /** "DOIS VIZINHOS" (sem acento, em maiúsculas), ou null quando não aparece. */
  municipio: string | null;
  numero: number | null;
  ano: number | null;
}

export interface DocumentoPci {
  arquivo: string;
  tipo: TipoDocumentoPci;
  baixadoEm: Date;
  concurso?: IdentificacaoConcurso | null;
}

export interface GabaritoPareado {
  arquivo: string;
  /** Segundos do gabarito em relação ao caderno (negativo = baixado antes). */
  diferencaSegundos: number;
  /** O concurso do gabarito confere com o do caderno? (null = algum dos dois não informa) */
  concursoConfere: boolean | null;
}

export interface ParPorHorario {
  caderno: string;
  /** Gabaritos ligados ao caderno, do mais próximo no tempo ao mais distante. */
  gabaritos: GabaritoPareado[];
}

export interface ResultadoPareamento {
  pares: ParPorHorario[];
  /** Gabaritos sem nenhum caderno compatível dentro da janela. */
  gabaritosSemCaderno: string[];
}

/** Segundos de tolerância entre o caderno e o gabarito do mesmo concurso. */
export const JANELA_PADRAO_SEGUNDOS = 8;

/**
 * Lê a data/hora de download da marca d'água do PCI (null se não houver marca legível).
 * Aceita o texto de qualquer página; usa a primeira marca.
 */
export function lerMarcaPci(texto: string): Date | null {
  const m = /pcimarkpci\s+([A-Za-z0-9+/=:_-]+)/.exec(texto);
  if (!m) return null;
  // A marca é "<base64 do IP>:<base64 da data>"; se vier sem o separador, vale o todo.
  const partes = m[1]!.split(':').filter(Boolean);
  for (const parte of partes.reverse()) {
    let decodificado: string;
    try {
      decodificado = Buffer.from(parte.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
        'latin1',
      );
    } catch {
      continue;
    }
    const data = /([A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4})/.exec(
      decodificado,
    );
    if (!data) continue;
    const d = new Date(data[1]!);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** O PDF do PCI é um gabarito ou um caderno de questões? (null = não dá para saber) */
export function classificarDocumentoPci(texto: string): TipoDocumentoPci | null {
  const inicio = chaveComparacao(texto.replace(/pcimarkpci\s+\S+/g, ' ').slice(0, 1500));
  if (/^(RETIFICACAO )?(DO )?GABARITO\b/.test(inicio) || /TORNA PUBLICO O GABARITO/.test(inicio))
    return 'gabarito';
  if (/\bGABARITO (PRELIMINAR|DEFINITIVO|OFICIAL)\b/.test(inicio.slice(0, 400))) return 'gabarito';
  if (/\bCARGO\b/.test(inicio) && /QUESTOES? DE MULTIPLA ESCOLHA|CADERNO DE QUESTOES/.test(inicio))
    return 'caderno';
  if (/CADERNO DE QUESTOES|LEIA AS INSTRUCOES/.test(inicio)) return 'caderno';
  return null;
}

/**
 * Município, número e ano do concurso, lidos do cabeçalho do caderno ou do gabarito
 * ("PREFEITURA DO MUNICÍPIO DE QUARTO CENTENÁRIO / CONCURSO PÚBLICO Nº 01/2025",
 * "Prefeitura Municipal de Rio Azul/PR … Concurso Público n° 02/2026").
 */
export function lerIdentificacaoConcurso(texto: string): IdentificacaoConcurso {
  const t = chaveComparacao(texto.replace(/pcimarkpci\s+\S+/g, ' ').slice(0, 2500));
  // Sem acento e sem pontuação: "PREFEITURA MUNICIPAL DE RIO AZUL PR NO USO …".
  const mun =
    /\b(?:PREFEITURA|CAMARA)(?: MUNICIPAL)?(?: DO MUNICIPIO)? DE ([A-Z]+(?: [A-Z]+){0,4}?)(?: PR\b| NO USO\b| TORNA\b| CONCURSO\b| PROCESSO\b| EDITAL\b| ESTADO\b| DATA\b| SECRETARIA\b| COMISSAO\b|$)/.exec(
      t,
    ) ?? /\bMUNICIPIO DE ([A-Z]+(?: [A-Z]+){0,4}?)(?: PR\b| NO USO\b| TORNA\b|$)/.exec(t);
  const num =
    /\b(?:CONCURSO(?: PUBLICO)?|PROCESSO SELETIVO(?: SIMPLIFICADO)?)\b.{0,80}?\b(\d{1,3}) (20\d\d)\b/.exec(
      t,
    ) ?? /\b(\d{1,3}) (20\d\d)\b/.exec(t);
  return {
    municipio: mun ? limparEspacos(mun[1]!) : null,
    numero: num ? Number(num[1]) : null,
    ano: num ? Number(num[2]) : null,
  };
}

/** Mesmo concurso? (null quando faltam dados para afirmar ou negar) */
export function mesmoConcurso(
  a: IdentificacaoConcurso | null | undefined,
  b: IdentificacaoConcurso | null | undefined,
): boolean | null {
  if (!a || !b) return null;
  const campos: [string | number | null, string | number | null][] = [
    [a.municipio ? semAcentos(a.municipio) : null, b.municipio ? semAcentos(b.municipio) : null],
    [a.numero, b.numero],
    [a.ano, b.ano],
  ];
  let sabidos = 0;
  for (const [x, y] of campos) {
    if (x === null || y === null) continue;
    sabidos++;
    if (x !== y) return false;
  }
  return sabidos ? true : null;
}

const segundos = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 1000);

/**
 * Liga cada gabarito ao caderno mais próximo no tempo (até `janelaSegundos`), descartando
 * os cadernos cujo concurso não confere. Um gabarito vai para um só caderno (o mais próximo;
 * em empate, o que foi baixado antes dele), mas um caderno pode ter vários gabaritos
 * (preliminar e definitivo da mesma página).
 */
export function parearPorHorario(
  documentos: DocumentoPci[],
  opcoes: { janelaSegundos?: number } = {},
): ResultadoPareamento {
  const janela = opcoes.janelaSegundos ?? JANELA_PADRAO_SEGUNDOS;
  const cadernos = documentos.filter((d) => d.tipo === 'caderno');
  const gabaritos = documentos.filter((d) => d.tipo === 'gabarito');
  const porCaderno = new Map<string, GabaritoPareado[]>(cadernos.map((c) => [c.arquivo, []]));
  const semCaderno: string[] = [];

  for (const g of gabaritos) {
    let melhor: { c: DocumentoPci; dif: number; confere: boolean | null } | null = null;
    for (const c of cadernos) {
      const dif = segundos(g.baixadoEm, c.baixadoEm);
      if (Math.abs(dif) > janela) continue;
      const confere = mesmoConcurso(c.concurso, g.concurso);
      if (confere === false) continue;
      const melhorQue =
        !melhor ||
        Math.abs(dif) < Math.abs(melhor.dif) ||
        // Empate: o caderno baixado antes do gabarito (dif > 0) é o par natural.
        (Math.abs(dif) === Math.abs(melhor.dif) && dif > melhor.dif);
      if (melhorQue) melhor = { c, dif, confere };
    }
    if (!melhor) semCaderno.push(g.arquivo);
    else
      porCaderno.get(melhor.c.arquivo)!.push({
        arquivo: g.arquivo,
        diferencaSegundos: melhor.dif,
        concursoConfere: melhor.confere,
      });
  }

  const pares = cadernos.map((c) => ({
    caderno: c.arquivo,
    gabaritos: porCaderno
      .get(c.arquivo)!
      .sort((a, b) => Math.abs(a.diferencaSegundos) - Math.abs(b.diferencaSegundos)),
  }));
  return { pares, gabaritosSemCaderno: semCaderno };
}

/**
 * Desempate: entre gabaritos candidatos (já do mesmo concurso), o baixado mais perto do
 * caderno, desde que dentro da janela e sem empate com outro candidato. Devolve o índice.
 */
export function escolherPorHorario(
  caderno: Date,
  candidatos: Date[],
  janelaSegundos: number = JANELA_PADRAO_SEGUNDOS,
): number | null {
  const distancias = candidatos
    .map((c, i) => ({ i, d: Math.abs(segundos(c, caderno)) }))
    .filter((x) => x.d <= janelaSegundos)
    .sort((a, b) => a.d - b.d);
  if (!distancias.length) return null;
  if (distancias.length > 1 && distancias[0]!.d === distancias[1]!.d) return null;
  return distancias[0]!.i;
}
