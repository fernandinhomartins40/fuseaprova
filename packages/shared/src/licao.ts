/**
 * Montagem de lições, desafio e revisão (PRD 5.7, 5.8, 5.13) e estado da trilha.
 */
import { embaralhar, inteiroAleatorio, type Rng } from './aleatorio.js';
import type { TipoLicao } from './dominio.js';
import { LIMITE_LICAO_REVISAO } from './revisao.js';

export const TAMANHO_LICAO = 5;
export const TAMANHO_DESAFIO = 10;
export const VEZES_ANEL_LICAO = 3;

export interface CandidataQuestao {
  id: string;
  /** Quantas vezes o aluno já respondeu a questão. */
  vezesRespondida: number;
  /** Última resposta do aluno (para preferir as vistas há mais tempo). */
  ultimaRespostaEm?: Date | null;
}

/**
 * Sorteia `n` questões novas do assunto: primeiro as nunca respondidas (embaralhadas),
 * depois as respondidas há mais tempo.
 */
export function sortearNovas(
  candidatas: readonly CandidataQuestao[],
  n: number,
  rng: Rng,
): string[] {
  const nunca = embaralhar(
    candidatas.filter((c) => c.vezesRespondida === 0),
    rng,
  );
  const vistas = embaralhar(
    candidatas.filter((c) => c.vezesRespondida > 0),
    rng,
  ).sort(
    (a, b) =>
      (a.ultimaRespostaEm?.getTime() ?? 0) - (b.ultimaRespostaEm?.getTime() ?? 0) ||
      a.vezesRespondida - b.vezesRespondida,
  );
  return [...nunca, ...vistas].slice(0, n).map((c) => c.id);
}

export interface EntradaMontagemLicao {
  /** Questões novas do assunto, já na ordem de preferência (veja `sortearNovas`). */
  novas: readonly string[];
  /** Questões de revisão vencidas do aluno (qualquer assunto), da mais antiga para a mais nova. */
  revisoesVencidas: readonly string[];
  tamanho?: number;
  rng: Rng;
}

export interface QuestaoDaLicao {
  questaoId: string;
  revisao: boolean;
}

/**
 * Lição = questões novas intercaladas com 1 questão de revisão vencida, se houver.
 * A revisão nunca é a primeira questão. Faltando novas, completa com mais revisões.
 */
export function montarLicao(e: EntradaMontagemLicao): QuestaoDaLicao[] {
  const tamanho = e.tamanho ?? TAMANHO_LICAO;
  const revisoes = e.revisoesVencidas.filter((id) => !e.novas.includes(id));
  const qtdRevisao = revisoes.length > 0 ? 1 : 0;
  const novas = e.novas.slice(0, tamanho - qtdRevisao);
  const qtdExtraRevisao = Math.max(0, tamanho - novas.length - qtdRevisao);
  const escolhidasRevisao = revisoes.slice(0, qtdRevisao + qtdExtraRevisao);

  const resultado: QuestaoDaLicao[] = novas.map((questaoId) => ({ questaoId, revisao: false }));
  const [primeira, ...outras] = escolhidasRevisao;
  if (primeira !== undefined) {
    // posição entre 1 e o fim (nunca a primeira, se houver novas)
    const pos = resultado.length === 0 ? 0 : 1 + inteiroAleatorio(resultado.length, e.rng);
    resultado.splice(pos, 0, { questaoId: primeira, revisao: true });
  }
  for (const id of outras) resultado.push({ questaoId: id, revisao: true });
  return resultado;
}

/**
 * Desafio da unidade: 10 questões distribuídas entre os assuntos das seções
 * (rodízio), sem revisão.
 */
export function montarDesafio(
  porAssunto: readonly (readonly string[])[],
  rng: Rng,
  tamanho = TAMANHO_DESAFIO,
): string[] {
  const filas = porAssunto.map((l) => embaralhar([...new Set(l)], rng));
  const escolhidas: string[] = [];
  const vistos = new Set<string>();
  let restante = true;
  while (escolhidas.length < tamanho && restante) {
    restante = false;
    for (const fila of filas) {
      if (escolhidas.length >= tamanho) break;
      const id = fila.shift();
      if (id === undefined) continue;
      restante = true;
      if (vistos.has(id)) continue;
      vistos.add(id);
      escolhidas.push(id);
    }
  }
  return embaralhar(escolhidas, rng);
}

/** Sessão de revisão: até 10 itens vencidos, os mais atrasados primeiro. */
export function montarRevisao(
  vencidas: readonly { questaoId: string; venceEm: Date }[],
  limite = LIMITE_LICAO_REVISAO,
): string[] {
  return [...vencidas]
    .sort((a, b) => a.venceEm.getTime() - b.venceEm.getTime())
    .slice(0, limite)
    .map((v) => v.questaoId);
}

/* ---------------------------------------------------------------- trilha */

export type EstadoNo = 'concluida' | 'atual' | 'bloqueada';

export interface LicaoNaTrilha {
  id: string;
  tipo: TipoLicao;
}

export interface ProgressoLicao {
  vezes: number;
  concluidaEm: Date | null;
}

export interface NoDaTrilha extends LicaoNaTrilha {
  estado: EstadoNo;
  vezes: number;
  /** Anel de progresso (0–1): vezes feitas até 3. */
  anel: number;
  /** Pode abrir: a atual e as já concluídas (para refazer). Baú concluído não reabre. */
  podeAbrir: boolean;
}

/**
 * Estado dos nós em ordem: as concluídas, depois a primeira não concluída como
 * `atual`, e o resto `bloqueada`.
 */
export function estadoDaTrilha(
  licoes: readonly LicaoNaTrilha[],
  progresso: Readonly<Record<string, ProgressoLicao | undefined>>,
): NoDaTrilha[] {
  let atualDefinida = false;
  return licoes.map((l) => {
    const p = progresso[l.id];
    const concluida = Boolean(p?.concluidaEm);
    const vezes = p?.vezes ?? 0;
    let estado: EstadoNo;
    if (concluida && !atualDefinida) estado = 'concluida';
    else if (!atualDefinida) {
      estado = 'atual';
      atualDefinida = true;
    } else estado = concluida ? 'concluida' : 'bloqueada';
    const podeAbrir = estado === 'atual' || (estado === 'concluida' && l.tipo !== 'bau');
    return {
      ...l,
      estado,
      vezes,
      anel: Math.min(vezes, VEZES_ANEL_LICAO) / VEZES_ANEL_LICAO,
      podeAbrir,
    };
  });
}

/** Lições normais que faltam até o próximo baú, a partir da atual (null se não houver baú à frente). */
export function licoesAteOBau(nos: readonly NoDaTrilha[]): number | null {
  const iAtual = nos.findIndex((n) => n.estado === 'atual');
  if (iAtual < 0) return null;
  let faltam = 0;
  for (let i = iAtual; i < nos.length; i++) {
    const n = nos[i]!;
    if (n.tipo === 'bau') return faltam;
    if (n.tipo === 'normal') faltam++;
  }
  return null;
}

/**
 * Intercala as seções comuns com as específicas na proporção da prova:
 * a cada 3 comuns, 5 específicas (PRD 7.1). Sobras vão para o fim.
 */
export function intercalarSecoes<T>(
  comuns: readonly T[],
  especificas: readonly T[],
  blocoComum = 3,
  blocoEspecifico = 5,
): T[] {
  const r: T[] = [];
  let i = 0;
  let j = 0;
  while (i < comuns.length || j < especificas.length) {
    r.push(...comuns.slice(i, i + blocoComum));
    i += blocoComum;
    r.push(...especificas.slice(j, j + blocoEspecifico));
    j += blocoEspecifico;
  }
  return r;
}
