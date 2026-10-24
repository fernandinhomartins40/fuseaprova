/**
 * Consultas de referência usadas em várias telas do admin (TanStack Query).
 */
import { useQuery } from '@tanstack/react-query';
import type { SlugDisciplina } from '@fuse/shared';
import { api } from './api';

export const chaves = {
  disciplinas: ['admin', 'disciplinas'] as const,
  assuntos: (disciplina?: SlugDisciplina) => ['admin', 'assuntos', disciplina ?? 'todas'] as const,
  concursos: ['admin', 'concursos'] as const,
};

export function useDisciplinas() {
  return useQuery({
    queryKey: chaves.disciplinas,
    queryFn: () => api('adminDisciplinas'),
    staleTime: 5 * 60_000,
  });
}

export function useAssuntos(disciplina?: SlugDisciplina) {
  return useQuery({
    queryKey: chaves.assuntos(disciplina),
    queryFn: () => api('adminAssuntosListar', { query: disciplina ? { disciplina } : {} }),
    staleTime: 60_000,
  });
}

export function useConcursos() {
  return useQuery({
    queryKey: chaves.concursos,
    queryFn: () => api('adminConcursosListar'),
    staleTime: 60_000,
  });
}
