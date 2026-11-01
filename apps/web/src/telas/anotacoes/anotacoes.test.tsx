import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ligarApiSimulada } from '../../test/apiSimulada';
import { EditorAnotacao } from './EditorAnotacao';

/** D28: a anotação é salva sozinha, inclusive quando o aluno sai logo depois de digitar. */
describe('EditorAnotacao', () => {
  async function questaoDaLicao() {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    const trilha = await (await fetch('/api/trilha')).json();
    const ini = await (
      await fetch(`/api/licoes/${trilha.atual.licaoId}/iniciar`, { method: 'POST' })
    ).json();
    return ini.questoes[0].id as string;
  }

  async function anotacoesSalvas() {
    return (await (await fetch('/api/anotacoes')).json()).anotacoes as { texto: string }[];
  }

  it('grava sozinha ao sair, sem esperar nem tocar em botão (ex.: CONTINUAR)', async () => {
    const qid = await questaoDaLicao();
    const { unmount } = render(<EditorAnotacao questaoId={qid} inicial={null} />);
    await userEvent.type(screen.getByLabelText(/Minha anotação/), 'Revisar a regra');
    unmount();
    await waitFor(async () =>
      expect((await anotacoesSalvas()).map((a) => a.texto)).toContain('Revisar a regra'),
    );
  });

  it('grava sozinha depois de parar de digitar e avisa onde ver', async () => {
    const qid = await questaoDaLicao();
    render(<EditorAnotacao questaoId={qid} inicial={null} />);
    await userEvent.type(screen.getByLabelText(/Minha anotação/), 'Crase antes de feminino');
    expect(
      await screen.findByText(
        /Minhas anotações/,
        { selector: 'p[role="status"]' },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect((await anotacoesSalvas()).map((a) => a.texto)).toContain('Crase antes de feminino');
  });
});
