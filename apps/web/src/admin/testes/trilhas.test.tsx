import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ASSUNTOS, DISCIPLINAS, IDS, renderizarAdmin, simularFetch } from './ajuda';

const UNIDADE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const SECAO = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const L = ['dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3'];

const concurso = {
  id: IDS.concurso,
  nome: 'Prefeitura de Palmital 2026',
  slug: 'palmital-2026',
  banca: 'FAU-Unicentro',
  orgao: 'Prefeitura de Palmital',
  municipio: 'Palmital',
  uf: 'PR',
  ano: 2026,
  status: 'aguardando_edital',
  dataProva: null,
  links: [],
  ativo: true,
  versaoConteudo: 1,
  editalPublicadoEm: null,
  criadoEm: '2026-10-01T10:00:00.000-03:00',
};

const licao = (id: string, ordem: number, titulo: string, tipo = 'normal') => ({
  id,
  secaoId: SECAO,
  ordem,
  tipo,
  tamanho: 5,
  titulo,
  dicaTitulo: null,
  dicaTexto: null,
  dicaExemplo: null,
});

const trilha = {
  unidades: [
    {
      id: UNIDADE,
      concursoId: IDS.concurso,
      area: null,
      ordem: 0,
      titulo: 'Português',
      disciplinaId: IDS.portugues,
      secoes: [
        {
          id: SECAO,
          unidadeId: UNIDADE,
          ordem: 0,
          titulo: 'Crase',
          assuntoId: IDS.crase,
          noEdital: null,
          licoes: [licao(L[0]!, 0, 'Primeira'), licao(L[1]!, 1, 'Segunda'), licao(L[2]!, 2, 'Baú', 'bau')],
        },
      ],
    },
  ],
};

describe('Trilhas: reordenação por teclado', () => {
  it('desce uma lição com o botão e envia a nova ordem', async () => {
    const usuario = userEvent.setup();
    const { chamadas } = simularFetch({
      'GET /admin/concursos': { itens: [concurso] },
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/trilhas': trilha,
      'PUT /admin/trilhas/ordem': { ok: true },
    });
    renderizarAdmin('/super/conteudo/trilhas');
    const lista = await screen.findByRole('list', { name: 'Lições de Crase' });
    expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent('Primeira');

    const descer = within(lista).getByRole('button', { name: 'Descer lição 1 Primeira' });
    descer.focus();
    await usuario.keyboard('{Enter}');

    await waitFor(() => {
      const put = chamadas.find((c) => c.metodo === 'PUT' && c.caminho === '/admin/trilhas/ordem');
      expect(put?.corpo).toEqual({ nivel: 'licoes', paiId: SECAO, ids: [L[1], L[0], L[2]] });
    });
    // Otimista: a ordem muda na hora e o foco continua no item movido.
    const itens = within(screen.getByRole('list', { name: 'Lições de Crase' })).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Segunda');
    expect(itens[1]).toHaveTextContent('Primeira');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Descer lição/);
    expect(screen.getByText(/movida para a posição 2 de 3/)).toBeInTheDocument();
  });

  it('o primeiro item não sobe e o último não desce', async () => {
    simularFetch({
      'GET /admin/concursos': { itens: [concurso] },
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/trilhas': trilha,
    });
    renderizarAdmin('/super/conteudo/trilhas');
    const lista = await screen.findByRole('list', { name: 'Lições de Crase' });
    expect(within(lista).getByRole('button', { name: 'Subir lição 1 Primeira' })).toBeDisabled();
    expect(within(lista).getByRole('button', { name: 'Descer lição 3 Baú' })).toBeDisabled();
  });

  it('desfaz a ordem e mostra o erro se a API recusar', async () => {
    const usuario = userEvent.setup();
    simularFetch({
      'GET /admin/concursos': { itens: [concurso] },
      'GET /admin/disciplinas': DISCIPLINAS,
      'GET /admin/assuntos': ASSUNTOS,
      'GET /admin/trilhas': trilha,
      'PUT /admin/trilhas/ordem': { status: 409, corpo: { erro: 'Essa ação não pode ser feita agora.', codigo: 'conflito' } },
    });
    renderizarAdmin('/super/conteudo/trilhas');
    const lista = await screen.findByRole('list', { name: 'Lições de Crase' });
    await usuario.click(within(lista).getByRole('button', { name: 'Subir lição 3 Baú' }));
    expect(await screen.findByText('Essa ação não pode ser feita agora.')).toBeInTheDocument();
    const itens = within(screen.getByRole('list', { name: 'Lições de Crase' })).getAllByRole('listitem');
    expect(itens[2]).toHaveTextContent('Baú');
  });
});
