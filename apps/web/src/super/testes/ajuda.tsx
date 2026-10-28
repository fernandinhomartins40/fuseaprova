/**
 * Utilitários dos testes do /super: largura da tela simulada (matchMedia) e renderização
 * em /super/* com fetch simulado por rota (o mesmo simulador do admin).
 */
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import { criarClienteAdmin } from '../../admin/rotas';
import SuperRotas from '../rotas';

export { simularFetch } from '../../admin/testes/ajuda';

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
  try {
    window.localStorage.clear();
  } catch {
    /* sem armazenamento */
  }
});

/** Simula a largura da janela: as consultas `(min-width: Npx)` respondem de acordo. */
export function definirLargura(largura: number): void {
  window.matchMedia = ((query: string) => {
    const m = /min-width:\s*(\d+)px/.exec(query);
    return {
      matches: m ? largura >= Number(m[1]) : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

export function renderizarSuper(caminho: string, largura = 1280) {
  definirLargura(largura);
  const cliente = criarClienteAdmin();
  cliente.setDefaultOptions({ queries: { retry: false, staleTime: 0 }, mutations: { retry: false } });
  return render(
    <MemoryRouter initialEntries={[caminho]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/super/*" element={<SuperRotas cliente={cliente} />} />
        <Route path="/entrar" element={<p>Tela de entrar</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ------------------------------------------------------------ fixtures */

export const IDS = {
  usuario: '55555555-5555-4555-8555-555555555555',
  pedido: '66666666-6666-4666-8666-666666666666',
  sup: '77777777-7777-4777-8777-777777777777',
};

export const BASE = {
  'GET /me': { nome: 'Dono Superadmin', papel: 'superadmin' },
  'GET /super/2fa': { configurado: true, verificadoNestaSessao: true, ativadoEm: '2026-10-01T10:00:00.000Z', codigosRecuperacaoRestantes: 10 },
};

export function pagamento(extra: Record<string, unknown> = {}) {
  return {
    id: IDS.pedido,
    usuario: { id: IDS.usuario, nome: 'Joana Pereira Dias', email: 'joana@teste.com', cpfOculto: '***.456.789-**', acesso: false },
    metodo: 'asaas',
    status: 'pendente',
    valorCentavos: 39700,
    valorLiquidoCentavos: null,
    asaasPaymentId: 'pay_123',
    asaasCustomerId: 'cus_1',
    criadoEm: '2026-10-20T12:00:00.000Z',
    pagoEm: null,
    pixExpiraEm: '2026-10-21T12:00:00.000Z',
    canceladoEm: null,
    reembolsoSolicitadoEm: null,
    estornadoEm: null,
    conciliadoEm: null,
    dentroDoArrependimento: false,
    manual: null,
    concurso: { id: '88888888-8888-4888-8888-888888888888', nome: 'Concurso de Palmital 2026' },
    concursoLiberado: false,
    cupomCodigo: null,
    valorOriginalCentavos: null,
    descontoCentavos: 0,
    ...extra,
  };
}

export function ficha(extra: Record<string, unknown> = {}) {
  return {
    usuario: {
      id: IDS.usuario,
      nome: 'Joana Pereira Dias',
      email: 'joana@teste.com',
      cpfOculto: '***.456.789-**',
      celularOculto: '(42) *****-5432',
      papel: 'aluno',
      acesso: false,
      pago: false,
      bloqueado: false,
      doisFatores: false,
      marketing: true,
      xpTotal: 120,
      ofensiva: 3,
      ultimaAtividadeEm: null,
      criadoEm: '2026-10-20T12:00:00.000Z',
      excluidoEm: null,
      celular: '42998765432',
      bloqueadoEm: null,
      bloqueioMotivo: null,
      doisFatoresAtivadoEm: null,
      cargo: 'Agente Administrativo',
      area: 'administrativo',
      notificacoes: true,
      lembreteHora: '19:00',
      aceiteTermosEm: '2026-10-20T12:00:00.000Z',
      versaoTermos: '1',
      ...extra,
    },
    progresso: {
      xpTotal: 120,
      gemas: 30,
      vidas: 5,
      ofensiva: 3,
      ofensivaRecorde: 4,
      divisao: 'bronze',
      ultimoDiaEstudo: '2026-10-20',
      licoesConcluidas: 2,
      questoesFeitas: 20,
      precisao: 70,
      sessoesEstudo: 2,
      simuladosEntregues: 0,
      revisoesPendentes: 1,
      dominio: [],
    },
    pedidos: [],
    concursos: [
      { id: '88888888-8888-4888-8888-888888888888', nome: 'Concurso de Palmital 2026', acesso: false, acessoEm: null, ativo: true, cargo: 'Agente Administrativo', pedidoPagoId: null },
    ],
    sessoes: [],
    push: [],
    auditoria: [],
  };
}
