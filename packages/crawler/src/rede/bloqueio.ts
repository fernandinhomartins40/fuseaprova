/**
 * Detecção de captcha e de login (puro). O coletor NÃO contorna nenhum dos dois:
 * ao detectar, para e avisa (PRD 7.5).
 */
import { load } from 'cheerio';

export type TipoBloqueio = 'captcha' | 'login' | 'desafio';

export interface Bloqueio {
  tipo: TipoBloqueio;
  detalhe: string;
}

export class ErroBloqueio extends Error {
  constructor(
    readonly url: string,
    readonly bloqueio: Bloqueio,
  ) {
    const oque =
      bloqueio.tipo === 'login'
        ? 'pede login'
        : bloqueio.tipo === 'captcha'
          ? 'pede um captcha'
          : 'apresentou um desafio anti-robô';
    super(
      `A página ${url} ${oque} (${bloqueio.detalhe}). O coletor não contorna captcha nem login: ` +
        'baixe o arquivo manualmente no navegador e use `crawler importar <pdf> --gabarito <pdf>`.',
    );
    this.name = 'ErroBloqueio';
  }
}

export class ErroRobots extends Error {
  constructor(
    readonly url: string,
    motivo: string,
  ) {
    super(`O robots.txt não permite buscar ${url} (${motivo}). Nada foi baixado.`);
    this.name = 'ErroRobots';
  }
}

/** Procura captcha, desafio de CDN ou formulário de login num HTML. */
export function detectarBloqueioHtml(html: string): Bloqueio | null {
  const $ = load(html);
  if (
    $('.cf-turnstile, [data-sitekey]').length ||
    /challenges\.cloudflare\.com\/turnstile/.test(html)
  ) {
    return { tipo: 'captcha', detalhe: 'Cloudflare Turnstile' };
  }
  if ($('.g-recaptcha').length || /www\.google\.com\/recaptcha\//.test(html)) {
    return { tipo: 'captcha', detalhe: 'reCAPTCHA' };
  }
  if ($('.h-captcha').length || /hcaptcha\.com\/1\/api\.js/.test(html)) {
    return { tipo: 'captcha', detalhe: 'hCaptcha' };
  }
  const titulo = $('title').text().trim();
  if (
    /^(Just a moment|Attention Required|Um momento)/i.test(titulo) ||
    /cf-chl-|cf_chl_opt|__cf_chl_/.test(html)
  ) {
    return { tipo: 'desafio', detalhe: 'desafio do Cloudflare' };
  }
  if ($('input[type="password"]').length) {
    return { tipo: 'login', detalhe: 'formulário com senha' };
  }
  return null;
}

/** Bloqueio pela resposta HTTP (antes de olhar o corpo). */
export function detectarBloqueioResposta(
  status: number,
  cabecalhos: Record<string, string | string[] | undefined>,
  urlFinal?: string,
): Bloqueio | null {
  const h = (n: string) => {
    const v = cabecalhos[n];
    return Array.isArray(v) ? v.join(',') : (v ?? '');
  };
  if (h('cf-mitigated').toLowerCase() === 'challenge') {
    return { tipo: 'desafio', detalhe: 'cf-mitigated: challenge' };
  }
  if (status === 401 || h('www-authenticate')) {
    return { tipo: 'login', detalhe: `HTTP ${status} com autenticação` };
  }
  if (
    urlFinal &&
    /\/(login|entrar|acesso|signin|auth)(\/|\?|$)/i.test(new URL(urlFinal).pathname)
  ) {
    return { tipo: 'login', detalhe: `redirecionou para ${new URL(urlFinal).pathname}` };
  }
  return null;
}
