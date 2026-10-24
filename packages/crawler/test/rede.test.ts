import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  detectarBloqueioHtml,
  detectarBloqueioResposta,
  ErroBloqueio,
} from '../src/rede/bloqueio.js';
import { LimitadorPorHost, type RelogioLimitador } from '../src/rede/limitador.js';
import {
  crawlDelayMs,
  normalizarCaminho,
  parseRobots,
  permitido,
  podeBuscar,
  situacaoPelaResposta,
  tokenDoAgente,
} from '../src/rede/robots.js';

const UA = 'FuseAprovaColetor/1.0 (+https://app.exemplo.test; suporte@exemplo.test)';
const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

/** Relógio falso: `dormir` avança o tempo e registra as esperas. */
function relogioFalso(): RelogioLimitador & { esperas: number[]; t: number } {
  const r = {
    t: 1_000_000,
    esperas: [] as number[],
    agora: () => r.t,
    dormir: async (ms: number) => {
      r.esperas.push(ms);
      r.t += ms;
    },
  };
  return r;
}

describe('LimitadorPorHost', () => {
  it('espera 2 s entre requisições ao mesmo host', async () => {
    const rel = relogioFalso();
    const lim = new LimitadorPorHost(2000, rel);
    await lim.aguardar('www.concursosfau.com.br');
    await lim.aguardar('www.concursosfau.com.br');
    await lim.aguardar('WWW.CONCURSOSFAU.COM.BR');
    expect(rel.esperas).toEqual([2000, 2000]);
  });

  it('não faz um host esperar pelo outro', async () => {
    const rel = relogioFalso();
    const lim = new LimitadorPorHost(2000, rel);
    await lim.aguardar('a.test');
    await lim.aguardar('b.test');
    expect(rel.esperas).toEqual([]);
  });

  it('desconta o tempo que já passou', async () => {
    const rel = relogioFalso();
    const lim = new LimitadorPorHost(2000, rel);
    await lim.aguardar('a.test');
    rel.t += 1500;
    await lim.aguardar('a.test');
    expect(rel.esperas).toEqual([500]);
  });

  it('enfileira chamadas simultâneas ao mesmo host', async () => {
    const rel = relogioFalso();
    const lim = new LimitadorPorHost(2000, rel);
    const ordem: number[] = [];
    await Promise.all(
      [1, 2, 3].map(() => lim.executar('https://a.test/x', async () => ordem.push(rel.t))),
    );
    expect(ordem).toEqual([1_000_000, 1_002_000, 1_004_000]);
  });

  it('respeita um Crawl-delay maior que o padrão', async () => {
    const rel = relogioFalso();
    const lim = new LimitadorPorHost(2000, rel);
    lim.definirIntervaloMinimo('a.test', 5000);
    lim.definirIntervaloMinimo('a.test', 0);
    expect(lim.intervaloDe('a.test')).toBe(5000);
    expect(lim.intervaloDe('b.test')).toBe(2000);
    await lim.aguardar('a.test');
    await lim.aguardar('a.test');
    expect(rel.esperas).toEqual([5000]);
  });

  it('recusa intervalo negativo', () => {
    expect(() => new LimitadorPorHost(-1)).toThrow();
  });
});

describe('robots.txt', () => {
  const pci = parseRobots(fixture('pci_robots.txt'));

  it('lê grupos, regras e sitemaps', () => {
    expect(pci.grupos).toHaveLength(2);
    expect(pci.grupos[1]!.agentes).toEqual(['*']);
    expect(pci.sitemaps).toEqual(['https://www.pciconcursos.com.br/smap_noticias.xml']);
  });

  it('aplica o grupo * do PCI: páginas liberadas, PDFs e /acesso/ proibidos', () => {
    expect(permitido(pci, UA, 'https://www.pciconcursos.com.br/provas/fau-unicentro')).toBe(true);
    expect(
      permitido(pci, UA, 'https://www.pciconcursos.com.br/provas/download/x-fau-unicentro-2024'),
    ).toBe(true);
    expect(
      permitido(pci, UA, 'https://www.pciconcursos.com.br/provas/arquivo/administrador.pdf'),
    ).toBe(false);
    expect(permitido(pci, UA, 'https://www.pciconcursos.com.br/acesso/entrar')).toBe(false);
    expect(permitido(pci, UA, 'https://www.pciconcursos.com.br/busca.php?q=1')).toBe(false);
    expect(permitido(pci, UA, 'https://www.pciconcursos.com.br/robots.txt')).toBe(true);
  });

  it('usa o grupo próprio do agente em vez do *', () => {
    const r = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: FuseAprovaColetor\nUser-agent: outro\nAllow: /provas/\nDisallow: /',
    );
    expect(tokenDoAgente(UA)).toBe('fuseaprovacoletor');
    expect(permitido(r, UA, 'https://x.test/provas/1')).toBe(true);
    expect(permitido(r, UA, 'https://x.test/outra')).toBe(false);
    expect(permitido(r, 'OutroRobo/2.0', 'https://x.test/provas/1')).toBe(false);
  });

  it('soma grupos repetidos e ignora regras fora de grupo e comentários', () => {
    const r = parseRobots(
      'Disallow: /tudo\n# comentário\nUser-agent: *\nDisallow: /a # fim\nUser-agent: *\nDisallow: /b\nlinha sem dois pontos\n:sem chave',
    );
    expect(permitido(r, UA, 'https://x.test/tudo')).toBe(true);
    expect(permitido(r, UA, 'https://x.test/a/1')).toBe(false);
    expect(permitido(r, UA, 'https://x.test/b')).toBe(false);
  });

  it('regra mais longa vence; no empate, Allow', () => {
    const r = parseRobots(
      'User-agent: *\nDisallow: /pasta/\nAllow: /pasta/livre\nAllow: /x\nDisallow: /x',
    );
    expect(permitido(r, UA, 'https://x.test/pasta/fechada')).toBe(false);
    expect(permitido(r, UA, 'https://x.test/pasta/livre/1')).toBe(true);
    expect(permitido(r, UA, 'https://x.test/x')).toBe(true);
  });

  it('entende * e $ e compara com a query', () => {
    const r = parseRobots('User-agent: *\nDisallow: /*.pdf$\nDisallow: /*?sessao=');
    expect(permitido(r, UA, 'https://x.test/a/b.pdf')).toBe(false);
    expect(permitido(r, UA, 'https://x.test/a/b.pdf?v=1')).toBe(true);
    expect(permitido(r, UA, 'https://x.test/p?sessao=1')).toBe(false);
    expect(permitido(r, UA, '/a/c.pdf')).toBe(false);
  });

  it('Disallow vazio libera tudo; sem grupo aplicável, tudo é permitido', () => {
    expect(permitido(parseRobots('User-agent: *\nDisallow:'), UA, 'https://x.test/a')).toBe(true);
    expect(
      permitido(parseRobots('User-agent: Googlebot\nDisallow: /'), UA, 'https://x.test/a'),
    ).toBe(true);
    expect(permitido(parseRobots(''), UA, 'https://x.test/a')).toBe(true);
  });

  it('normaliza escapes e acentos', () => {
    expect(normalizarCaminho('/%7Euser/%2f')).toBe('/~user/%2F');
    expect(normalizarCaminho('/concurso/CÂMARA X')).toBe('/concurso/C%C3%82MARA%20X');
    const r = parseRobots('User-agent: *\nDisallow: /concurso/CÂMARA');
    expect(permitido(r, UA, 'https://x.test/concurso/C%C3%82MARA%20MUNICIPAL')).toBe(false);
  });

  it('lê o Crawl-delay do grupo aplicável', () => {
    expect(crawlDelayMs(parseRobots('User-agent: *\nCrawl-delay: 5'), UA)).toBe(5000);
    expect(crawlDelayMs(parseRobots('User-agent: *\nCrawl-delay: 0,5\nCrawl-delay: abc'), UA)).toBe(
      500,
    );
    expect(crawlDelayMs(parseRobots('User-agent: *\nDisallow: /a'), UA)).toBe(0);
  });

  it('interpreta a resposta HTTP do robots.txt (RFC 9309)', () => {
    expect(situacaoPelaResposta(200, '').tipo).toBe('regras');
    expect(situacaoPelaResposta(404, '').tipo).toBe('liberado');
    expect(situacaoPelaResposta(503, '').tipo).toBe('bloqueado');
    expect(podeBuscar({ tipo: 'liberado' }, UA, 'https://x.test/a')).toBe(true);
    expect(podeBuscar({ tipo: 'bloqueado', motivo: 'x' }, UA, 'https://x.test/a')).toBe(false);
    expect(podeBuscar({ tipo: 'bloqueado', motivo: 'x' }, UA, 'https://x.test/robots.txt')).toBe(
      true,
    );
    expect(
      podeBuscar(situacaoPelaResposta(200, 'User-agent: *\nDisallow: /a'), UA, 'https://x.test/a'),
    ).toBe(false);
  });
});

describe('detecção de captcha e login', () => {
  it('detecta o Turnstile da página de prova do PCI', () => {
    expect(detectarBloqueioHtml(fixture('pci_prova_captcha.html'))).toEqual({
      tipo: 'captcha',
      detalhe: 'Cloudflare Turnstile',
    });
  });

  it('não acusa bloqueio em páginas normais (o botão "Entrar com Google" não é login)', () => {
    expect(detectarBloqueioHtml(fixture('pci_lista.html'))).toBeNull();
    expect(detectarBloqueioHtml(fixture('fau_encerrados.html'))).toBeNull();
    expect(detectarBloqueioHtml(fixture('fau_certame.html'))).toBeNull();
  });

  it('detecta reCAPTCHA, hCaptcha, desafio do Cloudflare e formulário de senha', () => {
    expect(detectarBloqueioHtml('<div class="g-recaptcha"></div>')?.detalhe).toBe('reCAPTCHA');
    expect(
      detectarBloqueioHtml('<script src="https://hcaptcha.com/1/api.js"></script>')?.detalhe,
    ).toBe('hCaptcha');
    expect(detectarBloqueioHtml('<title>Just a moment...</title>')?.tipo).toBe('desafio');
    expect(detectarBloqueioHtml('<form><input type="password" name="s"></form>')?.tipo).toBe(
      'login',
    );
  });

  it('detecta bloqueio pela resposta HTTP', () => {
    expect(detectarBloqueioResposta(403, { 'cf-mitigated': 'challenge' })?.tipo).toBe('desafio');
    expect(detectarBloqueioResposta(401, {})?.tipo).toBe('login');
    expect(detectarBloqueioResposta(200, { 'www-authenticate': ['Basic'] })?.tipo).toBe('login');
    expect(detectarBloqueioResposta(200, {}, 'https://x.test/login?volta=1')?.tipo).toBe('login');
    expect(detectarBloqueioResposta(200, {}, 'https://x.test/provas')).toBeNull();
  });

  it('a mensagem do erro orienta o download manual', () => {
    const e = new ErroBloqueio('https://x.test/p', {
      tipo: 'captcha',
      detalhe: 'Cloudflare Turnstile',
    });
    expect(e.message).toMatch(/não contorna captcha nem login/);
    expect(new ErroBloqueio('u', { tipo: 'login', detalhe: 'd' }).message).toMatch(/pede login/);
    expect(new ErroBloqueio('u', { tipo: 'desafio', detalhe: 'd' }).message).toMatch(/anti-robô/);
  });
});
