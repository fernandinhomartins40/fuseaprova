import { describe, expect, it, vi } from 'vitest';
import { criarEnviadorVelomail, ErroVelomail, separarRemetente } from './velomail.js';

const msg = { para: 'aluna@exemplo.com', assunto: 'Redefinir senha', html: '<p>oi</p>', texto: 'oi' };
const resposta = (status: number, corpo: unknown) =>
  ({ ok: status < 300, status, json: async () => corpo }) as unknown as Response;

describe('envio pelo Velomail (D37)', () => {
  it('manda a chave no header e o e-mail sem rastreio, e devolve o id', async () => {
    const f = vi.fn(async () => resposta(201, { message_id: 'm-1' }));
    const v = criarEnviadorVelomail({ apiKey: 're_x', url: 'https://v.exemplo/api/', remetente: 'Fuse <n@f.br>', fetch: f });
    expect(await v.enviar(msg)).toBe('m-1');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://v.exemplo/api/emails/send');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('re_x');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'n@f.br',
      from_name: 'Fuse',
      to: msg.para,
      subject: msg.assunto,
      html: msg.html,
      text: msg.texto,
      tracking_enabled: false,
    });
  });

  it('separa o nome do e-mail do remetente', () => {
    expect(separarRemetente('Fuse Aprova <nao-responda@fuseaprova.com.br>')).toEqual({ email: 'nao-responda@fuseaprova.com.br', nome: 'Fuse Aprova' });
    expect(separarRemetente('"Fuse Aprova" <n@f.br>')).toEqual({ email: 'n@f.br', nome: 'Fuse Aprova' });
    expect(separarRemetente('<n@f.br>')).toEqual({ email: 'n@f.br', nome: null });
    expect(separarRemetente(' n@f.br ')).toEqual({ email: 'n@f.br', nome: null });
  });

  it('sem id na resposta devolve null', async () => {
    const v = criarEnviadorVelomail({ apiKey: 're_x', remetente: 'n@f.br', fetch: async () => resposta(200, {}) });
    expect(await v.enviar(msg)).toBeNull();
  });

  it('recusa da mensagem (400) não é temporária; limite, chave e domínio são', async () => {
    const com = (status: number, corpo: unknown) =>
      criarEnviadorVelomail({ apiKey: 're_x', remetente: 'n@f.br', fetch: async () => resposta(status, corpo) }).enviar(msg);
    await expect(com(400, { error: 'Validation error' })).rejects.toMatchObject({ status: 400, temporaria: false });
    await expect(com(429, { error: 'limite', code: 'RATE_LIMIT_EXCEEDED' })).rejects.toMatchObject({
      codigo: 'RATE_LIMIT_EXCEEDED',
      temporaria: true,
      message: 'Velomail 429 RATE_LIMIT_EXCEEDED: limite',
    });
    await expect(com(401, null)).rejects.toMatchObject({ temporaria: true, message: 'Velomail 401: erro sem detalhe' });
  });

  it('resposta que não é JSON e falha de rede viram erro temporário', async () => {
    const semJson = criarEnviadorVelomail({
      apiKey: 're_x',
      remetente: 'n@f.br',
      fetch: async () => ({ ok: false, status: 502, json: async () => Promise.reject(new Error('html')) }) as unknown as Response,
    });
    await expect(semJson.enviar(msg)).rejects.toMatchObject({ status: 502, temporaria: true });
    const caiu = criarEnviadorVelomail({ apiKey: 're_x', remetente: 'n@f.br', fetch: async () => Promise.reject(new Error('ECONNRESET')) });
    const e = await caiu.enviar(msg).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroVelomail);
    expect(e).toMatchObject({ status: null, temporaria: true, message: 'O Velomail não respondeu: ECONNRESET' });
  });
});
