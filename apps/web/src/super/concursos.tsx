/**
 * D21 (S-14): lista de concursos para os filtros do /super (pagamentos e financeiro), pela rota
 * leve `GET /super/concursos` (id e nome). Se a lista falhar, o filtro avisa em vez de sumir calado.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../admin/api';
import { CampoSelecao } from '../admin/componentes/ui';

export function useConcursosResumo() {
  return useQuery({
    queryKey: ['super', 'concursos'],
    queryFn: () => api('superConcursos'),
    staleTime: 5 * 60_000,
  });
}

export function FiltroConcurso({ valor, aoMudar }: { valor: string; aoMudar: (id: string) => void }) {
  const concursos = useConcursosResumo();
  const opcoes = (concursos.data?.itens ?? []).map((c) => ({ valor: c.id, rotulo: c.nome }));
  return (
    <CampoSelecao
      rotulo="Concurso"
      value={valor}
      vazio="Todos"
      opcoes={opcoes}
      onChange={(e) => aoMudar(e.target.value)}
      erro={concursos.isError ? 'Não foi possível carregar os concursos.' : undefined}
    />
  );
}
