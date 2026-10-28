/**
 * Utilitários do /super: rotas, nomes, download de CSV e datas padrão.
 */
import {
  diaSP,
  NOMES_FORMA_PAGAMENTO_MANUAL,
  NOMES_PAPEL,
  NOMES_SEGMENTO_COMUNICACAO,
  somarDias,
  type Papel,
} from '@fuse/shared';
import type { ArquivoCsvResposta } from '@fuse/shared/api';

export const BASE_SUPER = '/super';
export const caminho = (p = '') => (p ? `${BASE_SUPER}/${p}` : BASE_SUPER);

export { NOMES_FORMA_PAGAMENTO_MANUAL, NOMES_PAPEL, NOMES_SEGMENTO_COMUNICACAO };

export const NOMES_METODO: Record<'asaas' | 'manual', string> = { asaas: 'Pix (Asaas)', manual: 'Manual' };

export function tomPapel(p: Papel): 'neutro' | 'info' | 'destaque' {
  return p === 'superadmin' ? 'destaque' : p === 'admin' ? 'info' : 'neutro';
}

/** Hoje e 30 dias atrás, em São Paulo. */
export function periodoPadrao(dias = 30): { de: string; ate: string } {
  const ate = diaSP(new Date());
  return { de: somarDias(ate, -(dias - 1)), ate };
}

/** Baixa o CSV devolvido pela API (o arquivo é montado no navegador). */
export function baixarCsv(a: ArquivoCsvResposta): void {
  try {
    const blob = new Blob([a.conteudo], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = a.nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* navegador sem Blob (testes): nada a baixar */
  }
}

export function baixarJson(nome: string, dados: unknown): void {
  baixarCsv({ nomeArquivo: nome, conteudo: JSON.stringify(dados, null, 2), aviso: null });
}

export function reaisCurto(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: centavos % 100 ? 2 : 0 });
}

export function porcentagem(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/* ------------------------------------------ textos do Asaas em português (S-19) */

/** Status de cobrança do Asaas → rótulo (R2-09). Desconhecido: o próprio código. */
export const NOMES_STATUS_ASAAS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  RECEIVED: 'Recebida',
  CONFIRMED: 'Confirmada',
  RECEIVED_IN_CASH: 'Recebida em dinheiro',
  OVERDUE: 'Vencida',
  REFUNDED: 'Estornada',
  REFUND_REQUESTED: 'Estorno pedido',
  REFUND_IN_PROGRESS: 'Estorno em andamento',
  CHARGEBACK_REQUESTED: 'Contestação aberta',
  CHARGEBACK_DISPUTE: 'Contestação em disputa',
  AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão da contestação',
  DUNNING_REQUESTED: 'Em negativação',
  DUNNING_RECEIVED: 'Recuperada',
  AWAITING_RISK_ANALYSIS: 'Em análise de risco',
  DELETED: 'Removida',
  CANCELADA: 'Cancelada',
};

/** Tipos de lançamento do extrato do Asaas → rótulo (R2-09). */
export const NOMES_TIPO_LANCAMENTO_ASAAS: Record<string, string> = {
  PAYMENT_RECEIVED: 'Pagamento recebido',
  PAYMENT_FEE: 'Taxa',
  PAYMENT_REVERSAL: 'Estorno',
  PAYMENT_REFUND_CANCELLED: 'Estorno cancelado',
  REFUND: 'Estorno',
  REFUND_REQUEST_FEE: 'Taxa de estorno',
  TRANSFER: 'Transferência',
  TRANSFER_FEE: 'Taxa de transferência',
  TRANSFER_REVERSAL: 'Transferência devolvida',
  PIX_TRANSACTION_CREDIT: 'Pix recebido',
  PIX_TRANSACTION_DEBIT: 'Pix enviado',
  CHARGEBACK: 'Contestação',
  CHARGEBACK_REVERSAL: 'Contestação revertida',
  PAYMENT_CUSTODY_BLOCK: 'Valor bloqueado',
  PAYMENT_CUSTODY_BLOCK_REVERSAL: 'Valor desbloqueado',
};

/** Situação da conta Asaas → rótulo. */
export const NOMES_SITUACAO_CONTA_ASAAS: Record<string, string> = {
  APPROVED: 'Aprovada',
  PENDING: 'Em análise',
  AWAITING_APPROVAL: 'Aguardando aprovação',
  AWAITING_ACTION_AUTHORIZATION: 'Aguardando autorização',
  REJECTED: 'Reprovada',
  DENIED: 'Recusada',
};

export const statusAsaas = (s: string) => NOMES_STATUS_ASAAS[s] ?? s;
export const tipoLancamentoAsaas = (t: string) => NOMES_TIPO_LANCAMENTO_ASAAS[t] ?? 'Outro lançamento';
export const situacaoContaAsaas = (s: string | null | undefined) => (s ? (NOMES_SITUACAO_CONTA_ASAAS[s] ?? s) : '—');

/** Nomes humanos dos jobs do worker (R2-19). Desconhecido: o nome técnico. */
export const NOMES_JOBS: Record<string, string> = {
  'fechar-liga': 'Fechamento da liga',
  'resetar-vidas': 'Recarga das vidas',
  'verificar-ofensivas': 'Conferência das ofensivas',
  'enviar-lembretes': 'Lembretes de estudo',
  'expirar-pix': 'Vencimento dos Pix',
  'limpar-sessoes': 'Limpeza de sessões',
  backup: 'Backup do banco',
  'enviar-comunicacoes': 'Envio de comunicações',
};

export const nomeJob = (job: string) => NOMES_JOBS[job] ?? job;
