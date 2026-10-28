import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { podeGerirConteudo } from '@fuse/shared';
import { ErroApi } from '../api/cliente';
import { useMe } from '../api/consultas';
import { Carregando, ErroTela } from '../ui';
import { rotaInicial } from './rotaInicial';

/**
 * Guardas do lado da PWA (espelham as da API, que é quem decide de verdade):
 * - login: precisa de sessão (senão /entrar);
 * - acesso: precisa de pagamento confirmado (senão /pagamento) e de onboarding feito;
 * - admin: papel admin ou superadmin (senão a casa do papel);
 * - super: papel superadmin (D13). Superadmin sem 2FA nesta sessão vai para /super/2fa.
 */
export function Guarda({
  nivel,
  children,
}: {
  nivel: 'login' | 'acesso' | 'admin' | 'super';
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
  if (nivel === 'admin' || nivel === 'super') {
    const pode = nivel === 'admin' ? podeGerirConteudo(u.papel) : u.papel === 'superadmin';
    if (!pode) return <Navigate to={rotaInicial(u)} replace />;
    if (u.papel === 'superadmin' && u.doisFatoresPendente && pathname !== '/super/2fa') {
      return <Navigate to="/super/2fa" replace />;
    }
    return <>{children}</>;
  }
  if (nivel === 'acesso') {
    if (!u.acesso) return <Navigate to={rotaInicial(u)} replace />;
    if (!u.onboardingConcluido && pathname !== '/onboarding')
      return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
