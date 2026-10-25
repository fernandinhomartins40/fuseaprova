import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BASE, ficha, IDS, pagamento, renderizarSuper, simularFetch } from './ajuda';

const lista = (itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, porPagina: 20 });

describe('Layout do /super', () => {
  it('desktop: sidebar com marca, selo, menu, /admin e rodapé; recolhe para só ícones', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...BASE, 'GET /super/equipe': { itens: [] } });
    const { container } = renderizarSuper('/super/equipe', 1280);
    const menu = screen.getByRole('navigation', { name: 'Menu do superadmin' });
    expect(within(menu).getByText('Superadmin')).toBeInTheDocument();
    for (const item of ['Visão geral', 'Pagamentos', 'Conta Asaas', 'Usuários', 'Equipe', 'Comunicação', 'Sistema']) {
      expect(within(menu).getByRole('link', { name: item })).toBeInTheDocument();
    }
    expect(within(menu).getByRole('link', { name: /\/admin/ })).toHaveAttribute('href', '/admin');
    expect(await within(menu).findByText('2FA ativo nesta sessão')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação do superadmin' })).not.toBeInTheDocument();
    expect(container.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'desktop');

    // Breadcrumb e título da página.
    expect(await screen.findByRole('heading', { name: 'Equipe', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toHaveTextContent('Superadmin');

    await usuario.click(within(menu).getByRole('button', { name: 'Recolher o menu' }));
    expect(within(menu).getByRole('link', { name: 'Pagamentos' })).toHaveAttribute('data-dica', 'Pagamentos');
    expect(within(menu).getByRole('button', { name: 'Expandir o menu' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tablet: sidebar só com ícones, sem botão de recolher', () => {
    simularFetch({ ...BASE, 'GET /super/equipe': { itens: [] } });
    const { container } = renderizarSuper('/super/equipe', 900);
    expect(container.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'tablet');
    const menu = screen.getByRole('navigation', { name: 'Menu do superadmin' });
    expect(within(menu).getByRole('link', { name: 'Usuários' })).toHaveAttribute('data-dica', 'Usuários');
    expect(within(menu).queryByRole('button', { name: /Recolher|Expandir/ })).not.toBeInTheDocument();
  });

  it('celular: barra superior e menu inferior; "Mais" abre a folha com Equipe, Comunicação, Sistema e Sair', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...BASE, 'GET /super/equipe': { itens: [] }, 'POST /auth/sair': { ok: true } });
    const { container } = renderizarSuper('/super/equipe', 390);
    expect(container.querySelector('[data-layout]')).toHaveAttribute('data-layout', 'mobile');
    expect(screen.queryByRole('navigation', { name: 'Menu do superadmin' })).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegação do superadmin' });
    for (const item of ['Visão geral', 'Pagamentos', 'Usuários', 'Asaas']) {
      expect(within(nav).getByRole('link', { name: item })).toBeInTheDocument();
    }
    // O título da página vai para a barra superior.
    await waitFor(() => expect(container.querySelector('header h1')).toHaveTextContent('Equipe'));

    await usuario.click(within(nav).getByRole('button', { name: 'Mais' }));
    const folha = screen.getByRole('dialog', { name: 'Mais opções' });
    expect(within(folha).getByRole('link', { name: 'Equipe' })).toHaveAttribute('aria-current', 'page');
    expect(within(folha).getByRole('link', { name: 'Comunicação' })).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Sistema' })).toBeInTheDocument();
    expect(within(folha).getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Mais opções' })).not.toBeInTheDocument();
  });
});

describe('Pagamentos', () => {
  it('desktop: tabela, e os filtros vão para a API', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({ ...BASE, 'GET /super/pagamentos': lista([pagamento()]) });
    renderizarSuper('/super/pagamentos', 1280);
    const tabela = await screen.findByRole('table', { name: 'Pagamentos' });
    expect(within(tabela).getByRole('link', { name: 'Joana Pereira Dias' })).toHaveAttribute('href', `/super/pagamentos/${IDS.pedido}`);
    expect(within(tabela).getByText('pay_123')).toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText('Status'), 'pago');
    await usuario.selectOptions(screen.getByLabelText('Método'), 'manual');
    await waitFor(() => {
      const ultima = chamadas.filter((c) => c.caminho === '/super/pagamentos').at(-1);
      expect(ultima?.query.get('status')).toBe('pago');
      expect(ultima?.query.get('metodo')).toBe('manual');
    });
  });

  it('celular: cartões e filtros numa folha', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({ ...BASE, 'GET /super/pagamentos': lista([pagamento()]) });
    renderizarSuper('/super/pagamentos', 390);
    const cartoes = await screen.findByRole('list', { name: 'Pagamentos' });
    expect(within(cartoes).getByRole('link', { name: /Joana Pereira Dias/ })).toHaveAttribute('href', `/super/pagamentos/${IDS.pedido}`);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Filtros' }));
    const folha = screen.getByRole('dialog', { name: 'Filtros' });
    await usuario.selectOptions(within(folha).getByLabelText('Status'), 'vencido');
    await usuario.click(within(folha).getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(chamadas.filter((c) => c.caminho === '/super/pagamentos').at(-1)?.query.get('status')).toBe('vencido'));
    expect(screen.getByRole('button', { name: 'Filtros (1 ativo(s))' })).toBeInTheDocument();
  });
});

describe('Aprovação manual de pagamento', () => {
  it('pede observação e a senha, manda tudo para a API e mostra o resultado', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/pagamentos/${IDS.pedido}`]: { pagamento: pagamento(), linhaDoTempo: [], webhooks: [] },
      [`POST /super/usuarios/${IDS.usuario}/aprovar-pagamento`]: {
        pedidoId: IDS.pedido,
        jaAprovado: false,
        asaas: { acao: 'receber_em_dinheiro', ok: true, mensagem: 'Cobrança marcada como recebida.' },
      },
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    await usuario.click(await screen.findByRole('button', { name: 'Aprovar pagamento manual' }));
    const dialogo = screen.getByRole('dialog', { name: 'Aprovar pagamento manual' });
    const aprovar = within(dialogo).getByRole('button', { name: 'Aprovar e liberar acesso' });
    expect(aprovar).toBeDisabled();

    await usuario.selectOptions(within(dialogo).getByLabelText('Forma do pagamento'), 'dinheiro');
    await usuario.type(within(dialogo).getByLabelText('Observação (motivo, fica na auditoria)'), 'Recebido em dinheiro na secretaria.');
    expect(aprovar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-super');
    expect(aprovar).toBeEnabled();
    await usuario.click(aprovar);

    expect(await within(dialogo).findByText('Pagamento manual registrado e acesso liberado.')).toBeInTheDocument();
    expect(within(dialogo).getByText(/Cobrança marcada como recebida/)).toBeInTheDocument();
    const post = chamadas.find((c) => c.metodo === 'POST');
    expect(post?.corpo).toMatchObject({
      forma: 'dinheiro',
      observacao: 'Recebido em dinheiro na secretaria.',
      acaoAsaas: 'receber_em_dinheiro',
      confirmacao: { senha: 'senha-super' },
    });
  });

  it('celular: o detalhe é uma tela empilhada com voltar e a aprovação abre em folha', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...BASE, [`GET /super/pagamentos/${IDS.pedido}`]: { pagamento: pagamento(), linhaDoTempo: [], webhooks: [] } });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 390);
    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: 'Aprovar pagamento manual' }));
    const folha = screen.getByRole('dialog', { name: 'Aprovar pagamento manual' });
    expect(within(folha).getByRole('button', { name: /Arraste para baixo/ })).toBeInTheDocument();
    // As outras ações ficam em "Mais ações".
    await usuario.click(within(folha).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: /Mais ações/ }));
    expect(within(screen.getByRole('dialog', { name: 'Ações' })).getByRole('button', { name: 'Cancelar Pix' })).toBeInTheDocument();
  });
});

describe('Usuários', () => {
  it('ficha: excluir (LGPD) exige o e-mail digitado, motivo e senha', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
      [`POST /super/usuarios/${IDS.usuario}/anonimizar`]: { ok: true },
    });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`, 1280);
    await usuario.click(await screen.findByRole('button', { name: 'Excluir (LGPD)' }));
    const dialogo = screen.getByRole('dialog', { name: 'Excluir a conta (LGPD)?' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir definitivamente' });
    await usuario.type(within(dialogo).getByLabelText('Motivo (fica na auditoria)'), 'Pedido do titular por e-mail.');
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-super');
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText('Digite joana@teste.com para confirmar'), 'joana@teste.com');
    await usuario.click(confirmar);
    expect(await within(dialogo).findByText(/Conta anonimizada/)).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({ emailConfirmado: 'joana@teste.com', confirmacao: { senha: 'senha-super' } });
  });

  it('lista no celular vira cartões com link para a ficha', async () => {
    simularFetch({
      ...BASE,
      'GET /super/usuarios': lista([{ ...ficha().usuario }]),
    });
    renderizarSuper('/super/usuarios', 390);
    const cartoes = await screen.findByRole('list', { name: 'Usuários' });
    expect(within(cartoes).getByRole('link', { name: /Joana Pereira Dias/ })).toHaveAttribute('href', `/super/usuarios/${IDS.usuario}`);
  });
});
