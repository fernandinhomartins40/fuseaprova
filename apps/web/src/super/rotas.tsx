/**
 * Módulo do painel superadmin (D13). O app monta `lazy(() => import('./super/rotas'))` em
 * `/super/*`, protegido pela guarda `super` (papel superadmin; 2FA pendente vai para
 * /super/2fa). Tem o próprio QueryClient (cache isolado, como o /admin).
 */
import { QueryClientContext, QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useContext, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { criarClienteAdmin } from '../admin/rotas';
import { Carregando, estilos as a } from '../admin/componentes/ui';
import { sair as sairDoApp } from '../app/sair';
import { Pagina } from './componentes';
import { Layout } from './Layout';
import { caminho } from './util';

const DoisFatores = lazy(() => import('./telas/DoisFatores'));
const VisaoGeral = lazy(() => import('./telas/VisaoGeral'));
const Pagamentos = lazy(() => import('./telas/Pagamentos'));
const PagamentoDetalhe = lazy(() => import('./telas/PagamentoDetalhe'));
const Webhooks = lazy(() => import('./telas/Webhooks'));
const Asaas = lazy(() => import('./telas/Asaas'));
const Usuarios = lazy(() => import('./telas/Usuarios'));
const UsuarioFicha = lazy(() => import('./telas/UsuarioFicha'));
const Equipe = lazy(() => import('./telas/Equipe'));
const Comunicacao = lazy(() => import('./telas/Comunicacao'));
const Sistema = lazy(() => import('./telas/Sistema'));
const Auditoria = lazy(() => import('./telas/Auditoria'));

function NaoEncontrada() {
  return (
    <Pagina titulo="Página não encontrada">
      <Link className={a.link} to={caminho()}>
        Voltar à visão geral
      </Link>
    </Pagina>
  );
}

export function RotasSuper({ appCliente }: { appCliente?: QueryClient | undefined }) {
  const navegar = useNavigate();
  const atualizarSessao = useCallback(async () => {
    await appCliente?.invalidateQueries({ queryKey: ['me'] });
  }, [appCliente]);
  const sair = useCallback(() => {
    void (async () => {
      if (appCliente) await sairDoApp(appCliente);
      navegar('/entrar', { replace: true });
    })();
  }, [appCliente, navegar]);
  return (
    <Layout sair={sair} atualizarSessao={atualizarSessao}>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route index element={<VisaoGeral />} />
          <Route path="2fa" element={<DoisFatores />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="pagamentos/:id" element={<PagamentoDetalhe />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="asaas" element={<Asaas />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="usuarios/:id" element={<UsuarioFicha />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="comunicacao" element={<Comunicacao />} />
          <Route path="sistema" element={<Sistema />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function SuperRotas({ cliente }: { cliente?: QueryClient } = {}) {
  // O QueryClient do app (o /me e o "Sair"); o painel usa um cache próprio.
  const appCliente = useContext(QueryClientContext);
  const [padrao] = useState(criarClienteAdmin);
  return (
    <QueryClientProvider client={cliente ?? padrao}>
      <RotasSuper appCliente={appCliente} />
    </QueryClientProvider>
  );
}
