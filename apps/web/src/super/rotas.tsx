/**
 * Módulo do painel único (D13 + D24). O app monta `lazy(() => import('./super/rotas'))` em
 * `/super/*`, protegido pela guarda `painel` (admin ou superadmin; superadmin com 2FA pendente
 * vai para /super/2fa). Tem o próprio QueryClient (cache isolado do app do aluno).
 *
 * - Superadmin: tudo (negócio e a seção Conteúdo em /super/conteudo/*).
 * - Admin: só /super/conteudo/*; qualquer outro caminho leva para lá.
 * - Sessão caída (401) → página de login do papel; 2FA vencido (403) → /super/2fa (S-19).
 */
import { QueryClientContext, QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Papel } from '@fuse/shared';
import { aoPerderSessao, api } from '../admin/api';
import { criarClienteAdmin, RotasConteudo } from '../admin/rotas';
import { Carregando, ErroCaixa, estilos as a } from '../admin/componentes/ui';
import { loginDoPapel, loginParaCaminho } from '../app/areaPainel';
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
const Precos = lazy(() => import('./telas/Precos'));
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

const CHAVE_ME_APP = ['me'] as const;

export function RotasSuper({ appCliente, papel: papelFixo }: { appCliente?: QueryClient | undefined; papel?: Papel | undefined }) {
  const navegar = useNavigate();
  const { pathname, search } = useLocation();
  const me = useQuery({ queryKey: ['super', 'me'], queryFn: () => api('meObter'), staleTime: 60_000, enabled: !papelFixo });
  const papel: Papel | undefined = papelFixo ?? me.data?.papel;

  // O ouvinte é registrado uma vez; lê o papel e o caminho atuais por referência.
  const atual = useRef({ papel, aqui: pathname + search });
  atual.current = { papel, aqui: pathname + search };
  useEffect(
    () =>
      aoPerderSessao((motivo) => {
        const { papel: p, aqui } = atual.current;
        if (motivo === 'login') {
          // Sem o /me antigo, a página de login não devolve a pessoa para cá.
          appCliente?.removeQueries({ queryKey: CHAVE_ME_APP });
          const destino = p ? loginDoPapel(p) : loginParaCaminho(aqui);
          navegar(`${destino}?voltar=${encodeURIComponent(aqui)}`, { replace: true });
          return;
        }
        if (aqui.startsWith(caminho('2fa'))) return;
        void appCliente?.invalidateQueries({ queryKey: CHAVE_ME_APP });
        navegar(`${caminho('2fa')}?voltar=${encodeURIComponent(aqui)}`);
      }),
    [appCliente, navegar],
  );

  const atualizarSessao = useCallback(async () => {
    await appCliente?.invalidateQueries({ queryKey: CHAVE_ME_APP });
  }, [appCliente]);
  const sair = useCallback(() => {
    const destino = atual.current.papel ? loginDoPapel(atual.current.papel) : loginParaCaminho(atual.current.aqui);
    void (async () => {
      if (appCliente) await sairDoApp(appCliente);
      navegar(destino, { replace: true });
    })();
  }, [appCliente, navegar]);

  if (!papel) {
    if (me.isError) return <ErroCaixa erro={me.error} tentar={() => void me.refetch()} />;
    return <Carregando />;
  }
  const ehSuper = papel === 'superadmin';
  return (
    <Layout sair={sair} atualizarSessao={atualizarSessao} papel={papel}>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="conteudo/*" element={<RotasConteudo />} />
          {ehSuper ? (
            <>
              <Route index element={<VisaoGeral />} />
              <Route path="2fa" element={<DoisFatores />} />
              <Route path="pagamentos" element={<Pagamentos />} />
              <Route path="pagamentos/:id" element={<PagamentoDetalhe />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="precos" element={<Precos />} />
              <Route path="asaas" element={<Asaas />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="usuarios/:id" element={<UsuarioFicha />} />
              <Route path="equipe" element={<Equipe />} />
              <Route path="comunicacao" element={<Comunicacao />} />
              <Route path="sistema" element={<Sistema />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="*" element={<NaoEncontrada />} />
            </>
          ) : (
            // Admin: o negócio não existe para ele; tudo leva ao Conteúdo.
            <Route path="*" element={<Navigate to={caminho('conteudo')} replace />} />
          )}
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function SuperRotas({ cliente, papel }: { cliente?: QueryClient; papel?: Papel } = {}) {
  // O QueryClient do app (o /me e o "Sair"); o painel usa um cache próprio.
  const appCliente = useContext(QueryClientContext);
  const [padrao] = useState(criarClienteAdmin);
  return (
    <QueryClientProvider client={cliente ?? padrao}>
      <RotasSuper appCliente={appCliente} papel={papel} />
    </QueryClientProvider>
  );
}
