/**
 * Liga o `fetch` dos testes à API simulada (mock/servidor.ts), com um "pote" de cookies,
 * para testar telas inteiras contra os contratos de @fuse/shared sem a API real.
 */
import { vi } from 'vitest';
import { tratar } from '../../mock/servidor';

export function ligarApiSimulada() {
  let cookie = '';
  const fn = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const corpo = typeof init?.body === 'string' ? new TextEncoder().encode(init.body) : null;
    const req = {
      url: url.replace(/^https?:\/\/[^/]+/, ''),
      method: init?.method ?? 'GET',
      headers: { cookie },
      async *[Symbol.asyncIterator]() {
        if (corpo) yield corpo;
      },
    };
    let status = 200;
    let texto = '';
    const res = {
      set statusCode(v: number) {
        status = v;
      },
      get statusCode() {
        return status;
      },
      setHeader(nome: string, valor: string | string[]) {
        if (nome.toLowerCase() === 'set-cookie') {
          const v = String(valor).split(';')[0]!;
          cookie = v.endsWith('=') ? '' : v;
        }
      },
      end(c?: string) {
        texto = c ?? '';
      },
    };
    await tratar(req, res);
    return new Response(texto || null, { status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return {
    fn,
    async cenario(nome: string) {
      await fn(`/api/__mock/cenario?nome=${nome}`);
    },
  };
}
