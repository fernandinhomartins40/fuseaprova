/**
 * Consultas (TanStack Query) das telas do aluno. O servidor é a fonte da verdade:
 * as telas só exibem o que estas consultas devolvem.
 */
import { QueryClient, useQuery } from '@tanstack/react-query';
import { chamar, ErroApi } from './cliente';

export const CHAVES = {
  me: ['me'] as const,
  concurso: ['concurso'] as const,
  trilha: ['trilha'] as const,
  guia: (id: string) => ['guia', id] as const,
  revisao: ['revisao'] as const,
  liga: ['liga'] as const,
  estatisticas: ['estatisticas'] as const,
  simulados: ['simulados'] as const,
  simulado: (id: string) => ['simulado', id] as const,
  pagamentoStatus: ['pagamento', 'status'] as const,
};

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 3600_000,
        refetchOnWindowFocus: true,
        retry: (falhas, erro) => {
          // 4xx não adianta repetir (401/402 já redirecionaram).
          if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false;
          return falhas < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

/** Perfil e contadores. `semRedirecionar` para telas públicas que só checam a sessão. */
export function useMe(opcoes: { semRedirecionar?: boolean; habilitado?: boolean } = {}) {
  return useQuery({
    queryKey: CHAVES.me,
    queryFn: ({ signal }) => chamar('meObter', { semRedirecionar: opcoes.semRedirecionar, signal }),
    enabled: opcoes.habilitado ?? true,
    staleTime: 10_000,
  });
}

export function useConcurso() {
  return useQuery({
    queryKey: CHAVES.concurso,
    queryFn: ({ signal }) => chamar('concurso', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useTrilha() {
  return useQuery({
    queryKey: CHAVES.trilha,
    queryFn: ({ signal }) => chamar('trilha', { signal }),
  });
}

export function useGuia(unidadeId: string) {
  return useQuery({
    queryKey: CHAVES.guia(unidadeId),
    queryFn: ({ signal }) => chamar('guia', { params: { unidadeId }, signal }),
    staleTime: 5 * 60_000,
  });
}

export function useRevisao() {
  return useQuery({
    queryKey: CHAVES.revisao,
    queryFn: ({ signal }) => chamar('revisao', { signal }),
  });
}

export function useLiga() {
  return useQuery({ queryKey: CHAVES.liga, queryFn: ({ signal }) => chamar('liga', { signal }) });
}

export function useEstatisticas() {
  return useQuery({
    queryKey: CHAVES.estatisticas,
    queryFn: ({ signal }) => chamar('perfilEstatisticas', { signal }),
  });
}

export function useSimulados() {
  return useQuery({
    queryKey: CHAVES.simulados,
    queryFn: ({ signal }) => chamar('simuladosListar', { signal }),
  });
}

export function useSimulado(id: string) {
  return useQuery({
    queryKey: CHAVES.simulado(id),
    queryFn: ({ signal }) => chamar('simuladoObter', { params: { id }, signal }),
    staleTime: 0,
  });
}
