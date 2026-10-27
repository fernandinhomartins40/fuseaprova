import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { criarQueryClient } from '../api/consultas';
import { Rotas } from '../app/App';
import { abrirDb } from '../offline/db';
import { limparTudo } from '../offline/fila';
import { ligarApiSimulada } from '../test/apiSimulada';
import { violacoesSerias } from '../test/axe';
import { ProvedorToast } from '../ui';

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

describe('telas do aluno contra a API simulada', () => {
  beforeEach(async () => {
    await abrirDb();
    await limparTudo();
  });

  it('cadastro valida com o schema compartilhado e mostra erros por campo', async () => {
    const api = ligarApiSimulada();
    await api.cenario('novo');
    const { container } = abrir('/cadastro');
    const botao = await screen.findByRole('button', { name: /Criar conta e ir para o pagamento/ });
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Marina');
    await userEvent.type(screen.getByLabelText('CPF'), '11111111111');
    await userEvent.click(botao);
    expect(await screen.findByText('Esse CPF não é válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe seu nome completo (nome e sobrenome).')).toBeInTheDocument();
    expect(
      screen.getByText('Você precisa aceitar os Termos de uso e a Política de privacidade.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos');
    expect(await violacoesSerias(container)).toEqual([]);
  });

  it('cadastro com senhas diferentes não envia e pede para repetir', async () => {
    const api = ligarApiSimulada();
    await api.cenario('novo');
    abrir('/cadastro');
    await userEvent.type(await screen.findByLabelText('Nome completo'), 'Marina Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'nova@email.com');
    await userEvent.type(screen.getByLabelText('Celular'), '42998765432');
    await userEvent.type(screen.getByLabelText('CPF'), '52998224725');
    await userEvent.type(screen.getByLabelText('Senha'), 'senhaforte');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
    expect(await screen.findByText('Repita a senha para confirmar.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'senhaforTe');
    expect(screen.getByText('As senhas ainda não coincidem.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(local).toBe('/cadastro');
  });

  it('cadastro com e-mail existente mostra o link para o login', async () => {
    const api = ligarApiSimulada();
    await api.cenario('novo');
    abrir('/cadastro');
    await userEvent.type(await screen.findByLabelText('Nome completo'), 'Marina Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'existe@email.com');
    await userEvent.type(screen.getByLabelText('Celular'), '42998765432');
    await userEvent.type(screen.getByLabelText('CPF'), '52998224725');
    await userEvent.type(screen.getByLabelText('Senha'), 'senhaforte');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'senhaforte');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));
    expect(
      await screen.findByText(/Já existe uma conta com este e-mail ou CPF/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Entrar' }).length).toBeGreaterThan(0);
  });

  it('conta sem pagamento é levada ao /pagamento e vê o Pix; pagar libera e vai ao onboarding', async () => {
    const api = ligarApiSimulada();
    await api.cenario('semAcesso');
    abrir('/aprender');
    await waitFor(() => expect(local).toBe('/pagamento'));
    // Com mais de um concurso aberto, o aluno escolhe antes de ver o Pix (D21).
    expect(await screen.findByText('Para qual concurso você vai estudar?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Prefeitura Municipal de Palmital/ }));
    expect(await screen.findByAltText(/QR Code do Pix/)).toBeInTheDocument();
    expect(screen.getByText('Pix copia e cola')).toBeInTheDocument();
    expect(screen.getByText(/Quando o edital de Palmital sair/)).toBeInTheDocument();
    expect(screen.getByText(/não tem vínculo com a FAU-Unicentro/)).toBeInTheDocument();
    await api.fn('/api/__mock/pagar', { method: 'POST' });
    expect(
      await screen.findByText('Pagamento confirmado!', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
  }, 10000);

  it('1ª compra: escolher outro concurso muda o Pix para esse concurso, a R$ 397', async () => {
    const api = ligarApiSimulada();
    await api.cenario('semAcesso');
    abrir('/pagamento');
    const opcao = await screen.findByRole('button', {
      name: /Prefeitura Municipal de Siqueira Campos/,
    });
    expect(opcao).toHaveTextContent('R$ 397,00');
    await userEvent.click(opcao);
    expect(await screen.findByAltText(/QR Code do Pix/)).toBeInTheDocument();
    expect(
      screen.getByText(/Acesso ao Prefeitura Municipal de Siqueira Campos-PR 2026/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('R$ 397').length).toBeGreaterThan(0);
  }, 10000);

  it('Meus concursos: adicionar um concurso custa R$ 197, e depois de pago dá para trocar entre eles', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    abrir('/meus-concursos');
    // o ativo e o outro concurso, já com o desconto de quem é aluno
    expect(await screen.findByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Outros concursos')).toBeInTheDocument();
    expect(screen.getByText('R$ 197,00')).toBeInTheDocument();
    expect(screen.getByText(/desconto por já ser aluno/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quero este concurso' }));
    const continuar = await screen.findByRole('button', { name: 'CONTINUAR PARA O PAGAMENTO' });
    expect(continuar).toBeDisabled();
    const cargo = await screen.findByRole('combobox', { name: 'Cargo' });
    await userEvent.selectOptions(cargo, within(cargo).getAllByRole('option')[1]!);
    await userEvent.click(continuar);
    // Pix do concurso adicional
    await waitFor(() => expect(local).toBe('/pagamento'));
    expect(await screen.findByAltText(/QR Code do Pix/)).toBeInTheDocument();
    expect(screen.getAllByText('R$ 197').length).toBeGreaterThan(0);
    await api.fn('/api/__mock/pagar', { method: 'POST' });
    expect(
      await screen.findByText('Pagamento confirmado!', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/O concurso foi liberado/)).toBeInTheDocument();
    // o concurso novo vira o ativo e a trilha abre
    await waitFor(() => expect(local).toBe('/aprender'), { timeout: 6000 });
    abrir('/meus-concursos');
    await userEvent.click(await screen.findByRole('button', { name: 'Estudar este concurso' }));
    await waitFor(() => expect(local).toBe('/aprender'), { timeout: 6000 });
  }, 20000);

  it('lição completa por teclado: dica, 5 questões, folhas, fim e ofensiva', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    const { container } = abrir('/aprender');
    await userEvent.click(
      await screen.findByRole('button', { name: /Continuar treino|Começar treino/ }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'ENTENDI, VAMOS LÁ' }));
    const verificar = await screen.findByRole('button', { name: 'VERIFICAR' });
    expect(verificar).toBeDisabled();
    expect(await violacoesSerias(container)).toEqual([]);
    let erros = 0;
    for (let i = 0; i < 5; i++) {
      await screen.findByText(`Questão ${i + 1} de 5`);
      await userEvent.keyboard('2');
      expect(screen.getByRole('button', { name: 'VERIFICAR' })).toBeEnabled();
      await userEvent.keyboard('{Enter}');
      const folha = await screen.findByRole('region', { name: 'Resultado da resposta' });
      expect(folha).toHaveTextContent(/\S/);
      if (screen.queryByRole('button', { name: 'ENTENDI' })) {
        erros += 1;
        expect(screen.getByText('Dica de bolso')).toBeInTheDocument();
        expect(screen.getByText('Essa questão volta na sua revisão amanhã')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'ENTENDI' }));
      } else {
        expect(screen.getByText('+10 XP')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
      }
    }
    expect(await screen.findByText('Lição concluída!')).toBeInTheDocument();
    expect(screen.getByText('XP TOTAL')).toBeInTheDocument();
    expect(screen.getByText('PRECISÃO')).toBeInTheDocument();
    if (erros > 0)
      expect(screen.getByRole('button', { name: `REVISAR ERROS (${erros})` })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    expect(await screen.findByText(/de/, { selector: 'h1' })).toHaveTextContent('ofensiva!');
  }, 20000);

  it('sair da lição pede confirmação', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    abrir('/aprender');
    await userEvent.click(
      await screen.findByRole('button', { name: /Continuar treino|Começar treino/ }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Sair da lição' }));
    expect(screen.getByRole('dialog', { name: 'Quer mesmo sair?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'SAIR' }));
    await waitFor(() => expect(local).toBe('/aprender'));
  });

  it('com 0 vidas a lição inicia normalmente: vidas não travam o treino', async () => {
    const api = ligarApiSimulada();
    await api.cenario('semVidas');
    abrir('/aprender');
    await userEvent.click(
      await screen.findByRole('button', { name: /Continuar treino|Começar treino/ }),
    );
    expect(
      await screen.findByRole('button', { name: /ENTENDI, VAMOS LÁ|VERIFICAR/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Suas vidas acabaram/)).not.toBeInTheDocument();
  });

  it('revisar, liga, perfil e simulado carregam sem violações sérias', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    for (const [rota, texto] of [
      ['/revisar', '12 questões para hoje'],
      ['/liga', 'Liga Bronze'],
      ['/perfil', 'Evolução por disciplina'],
      ['/simulado', 'COMEÇAR SIMULADO'],
    ] as const) {
      const { container, unmount } = abrir(rota);
      expect(await screen.findByText(texto)).toBeInTheDocument();
      expect(await violacoesSerias(container)).toEqual([]);
      unmount();
    }
  });

  it('modal "O edital saiu! Confirme seu cargo" aparece e some ao confirmar', async () => {
    const api = ligarApiSimulada();
    await api.cenario('edital');
    abrir('/aprender');
    expect(
      await screen.findByRole('dialog', { name: 'O edital saiu! Confirme seu cargo' }),
    ).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('radio', { name: /Agente Administrativo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'CONFIRMAR CARGO' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
