/**
 * XP (PRD 6.1).
 *
 * | Evento                                   | XP                         |
 * | Acerto em lição ou revisão               | +10                        |
 * | Concluir lição                           | +5                         |
 * | Lição perfeita (0 erros)                 | +10 bônus                  |
 * | Desafio da unidade com 70% ou mais       | +30                        |
 * | Simulado entregue                        | +1 por acerto, +20 se aprovado |
 *
 * O desafio é uma lição (tipo `desafio`): soma acertos, conclusão e perfeição como
 * uma lição normal, mais os +30 se passar (veja docs/DECISOES.md). A revisão só dá
 * XP por acerto (não é "concluir lição").
 */
import type { TipoSessaoEstudo, TipoXpEvento } from './dominio.js';

export const XP = {
  ACERTO: 10,
  CONCLUIR_LICAO: 5,
  LICAO_PERFEITA: 10,
  DESAFIO_APROVADO: 30,
  SIMULADO_ACERTO: 1,
  SIMULADO_APROVADO: 20,
} as const;

/** Precisão mínima (fração) para passar no desafio da unidade e ganhar a coroa. */
export const DESAFIO_PRECISAO_MINIMA = 0.7;

/** XP de uma resposta na hora em que ela é corrigida (lição, desafio ou revisão). */
export function xpDaResposta(tipo: TipoSessaoEstudo, acertou: boolean): number {
  if (!acertou || tipo === 'simulado') return 0;
  return XP.ACERTO;
}

export interface ItemXp {
  tipo: TipoXpEvento;
  valor: number;
}

export interface ResumoXpSessao {
  total: number;
  itens: ItemXp[];
}

/** Desafio aprovado: acertos/total ≥ 70%. */
export function desafioAprovado(acertos: number, total: number): boolean {
  return total > 0 && acertos / total >= DESAFIO_PRECISAO_MINIMA;
}

/**
 * XP total de uma sessão concluída, já incluindo os acertos.
 * Ex.: lição 4/5 = 45; lição 5/5 = 65 (critério de aceite).
 */
export function xpDaSessao(
  tipo: Exclude<TipoSessaoEstudo, 'simulado'>,
  acertos: number,
  total: number,
): ResumoXpSessao {
  const itens: ItemXp[] = [];
  if (acertos > 0) itens.push({ tipo: 'acerto', valor: acertos * XP.ACERTO });
  if (tipo !== 'revisao') {
    itens.push({ tipo: 'licao_concluida', valor: XP.CONCLUIR_LICAO });
    if (total > 0 && acertos === total) {
      itens.push({ tipo: 'licao_perfeita', valor: XP.LICAO_PERFEITA });
    }
    if (tipo === 'desafio' && desafioAprovado(acertos, total)) {
      itens.push({ tipo: 'desafio_aprovado', valor: XP.DESAFIO_APROVADO });
    }
  }
  return { total: somarItens(itens), itens };
}

/** XP de um simulado entregue. */
export function xpDoSimulado(acertos: number, aprovado: boolean): ResumoXpSessao {
  const itens: ItemXp[] = [];
  if (acertos > 0) itens.push({ tipo: 'simulado_acerto', valor: acertos * XP.SIMULADO_ACERTO });
  if (aprovado) itens.push({ tipo: 'simulado_aprovado', valor: XP.SIMULADO_APROVADO });
  return { total: somarItens(itens), itens };
}

function somarItens(itens: ItemXp[]): number {
  return itens.reduce((s, i) => s + i.valor, 0);
}

/** O XP total nunca diminui: ignora valores negativos. */
export function somarXp(atual: number, ganho: number): number {
  return atual + Math.max(0, ganho);
}

/** Combo (só visual): número de acertos seguidos no fim da sequência. Aparece a partir de 3. */
export function calcularCombo(respostas: readonly boolean[]): number {
  let combo = 0;
  for (let i = respostas.length - 1; i >= 0 && respostas[i]; i--) combo++;
  return combo;
}

export const COMBO_MINIMO_VISIVEL = 3;

export function comboVisivel(combo: number): boolean {
  return combo >= COMBO_MINIMO_VISIVEL;
}
