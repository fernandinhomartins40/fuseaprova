/**
 * Cliente HTTP do coletor (undici) com a postura do PRD 7.5:
 * - User-Agent identificado;
 * - 1 requisição a cada 2 s por host (LimitadorPorHost), inclusive o robots.txt e redirecionamentos;
 * - robots.txt de cada host lido uma vez, respeitado em todas as URLs e em cada salto de redirecionamento;
 * - captcha, desafio anti-robô ou login detectados → ErroBloqueio (não contorna).
 */
import { type Dispatcher, request } from 'undici';
import {
  type Bloqueio,
  detectarBloqueioHtml,
  detectarBloqueioResposta,
  ErroBloqueio,
  ErroRobots,
} from './bloqueio.js';
import { LimitadorPorHost, type RelogioLimitador, relogioReal } from './limitador.js';
import { crawlDelayMs, podeBuscar, type SituacaoRobots, situacaoPelaResposta } from './robots.js';

export class ErroHttp extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`O servidor respondeu HTTP ${status} para ${url}.`);
    this.name = 'ErroHttp';
  }
}

export interface OpcoesCliente {
  userAgent: string;
  intervaloMs?: number;
  /** Dispatcher do undici (nos testes, um MockAgent). */
  dispatcher?: Dispatcher;
  relogio?: RelogioLimitador;
  /** Tempo máximo por requisição. Padrão 60 s. */
  timeoutMs?: number;
  /** Tamanho máximo de arquivo. Padrão 80 MB. */
  maxBytes?: number;
  log?: (msg: string) => void;
}

export interface RespostaTexto {
  url: string;
  status: number;
  corpo: string;
  tipoConteudo: string;
  /** Preenchido só quando a chamada pede `permitirBloqueio`. */
  bloqueio: Bloqueio | null;
}

export interface RespostaBinaria {
  url: string;
  status: number;
  dados: Buffer;
  tipoConteudo: string;
}

const MAX_REDIRECIONAMENTOS = 5;

export class ClienteHttp {
  readonly userAgent: string;
  readonly limitador: LimitadorPorHost;
  private readonly robots = new Map<string, Promise<SituacaoRobots>>();
  private readonly opcoes: OpcoesCliente;

  constructor(opcoes: OpcoesCliente) {
    if (!opcoes.userAgent.trim())
      throw new Error('Defina um User-Agent identificado para o coletor.');
    this.opcoes = opcoes;
    this.userAgent = opcoes.userAgent;
    this.limitador = new LimitadorPorHost(
      opcoes.intervaloMs ?? 2000,
      opcoes.relogio ?? relogioReal,
    );
  }

  /** Situação do robots.txt do host da URL (lido uma vez por origem). */
  situacaoRobots(url: string | URL): Promise<SituacaoRobots> {
    const origem = new URL(url).origin;
    let s = this.robots.get(origem);
    if (!s) {
      s = this.buscarRobots(origem);
      this.robots.set(origem, s);
    }
    return s;
  }

  async permitidoPeloRobots(url: string | URL): Promise<boolean> {
    return podeBuscar(await this.situacaoRobots(url), this.userAgent, url);
  }

  private async buscarRobots(origem: string): Promise<SituacaoRobots> {
    const url = `${origem}/robots.txt`;
    try {
      const r = await this.bruto(url, 'text/plain,*/*');
      const corpo = await r.body.text();
      let situacao = situacaoPelaResposta(r.statusCode, corpo);
      // Redirecionamento do robots.txt: segue até 5 saltos (RFC 9309, 2.3.1.2).
      let saltos = 0;
      let atual = url;
      let resp = r;
      while (resp.statusCode >= 300 && resp.statusCode < 400 && saltos < MAX_REDIRECIONAMENTOS) {
        const destino = cabecalho(resp.headers, 'location');
        if (!destino) break;
        atual = new URL(destino, atual).href;
        resp = await this.bruto(atual, 'text/plain,*/*');
        situacao = situacaoPelaResposta(resp.statusCode, await resp.body.text());
        saltos++;
      }
      if (situacao.tipo === 'regras') {
        const atraso = crawlDelayMs(situacao.robots, this.userAgent);
        if (atraso) this.limitador.definirIntervaloMinimo(new URL(origem).host, atraso);
      }
      this.opcoes.log?.(`robots.txt de ${origem}: ${situacao.tipo}`);
      return situacao;
    } catch (e) {
      return {
        tipo: 'bloqueado',
        motivo: `não foi possível ler o robots.txt (${(e as Error).message})`,
      };
    }
  }

  /** GET cru, já com limitador e User-Agent, sem robots (usado só para o próprio robots.txt). */
  private async bruto(url: string, aceitar: string): Promise<Dispatcher.ResponseData> {
    await this.limitador.aguardar(new URL(url).host);
    return request(url, {
      method: 'GET',
      headers: {
        'user-agent': this.userAgent,
        accept: aceitar,
        'accept-language': 'pt-BR,pt;q=0.9',
      },
      dispatcher: this.opcoes.dispatcher,
      headersTimeout: this.opcoes.timeoutMs ?? 60_000,
      bodyTimeout: this.opcoes.timeoutMs ?? 60_000,
    });
  }

  /** GET respeitando robots em cada salto; devolve a resposta final (2xx). */
  private async obter(
    url: string,
    aceitar: string,
  ): Promise<{ url: string; resp: Dispatcher.ResponseData }> {
    let atual = new URL(url).href;
    for (let salto = 0; salto <= MAX_REDIRECIONAMENTOS; salto++) {
      const situacao = await this.situacaoRobots(atual);
      if (!podeBuscar(situacao, this.userAgent, atual)) {
        throw new ErroRobots(atual, situacao.tipo === 'bloqueado' ? situacao.motivo : 'Disallow');
      }
      this.opcoes.log?.(`GET ${atual}`);
      const resp = await this.bruto(atual, aceitar);
      const bloqueio = detectarBloqueioResposta(resp.statusCode, resp.headers, atual);
      if (bloqueio) {
        await resp.body.dump();
        throw new ErroBloqueio(atual, bloqueio);
      }
      if (resp.statusCode >= 300 && resp.statusCode < 400) {
        const destino = cabecalho(resp.headers, 'location');
        await resp.body.dump();
        if (!destino) throw new ErroHttp(atual, resp.statusCode);
        atual = new URL(destino, atual).href;
        continue;
      }
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        const corpo = await resp.body.text().catch(() => '');
        const b = corpo ? detectarBloqueioHtml(corpo) : null;
        if (b) throw new ErroBloqueio(atual, b);
        throw new ErroHttp(atual, resp.statusCode);
      }
      return { url: atual, resp };
    }
    throw new Error(`Redirecionamentos demais a partir de ${url}.`);
  }

  /** Baixa uma página de texto (HTML). Com captcha/login lança ErroBloqueio, salvo `permitirBloqueio`. */
  async obterTexto(
    url: string,
    opcoes: { permitirBloqueio?: boolean } = {},
  ): Promise<RespostaTexto> {
    const { url: final, resp } = await this.obter(url, 'text/html,application/xhtml+xml,*/*;q=0.8');
    const tipoConteudo = cabecalho(resp.headers, 'content-type') ?? '';
    const dados = Buffer.from(await resp.body.arrayBuffer());
    const corpo = decodificar(dados, tipoConteudo);
    const bloqueio =
      /html/i.test(tipoConteudo) || /^\s*</.test(corpo) ? detectarBloqueioHtml(corpo) : null;
    if (bloqueio && !opcoes.permitirBloqueio) throw new ErroBloqueio(final, bloqueio);
    return { url: final, status: resp.statusCode, corpo, tipoConteudo, bloqueio };
  }

  /** Baixa um arquivo binário (PDF). Recusa HTML no lugar do PDF (geralmente captcha/login). */
  async obterBinario(url: string): Promise<RespostaBinaria> {
    const { url: final, resp } = await this.obter(url, 'application/pdf,*/*;q=0.8');
    const tipoConteudo = cabecalho(resp.headers, 'content-type') ?? '';
    const max = this.opcoes.maxBytes ?? 80 * 1024 * 1024;
    const partes: Buffer[] = [];
    let total = 0;
    for await (const parte of resp.body) {
      total += (parte as Buffer).length;
      if (total > max) {
        resp.body.destroy();
        throw new Error(`O arquivo ${final} passa de ${Math.round(max / 1024 / 1024)} MB.`);
      }
      partes.push(parte as Buffer);
    }
    const dados = Buffer.concat(partes);
    if (/html/i.test(tipoConteudo)) {
      const b = detectarBloqueioHtml(decodificar(dados, tipoConteudo));
      if (b) throw new ErroBloqueio(final, b);
    }
    return { url: final, status: resp.statusCode, dados, tipoConteudo };
  }
}

function cabecalho(h: Dispatcher.ResponseData['headers'], nome: string): string | undefined {
  const v = h[nome];
  return Array.isArray(v) ? v[0] : v;
}

/** Decodifica pelo charset do Content-Type (padrão UTF-8). */
export function decodificar(dados: Buffer, tipoConteudo: string): string {
  const charset = /charset=([^;\s]+)/i.exec(tipoConteudo)?.[1]?.replace(/"/g, '') ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(dados);
  } catch {
    return new TextDecoder('utf-8').decode(dados);
  }
}
