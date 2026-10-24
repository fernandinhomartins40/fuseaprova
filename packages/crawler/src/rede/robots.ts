/**
 * Parser de robots.txt (RFC 9309), puro.
 *
 * - Grupos de `User-agent`; o coletor usa o grupo cujo nome casa com o token do produto
 *   (ex.: "FuseAprovaColetor"), sem diferenciar maiúsculas; sem grupo próprio, usa o `*`.
 *   Grupos repetidos para o mesmo agente são somados.
 * - `Allow`/`Disallow` com curingas `*` e `$`; vence a regra mais longa e, no empate, `Allow`.
 * - `Crawl-delay` (não padronizado) é respeitado quando maior que o intervalo do coletor.
 * - `/robots.txt` é sempre permitido.
 */

export interface RegraRobots {
  permitir: boolean;
  padrao: string;
}

export interface GrupoRobots {
  agentes: string[];
  regras: RegraRobots[];
  crawlDelaySegundos: number | null;
}

export interface Robots {
  grupos: GrupoRobots[];
  sitemaps: string[];
}

/** Situação do robots.txt de um host, conforme a resposta HTTP (RFC 9309, 2.3.1). */
export type SituacaoRobots =
  | { tipo: 'regras'; robots: Robots }
  /** 4xx: o arquivo não existe; tudo é permitido. */
  | { tipo: 'liberado' }
  /** 5xx ou falha de rede: o site está inacessível; nada é permitido. */
  | { tipo: 'bloqueado'; motivo: string };

export function parseRobots(conteudo: string): Robots {
  const grupos: GrupoRobots[] = [];
  const sitemaps: string[] = [];
  let atual: GrupoRobots | null = null;
  let ultimaFoiAgente = false;

  for (const bruta of conteudo.replace(/^\ufeff/, '').split(/\r\n|\r|\n/)) {
    const linha = bruta.replace(/#.*$/, '').trim();
    if (!linha) continue;
    const sep = linha.indexOf(':');
    if (sep <= 0) continue;
    const chave = linha.slice(0, sep).trim().toLowerCase();
    const valor = linha.slice(sep + 1).trim();

    if (chave === 'user-agent') {
      if (!atual || !ultimaFoiAgente) {
        atual = { agentes: [], regras: [], crawlDelaySegundos: null };
        grupos.push(atual);
      }
      atual.agentes.push(valor.toLowerCase());
      ultimaFoiAgente = true;
      continue;
    }
    ultimaFoiAgente = false;
    if (chave === 'sitemap') {
      if (valor) sitemaps.push(valor);
      continue;
    }
    if (!atual) continue; // regra fora de grupo: ignorada
    if (chave === 'allow' || chave === 'disallow') {
      // "Disallow:" vazio não é regra (libera tudo).
      if (valor)
        atual.regras.push({ permitir: chave === 'allow', padrao: normalizarCaminho(valor) });
    } else if (chave === 'crawl-delay') {
      const n = Number(valor.replace(',', '.'));
      if (Number.isFinite(n) && n >= 0) atual.crawlDelaySegundos = n;
    }
  }
  return { grupos, sitemaps };
}

/** Token do produto: "FuseAprovaColetor/1.0 (+contato)" → "fuseaprovacoletor". */
export function tokenDoAgente(userAgent: string): string {
  return (/^[A-Za-z0-9_-]+/.exec(userAgent.trim())?.[0] ?? userAgent).toLowerCase();
}

/** Grupos que valem para o agente (os próprios ou, na falta, os do `*`). */
export function gruposDoAgente(robots: Robots, userAgent: string): GrupoRobots[] {
  const token = tokenDoAgente(userAgent);
  const proprios = robots.grupos.filter((g) => g.agentes.some((a) => a !== '*' && a === token));
  if (proprios.length) return proprios;
  return robots.grupos.filter((g) => g.agentes.includes('*'));
}

const NAO_RESERVADOS = /[A-Za-z0-9\-._~]/;

/**
 * Normaliza o caminho para comparação: decodifica %XX de caracteres não reservados,
 * deixa os demais escapes em maiúsculas e codifica o que não é ASCII.
 */
export function normalizarCaminho(caminho: string): string {
  let saida = '';
  for (let i = 0; i < caminho.length; i++) {
    const c = caminho[i]!;
    if (c === '%' && /^[0-9A-Fa-f]{2}$/.test(caminho.slice(i + 1, i + 3))) {
      const hex = caminho.slice(i + 1, i + 3);
      const ch = String.fromCharCode(parseInt(hex, 16));
      saida += NAO_RESERVADOS.test(ch) ? ch : `%${hex.toUpperCase()}`;
      i += 2;
    } else if (c.charCodeAt(0) > 0x7e || c === ' ') {
      saida += encodeURIComponent(c);
    } else {
      saida += c;
    }
  }
  return saida;
}

/** Converte o padrão (com `*` e `$`) numa expressão regular ancorada no início. */
function regexDoPadrao(padrao: string): RegExp {
  const fim = padrao.endsWith('$');
  const corpo = (fim ? padrao.slice(0, -1) : padrao)
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${corpo}${fim ? '$' : ''}`);
}

/** Regra que decide o caminho (a mais longa; empate favorece Allow), ou null. */
export function regraAplicavel(grupos: GrupoRobots[], caminho: string): RegraRobots | null {
  const alvo = normalizarCaminho(caminho);
  let melhor: RegraRobots | null = null;
  for (const g of grupos) {
    for (const r of g.regras) {
      if (!regexDoPadrao(r.padrao).test(alvo)) continue;
      if (
        !melhor ||
        r.padrao.length > melhor.padrao.length ||
        (r.padrao.length === melhor.padrao.length && r.permitir && !melhor.permitir)
      ) {
        melhor = r;
      }
    }
  }
  return melhor;
}

/** O agente pode buscar a URL (ou caminho + query)? */
export function permitido(robots: Robots, userAgent: string, url: string | URL): boolean {
  const u =
    typeof url === 'string' && url.startsWith('/') ? new URL(url, 'http://x') : new URL(url);
  const caminho = (u.pathname || '/') + u.search;
  if (u.pathname === '/robots.txt') return true;
  const regra = regraAplicavel(gruposDoAgente(robots, userAgent), caminho);
  return regra ? regra.permitir : true;
}

/** Crawl-delay em ms para o agente (o maior dos grupos aplicáveis), ou 0. */
export function crawlDelayMs(robots: Robots, userAgent: string): number {
  const atrasos = gruposDoAgente(robots, userAgent)
    .map((g) => g.crawlDelaySegundos)
    .filter((n): n is number => n !== null);
  return atrasos.length ? Math.round(Math.max(...atrasos) * 1000) : 0;
}

/** Interpreta a resposta do GET /robots.txt (RFC 9309, 2.3.1). */
export function situacaoPelaResposta(status: number, corpo: string): SituacaoRobots {
  if (status >= 200 && status < 300) return { tipo: 'regras', robots: parseRobots(corpo) };
  if (status >= 400 && status < 500) return { tipo: 'liberado' };
  return { tipo: 'bloqueado', motivo: `robots.txt respondeu HTTP ${status}` };
}

/** Decisão final para uma URL, dada a situação do robots do host. */
export function podeBuscar(
  situacao: SituacaoRobots,
  userAgent: string,
  url: string | URL,
): boolean {
  if (new URL(url).pathname === '/robots.txt') return true;
  if (situacao.tipo === 'liberado') return true;
  if (situacao.tipo === 'bloqueado') return false;
  return permitido(situacao.robots, userAgent, url);
}
