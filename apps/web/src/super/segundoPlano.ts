/**
 * S-15: polling e refetch automático do painel mandam `x-fuse-segundo-plano: 1`, para a API não
 * renovar a ociosidade da sessão (2 h). A primeira carga e o botão "Atualizar" são ações do
 * usuário e vão sem o cabeçalho.
 */
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export function useSegundoPlano(chave: QueryKey) {
  const qc = useQueryClient();
  const manual = useRef(false);
  const chaveTexto = JSON.stringify(chave);

  /** Para o `queryFn`: true quando a busca é automática (já houve uma e ninguém pediu esta). */
  const automatica = useCallback((): boolean => {
    const estado = qc.getQueryState(JSON.parse(chaveTexto) as QueryKey);
    const jaBuscou = !!estado && (estado.dataUpdatedAt > 0 || estado.errorUpdatedAt > 0);
    const r = jaBuscou && !manual.current;
    manual.current = false;
    return r;
  }, [qc, chaveTexto]);

  /** Para o botão "Atualizar": a próxima busca é do usuário. */
  const atualizar = useCallback(() => {
    manual.current = true;
    return qc.refetchQueries({ queryKey: JSON.parse(chaveTexto) as QueryKey });
  }, [qc, chaveTexto]);

  return { automatica, atualizar };
}
