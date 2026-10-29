import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ASSUNTOS, DISCIPLINAS, IDS, renderizarAdmin, simularFetch } from './ajuda';

function questao(extra: Record<string, unknown> = {}) {
  return {
    id: IDS.q1,
    provaOrigemId: null,
    numeroOrigem: null,
    origem: 'autoral',
    disciplinaId: IDS.portugues,
    assuntoId: IDS.crase,
    areas: [],
    dificuldade: 2,
    textoApoio: null,
    enunciado: 'Assinale a alternativa em que a **crase** está correta.',
    alternativas: [
      { letra: 'A', texto: 'Fomos à Curitiba.' },
      { letra: 'B', texto: 'Entregue à ela.' },
      { letra: 'C', texto: 'Cheguei à prefeitura às 8 horas.' },
      { letra: 'D', texto: 'Comprei à prazo.' },
      { letra: 'E', texto: 'Começou à chover.' },
    ],
    gabarito: 'C',
    dica: null,
    explicacao: null,
    dicaBolso: null,
    status: 'rascunho',
    anuladaMotivo: null,
    versao: 3,
    criadoPor: null,
    revisadoPor: null,
    publicadoEm: null,
    criadoEm: '2026-10-01T10:00:00.000-03:00',
    atualizadoEm: '2026-10-20T10:00:00.000-03:00',
    reportsAbertos: 0,
    pendencias: ['Falta a explicação.'],
    ...extra,
  };
}

function rotas(q = questao()) {
  return {
    'GET /admin/disciplinas': DISCIPLINAS,
    'GET /admin/assuntos': ASSUNTOS,
    [`GET /admin/questoes/${IDS.q1}`]: q,
    [`PUT /admin/questoes/${IDS.q1}`]: (c: { corpo: unknown }) => ({ ...q, ...(c.corpo as object), versao: q.versao + 1 }),
  };
}

describe('Editor de questão: publicar exige dica, explicação e revisão humana', () => {
  it('bloqueia a publicação e lista o que falta, sem chamar a API', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch(rotas());
    renderizarAdmin(`/super/conteudo/questoes/${IDS.q1}`);
    await screen.findByRole('heading', { name: 'Editar questão' });
    await waitFor(() => expect(screen.getByLabelText('Assunto')).toHaveValue(IDS.crase));

    await usuario.selectOptions(screen.getByLabelText('Status'), 'publicada');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    const alerta = await screen.findByText(/Não dá para publicar ainda/);
    expect(alerta).toHaveTextContent('Falta a explicação.');
    expect(alerta).toHaveTextContent('Falta a dica.');
    expect(alerta).toHaveTextContent('Falta a dica de bolso.');
    expect(alerta).toHaveTextContent('Falta a revisão humana no painel.');
    expect(chamadas.some((c) => c.metodo === 'PUT')).toBe(false);
  });

  it('publica quando tem dica, explicação, dica de bolso e revisão marcada', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch(rotas());
    renderizarAdmin(`/super/conteudo/questoes/${IDS.q1}`);
    await screen.findByRole('heading', { name: 'Editar questão' });
    await waitFor(() => expect(screen.getByLabelText('Assunto')).toHaveValue(IDS.crase));

    await usuario.selectOptions(screen.getByLabelText('Status'), 'publicada');
    fireEvent.change(screen.getByLabelText('Dica'), { target: { value: 'Troque por "ao": se couber, tem crase.' } });
    fireEvent.change(screen.getByLabelText('Explicação'), { target: { value: 'Em C, "chegar a + a prefeitura".' } });
    fireEvent.change(screen.getByLabelText('Dica de bolso'), { target: { value: 'Antes de masculino, nada de crase.' } });
    await usuario.click(screen.getByLabelText(/Revisei esta questão/));
    expect(screen.getByText('Pronta para publicar')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      const put = chamadas.find((c) => c.metodo === 'PUT');
      expect(put?.corpo).toMatchObject({
        status: 'publicada',
        revisada: true,
        dica: 'Troque por "ao": se couber, tem crase.',
        gabarito: 'C',
      });
    });
    expect(await screen.findByText(/Questão salva \(versão 4\)/)).toBeInTheDocument();
  });

  it('valida campos obrigatórios em português ao criar', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({ 'GET /admin/disciplinas': DISCIPLINAS, 'GET /admin/assuntos': ASSUNTOS });
    renderizarAdmin('/super/conteudo/questoes/nova');
    await usuario.click(await screen.findByRole('button', { name: 'Criar questão' }));
    expect(await screen.findByText('Escolha a disciplina.')).toBeInTheDocument();
    expect(screen.getByText('Informe o enunciado.')).toBeInTheDocument();
    expect(screen.getByText('Marque o gabarito.')).toBeInTheDocument();
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false);
  });
});

describe('Pré-visualização no formato da tela de Pergunta', () => {
  it('mostra chip de origem, balão e alternativas, e a correção ao verificar', async () => {
    const usuario = userEvent.setup();
    simularFetch(rotas(questao({ explicacao: 'Chegar **a** + **a** prefeitura.' })));
    renderizarAdmin(`/super/conteudo/questoes/${IDS.q1}`);
    const previa = await screen.findByRole('region', { name: 'Pré-visualização da tela de Pergunta' });

    expect(within(previa).getByTestId('chip-origem')).toHaveTextContent('Questão Fuse Aprova');
    const balao = within(previa).getByTestId('balao-enunciado');
    expect(within(balao).getByText('crase').tagName).toBe('STRONG');
    const alternativas = within(previa).getAllByRole('radio');
    expect(alternativas).toHaveLength(5);

    const verificar = within(previa).getByRole('button', { name: 'VERIFICAR' });
    expect(verificar).toBeDisabled();
    await usuario.click(within(previa).getByRole('radio', { name: /Entregue à ela/ }));
    expect(verificar).toBeEnabled();
    await usuario.click(verificar);
    const folha = within(previa).getByTestId('folha-feedback');
    expect(folha).toHaveTextContent('C');
    expect(folha).toHaveTextContent('Chegar a + a prefeitura.');

    // A prévia acompanha a edição.
    fireEvent.change(screen.getByLabelText('Enunciado'), { target: { value: 'Novo enunciado da questão' } });
    expect(within(previa).getByTestId('balao-enunciado')).toHaveTextContent('Novo enunciado da questão');
  });

  it('usa o chip de prova anterior para questão real', async () => {
    const usuario = userEvent.setup();
    const prova = {
      id: IDS.concurso,
      banca: 'FAU-Unicentro',
      nome: 'Concurso 2023',
      tipo: null,
      orgao: 'Prefeitura de Pitanga',
      municipio: 'Pitanga',
      uf: 'PR',
      ano: 2023,
      dataProva: null,
      cargo: 'Agente Administrativo',
      nivel: null,
      urlPagina: null,
      urlCaderno: null,
      urlGabarito: null,
      urlRecursos: null,
      hashPdf: null,
      slugFau: null,
      relevanciaPalmital: true,
      status: 'ativa',
      totalQuestoes: 40,
      criadoEm: '2026-10-01T10:00:00.000-03:00',
    };
    simularFetch({
      ...rotas(questao({ origem: 'fau_real', provaOrigemId: IDS.concurso, numeroOrigem: 7 })),
      [`GET /admin/provas/${IDS.concurso}`]: prova,
      'GET /admin/provas': { itens: [prova], total: 1, pagina: 1, porPagina: 30 },
    });
    renderizarAdmin(`/super/conteudo/questoes/${IDS.q1}`);
    const previa = await screen.findByRole('region', { name: 'Pré-visualização da tela de Pergunta' });
    await waitFor(() =>
      expect(within(previa).getByTestId('chip-origem')).toHaveTextContent('Prova anterior · 2023'),
    );
    void usuario;
  });
});
