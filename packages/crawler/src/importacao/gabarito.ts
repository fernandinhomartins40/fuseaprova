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

const LIGACOES = new Set([
  'DE',
  'DO',
  'DA',
  'DOS',
  'DAS',
  'EM',
  'NO',
  'NA',
  'NOS',
  'NAS',
  'E',
  'A',
  'O',
  'AS',
  'OS',
  // Carga horária escrita por extenso ou solta ("40 HORAS", "20 H"): não distingue o cargo.
  'H',
  'HS',
  'HORA',
  'HORAS',
]);

/** Palavras que distinguem o cargo: sem ligações, numerais romanos, cargas horárias e siglas entre parênteses. */
function palavrasDoCargo(nome: string): string[] {
  return chaveComparacao(nome.replace(/\([^)]*\)/g, ' '))
    .split(' ')
    .filter((p) => p && !LIGACOES.has(p) && !/^[IVX]+$/.test(p) && !/\d/.test(p));
}

/**
 * Distância de edição com transposição de vizinhas (OSA), com corte: devolve `max + 1` quando
 * passa de `max`. Serve para tolerar erro de digitação no nome do cargo.
 */
export function distanciaEdicao(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const linha = new Array<number>(b.length + 1).fill(0);
    linha[0] = i;
    return linha;
  });
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/**
 * Duas palavras de cargo "são a mesma": iguais, uma abreviação da outra ("TÉC." → "TÉCNICO"),
 * ou com erro de digitação ("OBSTRETA" → "OBSTETRA", "ODONTOPEDIATRA" → "ODONTOPEDIATRIA").
 * O erro só vale com mesmo começo (2 letras) e mesma última letra, para não juntar cargos
 * diferentes ("AUXILIAR" x "AUXILIO"); até 1 erro em palavras de 5 a 7 letras, até 2 a partir de 8.
 */
export function palavrasParecidas(a: string, b: string): boolean {
  if (a === b) return true;
  const menor = Math.min(a.length, b.length);
  if (menor >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (menor < 5) return false;
  if (a.slice(0, 2) !== b.slice(0, 2) || a.at(-1) !== b.at(-1)) return false;
  return distanciaEdicao(a, b, 2) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);
}

/**
 * O bloco serve ao cargo quando cada palavra do cargo aparece no nome do bloco, aceitando
 * abreviação ("TÉC. EM ENFERMAGEM" serve a "Técnico em Enfermagem") e erro de digitação
 * ("MÉDICO OBSTRETA" serve a "Médico Obstetra"). Palavra a mais no
 * cargo derruba: "Cirurgião Dentista - Odontopediatria" não usa o bloco "CIRURGIÃO DENTISTA II",
 * nem "Agente Comunitário de Saúde" o de "AGENTE DE TRÂNSITO".
 */
export function blocoServeAoCargo(bloco: string, cargo: string): boolean {
  const doBloco = palavrasDoCargo(bloco);
  const doCargo = palavrasDoCargo(cargo);
  if (!doCargo.length) return false;
  if (doCargo.join('') === doBloco.join('')) return true;
  return doCargo.every((p) => doBloco.some((b) => palavrasParecidas(p, b)));
}

/**
 * O bloco tem exatamente as palavras do cargo (nem a mais, nem a menos). Desempata o cargo
 * sem especificação: "Professor 20h" fica com o bloco "PROFESSOR", e não com "PROFESSOR ARTE".
 */
export function blocoEquivaleAoCargo(bloco: string, cargo: string): boolean {
  const doBloco = palavrasDoCargo(bloco);
  const doCargo = palavrasDoCargo(cargo);
  if (!doCargo.length || !doBloco.length) return false;
  // "ÁUDIO VISUAL" x "AUDIOVISUAL": mesmas letras, espaçamento diferente.
  if (doCargo.join('') === doBloco.join('')) return true;
  return (
    doCargo.every((p) => doBloco.some((b) => palavrasParecidas(p, b))) &&
    doBloco.every((b) => doCargo.some((p) => palavrasParecidas(p, b)))
  );
}

const mesmasRespostas = (a: GabaritoCargo, b: GabaritoCargo) =>
  a.respostas.size === b.respostas.size &&
  [...a.respostas].every(
    ([n, r]) => b.respostas.get(n)?.letra === r.letra && b.respostas.get(n)?.anulada === r.anulada,
  );

export interface OpcoesEscolha {
  /** Nº de questões do caderno: desempata blocos de cargos parecidos (o bloco tem esse nº de respostas). */
  totalQuestoes?: number | null;
}

/**
 * Entre blocos que servem ao cargo: aceita se todos têm as mesmas respostas; senão tenta
 * o bloco com o nº de questões do caderno; senão não há como saber qual é o do caderno.
 */
function decidir(
  candidatos: GabaritoCargo[],
  cargo: string,
  totalQuestoes: number | null | undefined,
): GabaritoCargo {
  const melhor = [...candidatos].sort(
    (a, b) => similaridade(b.cargo!, cargo) - similaridade(a.cargo!, cargo),
  )[0]!;
  if (candidatos.every((g) => mesmasRespostas(g, melhor))) return melhor;
  if (totalQuestoes) {
    const doTamanho = candidatos.filter((g) => g.respostas.size === totalQuestoes);
    if (doTamanho.length && doTamanho.every((g) => mesmasRespostas(g, doTamanho[0]!)))
      return doTamanho[0]!;
  }
  throw new Error(
    `Mais de um cargo do gabarito serve a "${cargo}" com respostas diferentes: ${candidatos.map((g) => g.cargo).join('; ')}. Informe --cargo exato.`,
  );
}

/** Escolhe o gabarito do cargo (único bloco, ou o bloco cujo nome serve a `cargo`). */
export function escolherGabarito(
  r: ResultadoGabarito,
  cargo?: string | null,
  opcoes: OpcoesEscolha = {},
): GabaritoCargo {
  if (!r.gabaritos.length) throw new Error('O gabarito não tem respostas legíveis.');
  const nomes = r.gabaritos.map((g) => g.cargo ?? '(sem nome)');
  if (r.gabaritos.length === 1) {
    const unico = r.gabaritos[0]!;
    // Bloco único com nome de outro cargo (ex.: retificação só de um cargo): não serve.
    if (
      cargo &&
      unico.cargo &&
      chaveComparacao(unico.cargo) !== chaveComparacao(cargo) &&
      !blocoServeAoCargo(unico.cargo, cargo)
    ) {
      throw new Error(`O gabarito só tem o cargo "${unico.cargo}", que não é "${cargo}".`);
    }
    return unico;
  }
  if (!cargo) {
    throw new Error(
      `O gabarito tem ${r.gabaritos.length} cargos. Informe --cargo com um destes: ${nomes.join('; ')}.`,
    );
  }
  const exato = r.gabaritos.find((g) => chaveComparacao(g.cargo ?? '') === chaveComparacao(cargo));
  if (exato) return exato;
  // 1º as palavras do bloco são as do cargo (mesmo com erro de digitação ou carga horária);
  // 2º o bloco contém todas as palavras do cargo (o bloco é mais específico).
  const equivalentes = r.gabaritos.filter((g) => g.cargo && blocoEquivaleAoCargo(g.cargo, cargo));
  if (equivalentes.length) return decidir(equivalentes, cargo, opcoes.totalQuestoes);
  const servem = r.gabaritos.filter((g) => g.cargo && blocoServeAoCargo(g.cargo, cargo));
  if (!servem.length) {
    throw new Error(`Nenhum cargo do gabarito parece com "${cargo}". Cargos: ${nomes.join('; ')}.`);
  }
  // Vários blocos servem (ex.: "MÉDICO VETERINÁRIO I" e "II" para "Médico Veterinário"): só
  // aceita se as respostas forem as mesmas ou se só um tiver o nº de questões do caderno.
  return decidir(servem, cargo, opcoes.totalQuestoes);
}
