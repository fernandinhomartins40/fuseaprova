/**
 * Domínio de assunto e disciplina (PRD 6.6).
 * - Assunto: fração de acertos nas últimas 30 tentativas. Só aparece com ≥ 5 tentativas ("—").
 * - Disciplina: média dos assuntos ponderada pelo número de tentativas consideradas.
 */

export const JANELA_DOMINIO = 30;
export const MINIMO_TENTATIVAS_DOMINIO = 5;

export interface DominioAssunto {
  /** Fração 0–1, ou null se ainda não há tentativas suficientes. */
  valor: number | null;
  /** Tentativas consideradas (no máximo 30). */
  tentativas: number;
  acertos: number;
}

/**
 * @param tentativas acertos em ordem cronológica (a mais antiga primeiro).
 */
export function dominioDoAssunto(tentativas: readonly boolean[]): DominioAssunto {
  const janela = tentativas.slice(-JANELA_DOMINIO);
  const acertos = janela.filter(Boolean).length;
  return {
    valor: janela.length >= MINIMO_TENTATIVAS_DOMINIO ? acertos / janela.length : null,
    tentativas: janela.length,
    acertos,
  };
}

/** Média ponderada pelos assuntos que já têm domínio visível. */
export function dominioDaDisciplina(assuntos: readonly DominioAssunto[]): number | null {
  let peso = 0;
  let soma = 0;
  for (const a of assuntos) {
    if (a.valor === null) continue;
    peso += a.tentativas;
    soma += a.valor * a.tentativas;
  }
  return peso === 0 ? null : soma / peso;
}

/** "73%" ou "—". */
export function formatarDominio(valor: number | null): string {
  return valor === null ? '—' : `${Math.round(valor * 100)}%`;
}

/** Precisão de uma sessão como porcentagem inteira (0 se não houve questões). */
export function precisaoPercentual(acertos: number, total: number): number {
  return total > 0 ? Math.round((acertos / total) * 100) : 0;
}
