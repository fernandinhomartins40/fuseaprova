/**
 * Cliente HTTP da PWA, tipado pelos contratos de `ROTAS` (@fuse/shared/api).
 *
 * - Caminho relativo `/api`, sessão por cookie httpOnly (`credentials: 'include'`). No app
 *   nativo a URL é absoluta e o `fetch` vai pelo HTTP nativo do Capacitor (cookie do sistema).
 * - O corpo é validado no cliente com o MESMO schema Zod que a API usa.
 * - Erros sempre no formato `{ erro, codigo?, campos? }` → `ErroApi` com a mensagem pronta.
 * - Tratamento global: 401 → /entrar e 402 → /pagamento (via `aoRedirecionar`).
 */
import {
  erroDeValidacao,
  MENSAGENS_ERRO,
  montarCaminho,
  PREFIXO_API,
  ROTAS,
  type CorpoDe,
  type NomeRota,
  type QueryDe,
  type RespostaDe,
} from '@fuse/shared/api';
import { urlDoServidor } from '../nativo/plataforma';

export const MENSAGEM_SEM_CONEXAO =
  'Sem conexão com a internet. Verifique sua rede e tente de novo.';

export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string | undefined;
  readonly campos: Record<string, string>;

  constructor(
    mensagem: string,
    status: number,
    codigo?: string,
    campos: Record<string, string> = {},
  ) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }

  /** Falha de rede (sem resposta do servidor). */
  get semConexao(): boolean {
    return this.status === 0;
  }
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroApi) return e.message;
  return MENSAGENS_ERRO.interno;
}

export function camposDoErro(e: unknown): Record<string, string> {
  return e instanceof ErroApi ? e.campos : {};
}

/* -------------------------------------------------- redirecionamento global */

export type Redirecionamento = '/entrar' | '/pagamento';
type Ouvinte = (destino: Redirecionamento) => void;
const ouvintes = new Set<Ouvinte>();

/** O App registra aqui a navegação para 401/402. Devolve a função de remoção. */
export function aoRedirecionar(fn: Ouvinte): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function redirecionar(destino: Redirecionamento) {
  for (const fn of ouvintes) fn(destino);
}

/* ------------------------------------------------------------------ chamada */

type ValorQuery = string | number | boolean | null | undefined;

function montarQuery(query: Record<string, ValorQuery> | undefined): string {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export type OpcoesChamada<N extends NomeRota> = {
  params?: Record<string, string>;
  /** Não redirecionar em 401/402 (ex.: a tela de boas-vindas só consulta a sessão). */
  semRedirecionar?: boolean;
  signal?: AbortSignal;
} & ([QueryDe<N>] extends [never] ? { query?: never } : { query?: QueryDe<N> }) &
  ([CorpoDe<N>] extends [never] ? { corpo?: never } : { corpo?: CorpoDe<N> });

async function lerErro(res: Response): Promise<ErroApi> {
  let corpo: unknown = null;
  try {
    corpo = await res.json();
  } catch {
    /* sem corpo JSON */
  }
  if (corpo && typeof corpo === 'object' && 'erro' in corpo) {
    const c = corpo as { erro: unknown; codigo?: unknown; campos?: unknown };
    return new ErroApi(
      String(c.erro),
      res.status,
      typeof c.codigo === 'string' ? c.codigo : undefined,
      c.campos && typeof c.campos === 'object' ? (c.campos as Record<string, string>) : {},
    );
  }
  if (res.status === 401)
    return new ErroApi(MENSAGENS_ERRO.nao_autenticado, 401, 'nao_autenticado');
  if (res.status === 402) return new ErroApi(MENSAGENS_ERRO.sem_acesso, 402, 'sem_acesso');
  if (res.status === 429)
    return new ErroApi(MENSAGENS_ERRO.limite_requisicoes, 429, 'limite_requisicoes');
  return new ErroApi(MENSAGENS_ERRO.interno, res.status, 'interno');
}

/** Chama uma rota de `ROTAS` pelo nome, com tipos de entrada e saída do contrato. */
export async function chamar<N extends NomeRota>(
  nome: N,
  ...[opcoes]: [CorpoDe<N>] extends [never] ? [OpcoesChamada<N>?] : [OpcoesChamada<N>?]
): Promise<RespostaDe<N>> {
  const def = ROTAS[nome];
  const o = (opcoes ?? {}) as {
    params?: Record<string, string>;
    query?: object;
    corpo?: unknown;
    semRedirecionar?: boolean;
    signal?: AbortSignal;
  };
  const caminho = montarCaminho(def.caminho, o.params ?? {});
  const url = urlDoServidor(
    `${PREFIXO_API}${caminho}${montarQuery(o.query as Record<string, ValorQuery>)}`,
  );

  const init: RequestInit = {
    method: def.metodo,
    credentials: 'include',
    headers: { accept: 'application/json' },
    signal: o.signal,
  };
  if ('corpo' in def && def.corpo) {
    const r = def.corpo.safeParse(o.corpo ?? undefined);
    if (!r.success) {
      const e = erroDeValidacao(r.error);
      throw new ErroApi(e.erro, 400, 'validacao', e.campos ?? {});
    }
    if (r.data !== undefined) {
      init.body = JSON.stringify(r.data);
      init.headers = { ...init.headers, 'content-type': 'application/json' };
    }
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ErroApi(MENSAGEM_SEM_CONEXAO, 0, 'sem_conexao');
  }

  if (!res.ok) {
    const erro = await lerErro(res);
    if (!o.semRedirecionar) {
      // 401 de credenciais erradas (login) não redireciona: o formulário mostra o erro.
      if (res.status === 401 && def.guarda !== 'nenhuma') redirecionar('/entrar');
      if (res.status === 402) redirecionar('/pagamento');
    }
    throw erro;
  }
  if (res.status === 204 || def.resposta === null) return undefined as RespostaDe<N>;
  return (await res.json()) as RespostaDe<N>;
}
