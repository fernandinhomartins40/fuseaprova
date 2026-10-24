import { describe, expect, it, vi } from 'vitest';
import { aoRedirecionar, chamar, ErroApi } from './cliente';

function respostaJson(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('cliente da API', () => {
  it('usa /api, cookie e devolve o JSON', async () => {
    const f = vi.fn(async () => respostaJson(200, { ok: true }));
    vi.stubGlobal('fetch', f);
    await chamar('authSair');
    expect(f).toHaveBeenCalledWith(
      '/api/auth/sair',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('monta parâmetros do caminho', async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => respostaJson(200, {}));
    vi.stubGlobal('fetch', f);
    await chamar('guia', { params: { unidadeId: 'abc' } });
    expect(f.mock.calls[0]![0]).toBe('/api/guia/abc');
  });

  it('valida o corpo com o schema compartilhado antes de enviar', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await expect(chamar('authLogin', { corpo: { email: 'x', senha: '' } })).rejects.toMatchObject({
      status: 400,
      codigo: 'validacao',
    });
    expect(f).not.toHaveBeenCalled();
  });

  it('401 redireciona para /entrar e 402 para /pagamento', async () => {
    const destinos: string[] = [];
    const parar = aoRedirecionar((d) => destinos.push(d));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respostaJson(401, {
          erro: 'Entre na sua conta para continuar.',
          codigo: 'nao_autenticado',
        }),
      ),
    );
    await expect(chamar('meObter')).rejects.toBeInstanceOf(ErroApi);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respostaJson(402, { erro: 'Pague.', codigo: 'sem_acesso' })),
    );
    await expect(chamar('trilha')).rejects.toMatchObject({ status: 402, message: 'Pague.' });
    parar();
    expect(destinos).toEqual(['/entrar', '/pagamento']);
  });

  it('401 de login (credenciais) não redireciona; semRedirecionar respeitado', async () => {
    const destinos: string[] = [];
    const parar = aoRedirecionar((d) => destinos.push(d));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respostaJson(401, { erro: 'E-mail ou senha incorretos.', codigo: 'credenciais_invalidas' }),
      ),
    );
    await expect(
      chamar('authLogin', { corpo: { email: 'a@b.com', senha: 'x' } }),
    ).rejects.toMatchObject({ message: 'E-mail ou senha incorretos.' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respostaJson(401, {})),
    );
    await expect(chamar('meObter', { semRedirecionar: true })).rejects.toBeInstanceOf(ErroApi);
    parar();
    expect(destinos).toEqual([]);
  });

  it('falha de rede vira ErroApi sem conexão (status 0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const e = await chamar('meObter').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroApi);
    expect((e as ErroApi).semConexao).toBe(true);
  });

  it('erro sem corpo usa a mensagem padrão em português', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('x', { status: 500 })),
    );
    await expect(chamar('meObter')).rejects.toMatchObject({
      message: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
    });
  });
});
