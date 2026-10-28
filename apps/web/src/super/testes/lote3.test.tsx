/**
 * Lote 3 (web que depende do Lote 2): Sistema com os estados da API (S-09), cabeçalho de segundo
 * plano no polling (S-15), reconfirmação das ações sobre a equipe (S-11), convite com reenviar e
 * cancelar (S-19), Retomar na comunicação pausada (S-17) e cupons reservados (S-12).
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASE, ficha, IDS, renderizarSuper, simularFetch } from './ajuda';

const lista = (itens: unknown[]) => ({ itens, total: itens.length, pagina: 1, porPagina: 10 });

function job(extra: Record<string, unknown> = {}) {
  return {
    job: 'backup',
    nome: 'Backup do banco',
    descricao: 'Cópia diária do banco.',
    cron: '0 3 * * *',
    estado: 'ok',
    atrasado: false,
    esperadaAte: '2026-10-29T06:30:00.000Z',
    ultima: { iniciadoEm: '2026-10-28T06:00:00.000Z', terminadoEm: '2026-10-28T06:01:00.000Z', ok: true, erro: null, ms: 60000 },
    ultimoSucessoEm: '2026-10-28T06:01:00.000Z',
    falhas24h: 0,
    ...extra,
  };
}

function sistema(extra: Record<string, unknown> = {}) {
  return {
    api: { versao: '1.4.0', imagem: null, ambiente: 'producao', node: 'v22.1.0', iniciadaEm: '2026-10-28T00:00:00.000Z', uptimeS: 3600, memoriaMb: 120 },
    banco: { ok: true, versao: '16', tamanhoBytes: 2e8, conexoes: 5, maxConexoes: 100, erro: null },
    worker: { jobs: [job()], parado: false, ultimoSinalEm: '2026-10-28T11:59:00.000Z', versao: '1.4.0' },
    backup: { ultimo: 'fuse-2026-10-28.sql.gz', ultimoJob: '2026-10-28T06:00:00.000Z', ultimoJobOk: true, fonte: 'job', aviso: null, estado: 'ok', ultimoEm: '2026-10-28T06:01:00.000Z', idadeHoras: 6, atrasado: false },
    smtp: { configurado: true, host: 'smtp.exemplo.com', estado: 'ok', mensagem: 'Conexão aceita', testadoEm: '2026-10-28T11:58:00.000Z' },
    asaas: { chaveConfigurada: true, ambiente: 'sandbox', estado: 'ok', mensagem: 'Conta respondeu', testadoEm: '2026-10-28T11:58:00.000Z' },
    push: { configurado: true, estado: 'nao_testado', mensagem: 'Configurado, não testado' },
    disco: { caminho: '/srv/fuse/arquivos', livreBytes: 4e10, totalBytes: 8e10, percentualLivre: 50, estado: 'ok' },
    erros5xx: { ultimas24h: 0, ultimaEm: null, porRota: [] },
    resumo: { estado: 'ok', problemas: [] },
    precoCentavos: 39700,
    geradoEm: '2026-10-28T12:00:00.000Z',
    ...extra,
  };
}

const CONFIG = {
  'GET /super/configuracoes': {
    valores: { suporteWhatsapp: '', suporteEmail: '', manutencao: { ativa: false, mensagem: '' }, aviso: { ativo: false, texto: '', tom: 'info' }, avisoEdital: '' },
    precoCentavos: 39700,
    atualizadoEm: null,
    atualizadoPor: null,
  },
};

describe('Sistema (S-09)', () => {
  it('tudo ok: resumo "Tudo certo", jobs com nome humano e "OK" só onde a API diz ok', async () => {
    simularFetch({ ...BASE, ...CONFIG, 'GET /super/sistema': sistema() });
    renderizarSuper('/super/sistema');
    expect(await screen.findByText('Tudo certo: nenhum problema encontrado.')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-banco')).getByText('OK')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-smtp')).getByText('OK')).toBeInTheDocument();
    // Push sem teste não vira "OK".
    expect(within(screen.getByTestId('kpi-push')).getByText('Não testado')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-worker')).getByText('Ativo')).toBeInTheDocument();
    const jobs = screen.getByRole('table', { name: 'Jobs do worker' });
    expect(within(jobs).getByText('Backup do banco')).toBeInTheDocument();
    expect(within(jobs).getByText('Cópia diária do banco.')).toBeInTheDocument();
  });

  it('falhou e atrasado: problemas no topo, job atrasado, worker parado, SMTP falhou e erros 5xx por rota', async () => {
    simularFetch({
      ...BASE,
      ...CONFIG,
      'GET /super/sistema': sistema({
        resumo: { estado: 'falhou', problemas: ['O SMTP falhou no teste.', 'O worker parou de dar sinal.'] },
        worker: {
          jobs: [job({ job: 'enviar-comunicacoes', nome: '', estado: 'atrasado', atrasado: true }), job({ job: 'expirar-pix', nome: 'Vencimento dos Pix', estado: 'falhou', ultima: { iniciadoEm: '2026-10-28T06:00:00.000Z', terminadoEm: null, ok: false, erro: 'timeout no banco', ms: null } })],
          parado: true,
          ultimoSinalEm: '2026-10-28T09:00:00.000Z',
          versao: null,
        },
        backup: { ...sistema().backup, estado: 'atencao', idadeHoras: 30, atrasado: true },
        smtp: { configurado: true, host: 'smtp.exemplo.com', estado: 'falhou', mensagem: 'Conexão recusada', testadoEm: '2026-10-28T11:58:00.000Z' },
        disco: null,
        erros5xx: { ultimas24h: 3, ultimaEm: '2026-10-28T11:00:00.000Z', porRota: [{ rota: 'POST /pagamentos/pix', status: 502, quantidade: 3 }] },
      }),
    });
    renderizarSuper('/super/sistema');
    const problemas = await screen.findByRole('list', { name: 'Problemas' });
    expect(within(problemas).getByText('O SMTP falhou no teste.')).toBeInTheDocument();
    expect(screen.getByText('Há falhas no sistema')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-worker')).getByText('Parado')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-smtp')).getByText('Falhou')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-backup')).getByText('Atenção')).toBeInTheDocument();
    expect(within(screen.getByTestId('kpi-disco')).getByText('Sem medida')).toBeInTheDocument();
    const jobs = screen.getByRole('table', { name: 'Jobs do worker' });
    // Sem `nome` da API: o nome humano de `util.ts`.
    expect(within(jobs).getByText('Envio de comunicações')).toBeInTheDocument();
    expect(within(jobs).getByText('Atrasado')).toBeInTheDocument();
    expect(within(jobs).getByText('Falhou')).toBeInTheDocument();
    expect(within(jobs).getByText('timeout no banco')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Erros por rota' })).getByText('POST /pagamentos/pix')).toBeInTheDocument();
  });

  it('503 banco_indisponivel: mostra "Banco: Falhou" em vez do erro genérico', async () => {
    simularFetch({
      ...BASE,
      ...CONFIG,
      'GET /super/sistema': { status: 503, corpo: { erro: 'O banco caiu agora (teste).', codigo: 'banco_indisponivel' } },
    });
    renderizarSuper('/super/sistema');
    const banco = await screen.findByTestId('kpi-banco');
    expect(within(banco).getByText('Banco')).toBeInTheDocument();
    expect(within(banco).getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByText('O banco caiu agora (teste).')).toBeInTheDocument();
  });
});

describe('Cabeçalho de segundo plano (S-15)', () => {
  afterEach(() => vi.useRealTimers());

  it('o polling manda x-fuse-segundo-plano: 1; a primeira carga e o "Atualizar" não', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { chamadas } = simularFetch({ ...BASE, ...CONFIG, 'GET /super/sistema': sistema() });
    renderizarSuper('/super/sistema');
    await screen.findByText('Tudo certo: nenhum problema encontrado.');
    const doSistema = () => chamadas.filter((c) => c.caminho === '/super/sistema');
    expect(doSistema()).toHaveLength(1);
    expect(doSistema()[0]!.cabecalhos['x-fuse-segundo-plano']).toBeUndefined();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    await waitFor(() => expect(doSistema()).toHaveLength(2));
    expect(doSistema()[1]!.cabecalhos['x-fuse-segundo-plano']).toBe('1');

    vi.useRealTimers();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(doSistema()).toHaveLength(3));
    expect(doSistema()[2]!.cabecalhos['x-fuse-segundo-plano']).toBeUndefined();
  });
});

describe('Reconfirmação das ações sobre a equipe (S-11)', () => {
  it('bloquear um superadmin pede a senha e manda a confirmação', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/usuarios/${IDS.usuario}`]: ficha({ papel: 'superadmin' }),
      [`POST /super/usuarios/${IDS.usuario}/bloquear`]: { ok: true },
    });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`);
    await usuario.click(await screen.findByRole('button', { name: 'Bloquear' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Bloquear a conta?' });
    await usuario.type(within(dialogo).getByLabelText(/Motivo/), 'Conta comprometida');
    const confirmar = within(dialogo).getByRole('button', { name: 'Bloquear' });
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-do-dono');
    await usuario.click(confirmar);
    await waitFor(() => expect(chamadas.some((c) => c.caminho.endsWith('/bloquear'))).toBe(true));
    expect(chamadas.find((c) => c.caminho.endsWith('/bloquear'))!.corpo).toEqual({ motivo: 'Conta comprometida', confirmacao: { senha: 'senha-do-dono' } });
  });

  it('forçar a senha de um admin pede a reconfirmação', async () => {
    const usuario = userEvent.setup();
    simularFetch({ ...BASE, [`GET /super/usuarios/${IDS.usuario}`]: ficha({ papel: 'admin' }) });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`);
    await usuario.click(await screen.findByRole('button', { name: /Forçar troca de senha|Forçar senha/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Forçar troca de senha' });
    expect(within(dialogo).getByText('Confirme que é você')).toBeInTheDocument();
  });

  it('400 campos.confirmacao: a folha passa a pedir a senha e explica', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      [`GET /super/usuarios/${IDS.usuario}`]: ficha(),
      [`PATCH /super/usuarios/${IDS.usuario}`]: (c: { corpo: unknown }) =>
        (c.corpo as { confirmacao?: unknown }).confirmacao
          ? { ok: true }
          : { status: 400, corpo: { erro: 'Para trocar o e-mail de uma conta da equipe, confirme com sua senha.', codigo: 'validacao', campos: { confirmacao: 'Confirme.' } } },
    });
    renderizarSuper(`/super/usuarios/${IDS.usuario}`);
    await usuario.click(await screen.findByRole('button', { name: 'Editar dados' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar dados' });
    expect(within(dialogo).queryByText('Confirme que é você')).toBeNull();
    const email = within(dialogo).getByLabelText('E-mail');
    await usuario.clear(email);
    await usuario.type(email, 'novo@teste.com');
    await usuario.type(within(dialogo).getByLabelText(/Motivo/), 'Pedido do titular');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText(/confirme com sua senha/)).toBeInTheDocument();
    await usuario.type(within(dialogo).getByLabelText('Sua senha'), 'senha-do-dono');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('Dados atualizados.')).toBeInTheDocument();
    const patch = chamadas.filter((c) => c.metodo === 'PATCH');
    expect(patch.at(-1)!.corpo).toMatchObject({ email: 'novo@teste.com', confirmacao: { senha: 'senha-do-dono' } });
  });
});

describe('Equipe: convite pendente (S-19)', () => {
  const membro = {
    id: IDS.usuario,
    nome: 'Bia Convidada Souza',
    email: 'bia@teste.com',
    papel: 'admin',
    doisFatores: false,
    doisFatoresAtivadoEm: null,
    convitePendente: true,
    bloqueado: false,
    ultimoAcessoEm: null,
    criadoEm: '2026-10-27T12:00:00.000Z',
  };

  it('Reenviar e Cancelar aparecem só no convite pendente e chamam as rotas com o motivo', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      'GET /super/equipe': { itens: [membro, { ...membro, id: IDS.sup, nome: 'Dono Superadmin', email: 'dono@teste.com', papel: 'superadmin', convitePendente: false }] },
      'POST /super/equipe/convites/:id/reenviar': { id: IDS.usuario, email: 'bia@teste.com', expiraEm: '2026-10-31T12:00:00.000Z' },
      'POST /super/equipe/convites/:id/cancelar': { ok: true },
    });
    renderizarSuper('/super/equipe');
    const tabela = await screen.findByRole('table', { name: 'Equipe' });
    expect(within(tabela).getAllByRole('button', { name: 'Reenviar' })).toHaveLength(1);
    await usuario.click(within(tabela).getByRole('button', { name: 'Reenviar' }));
    let dialogo = await screen.findByRole('dialog', { name: 'Reenviar o convite?' });
    await usuario.type(within(dialogo).getByLabelText(/Motivo/), 'Não recebeu o e-mail');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reenviar convite' }));
    expect(await within(dialogo).findByText(/O link anterior deixou de valer/)).toBeInTheDocument();
    expect(chamadas.find((c) => c.caminho.endsWith('/reenviar'))).toMatchObject({ caminho: `/super/equipe/convites/${IDS.usuario}/reenviar`, corpo: { motivo: 'Não recebeu o e-mail' } });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Fechar' }));

    await usuario.click(within(tabela).getByRole('button', { name: 'Cancelar' }));
    dialogo = await screen.findByRole('dialog', { name: 'Cancelar o convite?' });
    await usuario.type(within(dialogo).getByLabelText(/Motivo/), 'Convite errado');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar convite' }));
    expect(await within(dialogo).findByText(/Convite cancelado/)).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho === `/super/equipe/convites/${IDS.usuario}/cancelar`)).toBe(true);
  });
});

describe('Comunicação (S-17)', () => {
  const com = (extra: Record<string, unknown> = {}) => ({
    id: IDS.pedido,
    canal: 'email',
    segmento: 'pagos',
    diasInativo: null,
    assunto: 'Novidades da semana',
    mensagem: 'Olá!',
    link: null,
    status: 'pausada',
    total: 100,
    enviados: 40,
    falhas: 3,
    ignorados: 0,
    pendentes: 57,
    criadoPor: { id: IDS.sup, nome: 'Dono Superadmin' },
    criadoEm: '2026-10-28T10:00:00.000Z',
    iniciadoEm: '2026-10-28T10:01:00.000Z',
    concluidoEm: null,
    pausadaMotivo: 'O SMTP recusou 3 envios seguidos.',
    pausadaEm: '2026-10-28T10:05:00.000Z',
    ...extra,
  });

  it('pausada mostra o motivo, Retomar chama a rota com o motivo, e Cancelar também aparece', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      ...BASE,
      'GET /super/webhooks': lista([]),
      'GET /super/comunicacoes': lista([com()]),
      'POST /super/comunicacoes/:id/retomar': com({ status: 'enviando', pausadaMotivo: null, pausadaEm: null }),
    });
    renderizarSuper('/super/comunicacao');
    const tabela = await screen.findByRole('table', { name: 'Comunicações' });
    expect(within(tabela).getByText('O SMTP recusou 3 envios seguidos.', { exact: false })).toBeInTheDocument();
    expect(within(tabela).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    await usuario.click(within(tabela).getByRole('button', { name: 'Retomar' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Retomar a comunicação?' });
    await usuario.type(within(dialogo).getByLabelText(/Motivo/), 'SMTP voltou');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Retomar envio' }));
    expect(await within(dialogo).findByText(/de volta à fila/)).toBeInTheDocument();
    expect(chamadas.find((c) => c.caminho.endsWith('/retomar'))).toMatchObject({ metodo: 'POST', corpo: { motivo: 'SMTP voltou' } });
  });

  it('mudar o link depois da prévia desfaz a prévia (R2-13)', async () => {
    const usuario = userEvent.setup();
    simularFetch({
      ...BASE,
      'GET /super/webhooks': lista([]),
      'GET /super/comunicacoes': lista([]),
      'POST /super/comunicacoes/previa': { destinatarios: 10, semOptIn: 2, amostra: [], assunto: 'Oi', html: null, texto: 'Oi', limitePorMinuto: 30, minutosEstimados: 1 },
    });
    renderizarSuper('/super/comunicacao');
    const form = await screen.findByRole('form', { name: 'Nova comunicação' });
    await usuario.type(within(form).getByLabelText('Assunto'), 'Novidades');
    await usuario.type(within(form).getByLabelText('Mensagem'), 'Mensagem de teste');
    await usuario.click(within(form).getByRole('button', { name: 'Ver prévia' }));
    const enviar = within(form).getByRole('button', { name: 'Enviar' });
    await waitFor(() => expect(enviar).toBeEnabled());
    await usuario.type(within(form).getByLabelText('Link do botão (opcional)'), '/liga');
    expect(enviar).toBeDisabled();
  });
});

describe('Cupons reservados (S-12)', () => {
  it('"Esgotado" conta os reservados (pagos + Pix pendentes) e a tela explica a reserva', async () => {
    const cupom = {
      id: IDS.pedido,
      codigo: 'PROVA10',
      descricao: '',
      tipo: 'percentual',
      valor: 10,
      validoAte: null,
      limiteUsos: 5,
      concursoId: null,
      ativo: true,
      concursoNome: null,
      usos: 3,
      pendentes: 2,
      reservados: 5,
      criadoEm: '2026-10-20T12:00:00.000Z',
      atualizadoEm: '2026-10-20T12:00:00.000Z',
    };
    simularFetch({ ...BASE, 'GET /super/cupons': { itens: [cupom] } });
    renderizarSuper('/super/precos');
    const tabela = await screen.findByRole('table', { name: 'Cupons' });
    const linha = within(tabela).getByText('PROVA10').closest('tr')!;
    expect(within(linha).getByText('Esgotado')).toBeInTheDocument();
    expect(within(linha).getByText('3 pago(s) · 5 de 5 reservado(s)')).toBeInTheDocument();
    expect(screen.getByText(/reserva um uso até vencer/)).toBeInTheDocument();
  });
});
