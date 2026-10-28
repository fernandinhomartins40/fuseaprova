/**
 * D21 (S-14): lista de concursos para os filtros do /super (pagamentos e financeiro).
 * Usa a rota de conteúdo (o superadmin com 2FA passa na guarda `conteudo`); a API ainda não
 * tem um resumo próprio em /super. Se a lista falhar, o filtro avisa em vez de sumir calado.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../admin/api';
import { CampoSelecao } from '../admin/componentes/ui';

export function useConcursosResumo() {
  return useQuery({
    queryKey: ['super', 'concursos'],
    queryFn: () => api('adminConcursosListar'),
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
