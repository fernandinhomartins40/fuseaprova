import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ASSUNTOS, DISCIPLINAS, IDS, renderizarAdmin, resumoQuestao, simularFetch } from './ajuda';

function lista(itens = [resumoQuestao(IDS.q1, 'Assinale a crase correta'), resumoQuestao(IDS.q2, 'Sobre a regência verbal'), resumoQuestao(IDS.q3, 'Pronomes oblíquos')]) {
  return { itens, total: itens.length, pagina: 1, porPagina: 25 };
}

describe('Questões: filtros e lote', () => {
  it('manda os filtros escolhidos para a API', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/questoes': () => lista(),
    });
    renderizarAdmin('/admin/questoes');
    expect(await screen.findByText('Assinale a crase correta')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Status'), 'rascunho');
    await usuario.selectOptions(screen.getByLabelText('Origem'), 'autoral');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Língua Portuguesa' })).toBeInTheDocument());
    await usuario.selectOptions(screen.getByLabelText('Disciplina'), 'portugues');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Crase' })).toBeInTheDocument());
    await usuario.selectOptions(screen.getByLabelText('Assunto'), IDS.crase);
    await usuario.selectOptions(screen.getByLabelText('Área'), 'administrativo');

    await waitFor(() => {
      const ultima = chamadas.filter((c) => c.caminho === '/admin/questoes').at(-1);
      expect(ultima?.query.get('status')).toBe('rascunho');
      expect(ultima?.query.get('origem')).toBe('autoral');
      expect(ultima?.query.get('disciplina')).toBe('portugues');
      expect(ultima?.query.get('assuntoId')).toBe(IDS.crase);
      expect(ultima?.query.get('area')).toBe('administrativo');
      expect(ultima?.query.get('pagina')).toBe('1');
    });
  });

  it('publica em lote as selecionadas e mostra as ignoradas', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/questoes': () => lista(),
      'POST /admin/questoes/lote': () => ({
        atualizadas: 1,
        ignoradas: [{ id: IDS.q2, motivo: 'Falta a explicação.' }],
      }),
    });
    renderizarAdmin('/admin/questoes');
    await screen.findByText('Assinale a crase correta');

    await usuario.click(screen.getByLabelText(/Selecionar questão Assinale/));
    await usuario.click(screen.getByLabelText(/Selecionar questão Sobre a regência/));
    const barra = screen.getByRole('toolbar', { name: 'Ações em lote' });
    expect(barra).toHaveTextContent('2 selecionadas');

    await usuario.click(within(barra).getByRole('button', { name: 'Publicar' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      const lote = chamadas.find((c) => c.caminho === '/admin/questoes/lote');
      expect(lote?.metodo).toBe('POST');
      expect(lote?.corpo).toEqual({ ids: [IDS.q1, IDS.q2], acao: 'publicar' });
    });
    expect(await screen.findByText(/1 questão atualizada/)).toBeInTheDocument();
    expect(screen.getByText(/Falta a explicação/)).toBeInTheDocument();
  });

  it('retirar em lote exige motivo', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/questoes': () => lista(),
      'POST /admin/questoes/lote': () => ({ atualizadas: 3, ignoradas: [] }),
    });
    renderizarAdmin('/admin/questoes');
    await screen.findByText('Assinale a crase correta');
    await usuario.click(screen.getByLabelText('Selecionar todas desta página'));
    await usuario.click(screen.getByRole('button', { name: 'Retirar' }));
    const dialogo = await screen.findByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar' });
    expect(confirmar).toBeDisabled();
    await usuario.type(within(dialogo).getByLabelText('Motivo'), 'Pedido da banca');
    expect(confirmar).toBeEnabled();
    await usuario.click(confirmar);
    await waitFor(() => {
      const lote = chamadas.find((c) => c.caminho === '/admin/questoes/lote');
      expect(lote?.corpo).toEqual({ ids: [IDS.q1, IDS.q2, IDS.q3], acao: 'retirar', motivo: 'Pedido da banca' });
    });
  });

  it('mostra o erro da API no estado de erro', async () => {
    simularFetch({
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/questoes': { status: 403, corpo: { erro: 'Você não tem permissão para isso.', codigo: 'proibido' } },
    });
    renderizarAdmin('/admin/questoes');
    expect(await screen.findByText('Você não tem permissão para isso.')).toBeInTheDocument();
  });

  it('mostra o estado vazio', async () => {
    simularFetch({
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/questoes': () => lista([]),
    });
    renderizarAdmin('/admin/questoes');
    expect(await screen.findByText('Nenhuma questão com esses filtros.')).toBeInTheDocument();
  });
});
