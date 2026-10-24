import { afterEach, describe, expect, it } from 'vitest';
import { ErroBloqueio, ErroRobots } from '../src/rede/bloqueio.js';
import { ClienteHttp, decodificar, ErroHttp } from '../src/rede/cliente.js';
import { lerConfig, userAgentPadrao } from '../src/config.js';
import { fixture, mockAgent, relogioFalso, UA } from './ajuda.js';

const FAU = 'https://www.concursosfau.com.br';
const PCI = 'https://www.pciconcursos.com.br';
const html = { 'content-type': 'text/html; charset=utf-8' };

let agent = mockAgent();
afterEach(async () => {
  await agent.close();
  agent = mockAgent();
});

function cliente(rel = relogioFalso()) {
  return {
    c: new ClienteHttp({ userAgent: UA, intervaloMs: 2000, dispatcher: agent, relogio: rel }),
    rel,
  };
}

describe('ClienteHttp', () => {
  it('manda o User-Agent identificado, lê o robots.txt uma vez e espera 2 s entre requisições', async () => {
    const fau = agent.get(FAU);
    const comUa = (h: Record<string, string>) => h['user-agent'] === UA;
    fau.intercept({ path: '/robots.txt', headers: comUa }).reply(200, '');
    fau
      .intercept({ path: '/novo/encerrados/', headers: comUa })
      .reply(200, fixture('fau_encerrados.html'), { headers: html });
    fau
      .intercept({ path: '/novo/concurso/pmsf2026', headers: comUa })
      .reply(200, fixture('fau_certame.html'), { headers: html });
    const { c, rel } = cliente();
    const r1 = await c.obterTexto(`${FAU}/novo/encerrados/`);
    const r2 = await c.obterTexto(`${FAU}/novo/concurso/pmsf2026`);
    expect(r1.corpo).toContain('SALGADO FILHO');
    expect(r2.bloqueio).toBeNull();
    // robots.txt + 2 páginas = 3 requisições ao mesmo host → 2 esperas de 2 s.
    expect(rel.esperas).toEqual([2000, 2000]);
    agent.assertNoPendingInterceptors();
  });

  it('recusa URL proibida pelo robots.txt sem fazer a requisição', async () => {
    agent.get(PCI).intercept({ path: '/robots.txt' }).reply(200, fixture('pci_robots.txt'));
    const { c } = cliente();
    await expect(c.obterBinario(`${PCI}/provas/arquivo/x.pdf`)).rejects.toBeInstanceOf(ErroRobots);
    expect(await c.permitidoPeloRobots(`${PCI}/provas/fau-unicentro`)).toBe(true);
  });

  it('robots.txt 404 libera tudo; 5xx ou falha de rede bloqueia tudo', async () => {
    agent.get('https://a.test').intercept({ path: '/robots.txt' }).reply(404, 'não existe');
    agent
      .get('https://a.test')
      .intercept({ path: '/p' })
      .reply(200, 'ok', { headers: { 'content-type': 'text/plain' } });
    agent.get('https://b.test').intercept({ path: '/robots.txt' }).reply(503, 'fora');
    agent
      .get('https://c.test')
      .intercept({ path: '/robots.txt' })
      .replyWithError(new Error('ECONNRESET'));
    const { c } = cliente();
    expect((await c.obterTexto('https://a.test/p')).corpo).toBe('ok');
    await expect(c.obterTexto('https://b.test/p')).rejects.toThrow(/HTTP 503/);
    await expect(c.obterTexto('https://c.test/p')).rejects.toThrow(/não foi possível ler o robots/);
  });

  it('segue redirecionamentos conferindo o robots.txt de cada destino', async () => {
    agent.get('https://a.test').intercept({ path: '/robots.txt' }).reply(200, '');
    agent
      .get('https://a.test')
      .intercept({ path: '/velho' })
      .reply(301, '', { headers: { location: 'https://b.test/novo' } });
    agent
      .get('https://b.test')
      .intercept({ path: '/robots.txt' })
      .reply(200, 'User-agent: *\nDisallow: /novo');
    const { c } = cliente();
    await expect(c.obterTexto('https://a.test/velho')).rejects.toBeInstanceOf(ErroRobots);
  });

  it('segue redirecionamento permitido e o do próprio robots.txt; aplica o Crawl-delay', async () => {
    const a = agent.get('https://a.test');
    a.intercept({ path: '/robots.txt' }).reply(302, '', { headers: { location: '/r2.txt' } });
    a.intercept({ path: '/r2.txt' }).reply(200, 'User-agent: *\nCrawl-delay: 4');
    a.intercept({ path: '/x' }).reply(302, '', { headers: { location: '/y' } });
    a.intercept({ path: '/y' }).reply(200, '<p>fim</p>', { headers: html });
    const { c, rel } = cliente();
    const r = await c.obterTexto('https://a.test/x');
    expect(r.url).toBe('https://a.test/y');
    expect(rel.esperas).toEqual([2000, 4000, 4000]);
  });

  it('para ao detectar captcha (ou devolve o bloqueio quando pedido)', async () => {
    const p = agent.get(PCI);
    p.intercept({ path: '/robots.txt' }).reply(200, fixture('pci_robots.txt'));
    p.intercept({ path: '/provas/download/x' })
      .reply(200, fixture('pci_prova_captcha.html'), { headers: html })
      .times(2);
    const { c } = cliente();
    await expect(c.obterTexto(`${PCI}/provas/download/x`)).rejects.toBeInstanceOf(ErroBloqueio);
    const r = await c.obterTexto(`${PCI}/provas/download/x`, { permitirBloqueio: true });
    expect(r.bloqueio?.tipo).toBe('captcha');
  });

  it('para em login (401, redirecionamento para /login) e em desafio do Cloudflare', async () => {
    const a = agent.get('https://a.test');
    a.intercept({ path: '/robots.txt' }).reply(200, '');
    a.intercept({ path: '/privado' }).reply(401, 'auth');
    a.intercept({ path: '/area' }).reply(302, '', { headers: { location: '/login' } });
    a.intercept({ path: '/login' }).reply(200, '<form><input type="password"></form>', {
      headers: html,
    });
    a.intercept({ path: '/cf' }).reply(403, '<title>Just a moment...</title>', { headers: html });
    a.intercept({ path: '/erro' }).reply(500, '');
    const { c } = cliente();
    await expect(c.obterTexto('https://a.test/privado')).rejects.toMatchObject({
      bloqueio: { tipo: 'login' },
    });
    await expect(c.obterTexto('https://a.test/area')).rejects.toMatchObject({
      bloqueio: { tipo: 'login' },
    });
    await expect(c.obterTexto('https://a.test/cf')).rejects.toMatchObject({
      bloqueio: { tipo: 'desafio' },
    });
    await expect(c.obterTexto('https://a.test/erro')).rejects.toBeInstanceOf(ErroHttp);
  });

  it('obterBinario recusa HTML de captcha no lugar do PDF e arquivo grande demais', async () => {
    const a = agent.get('https://a.test');
    a.intercept({ path: '/robots.txt' }).reply(200, '');
    a.intercept({ path: '/a.pdf' }).reply(200, '<div class="g-recaptcha"></div>', {
      headers: html,
    });
    a.intercept({ path: '/b.pdf' }).reply(200, Buffer.alloc(2048, 1), {
      headers: { 'content-type': 'application/pdf' },
    });
    const c = new ClienteHttp({
      userAgent: UA,
      dispatcher: agent,
      relogio: relogioFalso(),
      maxBytes: 1024,
    });
    await expect(c.obterBinario('https://a.test/a.pdf')).rejects.toBeInstanceOf(ErroBloqueio);
    await expect(c.obterBinario('https://a.test/b.pdf')).rejects.toThrow(/passa de/);
  });

  it('exige User-Agent e decodifica pelo charset', () => {
    expect(() => new ClienteHttp({ userAgent: ' ' })).toThrow(/User-Agent/);
    expect(decodificar(Buffer.from([0x43, 0xe2, 0x6d]), 'text/html; charset=iso-8859-1')).toBe(
      'Câm',
    );
    expect(decodificar(Buffer.from('ok'), 'text/html; charset=inexistente')).toBe('ok');
  });
});

describe('configuração', () => {
  it('monta o User-Agent com o contato do .env e não deixa o intervalo abaixo de 2 s', () => {
    expect(userAgentPadrao({ APP_URL: 'https://app.x', SUPORTE_EMAIL: 's@x' })).toBe(
      'FuseAprovaColetor/1.0 (+https://app.x; s@x)',
    );
    expect(userAgentPadrao({})).toMatch(/defina APP_URL/);
    const c = lerConfig({
      CRAWLER_INTERVALO_MS: '500',
      ARQUIVOS_DIR: '/tmp/x',
      CRAWLER_USER_AGENT: 'Robo/1',
    });
    expect(c).toMatchObject({
      intervaloMs: 2000,
      arquivosDir: '/tmp/x',
      userAgent: 'Robo/1',
      pdftotext: 'pdftotext',
    });
    expect(lerConfig({ CRAWLER_INTERVALO_MS: '5000' }).intervaloMs).toBe(5000);
    expect(lerConfig({}).arquivosDir).toBe('/srv/fuse/arquivos');
  });
});
