import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { aoRedirecionar } from '../api/cliente';
import { criarQueryClient } from '../api/consultas';
import { Carregando, ProvedorToast } from '../ui';
import { Guarda } from './Guarda';
import { LayoutAbas } from './LayoutAbas';
import { Sincronizador } from './Sincronizador';

const BoasVindas = lazy(() => import('../telas/BoasVindas'));
const Cadastro = lazy(() => import('../telas/Cadastro'));
const Entrar = lazy(() => import('../telas/Entrar'));
const Recuperar = lazy(() => import('../telas/Recuperar'));
const Termos = lazy(() => import('../telas/Legal').then((m) => ({ default: m.Termos })));
const Privacidade = lazy(() => import('../telas/Legal').then((m) => ({ default: m.Privacidade })));
const Pagamento = lazy(() => import('../telas/Pagamento'));
const Onboarding = lazy(() => import('../telas/Onboarding'));
const Aprender = lazy(() => import('../telas/Aprender'));
const SobreConcurso = lazy(() => import('../telas/SobreConcurso'));
const Guia = lazy(() => import('../telas/Guia'));
const Licao = lazy(() => import('../telas/licao/Licao'));
const Revisar = lazy(() => import('../telas/Revisar'));
const Simulado = lazy(() => import('../telas/simulado/Simulado'));
const SimuladoProva = lazy(() => import('../telas/simulado/SimuladoProva'));
const Liga = lazy(() => import('../telas/Liga'));
const Perfil = lazy(() => import('../telas/Perfil'));
const Configuracoes = lazy(() => import('../telas/Configuracoes'));
const NaoEncontrada = lazy(() => import('../telas/NaoEncontrada'));
const Admin = lazy(() => import('../admin/rotas'));

/** 401 → /entrar e 402 → /pagamento, vindos de qualquer chamada da API. */
function Redirecionador() {
  const navegar = useNavigate();
  const local = useLocation();
  useEffect(
    () =>
      aoRedirecionar((destino) => {
        if (local.pathname === destino) return;
        if (
          destino === '/entrar' &&
          ['/', '/cadastro', '/entrar', '/termos', '/privacidade'].includes(local.pathname)
        )
          return;
        navegar(destino, { replace: true });
      }),
    [navegar, local.pathname],
  );
  return null;
}

/** Leva o foco ao conteúdo ao trocar de rota (leitores de tela). */
function FocoNaTroca() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector<HTMLElement>('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}

function Carregar({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Carregando />}>{children}</Suspense>;
}

export function Rotas() {
  return (
    <Carregar>
      <Routes>
        <Route path="/" element={<BoasVindas />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/recuperar/:token" element={<Recuperar />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />

        <Route
          path="/pagamento"
          element={
            <Guarda nivel="login">
              <Pagamento />
            </Guarda>
          }
        />
        <Route
          path="/onboarding"
          element={
            <Guarda nivel="acesso">
              <Onboarding />
            </Guarda>
          }
        />

        <Route
          element={
            <Guarda nivel="acesso">
              <Sincronizador />
              <LayoutAbas />
            </Guarda>
          }
        >
          <Route path="/aprender" element={<Aprender />} />
          <Route path="/revisar" element={<Revisar />} />
          <Route path="/simulado" element={<Simulado />} />
          <Route path="/liga" element={<Liga />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        <Route
          path="/concurso"
          element={
            <Guarda nivel="acesso">
              <SobreConcurso />
            </Guarda>
          }
        />
        <Route
          path="/guia/:unidadeId"
          element={
            <Guarda nivel="acesso">
              <Guia />
            </Guarda>
          }
        />
        <Route
          path="/licao/:id"
          element={
            <Guarda nivel="acesso">
              <Sincronizador />
              <Licao />
            </Guarda>
          }
        />
        <Route
          path="/revisar/praticar"
          element={
            <Guarda nivel="acesso">
              <Sincronizador />
              <Licao revisao />
            </Guarda>
          }
        />
        <Route
          path="/simulado/:id"
          element={
            <Guarda nivel="acesso">
              <SimuladoProva />
            </Guarda>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <Guarda nivel="login">
              <Configuracoes />
            </Guarda>
          }
        />

        <Route
          path="/admin/*"
          element={
            <Guarda nivel="admin">
              <Admin />
            </Guarda>
          }
        />
        <Route path="/inicio" element={<Navigate to="/aprender" replace />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </Carregar>
  );
}

export function App() {
  const [cliente] = useState(criarQueryClient);
  return (
    <QueryClientProvider client={cliente}>
      <ProvedorToast>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Redirecionador />
          <FocoNaTroca />
          <Rotas />
        </BrowserRouter>
      </ProvedorToast>
    </QueryClientProvider>
  );
}
