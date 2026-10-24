/**
 * Parser do caderno de questões da FAU (puro), sobre o texto do pdftotext.
 *
 * Padrão FAU: questões numeradas "01." (ou "01)"/"QUESTÃO 01"), alternativas "A)" a "E)",
 * blocos por disciplina ("LÍNGUA PORTUGUESA", "MATEMÁTICA", "CONHECIMENTOS GERAIS",
 * "CONHECIMENTOS ESPECÍFICOS") e textos de apoio "Leia o texto … questões 01 a 03".
 *
 * Regras para não confundir listas internas com questões:
 * - a numeração tem de ser sequencial (a próxima questão é sempre a anterior + 1);
 * - o formato do número (com zero à esquerda e o separador) é aprendido na 1ª questão;
 * - as alternativas têm de vir na ordem A, B, C, D, E.
 */
import type { Letra, SlugDisciplina } from '@fuse/shared';
import { chaveComparacao, limparEspacos } from '../util/texto.js';
import { linhasLimpas } from './texto-pdf.js';

export interface AlternativaExtraida {
  letra: Letra;
  texto: string;
}

export interface QuestaoExtraida {
  numero: number;
  disciplina: SlugDisciplina | null;
  /** Título da seção do caderno onde a questão estava. */
  secao: string | null;
  textoApoio: string | null;
  enunciado: string;
  alternativas: AlternativaExtraida[];
  avisos: string[];
}

export interface SecaoCaderno {
  titulo: string;
  disciplina: SlugDisciplina;
  primeiraQuestao: number | null;
}

export interface ResultadoCaderno {
  questoes: QuestaoExtraida[];
  secoes: SecaoCaderno[];
  avisos: string[];
}

const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E'];

/* ----------------------------------------------------------- seções */

const SECOES: [RegExp, SlugDisciplina][] = [
  [/^(LINGUA PORTUGUESA|PORTUGUES|INTERPRETACAO DE TEXTO)/, 'portugues'],
  [/^(MATEMATICA|RACIOCINIO LOGICO)/, 'matematica'],
  [
    /^(CONHECIMENTOS GERAIS|ATUALIDADES|REALIDADE DO MUNICIPIO|HISTORIA E GEOGRAFIA|CONHECIMENTOS SOBRE O MUNICIPIO)/,
    'gerais',
  ],
  [
    /^(CONHECIMENTOS ESPECIFICOS|ESPECIFICOS?|CONHECIMENTOS TECNICOS|CONHECIMENTOS PEDAGOGICOS|INFORMATICA|NOCOES DE INFORMATICA|LEGISLACAO)/,
    'especificos',
  ],
];

/** "LÍNGUA PORTUGUESA" (linha de título) → 'portugues'; texto comum → null. */
export function detectarSecao(linha: string): SlugDisciplina | null {
  const t = linha.trim();
  if (!t || t.length > 90) return null;
  if (/^\(?[A-E]\)/.test(t) || /^\d{1,3}\s*[.)-]/.test(t)) return null;
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length < 5) return null;
  const maiusculas = letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length;
  const k = chaveComparacao(t)
    .replace(/\bQUESTOES?\b.*$/, '')
    .replace(/\b(PARTE|BLOCO|PROVA( OBJETIVA)?( DE)?)\b/g, '')
    .trim();
  for (const [re, slug] of SECOES) {
    if (!re.test(k)) continue;
    // Título: quase todo em maiúsculas, ou curto e exatamente o nome da seção.
    if (maiusculas >= 0.7 || k.split(' ').length <= 4) return slug;
  }
  return null;
}

/** Distribuição padrão da prova FAU de 40 questões (5/5/5/25), usada sem títulos de seção. */
export function disciplinaPadraoFau(numero: number, total: number): SlugDisciplina | null {
  if (total !== 40) return null;
  if (numero <= 5) return 'portugues';
  if (numero <= 10) return 'matematica';
  if (numero <= 15) return 'gerais';
  return 'especificos';
}

/* ----------------------------------------------------------- linhas */

interface InicioQuestao {
  numero: number;
  bruto: string;
  sep: string;
  resto: string;
}

const RE_QUESTAO =
  /^(?:QUEST[ÃA]O\s+)(\d{1,3})\s*[.):–-]?\s*(.*)$|^(\d{1,3})\s*([.)]|\s-|–)\s*(.*)$/i;

export function matchQuestao(linha: string): InicioQuestao | null {
  const m = RE_QUESTAO.exec(linha.trim());
  if (!m) return null;
  if (m[1]) return { numero: Number(m[1]), bruto: m[1], sep: 'QUESTAO', resto: m[2] ?? '' };
  const resto = m[5] ?? '';
  // "1.000 pessoas", "2.5 cm": número com casas não é início de questão.
  if (m[4] === '.' && /^\d/.test(resto)) return null;
  return { numero: Number(m[3]), bruto: m[3]!, sep: m[4]!.trim(), resto };
}

const RE_ALTERNATIVA = /^\(?([A-E])\)\s*(.*)$/;

export function matchAlternativa(linha: string): { letra: Letra; resto: string } | null {
  const m = RE_ALTERNATIVA.exec(linha.trim());
  return m ? { letra: m[1] as Letra, resto: m[2] ?? '' } : null;
}

/** "A) 10 B) 12 C) 14" numa linha só → partes na ordem; senão, a linha inteira. */
export function dividirAlternativasNaLinha(primeira: Letra, resto: string): AlternativaExtraida[] {
  const partes: AlternativaExtraida[] = [];
  let letra = primeira;
  let texto = resto;
  for (;;) {
    const proxima = LETRAS[LETRAS.indexOf(letra) + 1];
    if (!proxima) break;
    const re = new RegExp(`(^|\\s)\\(?${proxima}\\)\\s`);
    const m = re.exec(texto);
    if (!m) break;
    partes.push({ letra, texto: texto.slice(0, m.index).trim() });
    texto = texto.slice(m.index + m[0].length);
    letra = proxima;
  }
  partes.push({ letra, texto: texto.trim() });
  return partes;
}

const RE_INICIO_APOIO =
  /^(Leia|Texto\b|TEXTO\b|Observe|Considere o (texto|trecho|gr[áa]fico|quadro|tabela)|Analise o (texto|trecho)|Instru[çc][ãa]o)/;

const RE_IMAGEM =
  /\b(figura|imagem|gr[áa]fico|charge|tirinha|ilustra[çc][ãa]o|mapa|quadro abaixo|tabela abaixo|tabela a seguir)\b/i;

/** Questões citadas num texto de apoio ("questões 01 a 03", "questões 04 e 05", "questão 06"). */
export function intervaloDoApoio(texto: string): [number, number] | null {
  const k = chaveComparacao(texto);
  const faixa = /QUESTOES (?:DE )?(\d{1,3}) (?:A|ATE|E) (?:A )?(\d{1,3})/.exec(k);
  if (faixa) {
    const a = Number(faixa[1]);
    const b = Number(faixa[2]);
    return a <= b ? [a, b] : [b, a];
  }
  const uma = /QUESTAO (\d{1,3})\b/.exec(k);
  return uma ? [Number(uma[1]), Number(uma[1])] : null;
}

/** Junta linhas quebradas: "palavra-" + "ção" → "palavração"; parágrafos ('') viram \n\n. */
export function juntarLinhas(linhas: string[]): string {
  const paragrafos: string[] = [];
  let atual = '';
  for (const l of linhas) {
    if (!l.trim()) {
      if (atual) paragrafos.push(atual);
      atual = '';
      continue;
    }
    const t = l.trim();
    if (!atual) atual = t;
    else if (/[A-Za-zÀ-ÿ]-$/.test(atual) && /^[a-zà-ÿ]/.test(t)) atual = atual.slice(0, -1) + t;
    // Itens enumerados ("1. …", "II – …") começam em linha própria.
    else if (/^(\d{1,2}|[IVX]{1,4})\s*[.)–-]\s/.test(t)) atual = `${atual}\n${t}`;
    else atual = `${atual} ${t}`;
  }
  if (atual) paragrafos.push(atual);
  return paragrafos.map((p) => p.split('\n').map(limparEspacos).join('\n')).join('\n\n');
}

/* ----------------------------------------------------------- parser */

interface QuestaoEmMontagem {
  numero: number;
  disciplina: SlugDisciplina | null;
  secao: string | null;
  enunciado: string[];
  alternativas: { letra: Letra; linhas: string[] }[];
}

interface BlocoApoio {
  linhas: string[];
  /** Bloco do começo do caderno (capa/instruções). */
  capa: boolean;
}

export function parseCaderno(texto: string): ResultadoCaderno {
  const linhas = linhasLimpas(texto);
  const avisos: string[] = [];
  const secoes: SecaoCaderno[] = [];
  const montadas: { q: QuestaoEmMontagem; apoio: BlocoApoio | null }[] = [];
  const apoios: { de: number; ate: number; texto: string; explicito: boolean }[] = [];
  const faixas: { de: number; ate: number; disciplina: SlugDisciplina }[] = [];

  let formato: { padded: boolean; sep: string } | null = null;
  let esperado: number | null = null;
  let atual: QuestaoEmMontagem | null = null;
  let estado: 'capa' | 'apoio' | 'enunciado' | 'alternativa' = 'capa';
  let apoio: BlocoApoio = { linhas: [], capa: true };
  let secaoAtual: { titulo: string; disciplina: SlugDisciplina } | null = null;
  let linhaEmBranco = false;

  const fechar = () => {
    if (atual) montadas.push({ q: atual, apoio: null });
    atual = null;
  };

  const mesmoFormato = (q: InicioQuestao, f: { padded: boolean; sep: string }): boolean => {
    if (q.sep !== f.sep && !(q.sep === 'QUESTAO' || f.sep === 'QUESTAO')) return false;
    if (q.numero < 10 && q.sep !== 'QUESTAO' && q.bruto.length >= 2 !== f.padded) return false;
    return true;
  };

  /** Há uma alternativa "A)" antes da próxima questão (número + 1, mesmo formato)? */
  const temAlternativaAdiante = (q: InicioQuestao, i: number): boolean => {
    const f = { padded: q.bruto.length >= 2, sep: q.sep };
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j]!;
      if (!l) continue;
      if (matchAlternativa(l)?.letra === 'A') return true;
      const prox = matchQuestao(l);
      if (prox && prox.numero === q.numero + 1 && mesmoFormato(prox, f)) return false;
    }
    return false;
  };

  const aceitaInicio = (q: InicioQuestao, i: number): boolean => {
    if (esperado === null) {
      // 1ª questão: listas da capa ("1. Confira seu nome…") não têm alternativas.
      return q.numero === 1 && temAlternativaAdiante(q, i);
    }
    if (q.numero !== esperado) return false;
    return !formato || mesmoFormato(q, formato);
  };

  const registrarApoio = (proxima: number) => {
    let ls = apoio.linhas;
    if (apoio.capa) {
      // Da capa só aproveita o último bloco que começa como texto de apoio ("Leia o texto…").
      const inicio = ls
        .map((l, i) => (RE_INICIO_APOIO.test(l) ? i : -1))
        .filter((i) => i >= 0)
        .pop();
      ls = inicio === undefined ? [] : ls.slice(inicio);
    }
    const textoApoio = juntarLinhas(ls);
    apoio = { linhas: [], capa: false };
    if (!textoApoio) return;
    const faixa = intervaloDoApoio(textoApoio);
    const de = faixa && faixa[1] >= proxima ? Math.max(faixa[0], proxima) : proxima;
    const ate = faixa && faixa[1] >= proxima ? faixa[1] : proxima;
    // Tira a frase de instrução do começo quando sobra texto depois dela.
    const partes = textoApoio.split('\n\n');
    const semInstrucao =
      partes.length > 1 &&
      /\bquest(ões|ão|oes|ao)\b/i.test(partes[0]!) &&
      RE_INICIO_APOIO.test(partes[0]!)
        ? partes.slice(1).join('\n\n')
        : textoApoio;
    apoios.push({ de, ate, texto: semInstrucao, explicito: !!faixa });
  };

  for (const [i, linha] of linhas.entries()) {
    if (!linha) {
      linhaEmBranco = true;
      if (estado === 'enunciado' && atual) (atual as QuestaoEmMontagem).enunciado.push('');
      else if (estado === 'apoio' || estado === 'capa') apoio.linhas.push('');
      continue;
    }
    const emBrancoAntes = linhaEmBranco;
    linhaEmBranco = false;

    const secao = detectarSecao(linha);
    const faixaIndice = secao
      ? /(\d{1,3})\s*(?:a|à|-|–|até)\s*(\d{1,3})\s*\)?\s*$/i.exec(linha)
      : null;
    if (secao && faixaIndice) {
      // Quadro da capa ("LÍNGUA PORTUGUESA ... 01 a 05"): vale como faixa, não como título.
      faixas.push({ de: Number(faixaIndice[1]), ate: Number(faixaIndice[2]), disciplina: secao });
      continue;
    }
    if (secao) {
      fechar();
      secaoAtual = { titulo: limparEspacos(linha), disciplina: secao };
      secoes.push({ titulo: secaoAtual.titulo, disciplina: secao, primeiraQuestao: null });
      apoio = { linhas: [], capa: false };
      estado = 'apoio';
      continue;
    }

    const q = matchQuestao(linha);
    if (q && aceitaInicio(q, i)) {
      fechar();
      registrarApoio(q.numero);
      if (!formato) formato = { padded: q.bruto.length >= 2, sep: q.sep };
      esperado = q.numero + 1;
      atual = {
        numero: q.numero,
        disciplina: secaoAtual?.disciplina ?? null,
        secao: secaoAtual?.titulo ?? null,
        enunciado: q.resto ? [q.resto] : [],
        alternativas: [],
      };
      const s = secoes[secoes.length - 1];
      if (s && s.primeiraQuestao === null && secaoAtual) s.primeiraQuestao = q.numero;
      estado = 'enunciado';
      continue;
    }

    const cur = atual as QuestaoEmMontagem | null;
    const alt = cur ? matchAlternativa(linha) : null;
    const proximaLetra = cur ? LETRAS[cur.alternativas.length] : undefined;
    if (
      cur &&
      alt &&
      alt.letra === proximaLetra &&
      (estado === 'enunciado' || estado === 'alternativa')
    ) {
      for (const parte of dividirAlternativasNaLinha(alt.letra, alt.resto)) {
        cur.alternativas.push({ letra: parte.letra, linhas: parte.texto ? [parte.texto] : [] });
      }
      estado = 'alternativa';
      continue;
    }

    if (estado === 'enunciado' && cur) {
      cur.enunciado.push(linha);
    } else if (estado === 'alternativa' && cur) {
      const ultima = cur.alternativas[cur.alternativas.length - 1]!;
      const terminou = ultima.letra === 'E' && emBrancoAntes;
      if (terminou || RE_INICIO_APOIO.test(linha)) {
        estado = 'apoio';
        apoio.linhas.push(linha);
      } else {
        ultima.linhas.push(linha);
      }
    } else {
      apoio.linhas.push(linha);
    }
  }
  fechar();

  // Monta as questões finais.
  const total = montadas.length;
  const semSecao = !secoes.length && !faixas.length;
  if (semSecao && total) {
    avisos.push(
      total === 40
        ? 'O caderno não tem títulos de seção; a disciplina foi deduzida pela distribuição FAU 5/5/5/25.'
        : 'O caderno não tem títulos de seção; classifique a disciplina de cada questão no painel.',
    );
  }
  const questoes: QuestaoExtraida[] = montadas.map(({ q }) => {
    const avisosQ: string[] = [];
    const apoioQ = apoios.filter((a) => q.numero >= a.de && q.numero <= a.ate);
    const textoApoio = apoioQ.length ? apoioQ.map((a) => a.texto).join('\n\n') : null;
    if (apoioQ.some((a) => !a.explicito))
      avisosQ.push('texto de apoio sem indicação das questões; confira');
    const enunciado = juntarLinhas(q.enunciado);
    const alternativas = q.alternativas.map((a) => ({
      letra: a.letra,
      texto: juntarLinhas(a.linhas).replace(/\n\n/g, ' '),
    }));
    if (!enunciado) avisosQ.push('enunciado vazio');
    if (alternativas.length !== 5)
      avisosQ.push(`${alternativas.length} alternativas extraídas (esperado 5)`);
    if (alternativas.some((a) => !a.texto)) avisosQ.push('alternativa sem texto (pode ser imagem)');
    if (RE_IMAGEM.test(`${enunciado} ${textoApoio ?? ''}`))
      avisosQ.push('cita figura/gráfico/tabela: confira se depende de imagem');
    const daFaixa = faixas.find((f) => q.numero >= f.de && q.numero <= f.ate)?.disciplina ?? null;
    const disciplina =
      q.disciplina ?? daFaixa ?? (semSecao ? disciplinaPadraoFau(q.numero, total) : null);
    if (!disciplina) avisosQ.push('disciplina não identificada');
    return {
      numero: q.numero,
      disciplina,
      secao: q.secao,
      textoApoio,
      enunciado,
      alternativas,
      avisos: avisosQ,
    };
  });

  for (let i = 1; i < questoes.length; i++) {
    if (questoes[i]!.numero !== questoes[i - 1]!.numero + 1) {
      avisos.push(`numeração com salto entre ${questoes[i - 1]!.numero} e ${questoes[i]!.numero}`);
    }
  }
  if (!questoes.length)
    avisos.push('Nenhuma questão encontrada (o padrão é "01." e alternativas "A)" a "E)").');
  return { questoes, secoes, avisos };
}

/** Pontuação de qualidade de uma extração (para escolher entre texto normal e -layout). */
export function qualidadeDaExtracao(r: ResultadoCaderno): number {
  return r.questoes.reduce(
    (s, q) => s + (q.alternativas.length === 5 && q.enunciado ? 1 : 0.25),
    0,
  );
}
