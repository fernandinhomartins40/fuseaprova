/**
 * Utilitários dos testes da seção Conteúdo: fetch simulado por rota e renderização em
 * /super/conteudo/* (D24: o painel único, com o papel admin, sem buscar o /me).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, vi } from 'vitest';
import SuperRotas from '../../super/rotas';
import { criarClienteAdmin } from '../rotas';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

export interface Chamada {
  metodo: string;
  caminho: string;
  query: URLSearchParams;
  corpo: unknown;
  /** Cabeçalhos da requisição, em minúsculas. */
  cabecalhos: Record<string, string>;
}

type Resposta = { status?: number; corpo?: unknown } | unknown;
type Manipulador = (c: Chamada) => Resposta;

/**
 * `rotas`: { 'GET /admin/painel': (c) => corpo | { status, corpo } }.
 * Caminhos sem o prefixo /api; ":id" casa com qualquer segmento.
 */
export function simularFetch(rotas: Record<string, Manipulador | unknown>) {
  const chamadas: Chamada[] = [];
  const fn = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), 'http://localhost');
    const metodo = (init?.method ?? 'GET').toUpperCase();
    const caminho = url.pathname.replace(/^\/api/, '');
    let corpo: unknown = undefined;
    if (typeof init?.body === 'string') corpo = JSON.parse(init.body);
    const cabecalhos = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const chamada = { metodo, caminho, query: url.searchParams, corpo, cabecalhos };
    chamadas.push(chamada);
    const chave = Object.keys(rotas).find((k) => {
      const [m, p] = k.split(' ');
      if (m !== metodo || !p) return false;
      const re = new RegExp(`^${p.replace(/:[a-zA-Z]+/g, '[^/]+')}$`);
      return re.test(caminho);
    });
    if (!chave) {
      return new Response(JSON.stringify({ erro: `Rota não simulada: ${metodo} ${caminho}` }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    const def = rotas[chave];
    const r = typeof def === 'function' ? (def as Manipulador)(chamada) : def;
    const comStatus =
      r && typeof r === 'object' && 'status' in r && 'corpo' in r
        ? (r as { status: number; corpo: unknown })
        : { status: 200, corpo: r };
    return new Response(comStatus.corpo === undefined ? null : JSON.stringify(comStatus.corpo), {
      status: comStatus.status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { chamadas, fn };
}

export function renderizarAdmin(caminho: string) {
  const cliente = criarClienteAdmin();
  cliente.setDefaultOptions({ queries: { retry: false, staleTime: 0 }, mutations: { retry: false } });
  return render(
    <MemoryRouter initialEntries={[caminho]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/super/*" element={<SuperRotas cliente={cliente} papel="admin" />} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ------------------------------------------------------------ fixtures */

export const IDS = {
  portugues: '11111111-1111-4111-8111-111111111111',
  administrativo: '22222222-2222-4222-8222-222222222222',
  crase: '33333333-3333-4333-8333-333333333333',
  q1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  q2: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  q3: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  concurso: '44444444-4444-4444-8444-444444444444',
  usuario: '55555555-5555-4555-8555-555555555555',
  pedido: '66666666-6666-4666-8666-666666666666',
  admin: '77777777-7777-4777-8777-777777777777',
};

export const DISCIPLINAS = {
  itens: [
    { id: IDS.portugues, slug: 'portugues', nome: 'Língua Portuguesa', cor: '#1D6FE0' },
    { id: IDS.administrativo, slug: 'especificos', nome: 'Conhecimentos Específicos', cor: '#6D3FE0' },
  ],
};

export const ASSUNTOS = {
  itens: [
    {
      id: IDS.crase,
      disciplinaId: IDS.portugues,
      nome: 'Crase',
      slug: 'crase',
      dicaTitulo: null,
      dicaTexto: null,
      dicaExemplo: null,
      totalQuestoes: 10,
      publicadas: 2,
    },
  ],
};

export function resumoQuestao(id: string, trecho: string, status = 'rascunho') {
  return {
    id,
    status,
    origem: 'autoral',
    disciplina: DISCIPLINAS.itens[0],
    assunto: { id: IDS.crase, nome: 'Crase' },
    areas: [],
    dificuldade: 2,
    trecho,
    provaOrigem: null,
    numeroOrigem: null,
    reportsAbertos: 0,
    versao: 1,
    atualizadoEm: '2026-10-20T12:00:00.000-03:00',
  };
}
