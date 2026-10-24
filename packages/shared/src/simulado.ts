/**
 * Simulado no padrão FAU (PRD 1.2 e 5.14).
 * - 40 questões: Português 5, Matemática/RL 5, Conhecimentos Gerais 5, Específicos 25.
 * - 2,0 pontos por questão nos blocos comuns e 2,8 nos específicos (total 100).
 * - 4 horas, contadas no servidor. Mínimo de 50% dos pontos para aprovação.
 * - Com o edital publicado, vale a distribuição (e os pesos) do cargo no edital.
 *
 * As contas usam décimos de ponto em inteiros para evitar erro de ponto flutuante.
 */
import { MS_HORA } from './datas.js';
import { SLUGS_DISCIPLINA, type SlugDisciplina } from './dominio.js';
import { embaralhar, type Rng } from './aleatorio.js';

export type Distribuicao = Record<SlugDisciplina, number>;
export type Pesos = Record<SlugDisciplina, number>;

export const DISTRIBUICAO_PADRAO: Readonly<Distribuicao> = {
  portugues: 5,
  matematica: 5,
  gerais: 5,
  especificos: 25,
};

export const PESOS_PADRAO: Readonly<Pesos> = {
  portugues: 2.0,
  matematica: 2.0,
  gerais: 2.0,
  especificos: 2.8,
};

export const DURACAO_SIMULADO_MS = 4 * MS_HORA;
export const NOTA_MINIMA_PERCENTUAL = 50;

/** Ordem dos blocos na prova. */
export const ORDEM_BLOCOS: readonly SlugDisciplina[] = SLUGS_DISCIPLINA;

export function totalDeQuestoes(d: Distribuicao): number {
  return ORDEM_BLOCOS.reduce((s, b) => s + d[b], 0);
}

const decimos = (n: number) => Math.round(n * 10);

/** Pontuação máxima com a distribuição e os pesos (100 no padrão). */
export function pontuacaoMaxima(d: Distribuicao, pesos: Pesos = PESOS_PADRAO): number {
  return ORDEM_BLOCOS.reduce((s, b) => s + d[b] * decimos(pesos[b]), 0) / 10;
}

export interface DesempenhoBloco {
  bloco: SlugDisciplina;
  questoes: number;
  acertos: number;
  pontos: number;
  pontosMaximos: number;
}

export interface NotaSimulado {
  pontos: number;
  pontosMaximos: number;
  /** 0–100, com 1 casa decimal. */
  percentual: number;
  aprovado: boolean;
  acertos: number;
  totalQuestoes: number;
  porBloco: DesempenhoBloco[];
}

/**
 * Calcula a nota a partir dos acertos por bloco.
 * Questões anuladas depois do início contam como acerto para todos (padrão de banca),
 * e cabe ao chamador somá-las em `acertosPorBloco`.
 */
export function calcularNota(
  acertosPorBloco: Partial<Record<SlugDisciplina, number>>,
  distribuicao: Distribuicao = DISTRIBUICAO_PADRAO,
  pesos: Pesos = PESOS_PADRAO,
): NotaSimulado {
  let pontosD = 0;
  let maxD = 0;
  let acertos = 0;
  const porBloco = ORDEM_BLOCOS.map((bloco) => {
    const questoes = distribuicao[bloco];
    const ac = Math.min(Math.max(acertosPorBloco[bloco] ?? 0, 0), questoes);
    const p = ac * decimos(pesos[bloco]);
    const m = questoes * decimos(pesos[bloco]);
    pontosD += p;
    maxD += m;
    acertos += ac;
    return { bloco, questoes, acertos: ac, pontos: p / 10, pontosMaximos: m / 10 };
  });
  const percentual = maxD > 0 ? Math.round((pontosD / maxD) * 1000) / 10 : 0;
  return {
    pontos: pontosD / 10,
    pontosMaximos: maxD / 10,
    percentual,
    aprovado: maxD > 0 && pontosD * 100 >= maxD * NOTA_MINIMA_PERCENTUAL,
    acertos,
    totalQuestoes: totalDeQuestoes(distribuicao),
    porBloco,
  };
}

export interface ErroMontagem {
  bloco: SlugDisciplina;
  necessarias: number;
  disponiveis: number;
}

export type ResultadoMontagem =
  | { ok: true; questoes: string[]; blocos: SlugDisciplina[] }
  | { ok: false; faltando: ErroMontagem[] };

/**
 * Sorteia as questões do simulado, bloco a bloco, na ordem da prova.
 * `candidatas[bloco]` já vem filtrada (publicadas; específicas da área do cargo).
 */
export function montarSimulado(
  candidatas: Partial<Record<SlugDisciplina, readonly string[]>>,
  distribuicao: Distribuicao,
  rng: Rng,
): ResultadoMontagem {
  const faltando: ErroMontagem[] = [];
  const questoes: string[] = [];
  const blocos: SlugDisciplina[] = [];
  for (const bloco of ORDEM_BLOCOS) {
    const n = distribuicao[bloco];
    const lista = [...new Set(candidatas[bloco] ?? [])];
    if (lista.length < n) {
      faltando.push({ bloco, necessarias: n, disponiveis: lista.length });
      continue;
    }
    for (const id of embaralhar(lista, rng).slice(0, n)) {
      questoes.push(id);
      blocos.push(bloco);
    }
  }
  return faltando.length ? { ok: false, faltando } : { ok: true, questoes, blocos };
}

/** Instante em que o simulado acaba (iniciado + 4 h). */
export function terminoDoSimulado(iniciadoEm: Date, duracaoMs = DURACAO_SIMULADO_MS): Date {
  return new Date(iniciadoEm.getTime() + duracaoMs);
}

export function msRestantesSimulado(terminaEm: Date, agora: Date): number {
  return Math.max(0, terminaEm.getTime() - agora.getTime());
}

export function simuladoExpirado(terminaEm: Date, agora: Date): boolean {
  return agora.getTime() >= terminaEm.getTime();
}

/** Quantas questões ficaram sem resposta. */
export function questoesEmBranco(
  questoes: readonly string[],
  respostas: Readonly<Record<string, { letra: string | null } | undefined>>,
): number {
  return questoes.filter((id) => !respostas[id]?.letra).length;
}
