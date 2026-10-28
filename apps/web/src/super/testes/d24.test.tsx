/**
 * D24 (Lote 3, web): painel único com a seção Conteúdo e o menu por papel, sessão perdida
 * (S-19), os três botões do RQ4 na tela do pagamento e a ficha por concurso (S-14, S-25).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BASE, ficha, IDS, pagamento, renderizarSuper, simularFetch } from './ajuda';

const CONCURSO = '88888888-8888-4888-8888-888888888888';
const OUTRO = '99999999-9999-4999-8999-999999999999';
const lista = (itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, porPagina: 20 });
const PAINEL_CONTEUDO = {
  reportsAbertos: 0,
  questoesRascunho: 2,
  questoesPorStatus: { rascunho: 2, revisao: 1, publicada: 10, anulada: 0, retirada: 0 },
  metricas: { licoesPorAlunoSemana: 3, melhoraAcertoPp: 5 },
  geradoEm: '2026-10-28T12:00:00.000Z',
};
const ME_ADMIN = { 'GET /me': { id: '12121212-1212-4212-8212-121212121212', nome: 'Ana Conteúdo', papel: 'admin' } };

function detalhe(extra: Record<string, unknown> = {}) {
  return { pagamento: pagamento(extra), linhaDoTempo: [], webhooks: [] };
}

describe('Painel único: menu por papel (D24)', () => {
  it('admin vê só o Conteúdo, com Sair, sem negócio nem link para o app do aluno', async () => {
    simularFetch({ ...ME_ADMIN, 'GET /admin/painel': PAINEL_CONTEUDO });
    renderizarSuper('/super/conteudo', 1280, null);
    const menu = await screen.findByRole('navigation', { name: 'Menu do painel de conteúdo' });
    expect(within(menu).getByText('Conteúdo', { selector: 'span' })).toBeInTheDocument();
    for (const item of ['Concursos e provas', 'Questões', 'Importação', 'Trilhas', 'Edital', 'Erros relatados']) {
      expect(within(menu).getByRole('link', { name: item })).toBeInTheDocument();
    }
    for (const negocio of ['Visão geral', 'Pagamentos', 'Usuários', 'Equipe', 'Auditoria', 'Sistema']) {
      expect(within(menu).queryByRole('link', { name: negocio })).not.toBeInTheDocument();
    }
    const hrefs = within(menu).getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs.every((h) => h?.startsWith('/super/conteudo'))).toBe(true);
    expect(within(menu).getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(await within(menu).findByText('Equipe de conteúdo')).toBeInTheDocument();
    // Trilha "Conteúdo" e título da tela inicial.
    expect(await screen.findByRole('heading', { name: 'Resumo do conteúdo', level: 1 })).toBeInTheDocument();
  });

  it('admin que abre uma página de negócio vai para o Conteúdo', async () => {
    simularFetch({ ...ME_ADMIN, 'GET /admin/painel': PAINEL_CONTEUDO });
    renderizarSuper('/super/pagamentos', 1280, null);
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent(/^\/super\/conteudo$/));
  });

  it('admin no celular: menu inferior do Conteúdo e "Mais" com Concursos, Edital e Sair', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...ME_ADMIN, 'GET /admin/painel': PAINEL_CONTEUDO });
    renderizarSuper('/super/conteudo', 390, null);
    const nav = await screen.findByRole('navigation', { name: 'Navegação do painel de conteúdo' });
    for (const item of ['Questões', 'Importação', 'Trilhas', 'Erros']) {
      expect(within(nav).getByRole('link', { name: item })).toBeInTheDocument();
    }
    await usuario.click(within(nav).getByRole('button', { name: 'Mais' }));
    const folha = screen.getByRole('dialog', { name: 'Mais opções' });
    expect(within(folha).getByRole('link', { name: 'Concursos e provas' })).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Edital' })).toBeInTheDocument();
    expect(within(folha).getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(within(folha).queryByRole('link', { name: 'Pagamentos' })).not.toBeInTheDocument();
  });

  it('superadmin abre o Conteúdo no mesmo layout, com a trilha "Conteúdo"', async () => {
    simularFetch({ ...BASE, 'GET /admin/reports': lista([]) });
    renderizarSuper('/super/conteudo/reports', 1280);
    const menu = screen.getByRole('navigation', { name: 'Menu do superadmin' });
    expect(within(menu).getByRole('link', { name: 'Erros relatados' })).toHaveClass('ativo');
    expect(await screen.findByRole('heading', { name: 'Erros relatados', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Você está em' })).toHaveTextContent('Conteúdo');
  });

  it('Sair leva à página de login do papel', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...ME_ADMIN, 'GET /admin/painel': PAINEL_CONTEUDO, 'POST /auth/sair': { ok: true } });
    renderizarSuper('/super/conteudo', 1280, null);
    const menu = await screen.findByRole('navigation', { name: 'Menu do painel de conteúdo' });
    await usuario.click(within(menu).getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText('Tela de entrar da equipe de conteúdo')).toBeInTheDocument();
  });
});

describe('Sessão perdida no painel (S-19)', () => {
  it('401 numa tela leva ao login do superadmin, com o caminho para voltar', async () => {
    simularFetch({ ...BASE, 'GET /super/equipe': { status: 401, corpo: { erro: 'Entre na sua conta para continuar.', codigo: 'nao_autenticado' } } });
    renderizarSuper('/super/equipe', 1280);
    expect(await screen.findByText('Tela de entrar do superadmin')).toBeInTheDocument();
    expect(screen.getByTestId('local')).toHaveTextContent('/super/entrar?voltar=%2Fsuper%2Fequipe');
  });

  it('2FA vencido (403) leva ao /super/2fa, e o 2FA tem Sair mesmo no celular', async () => {
    simularFetch({
      ...BASE,
      'GET /super/equipe': { status: 403, corpo: { erro: 'Confirme o código do app.', codigo: 'dois_fatores_pendente' } },
      'GET /super/2fa': { configurado: false, verificadoNestaSessao: false, ativadoEm: null, codigosRecuperacaoRestantes: 0 },
    });
    renderizarSuper('/super/equipe', 390);
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/super/2fa?voltar=%2Fsuper%2Fequipe'));
    expect(await screen.findByRole('button', { name: 'Gerar QR code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação do superadmin' })).not.toBeInTheDocument();
  });
});

describe('RQ4: as ações da tela do pagamento', () => {
  const nomes = ['Liberar acesso', 'Aprovar pagamento manual', 'Estornar'];
  async function botoesVisiveis(): Promise<string[]> {
    await screen.findByRole('group', { name: 'Ações do pagamento' });
    // Espera a ficha (papel) e o /me chegarem antes de olhar.
    await waitFor(() => expect(screen.getByRole('group', { name: 'Ações do pagamento' })).toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 50));
    return nomes.filter((n) => screen.queryByRole('button', { name: n }));
  }

  it('pago sem o concurso liberado: Liberar acesso e Estornar; libera com motivo e senha e mostra a mensagem', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'pago', pagoEm: '2026-10-20T13:00:00.000Z', concursoLiberado: false, dentroDoArrependimento: true }),
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
      [`POST /super/pagamentos/${IDS.pedido}/liberar`]: {
        alterado: true,
        mensagem: 'Concurso de Palmital 2026 liberado para Joana Pereira Dias.',
        pagamento: pagamento({ status: 'pago', concursoLiberado: true }),
      },
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Liberar acesso' })).toBeInTheDocument());
    expect(await botoesVisiveis()).toEqual(['Liberar acesso', 'Estornar']);
    expect(screen.getByText('Não liberado')).toBeInTheDocument();
    expect(screen.getAllByText('Concurso de Palmital 2026').length).toBeGreaterThan(0);

    await usuario.click(screen.getByRole('button', { name: 'Liberar acesso' }));
    const dialogo = screen.getByRole('dialog', { name: 'Liberar o acesso deste concurso?' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Liberar acesso' });
    await usuario.type(within(dialogo).getByLabelText('Motivo (fica na auditoria)'), 'Webhook não chegou ao servidor.');
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-super');
    await usuario.click(confirmar);
    expect(await within(dialogo).findByText('Concurso de Palmital 2026 liberado para Joana Pereira Dias.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toMatchObject({ motivo: 'Webhook não chegou ao servidor.', confirmacao: { senha: 'senha-super' } });
  });

  it('pago com o concurso liberado: só Estornar', async () => {
    simularFetch({
      ...BASE,
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'pago', concursoLiberado: true }),
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Estornar' })).toBeInTheDocument());
    expect(await botoesVisiveis()).toEqual(['Estornar']);
  });

  it('pendente ou vencido: só Aprovar pagamento manual, com o concurso e o valor do pedido (cupom)', async () => {
    const usuario = userEvent.setup();
    simularFetch({
      ...BASE,
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'vencido', valorCentavos: 17730, cupomCodigo: 'PALMITAL10', valorOriginalCentavos: 19700, descontoCentavos: 1970 }),
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprovar pagamento manual' })).toBeInTheDocument());
    expect(await botoesVisiveis()).toEqual(['Aprovar pagamento manual']);
    expect(screen.getByText('PALMITAL10')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Aprovar pagamento manual' }));
    const dialogo = screen.getByRole('dialog', { name: 'Aprovar pagamento manual' });
    expect(within(dialogo).getByText(/R\$\s*177,30 \(cupom PALMITAL10, de R\$\s*197,00\)/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Concurso de Palmital 2026')).toBeInTheDocument();
    // A cobrança no Asaas: receber em dinheiro ou cancelar (sem "não mexer").
    const asaas = within(dialogo).getByLabelText('Cobrança Pix no Asaas');
    expect(within(asaas).getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual(['receber_em_dinheiro', 'cancelar']);
  });

  it('conta da equipe: nenhuma das três ações aparece', async () => {
    simularFetch({
      ...BASE,
      // Lote 3: o papel vem no próprio pedido (sem consultar a ficha).
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'pago', concursoLiberado: false, usuario: { ...pagamento().usuario, papel: 'admin' } }),
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    expect(await botoesVisiveis()).toEqual([]);
  });

  it('a própria conta: nenhuma das três ações aparece', async () => {
    simularFetch({
      ...BASE,
      'GET /me': { id: IDS.usuario, nome: 'Joana Pereira Dias', papel: 'superadmin' },
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'pendente' }),
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    expect(await botoesVisiveis()).toEqual([]);
  });

  it('Estornar fora do prazo: a marcação volta ao padrão quando o modal reabre (S-25)', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/pagamentos/${IDS.pedido}`]: detalhe({ status: 'pago', concursoLiberado: true, dentroDoArrependimento: false }),
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
      [`POST /super/pagamentos/${IDS.pedido}/estornar`]: {
        modo: 'asaas',
        status: 'aguardando_webhook',
        mensagem: 'Estorno pedido ao Asaas. O acesso deste concurso cai quando o Asaas confirmar.',
        pagamento: pagamento({ status: 'pago' }),
      },
    });
    renderizarSuper(`/super/pagamentos/${IDS.pedido}`, 1280);
    await usuario.click(await screen.findByRole('button', { name: 'Estornar' }));
    let dialogo = screen.getByRole('dialog', { name: 'Estornar o pagamento?' });
    const marcar = within(dialogo).getByLabelText(/Fora dos 7 dias/);
    await usuario.click(marcar);
    expect(marcar).toBeChecked();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await usuario.click(screen.getByRole('button', { name: 'Estornar' }));
    dialogo = screen.getByRole('dialog', { name: 'Estornar o pagamento?' });
    expect(within(dialogo).getByLabelText(/Fora dos 7 dias/)).not.toBeChecked();
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar estorno' });
    await usuario.type(within(dialogo).getByLabelText('Motivo (fica na auditoria)'), 'Aluno pediu o dinheiro de volta.');
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-super');
    expect(confirmar).toBeDisabled();
    await usuario.click(within(dialogo).getByLabelText(/Fora dos 7 dias/));
    await usuario.click(confirmar);
    expect(await within(dialogo).findByText(/Estorno pedido ao Asaas/)).toBeInTheDocument();
    const post = chamadas.find((c) => c.metodo === 'POST');
    expect(post?.caminho).toBe(`/super/pagamentos/${IDS.pedido}/estornar`);
    expect(post?.corpo).toMatchObject({ foraDoPrazo: true, confirmacao: { senha: 'senha-super' } });
  });
});

describe('Ficha por concurso (D21/D24)', () => {
  const doisConcursos = {
    concursos: [
      { id: CONCURSO, nome: 'Concurso de Palmital 2026', acesso: true, acessoEm: '2026-10-20T13:00:00.000Z', ativo: true, cargo: 'Agente Administrativo', pedidoPagoId: IDS.pedido },
      { id: OUTRO, nome: 'Concurso de Ourinhos 2027', acesso: false, acessoEm: null, ativo: false, cargo: null, pedidoPagoId: null },
    ],
  };

  it('lista os concursos e libera só o escolhido, pela rota do concurso', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/usuarios/${IDS.usuario}`]: { ...ficha(), ...doisConcursos },
      [`POST /super/usuarios/${IDS.usuario}/concursos/${OUTRO}/liberar`]: {
        alterado: true,
        acesso: true,
        mensagem: 'Concurso de Ourinhos 2027 liberado.',
        concursos: doisConcursos.concursos,
      },
    });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`, 1280);
    const lista = await screen.findByRole('list', { name: 'Concursos do usuário' });
    expect(within(lista).getByText('Concurso de Palmital 2026')).toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'pedido pago' })).toHaveAttribute('href', `/super/pagamentos/${IDS.pedido}`);
    await waitFor(() => expect(within(lista).getByRole('button', { name: 'Revogar Concurso de Palmital 2026' })).toBeInTheDocument());
    expect(within(lista).queryByRole('button', { name: 'Liberar Concurso de Palmital 2026' })).not.toBeInTheDocument();
    expect(within(lista).getByRole('button', { name: 'Aprovar pagamento manual de Concurso de Ourinhos 2027' })).toBeInTheDocument();
    // O "acesso geral" saiu dos botões do topo.
    expect(screen.queryByRole('button', { name: 'Liberar acesso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revogar acesso' })).not.toBeInTheDocument();

    await usuario.click(within(lista).getByRole('button', { name: 'Liberar Concurso de Ourinhos 2027' }));
    const dialogo = screen.getByRole('dialog', { name: 'Liberar o concurso?' });
    await usuario.type(within(dialogo).getByLabelText('Motivo (fica na auditoria)'), 'Cortesia aprovada pela direção.');
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-super');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Liberar' }));
    expect(await within(dialogo).findByText('Concurso de Ourinhos 2027 liberado.')).toBeInTheDocument();
    expect(chamadas.find((c) => c.metodo === 'POST')?.caminho).toBe(`/super/usuarios/${IDS.usuario}/concursos/${OUTRO}/liberar`);
  });

  it('conta da equipe: sem liberar, revogar nem aprovar (S-25)', async () => {
    simularFetch({ ...BASE, [`GET /super/usuarios/${IDS.usuario}`]: { ...ficha({ papel: 'admin' }), ...doisConcursos } });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`, 1280);
    const lista = await screen.findByRole('list', { name: 'Concursos do usuário' });
    await new Promise((r) => setTimeout(r, 50));
    expect(within(lista).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByText(/Sem concurso liberado|Com concurso liberado/)).not.toBeInTheDocument();
  });

  it('lista de pagamentos mostra o concurso e o cupom e filtra por concurso', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      'GET /super/pagamentos': lista([pagamento({ cupomCodigo: 'PALMITAL10', descontoCentavos: 1970 })]),
    });
    renderizarSuper('/super/pagamentos', 1280);
    const tabela = await screen.findByRole('table', { name: 'Pagamentos' });
    expect(within(tabela).getByText('Concurso de Palmital 2026')).toBeInTheDocument();
    expect(within(tabela).getByText('PALMITAL10')).toBeInTheDocument();
    const filtro = screen.getByLabelText('Concurso');
    await waitFor(() => expect(within(filtro).getAllByRole('option')).toHaveLength(2));
    await usuario.selectOptions(filtro, CONCURSO);
    await waitFor(() => expect(chamadas.filter((c) => c.caminho === '/super/pagamentos').at(-1)?.query.get('concursoId')).toBe(CONCURSO));
  });
});
