/**
 * Módulo do painel admin (PRD 5.17). O app do aluno monta este componente em `/admin/*`
 * com `lazy(() => import('./admin/rotas'))`, já protegido pelo papel admin.
 *
 * Contrato: `export default function AdminRotas(props?: { cliente?: QueryClient })`.
 * As rotas abaixo são relativas a /admin. O módulo tem o próprio QueryClient (cache isolado
 * do app do aluno); os testes podem passar um cliente próprio.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { ErroAdminApi } from './api';
import { Layout } from './componentes/Layout';
import { Cabecalho, Carregando, estilos as s } from './componentes/ui';
import { BASE_ADMIN } from './util';

const Painel = lazy(() => import('./telas/Painel'));
const Concursos = lazy(() => import('./telas/Concursos'));
const Questoes = lazy(() => import('./telas/Questoes'));
const EditorQuestao = lazy(() => import('./telas/EditorQuestao'));
const Importacoes = lazy(() => import('./telas/Importacoes'));
const Trilhas = lazy(() => import('./telas/Trilhas'));
const Edital = lazy(() => import('./telas/Edital'));
const Reports = lazy(() => import('./telas/Reports'));

export function criarClienteAdmin(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        // Erros 4xx (sem permissão, não encontrado, validação) não adiantam repetir.
        retry: (falhas, erro) =>
          !(erro instanceof ErroAdminApi && erro.status >= 400 && erro.status < 500) && falhas < 1,
      },
      mutations: { retry: false },
    },
  });
}

function NaoEncontrada() {
  return (
    <>
      <Cabecalho titulo="Página não encontrada" />
      <Link className={s.link} to={BASE_ADMIN}>
        Voltar ao painel
      </Link>
    </>
  );
}

export function RotasAdmin() {
  return (
    <Layout>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route index element={<Painel />} />
          <Route path="concursos" element={<Concursos />} />
          <Route path="questoes" element={<Questoes />} />
          <Route path="questoes/nova" element={<EditorQuestao />} />
          <Route path="questoes/:id" element={<EditorQuestao />} />
          <Route path="importacao" element={<Importacoes />} />
          <Route path="importacao/:id" element={<Importacoes />} />
          <Route path="trilhas" element={<Trilhas />} />
          <Route path="edital" element={<Edital />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function AdminRotas({ cliente }: { cliente?: QueryClient } = {}) {
  const [padrao] = useState(criarClienteAdmin);
  return (
    <QueryClientProvider client={cliente ?? padrao}>
      <RotasAdmin />
    </QueryClientProvider>
  );
}
