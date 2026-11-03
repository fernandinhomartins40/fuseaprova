/**
 * D33: validade do acesso pago, como dizem os termos (seção 6): até a homologação do concurso ou
 * por 24 meses desde a liberação, o que vier primeiro. Quem aplica é `encerrarAcessosVencidos`.
 */
import { inicioDoDiaSP, somarDias, type Dia } from './datas.js';

export const MESES_VALIDADE_ACESSO = 24;

/** Primeiro instante SEM acesso. O dia da homologação ainda conta (fim do dia em São Paulo). */
export function fimDoAcesso(liberadoEm: Date, homologadoEm: Dia | null): Date {
  const limite = new Date(liberadoEm);
  limite.setUTCMonth(limite.getUTCMonth() + MESES_VALIDADE_ACESSO);
  if (!homologadoEm) return limite;
  const homologacao = inicioDoDiaSP(somarDias(homologadoEm, 1));
  return homologacao < limite ? homologacao : limite;
}

export function acessoVencido(liberadoEm: Date, homologadoEm: Dia | null, agora: Date): boolean {
  return fimDoAcesso(liberadoEm, homologadoEm) <= agora;
}
