import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { IDS, renderizarAdmin, simularFetch } from './ajuda';

function pedido(extra: Record<string, unknown> = {}) {
  return {
    id: IDS.pedido,
    usuario: { id: IDS.usuario, nome: 'Maria Souza', email: 'maria@exemplo.com.br', cpfOculto: '***.123.456-**' },
    valorCentavos: 39700,
    status: 'pago',
    asaasPaymentId: 'pay_123',
    asaasCustomerId: 'cus_123',
    criadoEm: '2026-10-20T10:00:00.000-03:00',
    pagoEm: '2026-10-20T10:02:00.000-03:00',
    pixExpiraEm: null,
    reembolsoSolicitadoEm: null,
    dentroDoArrependimento: true,
    ...extra,
  };
}

const listaDe = (...itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, porPagina: 25 });

describe('Pedidos', () => {
  it('mostra o CPF sempre mascarado, mesmo se vier completo', async () => {
    simularFetch({
      'GET /admin/pedidos': listaDe(
        pedido(),
        pedido({
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
          usuario: { id: IDS.admin, nome: 'João', email: 'joao@exemplo.com.br', cpfOculto: '529.982.247-25' },
        }),
      ),
    });
    renderizarAdmin('/admin/pedidos');
    const cpfs = await screen.findAllByTestId('cpf');
    expect(cpfs.map((c) => c.textContent)).toEqual(['***.123.456-**', '***.982.247-**']);
    expect(document.body.textContent).not.toContain('529.982.247-25');
  });

  it('reembolso pede confirmação com motivo e avisa que o acesso cai com o webhook', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/pedidos': listaDe(pedido()),
      'POST /admin/pedidos/:id/reembolso': { ok: true, status: 'aguardando_webhook' },
    });
    renderizarAdmin('/admin/pedidos');
    await usuario.click(await screen.findByRole('button', { name: 'Reembolsar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Reembolsar pedido?' });
    expect(dialogo).toHaveTextContent(/revogado quando o webhook de estorno chegar/);
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar reembolso' });
    expect(confirmar).toBeDisabled();

    await usuario.type(within(dialogo).getByLabelText('Motivo do reembolso'), 'Arrependimento em 7 dias');
    await usuario.click(confirmar);

    await waitFor(() => {
      const r = chamadas.find((c) => c.metodo === 'POST');
      expect(r?.caminho).toBe(`/admin/pedidos/${IDS.pedido}/reembolso`);
      expect(r?.corpo).toEqual({ motivo: 'Arrependimento em 7 dias', foraDoPrazo: false });
    });
    expect(await within(dialogo).findByText(/quando o webhook de estorno\s+chegar/)).toBeInTheDocument();
  });

  it('fora dos 7 dias, o reembolso exige marcar a exceção', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/pedidos': listaDe(pedido({ dentroDoArrependimento: false })),
      'POST /admin/pedidos/:id/reembolso': { ok: true, status: 'aguardando_webhook' },
    });
    renderizarAdmin('/admin/pedidos');
    await usuario.click(await screen.findByRole('button', { name: 'Reembolsar' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText('Motivo do reembolso'), 'Exceção aprovada');
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar reembolso' });
    expect(confirmar).toBeDisabled();
    await usuario.click(within(dialogo).getByLabelText(/fora do direito de arrependimento/));
    await usuario.click(confirmar);
    await waitFor(() =>
      expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({ motivo: 'Exceção aprovada', foraDoPrazo: true }),
    );
  });

  it('liberação manual exige motivo de pelo menos 10 caracteres', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/pedidos': listaDe(pedido({ status: 'pendente', pagoEm: null })),
      'POST /admin/usuarios/:id/liberar-acesso': { ok: true },
    });
    renderizarAdmin('/admin/pedidos');
    await usuario.click(await screen.findByRole('button', { name: 'Liberar acesso' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Liberar acesso manualmente?' });
    expect(dialogo).toHaveTextContent('***.123.456-**');

    await usuario.type(within(dialogo).getByLabelText('Motivo'), 'curto');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Liberar acesso' }));
    expect(await within(dialogo).findByText('Descreva o motivo (pelo menos 10 caracteres).')).toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);

    await usuario.clear(within(dialogo).getByLabelText('Motivo'));
    await usuario.type(within(dialogo).getByLabelText('Motivo'), 'Pix pago, webhook perdido, conferido no Asaas');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Liberar acesso' }));
    await waitFor(() => {
      const r = chamadas.find((c) => c.metodo === 'POST');
      expect(r?.caminho).toBe(`/admin/usuarios/${IDS.usuario}/liberar-acesso`);
      expect(r?.corpo).toEqual({ motivo: 'Pix pago, webhook perdido, conferido no Asaas' });
    });
    expect(await within(dialogo).findByText(/Acesso liberado/)).toBeInTheDocument();
  });
});
