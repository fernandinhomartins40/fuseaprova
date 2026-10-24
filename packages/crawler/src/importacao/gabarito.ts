/**
 * Parser do gabarito definitivo da FAU (puro), sobre o texto do `pdftotext -layout`.
 *
 * Formato real (ex.: GABARITO DEFINITIVO, Salgado Filho 2026): um bloco por cargo, com o
 * nome do cargo numa linha e, abaixo, linhas de números ("01  02 … 10") seguidas da linha
 * de letras ("B   C … A"). Marcas da legenda:
 *   `*`  questão anulada (ex.: "*X")
 *   `**` questão alterada após recursos (ex.: "**C" = o gabarito passou a ser C)
 * Também aceita pares numa linha ("01-A  02-B", "01) A", "Questão 01: ANULADA").
 */
import type { Letra } from '@fuse/shared';
import { chaveComparacao, limparEspacos, similaridade } from '../util/texto.js';
import { normalizarTextoPdf } from './texto-pdf.js';

export interface RespostaGabarito {
  /** Letra definitiva (null quando anulada sem letra). */
  letra: Letra | null;
  anulada: boolean;
  alterada: boolean;
  /** Token como veio no PDF ("**C", "*X"). */
  bruto: string;
}

export interface GabaritoCargo {
  cargo: string | null;
  respostas: Map<number, RespostaGabarito>;
}

export interface ResultadoGabarito {
  gabaritos: GabaritoCargo[];
  /** O documento se diz definitivo? (false = preliminar ou não identificado). */
  definitivo: boolean;
  preliminar: boolean;
  avisos: string[];
}

interface Legenda {
  umaEstrela: 'anulada' | 'alterada';
  duasEstrelas: 'anulada' | 'alterada';
}

const RE_TOKEN_RESPOSTA = /^(\*{0,2})(?:([A-E])|X|N|NULA|ANULADA|-)$/i;
const RE_NUMERO = /^\d{1,3}$/;

export function lerLegenda(texto: string): Legenda {
  const legenda: Legenda = { umaEstrela: 'anulada', duasEstrelas: 'alterada' };
  for (const linha of texto.split('\n')) {
    const m = /^\s*(\*{1,2})\s*[-=:]?\s*(?:QUEST(?:ÃO|AO|ÕES|OES))?\s*(ANULADA|ALTERADA)/i.exec(
      linha,
    );
    if (!m) continue;
    const sentido = m[2]!.toUpperCase().startsWith('ANUL') ? 'anulada' : 'alterada';
    if (m[1] === '*') legenda.umaEstrela = sentido;
    else legenda.duasEstrelas = sentido;
  }
  return legenda;
}

/** Interpreta um token de resposta ("B", "*X", "**C", "ANULADA"). */
export function interpretarToken(
  token: string,
  legenda: Legenda = lerLegenda(''),
): RespostaGabarito | null {
  const t = token.trim().toUpperCase();
  const m = RE_TOKEN_RESPOSTA.exec(t);
  if (!m) return null;
  const estrelas = m[1]!.length;
  const letra = (m[2] as Letra | undefined) ?? null;
  const marca = estrelas === 1 ? legenda.umaEstrela : estrelas === 2 ? legenda.duasEstrelas : null;
  const anulada = !letra || marca === 'anulada';
  return { letra, anulada, alterada: !anulada && marca === 'alterada', bruto: token.trim() };
}

function tokensComPosicao(linha: string): { t: string; ini: number }[] {
  const out: { t: string; ini: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) out.push({ t: m[0], ini: m.index });
  return out;
}

function ehLinhaDeNumeros(linha: string): boolean {
  const ts = linha.trim().split(/\s+/);
  return ts.length >= 2 && ts.every((t) => RE_NUMERO.test(t));
}

function ehLinhaDeRespostas(linha: string): boolean {
  const ts = linha.trim().split(/\s+/);
  return ts.length >= 1 && ts.every((t) => RE_TOKEN_RESPOSTA.test(t));
}

/** Pares numa linha: "01-A 02-B", "01) A", "Questão 01: ANULADA". */
export function paresNaLinha(linha: string, legenda: Legenda): [number, RespostaGabarito][] | null {
  const re =
    /(?:QUEST[ÃA]O\s*)?(?<!\d)(\d{1,3})\s*[-–.:)=]?\s*(\*{0,2}(?:[A-E]|X|NULA|ANULADA))(?![A-Za-zÀ-ÿ])/gi;
  const pares: [number, RespostaGabarito][] = [];
  let resto = linha;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    const r = interpretarToken(m[2]!, legenda);
    if (!r) continue;
    pares.push([Number(m[1]), r]);
    resto = resto.replace(m[0], ' ');
  }
  // Só vale se a linha for basicamente pares (evita "Edital nº 01/2026 de …").
  if (pares.length < 1 || resto.replace(/[\s|;,]/g, '').length > 3) return null;
  return pares;
}

const RE_NAO_CARGO =
  /GABARITO|TORNA|PUBLICO|LEGENDA|QUESTAO ANULADA|QUESTAO ALTERADA|PRESIDENTE|PORTARIA|COMISSAO|EDITAL|PROCESSO SELETIVO|CONCURSO PUBLICO|^\d+ DE [A-Z]+ DE \d{4}/;

/** A linha parece o nome de um cargo? */
function nomeDeCargo(linha: string): string | null {
  // "GABARITO DEFINITIVO - CARGO: TÉCNICO EM ENFERMAGEM" → "TÉCNICO EM ENFERMAGEM"
  const explicito = /\bCARGO\s*:\s*(.+)$/i.exec(linha);
  if (explicito) return limparEspacos(explicito[1]!) || null;
  const t = limparEspacos(linha).replace(/^CARGO\s*[:-]?\s*/i, '');
  if (!t || t.length > 100 || ehLinhaDeNumeros(t) || ehLinhaDeRespostas(t)) return null;
  const k = chaveComparacao(t);
  if (!k || RE_NAO_CARGO.test(k)) return null;
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length < 3) return null;
  const maiusculas = letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length;
  return maiusculas >= 0.6 ? t : null;
}

export function parseGabarito(texto: string): ResultadoGabarito {
  const normal = normalizarTextoPdf(texto);
  const legenda = lerLegenda(normal);
  const k = chaveComparacao(normal.slice(0, 3000));
  const preliminar = /GABARITO (PRELIMINAR|PROVISORIO)/.test(k);
  const definitivo = /GABARITO (DEFINITIVO|OFICIAL|FINAL)/.test(k) && !preliminar;
  const avisos: string[] = [];
  if (!definitivo) {
    avisos.push(
      preliminar
        ? 'O documento é um gabarito PRELIMINAR. O PRD exige o definitivo, depois dos recursos.'
        : 'O documento não se identifica como GABARITO DEFINITIVO; confira.',
    );
  }

  const linhas = normal.split(/\n|\f/);
  const gabaritos: GabaritoCargo[] = [];
  let atual: GabaritoCargo | null = null;
  let ultimoNumero = 0;
  let cargoPendente: string | null = null;

  const garantirBloco = (primeiroNumero: number) => {
    // Novo bloco: cargo novo citado, ou a numeração recomeçou.
    if (!atual || cargoPendente !== null || primeiroNumero <= ultimoNumero) {
      atual = { cargo: cargoPendente, respostas: new Map() };
      gabaritos.push(atual);
      cargoPendente = null;
    }
  };
  const registrar = (n: number, r: RespostaGabarito) => {
    const g = atual!;
    if (g.respostas.has(n))
      avisos.push(`questão ${n} repetida no gabarito${g.cargo ? ` de ${g.cargo}` : ''}`);
    g.respostas.set(n, r);
    ultimoNumero = n;
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]!;
    if (!linha.trim()) continue;

    if (ehLinhaDeNumeros(linha)) {
      // Procura a próxima linha não vazia com as respostas.
      let j = i + 1;
      while (j < linhas.length && !linhas[j]!.trim()) j++;
      const linhaResp = linhas[j];
      if (linhaResp === undefined || !ehLinhaDeRespostas(linhaResp)) continue;
      const nums = tokensComPosicao(linha);
      const resps = tokensComPosicao(linhaResp);
      garantirBloco(Number(nums[0]!.t));
      if (nums.length === resps.length) {
        nums.forEach((n, idx) => {
          const r = interpretarToken(resps[idx]!.t, legenda);
          if (r) registrar(Number(n.t), r);
        });
      } else {
        // Contagens diferentes: casa cada resposta com o número de coluna mais próxima.
        for (const r of resps) {
          const centro =
            r.ini +
            r.t.replace(/^\*+/, '').length / 2 +
            (r.t.length - r.t.replace(/^\*+/, '').length);
          const n = [...nums].sort(
            (a, b) =>
              Math.abs(a.ini + a.t.length / 2 - centro) - Math.abs(b.ini + b.t.length / 2 - centro),
          )[0]!;
          const resp = interpretarToken(r.t, legenda);
          if (resp) registrar(Number(n.t), resp);
        }
        const faltam = nums.filter((n) => !atual!.respostas.has(Number(n.t)));
        if (faltam.length)
          avisos.push(`sem resposta para as questões ${faltam.map((n) => n.t).join(', ')}`);
      }
      i = j;
      continue;
    }

    const pares = paresNaLinha(linha, legenda);
    if (pares) {
      garantirBloco(pares[0]![0]);
      for (const [n, r] of pares) registrar(n, r);
      continue;
    }

    const cargo = nomeDeCargo(linha);
    if (cargo) cargoPendente = cargo;
  }

  const validos = gabaritos.filter((g) => g.respostas.size);
  if (!validos.length) avisos.push('Nenhuma resposta encontrada no gabarito.');
  return { gabaritos: validos, definitivo, preliminar, avisos };
}

/** Escolhe o gabarito do cargo (único bloco, ou o de nome mais parecido com `cargo`). */
export function escolherGabarito(r: ResultadoGabarito, cargo?: string | null): GabaritoCargo {
  if (!r.gabaritos.length) throw new Error('O gabarito não tem respostas legíveis.');
  if (r.gabaritos.length === 1) return r.gabaritos[0]!;
  const nomes = r.gabaritos.map((g) => g.cargo ?? '(sem nome)');
  if (!cargo) {
    throw new Error(
      `O gabarito tem ${r.gabaritos.length} cargos. Informe --cargo com um destes: ${nomes.join('; ')}.`,
    );
  }
  const exato = r.gabaritos.find((g) => chaveComparacao(g.cargo ?? '') === chaveComparacao(cargo));
  if (exato) return exato;
  const melhor = [...r.gabaritos].sort(
    (a, b) => similaridade(b.cargo ?? '', cargo) - similaridade(a.cargo ?? '', cargo),
  )[0]!;
  if (similaridade(melhor.cargo ?? '', cargo) < 0.34) {
    throw new Error(`Nenhum cargo do gabarito parece com "${cargo}". Cargos: ${nomes.join('; ')}.`);
  }
  return melhor;
}
