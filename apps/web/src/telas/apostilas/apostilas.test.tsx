import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { caminhoDownloadApostila } from '@fuse/shared/api';
import { criarQueryClient } from '../../api/consultas';
import { Rotas } from '../../app/App';
import { abrirDb } from '../../offline/db';
import { limparTudo } from '../../offline/fila';
import { ligarApiSimulada } from '../../test/apiSimulada';
import { violacoesSerias } from '../../test/axe';
import { ProvedorToast } from '../../ui';

let local = '';
function Espiao() {
  local = useLocation().pathname;
  return null;
}

function abrir(rota: string) {
  return render(
    <QueryClientProvider client={criarQueryClient()}>
      <ProvedorToast>
        <MemoryRouter
          initialEntries={[rota]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Espiao />
          <Rotas />
        </MemoryRouter>
      </ProvedorToast>
    </QueryClientProvider>,
  );
}

const chamouPix = (fn: ReturnType<typeof ligarApiSimulada>['fn']) =>
  fn.mock.calls.some(([url]) => String(url).includes('/apostilas/pix'));

describe('página das apostilas (D34)', () => {
  beforeEach(async () => {
    await abrirDb();
    await limparTudo();
  });

  it('sem login mostra a venda e o cadastro; criar a conta continua na página', async () => {
    const api = ligarApiSimulada();
    await api.cenario('novo');
    const { container } = abrir('/apostilas');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /4 apostilas · 10\.587 questões comentadas/,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('R$ 47').length).toBeGreaterThan(0);
    expect(screen.getByText('Base comum')).toBeInTheDocument();
    expect(screen.getByText('Administração, direito e áreas técnicas')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Crie sua conta para comprar' }),
    ).toBeInTheDocument();
    expect(await violacoesSerias(container)).toEqual([]);

    await userEvent.type(screen.getByLabelText('Nome completo'), 'Marina Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'nova@email.com');
    await userEvent.type(screen.getByLabelText('Celular'), '42998765432');
    await userEvent.type(screen.getByLabelText('CPF'), '52998224725');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-123');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'senha-forte-123');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Criar conta e continuar/ }));
    expect(await screen.findByRole('button', { name: 'Gerar Pix de R$ 47' })).toBeInTheDocument();
    expect(local).toBe('/apostilas');
    expect(chamouPix(api.fn)).toBe(false);
  });

  it('"Já tenho conta" troca para o login', async () => {
    const api = ligarApiSimulada();
    await api.cenario('novo');
    abrir('/apostilas');
    await userEvent.click(await screen.findByRole('button', { name: 'Já tenho conta' }));
    expect(screen.getByRole('heading', { name: 'Entre na sua conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument();
  });

  it('logado sem compra: o Pix só nasce no toque e, pago, libera os downloads', async () => {
    const api = ligarApiSimulada();
    await api.cenario('semAcesso');
    abrir('/apostilas');
    const botao = await screen.findByRole('button', { name: 'Gerar Pix de R$ 47' });
    expect(chamouPix(api.fn)).toBe(false);
    expect(screen.queryByAltText(/QR Code do Pix/)).not.toBeInTheDocument();
    await userEvent.click(botao);
    expect(await screen.findByAltText('QR Code do Pix de R$ 47,00')).toBeInTheDocument();
    expect((screen.getByLabelText('Pix copia e cola') as HTMLInputElement).value).toContain(
      'br.gov.bcb.pix',
    );
    await api.fn('/api/__mock/pagar-apostilas', { method: 'POST' });
    expect(
      await screen.findByText('Suas apostilas estão liberadas', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(local).toBe('/apostilas');
  }, 10000);

  it('comprado mostra os 4 downloads e o link para o app', async () => {
    const api = ligarApiSimulada();
    await api.cenario('apostilasCompradas');
    const { container } = abrir('/apostilas');
    expect(await screen.findByText('Suas apostilas estão liberadas')).toBeInTheDocument();
    const links = within(container).getAllByRole('link', { name: /Baixar volume/ });
    expect(links).toHaveLength(4);
    links.forEach((l, i) => expect(l).toHaveAttribute('href', caminhoDownloadApostila(i + 1)));
    expect(links[0]).toHaveAttribute('download');
    expect(screen.getByRole('link', { name: 'Estudar no app Fuse Aprova' })).toHaveAttribute(
      'href',
      '/aprender',
    );
    expect(chamouPix(api.fn)).toBe(false);
    expect(await violacoesSerias(container)).toEqual([]);
  });

  it('conta da equipe vê o aviso para entrar como aluno', async () => {
    const api = ligarApiSimulada();
    await api.cenario('equipe');
    abrir('/apostilas');
    await waitFor(() =>
      expect(screen.getByText(/compradas com uma conta de aluno/)).toBeInTheDocument(),
    );
  });
});
