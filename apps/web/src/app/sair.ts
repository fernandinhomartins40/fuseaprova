import type { QueryClient } from '@tanstack/react-query';
import { chamar } from '../api/cliente';
import { limparTudo } from '../offline/fila';
import { limparCachesApi } from '../offline/pacote';

/** Encerra a sessão e apaga os dados locais (pacote offline, fila e caches da API). */
export async function sair(qc: QueryClient) {
  try {
    await chamar('authSair', { semRedirecionar: true });
  } catch {
    /* sessão já encerrada ou sem conexão: limpa o local mesmo assim */
  }
  await limparLocal(qc);
}

export async function limparLocal(qc: QueryClient) {
  await Promise.allSettled([limparTudo(), limparCachesApi()]);
  qc.clear();
}
