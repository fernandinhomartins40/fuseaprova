import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { podeGerirConteudo } from '@fuse/shared';
import { ErroApi } from '../api/cliente';
import { loginParaCaminho } from './areaPainel';
import { useMe } from '../api/consultas';
import { Carregando, ErroTela } from '../ui';
import { rotaInicial } from './rotaInicial';

/**
 * Guardas do lado da PWA (espelham as da API, que é quem decide de verdade):
 * - login: precisa de sessão (senão /entrar);
 * - acesso: precisa de pagamento confirmado (senão /pagamento) e de onboarding feito;
 * - painel (D24): admin ou superadmin (senão a casa do papel). Superadmin sem 2FA nesta
 *   sessão vai para /super/2fa; o admin não tem 2FA (P-09). O que cada papel vê dentro do
 *   painel é decidido pelo módulo do /super (e, de verdade, pela API).
 * Sem sessão (401): a página de login do papel de quem estava ali (S-19).
 */
export function Guarda({
  nivel,
  children,
}: {
  nivel: 'login' | 'acesso' | 'painel';
  children: ReactNode;
}) {
  const me = useMe();
  const { pathname, search } = useLocation();
  const voltar = `?voltar=${encodeURIComponent(pathname + search)}`;

  if (me.isPending) return <Carregando />;
  if (me.isError && !me.data) {
    const e = me.error;
    if (e instanceof ErroApi && e.status === 401) {
      const destino = loginParaCaminho(pathname);
      return <Navigate to={destino === '/entrar' ? destino : destino + voltar} replace />;
    }
    return (
      <ErroTela
        mensagem={e instanceof ErroApi ? e.message : 'Algo deu errado.'}
        onTentar={() => me.refetch()}
      />
    );
  }
  const u = me.data!;
  if (nivel === 'painel') {
    if (!podeGerirConteudo(u.papel)) return <Navigate to={rotaInicial(u)} replace />;
    if (u.papel === 'superadmin' && u.doisFatoresPendente && pathname !== '/super/2fa') {
      return <Navigate to={`/super/2fa${voltar}`} replace />;
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
