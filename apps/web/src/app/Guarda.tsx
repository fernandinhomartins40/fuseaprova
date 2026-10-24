import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ErroApi } from '../api/cliente';
import { useMe } from '../api/consultas';
import { Carregando, ErroTela } from '../ui';

/**
 * Guardas do lado da PWA (espelham as da API, que é quem decide de verdade):
 * - login: precisa de sessão (senão /entrar);
 * - acesso: precisa de pagamento confirmado (senão /pagamento) e de onboarding feito;
 * - admin: papel admin (senão /aprender).
 */
export function Guarda({
  nivel,
  children,
}: {
  nivel: 'login' | 'acesso' | 'admin';
  children: ReactNode;
}) {
  const me = useMe();
  const { pathname } = useLocation();

  if (me.isPending) return <Carregando />;
  if (me.isError && !me.data) {
    const e = me.error;
    if (e instanceof ErroApi && e.status === 401) return <Navigate to="/entrar" replace />;
    return (
      <ErroTela
        mensagem={e instanceof ErroApi ? e.message : 'Algo deu errado.'}
        onTentar={() => me.refetch()}
      />
    );
  }
  const u = me.data!;
  if (nivel === 'admin') {
    return u.papel === 'admin' ? <>{children}</> : <Navigate to="/aprender" replace />;
  }
  if (nivel === 'acesso') {
    if (!u.acesso) return <Navigate to="/pagamento" replace />;
    if (!u.onboardingConcluido && pathname !== '/onboarding')
      return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
