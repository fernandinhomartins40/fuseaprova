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
  baixarCsv({ nomeArquivo: nome, conteudo: JSON.stringify(dados, null, 2) });
}

export function reaisCurto(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: centavos % 100 ? 2 : 0 });
}

export function porcentagem(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
