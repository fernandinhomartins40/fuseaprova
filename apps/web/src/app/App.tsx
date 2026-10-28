import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { loginParaCaminho } from './areaPainel';
import { aoRedirecionar } from '../api/cliente';
import { criarQueryClient } from '../api/consultas';
import { EH_APP } from '../nativo/plataforma';
import { Carregando, ProvedorToast } from '../ui';
import { Guarda } from './Guarda';
import { LayoutAbas } from './LayoutAbas';
import { Sincronizador } from './Sincronizador';

function Vazio() {
  return null;
}

const BoasVindas = lazy(() => import('../telas/BoasVindas'));
const Cadastro = EH_APP ? Vazio : lazy(() => import('../telas/Cadastro'));
const Entrar = lazy(() => import('../telas/Entrar'));
const Recuperar = lazy(() => import('../telas/Recuperar'));
const Termos = lazy(() => import('../telas/Legal').then((m) => ({ default: m.Termos })));
const Privacidade = lazy(() => import('../telas/Legal').then((m) => ({ default: m.Privacidade })));
const ExclusaoDeConta = lazy(() =>
  import('../telas/Legal').then((m) => ({ default: m.ExclusaoDeConta })),
);
const Pagamento = EH_APP ? Vazio : lazy(() => import('../telas/Pagamento'));
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
// Cada alvo só leva as suas telas (D20): o app nativo não tem cadastro, pagamento nem
// painéis da equipe; o site não tem os recursos nativos.
// D24: um painel só (/super), com a seção Conteúdo; as páginas da equipe ficam fora do
// precache da PWA (S-27, vite.config.ts).
const Super = EH_APP ? Vazio : lazy(() => import('../super/rotas'));
const EntrarConteudo = EH_APP
  ? Vazio
  : lazy(() => import('../painel/EntrarPainel').then((m) => ({ default: () => <m.default area="conteudo" /> })));
const EntrarSuper = EH_APP
  ? Vazio
  : lazy(() => import('../painel/EntrarPainel').then((m) => ({ default: () => <m.default area="super" /> })));
const Convite = EH_APP ? Vazio : lazy(() => import('../painel/Convite'));
const MeusConcursos = lazy(() => import('../telas/MeusConcursos'));
const AcessoApp = EH_APP ? lazy(() => import('../telas/AcessoApp')) : Vazio;
const RecursosNativos = EH_APP ? lazy(() => import('../nativo/RecursosNativos')) : Vazio;

/** /admin/* (antigo painel de conteúdo) → /super/conteudo/* (D24). */
function RedirecionarAdmin() {
  const { pathname, search } = useLocation();
  const resto = pathname.replace(/^\/admin\/?/, '');
  return <Navigate to={`/super/conteudo${resto ? `/${resto}` : ''}${search}`} replace />;
}

/**
 * 401 → login do papel (/entrar, /admin/entrar ou /super/entrar) e 402 → /pagamento (no app,
 * /acesso), vindos de qualquer chamada da API.
 */
function Redirecionador() {
  const navegar = useNavigate();
  const local = useLocation();
  useEffect(
    () =>
      aoRedirecionar((pedido) => {
        const destino =
          EH_APP && pedido === '/pagamento'
            ? '/acesso'
            : pedido === '/entrar'
              ? loginParaCaminho(local.pathname)
              : pedido;
        if (local.pathname === destino) return;
        if (
          destino === '/entrar' &&
          ['/', '/cadastro', '/entrar', '/termos', '/privacidade', '/excluir-conta'].includes(
            local.pathname,
          )
        )
          return;
        if (destino !== '/entrar' && destino.endsWith('/entrar') && local.pathname.endsWith('/entrar')) return;
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
        {/* App nativo: sem cadastro, pagamento nem painéis da equipe (D20). */}
        {EH_APP ? (
          <Route path="/cadastro" element={<Navigate to="/entrar" replace />} />
        ) : (
          <Route path="/cadastro" element={<Cadastro />} />
        )}
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/recuperar/:token" element={<Recuperar />} />
        {/* D24: cada papel tem a sua página de login; no app nativo, só a do aluno. */}
        {EH_APP ? (
          <>
            <Route path="/admin/entrar" element={<Navigate to="/entrar" replace />} />
            <Route path="/super/entrar" element={<Navigate to="/entrar" replace />} />
            <Route path="/convite/:token" element={<Navigate to="/entrar" replace />} />
          </>
        ) : (
          <>
            <Route path="/admin/entrar" element={<EntrarConteudo />} />
            <Route path="/super/entrar" element={<EntrarSuper />} />
            <Route path="/convite/:token" element={<Convite />} />
          </>
        )}
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/excluir-conta" element={<ExclusaoDeConta />} />

        {EH_APP ? (
          <>
            <Route path="/pagamento" element={<Navigate to="/acesso" replace />} />
            <Route
              path="/acesso"
              element={
                <Guarda nivel="login">
                  <AcessoApp />
                </Guarda>
              }
            />
          </>
        ) : (
          <Route
            path="/pagamento"
            element={
              <Guarda nivel="login">
                <Pagamento />
              </Guarda>
            }
          />
        )}
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
          path="/meus-concursos"
          element={
            <Guarda nivel="login">
              <MeusConcursos />
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

        {!EH_APP && (
          <>
            <Route path="/admin/*" element={<RedirecionarAdmin />} />
            <Route
              path="/super/*"
              element={
                <Guarda nivel="painel">
                  <Super />
                </Guarda>
              }
            />
          </>
        )}
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
          {EH_APP && (
            <Suspense fallback={null}>
              <RecursosNativos />
            </Suspense>
          )}
          <Rotas />
        </BrowserRouter>
      </ProvedorToast>
    </QueryClientProvider>
  );
}
