/**
 * Revisão espaçada (PRD 6.5).
 * - Errar (em qualquer modo) cria ou reinicia o item na etapa 0, vencendo em +1 dia.
 * - Acertar o item vencido avança: etapa 0 → 1 (+3 dias) → 2 (+7) → 3 (+15).
 * - Acertar na etapa de 15 dias (3) retira o item da fila: status `dominada`, etapa 4.
 *   São 4 acertos seguidos (1, 3, 7 e 15 dias).
 * - Errar na revisão volta à etapa 0 (+1 dia).
 * - Pendentes = itens ativos com `vence_em <= agora`.
 *
 * "+N dias" vence às 00:00 (São Paulo) do dia de hoje + N, para que a questão
 * errada à noite já apareça na manhã seguinte ("volta na sua revisão amanhã").
 */
import { diaSP, inicioDoDiaSP, somarDias } from './datas.js';
import type { StatusRevisao } from './dominio.js';

/** Dias de espera de cada etapa (índice = etapa). */
export const INTERVALOS_REVISAO = [1, 3, 7, 15] as const;
export const ETAPA_DOMINADA = 4;
export const LIMITE_LICAO_REVISAO = 10;

export interface ItemRevisao {
  etapa: number;
  venceEm: Date;
  status: StatusRevisao;
}

export function vencimentoEmDias(agora: Date, dias: number): Date {
  return inicioDoDiaSP(somarDias(diaSP(agora), dias));
}

/** Item novo (ou reiniciado) após um erro. */
export function revisaoAposErro(agora: Date): ItemRevisao {
  return { etapa: 0, venceEm: vencimentoEmDias(agora, INTERVALOS_REVISAO[0]), status: 'ativa' };
}

export function estaVencida(item: ItemRevisao, agora: Date): boolean {
  return item.status === 'ativa' && item.venceEm.getTime() <= agora.getTime();
}

/**
 * Efeito de um acerto. Só avança se o item estiver vencido; acertar antes do
 * vencimento (por exemplo, numa lição nova) não muda nada.
 */
export function revisaoAposAcerto(item: ItemRevisao, agora: Date): ItemRevisao {
  if (!estaVencida(item, agora)) return item;
  const proxima = item.etapa + 1;
  if (proxima >= ETAPA_DOMINADA) {
    return { etapa: ETAPA_DOMINADA, venceEm: item.venceEm, status: 'dominada' };
  }
  const dias = INTERVALOS_REVISAO[proxima] as number;
  return { etapa: proxima, venceEm: vencimentoEmDias(agora, dias), status: 'ativa' };
}

/**
 * Aplica uma resposta ao item de revisão (que pode não existir).
 * Retorna o novo item, ou null quando não há item e a resposta foi certa.
 */
export function aplicarRespostaNaRevisao(
  item: ItemRevisao | null,
  acertou: boolean,
  agora: Date,
): ItemRevisao | null {
  if (!acertou) return revisaoAposErro(agora);
  if (!item) return null;
  return revisaoAposAcerto(item, agora);
}

/** Filtra os itens pendentes (vencidos e ativos). */
export function filtrarPendentes<T extends ItemRevisao>(itens: readonly T[], agora: Date): T[] {
  return itens.filter((i) => estaVencida(i, agora));
}

export const TEXTO_REGRA_REVISAO =
  'Cada erro volta em 1, 3, 7 e 15 dias. Acertou 4 vezes seguidas, a questão sai da fila.';
