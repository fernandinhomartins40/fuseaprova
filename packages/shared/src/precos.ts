/**
 * D23: preços editáveis pelo superadmin e cupons de desconto. O servidor calcula o valor de
 * cada Pix com estas regras; o cliente só exibe.
 */
import type { TipoCupom } from './dominio.js';

/** Menor valor de uma cobrança Pix: nenhum cupom deixa o Pix abaixo disso (nem de graça). */
export const PRECO_MINIMO_CENTAVOS = 500;
/** Maior preço aceito no formulário (trava contra um zero a mais). */
export const PRECO_MAXIMO_CENTAVOS = 500_000;
/** Maior desconto percentual de um cupom. Acesso gratuito não existe. */
export const DESCONTO_MAXIMO_PERCENTUAL = 90;

export interface RegraCupom {
  tipo: TipoCupom;
  /** Percentual (1 a 90) ou centavos. */
  valor: number;
}

/** Valor final com o cupom, nunca abaixo de PRECO_MINIMO_CENTAVOS nem acima do preço base. */
export function aplicarCupom(baseCentavos: number, cupom: RegraCupom): { centavos: number; descontoCentavos: number } {
  const bruto =
    cupom.tipo === 'percentual'
      ? Math.round((baseCentavos * (100 - Math.min(cupom.valor, DESCONTO_MAXIMO_PERCENTUAL))) / 100)
      : baseCentavos - cupom.valor;
  const centavos = Math.min(baseCentavos, Math.max(PRECO_MINIMO_CENTAVOS, bruto));
  return { centavos, descontoCentavos: baseCentavos - centavos };
}

/** Código do cupom como o aluno digita: sem espaços, maiúsculo. */
export function normalizarCodigoCupom(codigo: string): string {
  return codigo.replace(/\s+/g, '').toUpperCase();
}

/** "20% de desconto" ou "R$ 50,00 de desconto". */
export function descreverCupom(cupom: RegraCupom, formatar: (centavos: number) => string): string {
  return cupom.tipo === 'percentual' ? `${cupom.valor}% de desconto` : `${formatar(cupom.valor)} de desconto`;
}
