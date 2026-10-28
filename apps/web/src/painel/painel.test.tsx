/**
 * D24 (S-03): as três páginas de login, o convite da equipe e o redirecionamento do /admin,
 * pelas rotas reais do app (fetch simulado por rota).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { criarQueryClient } from '../api/consultas';
import { Rotas } from '../app/App';
import { simularFetch } from '../admin/testes/ajuda';
import { ProvedorToast } from '../ui';

function Local() {
  const { pathname, search } = useLocation();
  return <output data-testid="local">{pathname + search}</output>;
}

function abrir(rota: string) {
  return render(
    <QueryClientProvider client={criarQueryClient()}>
      <ProvedorToast>
        <MemoryRouter initialEntries={[rota]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Local />
          <Rotas />
        </MemoryRouter>
      </ProvedorToast>
    </QueryClientProvider>,
  );
}

const ID = '77777777-7777-4777-8777-777777777777';
const SEM_SESSAO = { status: 401, corpo: { erro: 'Entre na sua conta para continuar.', codigo: 'nao_autenticado' } };
const CREDENCIAIS = { status: 401, corpo: { erro: 'E-mail ou senha incorretos.', codigo: 'credenciais_invalidas' } };

function me(papel: 'aluno' | 'admin' | 'superadmin', extra: Record<string, unknown> = {}) {
  return { id: ID, nome: 'Pessoa Teste', email: 'pessoa@teste.com', papel, acesso: false, onboardingConcluido: false, doisFatoresPendente: false, ...extra };
}

function sessao(papel: 'aluno' | 'admin' | 'superadmin') {
  const area = papel === 'aluno' ? 'aluno' : papel === 'admin' ? 'conteudo' : 'super';
  const proximo = papel === 'aluno' ? 'pagamento' : papel === 'admin' ? 'conteudo' : 'dois_fatores';
  return { usuario: { id: ID, nome: 'Pessoa Teste', email: 'pessoa@teste.com', papel, acesso: false }, proximo, area };
}

/** GET /me: 401 até o login dar certo; depois, a conta logada. */
function sessaoQueComecaFechada() {
  let logado: ReturnType<typeof me> | null = null;
  return {
    entrar: (m: ReturnType<typeof me>) => {
      logado = m;
    },
    me: () => logado ?? SEM_SESSAO,
  };
}

async function preencher(email: string, senha: string) {
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByLabelText('E-mail'), email);
  await usuario.type(screen.getByLabelText('Senha'), senha);
  await usuario.click(screen.getByRole('button', { name: /Entrar/ }));
}

describe('Três páginas de login (D24)', () => {
  it('/super/entrar: marca do superadmin, sem "Criar conta", chama /auth/login/super e segue para o 2FA', async () => {
    const s = sessaoQueComecaFechada();
    const { chamadas } = simularFetch({
      'GET /me': () => s.me(),
      'POST /auth/login/super': () => {
        s.entrar(me('superadmin', { doisFatoresPendente: true }));
        return sessao('superadmin');
      },
      'GET /super/2fa': { configurado: true, verificadoNestaSessao: false, ativadoEm: '2026-10-01T10:00:00.000Z', codigosRecuperacaoRestantes: 10 },
    });
    abrir('/super/entrar');
    expect(await screen.findByRole('heading', { name: 'Painel do superadmin' })).toBeInTheDocument();
    expect(screen.getByText('Superadmin')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/recuperar?area=super');
    await preencher('dono@fuse.com', 'senha-forte');
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(/^\/super\/2fa/));
    expect(chamadas.find((c) => c.metodo === 'POST')?.caminho).toBe('/auth/login/super');
    expect(await screen.findByRole('heading', { name: 'Digite o código do app' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Sair' }).length).toBeGreaterThan(0);
  });

  it('/admin/entrar: equipe de conteúdo, sem "Criar conta", chama /auth/login/conteudo e vai ao /super/conteudo', async () => {
    const s = sessaoQueComecaFechada();
    const { chamadas } = simularFetch({
      'GET /me': () => s.me(),
      'POST /auth/login/conteudo': () => {
        s.entrar(me('admin'));
        return sessao('admin');
      },
      'GET /admin/painel': {
        reportsAbertos: 0,
        questoesRascunho: 0,
        questoesPorStatus: { rascunho: 0, revisao: 0, publicada: 0, anulada: 0, retirada: 0 },
        metricas: { licoesPorAlunoSemana: 0, melhoraAcertoPp: 0 },
        geradoEm: '2026-10-28T12:00:00.000Z',
      },
    });
    abrir('/admin/entrar');
    expect(await screen.findByRole('heading', { name: 'Equipe de conteúdo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
    await preencher('ana@fuse.com', 'senha-forte');
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(/^\/super\/conteudo$/));
    expect(chamadas.find((c) => c.metodo === 'POST')?.caminho).toBe('/auth/login/conteudo');
    expect((await screen.findAllByRole('navigation', { name: /painel de conteúdo/ })).length).toBeGreaterThan(0);
  });

  it('/entrar: o login do aluno continua com "Criar conta" e chama /auth/login', async () => {
    const s = sessaoQueComecaFechada();
    const { chamadas } = simularFetch({
      'GET /me': () => s.me(),
      'POST /auth/login': () => {
        s.entrar(me('aluno'));
        return sessao('aluno');
      },
    });
    abrir('/entrar');
    expect(await screen.findByRole('link', { name: 'Criar conta' })).toBeInTheDocument();
    await preencher('aluno@teste.com', 'senha-forte');
    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST' && c.caminho === '/auth/login')).toBe(true));
  });

  it('portal errado: a mensagem genérica de credenciais, sem sair da página', async () => {
    simularFetch({ 'GET /me': SEM_SESSAO, 'POST /auth/login/super': CREDENCIAIS });
    abrir('/super/entrar');
    await preencher('aluno@teste.com', 'senha-forte');
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByTestId('local')).toHaveTextContent(/^\/super\/entrar$/);
  });

  it('sem sessão no painel, a guarda leva ao login do superadmin com o caminho para voltar', async () => {
    simularFetch({ 'GET /me': SEM_SESSAO });
    abrir('/super/pagamentos');
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/super/entrar?voltar=%2Fsuper%2Fpagamentos'));
    expect(await screen.findByText('Sua sessão terminou. Entre de novo para continuar de onde parou.')).toBeInTheDocument();
  });
});

describe('/admin redireciona para /super/conteudo (D24)', () => {
  it('mantém o resto do caminho e a busca', async () => {
    simularFetch({
      'GET /me': me('admin'),
      'GET /admin/questoes': { itens: [], total: 0, pagina: 1, porPagina: 20 },
      'GET /admin/disciplinas': { itens: [] },
      'GET /admin/assuntos': { itens: [] },
    });
    abrir('/admin/questoes?status=rascunho');
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/super/conteudo/questoes?status=rascunho'));
  });
});

describe('Convite da equipe (/convite/:token)', () => {
  it('define a senha e leva ao login da área da conta, com o aviso', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /me': SEM_SESSAO,
      'POST /auth/redefinir': sessao('superadmin'),
      'POST /auth/sair': { ok: true },
    });
    abrir('/convite/token-de-convite-com-mais-de-20');
    expect(await screen.findByRole('heading', { name: 'Bem-vindo à equipe do Fuse Aprova' })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Sua senha'), 'senha-nova-forte');
    await usuario.type(screen.getByLabelText('Repita a senha'), 'senha-nova-forte');
    await usuario.click(screen.getByRole('button', { name: 'Salvar senha' }));
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(/^\/super\/entrar$/));
    expect(await screen.findByText('Senha salva. Entre com o seu e-mail e a nova senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('pessoa@teste.com');
    expect(chamadas.find((c) => c.caminho === '/auth/redefinir')?.corpo).toMatchObject({ token: 'token-de-convite-com-mais-de-20', senha: 'senha-nova-forte' });
    expect(chamadas.some((c) => c.caminho === '/auth/sair')).toBe(true);
  });

  it('recuperação de senha da equipe também leva ao login da área', async () => {
    const usuario = userEvent.setup();
    simularFetch({ 'GET /me': SEM_SESSAO, 'POST /auth/redefinir': sessao('admin'), 'POST /auth/sair': { ok: true } });
    abrir('/recuperar/token-de-recuperacao-com-mais-de-20');
    await usuario.type(await screen.findByLabelText('Nova senha'), 'senha-nova-forte');
    await usuario.type(screen.getByLabelText('Repita a nova senha'), 'senha-nova-forte');
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(/^\/admin\/entrar$/));
  });
});
