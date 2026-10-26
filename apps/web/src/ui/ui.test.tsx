import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Letra } from '@fuse/shared';
import { violacoesSerias } from '../test/axe';
import {
  BannerUnidade,
  BarraProgresso,
  Botao3D,
  Campo,
  Capi,
  CartaoEstatistica,
  Chip,
  Confirmacao,
  FolhaFeedback,
  GrupoAlternativas,
  letraDaTecla,
  Modal,
  NavInferior,
  NoTrilha,
  ProvedorToast,
  useToast,
} from './index';

const ALTS = (['A', 'B', 'C', 'D', 'E'] as Letra[]).map((letra) => ({
  letra,
  texto: `Texto ${letra}`,
}));

function Licao({ onVerificar }: { onVerificar: (l: Letra | null) => void }) {
  const [sel, setSel] = useState<Letra | null>(null);
  return (
    <div>
      <GrupoAlternativas
        alternativas={ALTS}
        selecionada={sel}
        onSelecionar={setSel}
        onConfirmar={() => onVerificar(sel)}
        atalhosGlobais
      />
      <Botao3D disabled={!sel} onClick={() => onVerificar(sel)}>
        VERIFICAR
      </Botao3D>
    </div>
  );
}

describe('Botao3D', () => {
  it('fica desabilitado e mostra carregando com aria-busy', () => {
    const { rerender } = render(<Botao3D disabled>VERIFICAR</Botao3D>);
    expect(screen.getByRole('button', { name: 'VERIFICAR' })).toBeDisabled();
    rerender(<Botao3D carregando>VERIFICAR</Botao3D>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
  it('chama onClick', async () => {
    const fn = vi.fn();
    render(<Botao3D onClick={fn}>OK</Botao3D>);
    await userEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('Alternativa / GrupoAlternativas', () => {
  it('mostra o termo em destaque (**termo**) em negrito, sem asteriscos, e o rótulo fica limpo', () => {
    const alts = ALTS.map((x) =>
      x.letra === 'A' ? { ...x, texto: 'O **menino** correu *rápido*.' } : x,
    );
    render(
      <GrupoAlternativas alternativas={alts} selecionada={null} onSelecionar={() => undefined} />,
    );
    const a = screen.getAllByRole('radio')[0]!;
    expect(a.textContent).toContain('O menino correu rápido.');
    expect(a.textContent).not.toContain('*');
    expect(a.querySelector('strong')?.textContent).toBe('menino');
    expect(a.querySelector('em')?.textContent).toBe('rápido');
    expect(a).toHaveAccessibleName('A) O menino correu rápido.');
  });

  it('mapeia teclas 1–5 e A–E', () => {
    expect(letraDaTecla('1')).toBe('A');
    expect(letraDaTecla('5')).toBe('E');
    expect(letraDaTecla('c')).toBe('C');
    expect(letraDaTecla('6')).toBeNull();
    expect(letraDaTecla('x')).toBeNull();
  });

  it('é um radiogroup; teclas selecionam e Enter verifica; VERIFICAR habilita após seleção', async () => {
    const verificar = vi.fn();
    render(<Licao onVerificar={verificar} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'VERIFICAR' })).toBeDisabled();
    await userEvent.keyboard('3');
    expect(screen.getByRole('radio', { name: /^C\)/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('e');
    expect(screen.getByRole('radio', { name: /^E\)/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^C\)/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'VERIFICAR' })).toBeEnabled();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(verificar).toHaveBeenCalledWith('E');
  });

  it('setas movem a seleção; clique seleciona', async () => {
    render(<Licao onVerificar={() => undefined} />);
    await userEvent.click(screen.getByRole('radio', { name: /^B\)/ }));
    expect(screen.getByRole('radio', { name: /^B\)/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(screen.getByRole('radio', { name: /^B\)/ }), { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: /^C\)/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('depois da correção marca certa, errada e trava a seleção', () => {
    const sel = vi.fn();
    render(
      <GrupoAlternativas
        alternativas={ALTS}
        selecionada="A"
        correcao={{ gabarito: 'C', marcada: 'A' }}
        onSelecionar={sel}
      />,
    );
    expect(screen.getByRole('radio', { name: /^A\).*errada/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /^C\).*esta era a correta/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^D\)/ }));
    expect(sel).not.toHaveBeenCalled();
  });

  it('não tem violações sérias de acessibilidade', async () => {
    const { container } = render(<Licao onVerificar={() => undefined} />);
    expect(await violacoesSerias(container)).toEqual([]);
  });
});

describe('FolhaFeedback', () => {
  it('anuncia o acerto com +XP e COMBO, e o erro com dica de bolso e linha de revisão', async () => {
    const cont = vi.fn();
    const { rerender, container } = render(
      <FolhaFeedback
        tipo="acerto"
        titulo="Mandou bem!"
        xp={10}
        combo={3}
        explicacao="Porque sim."
        textoBotao="CONTINUAR"
        onContinuar={cont}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Mandou bem!');
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(screen.getByText('COMBO × 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    expect(cont).toHaveBeenCalled();
    expect(await violacoesSerias(container)).toEqual([]);
    rerender(
      <FolhaFeedback
        tipo="erro"
        titulo="Resposta correta: C"
        explicacao="Explicação."
        dicaBolso="Troque por masculino."
        linhaRevisao="Essa questão volta na sua revisão amanhã"
        textoBotao="ENTENDI"
        onContinuar={cont}
      />,
    );
    expect(screen.getByText('Resposta correta: C')).toBeInTheDocument();
    expect(screen.getByText('Dica de bolso')).toBeInTheDocument();
    expect(screen.getByText('Essa questão volta na sua revisão amanhã')).toBeInTheDocument();
  });

  it('explicação e dica de bolso ficam recolhidas, o botão continua à vista e a escolha é lembrada', async () => {
    localStorage.removeItem('fa:folha-detalhe-aberto');
    const cont = vi.fn();
    const props = {
      tipo: 'erro' as const,
      titulo: 'Resposta correta: C',
      explicacao: 'Explicação longa.',
      dicaBolso: 'Troque por masculino.',
      textoBotao: 'ENTENDI',
      onContinuar: cont,
    };
    const { unmount } = render(<FolhaFeedback {...props} />);
    const alternar = screen.getByRole('button', { name: /Ver explicação e dica de bolso/ });
    expect(alternar).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Explicação longa.')).not.toBeVisible();
    expect(screen.getByText('Troque por masculino.')).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'ENTENDI' })).toBeVisible();

    await userEvent.click(alternar);
    expect(screen.getByRole('button', { name: 'Ocultar explicação' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Explicação longa.')).toBeVisible();
    expect(screen.getByText('Troque por masculino.')).toBeVisible();

    unmount();
    render(<FolhaFeedback {...props} />);
    expect(screen.getByText('Explicação longa.')).toBeVisible();
    localStorage.removeItem('fa:folha-detalhe-aberto');
  });
});

describe('BarraProgresso, Chip, CartaoEstatistica, Capi', () => {
  it('progressbar com aria-valuenow em %', () => {
    render(<BarraProgresso valor={0.4} rotulo="Progresso" />);
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
  });
  it('renderiza chip, cartão e Capi com balão', async () => {
    const { container } = render(
      <div>
        <Chip variante="laranja">COMBO × 3</Chip>
        <CartaoEstatistica icone="icone-xp" valor="45 XP" legenda="XP TOTAL" />
        <Capi pose="explicando" fala="Faltam 2 lições para o baú!" />
        <Capi pose="celebrando" descrever />
      </div>,
    );
    expect(screen.getByText('45 XP')).toBeInTheDocument();
    expect(screen.getByText('Faltam 2 lições para o baú!')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Capi comemorando' })).toBeInTheDocument();
    expect(await violacoesSerias(container)).toEqual([]);
  });
});

describe('Campo', () => {
  function CampoCpf() {
    const [v, setV] = useState('');
    return (
      <Campo
        rotulo="CPF"
        valor={v}
        onValor={setV}
        mascara="cpf"
        erro={v.length > 3 && v.length < 14 ? 'Esse CPF não é válido.' : null}
      />
    );
  }
  it('aplica máscara de CPF e liga o erro ao campo', async () => {
    render(<CampoCpf />);
    const campo = screen.getByLabelText('CPF');
    await userEvent.type(campo, '5299822');
    expect(campo).toHaveValue('529.982.2');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Esse CPF não é válido.');
    await userEvent.type(campo, '4725');
    expect(campo).toHaveValue('529.982.247-25');
    expect(campo).not.toHaveAttribute('aria-invalid');
  });
  it('aplica máscara de celular e alterna a senha', async () => {
    function Dois() {
      const [c, setC] = useState('');
      const [s, setS] = useState('');
      return (
        <>
          <Campo rotulo="Celular" valor={c} onValor={setC} mascara="celular" />
          <Campo rotulo="Senha" valor={s} onValor={setS} senha />
        </>
      );
    }
    const { container } = render(<Dois />);
    await userEvent.type(screen.getByLabelText('Celular'), '42998765432');
    expect(screen.getByLabelText('Celular')).toHaveValue('(42) 99876-5432');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(await violacoesSerias(container)).toEqual([]);
  });
});

describe('Modal e Confirmacao', () => {
  it('Esc fecha; foco vai para dentro', async () => {
    const fechar = vi.fn();
    render(
      <Modal aberto titulo="Título" onFechar={fechar}>
        <button type="button">Dentro</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fechar).toHaveBeenCalled();
  });
  it('confirmação de sair com CONTINUAR ESTUDANDO e SAIR', async () => {
    const sair = vi.fn();
    const ficar = vi.fn();
    render(
      <Confirmacao
        aberto
        titulo="Quer mesmo sair?"
        texto="Você perde o progresso desta lição."
        textoCancelar="CONTINUAR ESTUDANDO"
        textoConfirmar="SAIR"
        onCancelar={ficar}
        onConfirmar={sair}
      />,
    );
    expect(screen.getByRole('button', { name: 'CONTINUAR ESTUDANDO' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'SAIR' }));
    expect(sair).toHaveBeenCalled();
    expect(await violacoesSerias(document.body)).toEqual([]);
  });
});

describe('NavInferior, NoTrilha e BannerUnidade', () => {
  it('mostra as 5 abas e o selo de revisões', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/revisar']}>
        <NavInferior revisoesPendentes={12} />
      </MemoryRouter>,
    );
    for (const n of ['Início', 'Revisar', 'Simulados', 'Liga', 'Perfil'])
      expect(screen.getByRole('link', { name: new RegExp(n) })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(await violacoesSerias(container)).toEqual([]);
  });
  it('nó bloqueado não abre; atual abre e mostra o balão', async () => {
    const abrir = vi.fn();
    const { container } = render(
      <div>
        <NoTrilha
          tipo="normal"
          estado="bloqueada"
          titulo="Crase 3"
          podeAbrir={false}
          onAbrir={abrir}
        />
        <NoTrilha
          tipo="normal"
          estado="atual"
          titulo="Crase 2"
          podeAbrir
          anel={0.33}
          balao="COMEÇAR"
          onAbrir={abrir}
        />
        <NoTrilha tipo="bau" estado="bloqueada" titulo="Baú" podeAbrir={false} />
        <NoTrilha tipo="desafio" estado="concluida" titulo="Desafio" podeAbrir />
        <BannerUnidade unidade={1} secao={2} titulo="Português" onGuia={abrir} />
      </div>,
    );
    expect(screen.getByRole('button', { name: /Crase 3. Lição, bloqueada/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Crase 2. Lição, disponível/ }));
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(screen.getByText('COMEÇAR')).toBeInTheDocument();
    expect(screen.getByText(/UNIDADE 1 · SEÇÃO 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o guia da unidade' }));
    expect(abrir).toHaveBeenCalledTimes(2);
    expect(await violacoesSerias(container)).toEqual([]);
  });
});

describe('Toast', () => {
  it('mostra "Código copiado" num status e some', async () => {
    vi.useFakeTimers();
    function Botao() {
      const t = useToast();
      return (
        <button type="button" onClick={() => t('Código copiado', 'sucesso')}>
          copiar
        </button>
      );
    }
    render(
      <ProvedorToast duracaoMs={1000}>
        <Botao />
      </ProvedorToast>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toHaveTextContent('Código copiado');
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('Código copiado')).toBeNull();
    vi.useRealTimers();
  });
});
