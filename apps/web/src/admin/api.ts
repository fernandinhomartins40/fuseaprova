/**
 * Cliente HTTP próprio do painel admin. Tipado pelos contratos de `ROTAS` (@fuse/shared/api):
 * caminho relativo `/api`, cookie de sessão (credentials: 'include'), corpo validado com o
 * mesmo schema Zod que a API usa, e erros no formato `{ erro, codigo?, campos? }`.
 */
import {
  erroDeValidacao,
  montarCaminho,
  PREFIXO_API,
  ROTAS,
  type CorpoDe,
  type NomeRota,
  type QueryDe,
  type RespostaDe,
} from '@fuse/shared/api';

export const MENSAGEM_SEM_CONEXAO =
  'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.';

/** Erro da API já com a mensagem pronta para o usuário (campo `erro`). */
export class ErroAdminApi extends Error {
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
    this.name = 'ErroAdminApi';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }
}

/** Mensagem legível de qualquer erro (para os estados de erro das telas). */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroAdminApi) return e.message;
  if (e instanceof Error && e.message) return MENSAGEM_SEM_CONEXAO;
  return MENSAGEM_SEM_CONEXAO;
}

/** Erros por campo (validação). */
export function camposDoErro(e: unknown): Record<string, string> {
  return e instanceof ErroAdminApi ? e.campos : {};
}

type ValorQuery = string | number | boolean | null | undefined;

export function montarQuery(query: Record<string, ValorQuery> | undefined): string {
  if (!query) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

type Opcoes<N extends NomeRota> = {
  params?: Record<string, string>;
} & ([QueryDe<N>] extends [never] ? { query?: never } : { query?: QueryDe<N> }) &
  ([CorpoDe<N>] extends [never] ? { corpo?: never } : { corpo: CorpoDe<N> });

async function lerErro(res: Response): Promise<ErroAdminApi> {
  let corpo: unknown = null;
  try {
    corpo = await res.json();
  } catch {
    /* corpo vazio ou não JSON */
  }
  if (corpo && typeof corpo === 'object' && 'erro' in corpo) {
    const c = corpo as { erro: unknown; codigo?: unknown; campos?: unknown };
    return new ErroAdminApi(
      String(c.erro),
      res.status,
      typeof c.codigo === 'string' ? c.codigo : undefined,
      c.campos && typeof c.campos === 'object' ? (c.campos as Record<string, string>) : {},
    );
  }
  if (res.status === 401) return new ErroAdminApi('Entre na sua conta para continuar.', 401);
  if (res.status === 403) return new ErroAdminApi('Você não tem permissão para isso.', 403);
  return new ErroAdminApi('Algo deu errado do nosso lado. Tente de novo em instantes.', res.status);
}

/* ------------------------------------------------ sessão perdida (S-19) */

/** Códigos do 403 que pedem o 2FA de novo (não configurado ou não verificado nesta sessão). */
const CODIGOS_2FA = new Set(['dois_fatores_necessario', 'dois_fatores_pendente']);

type OuvinteSessao = (motivo: 'login' | 'dois_fatores') => void;
let ouvinteSessao: OuvinteSessao | null = null;

/**
 * O layout do painel registra aqui o que fazer quando a sessão cai (401 → página de login do
 * papel) ou o 2FA vence (403 de 2FA → /super/2fa). Devolve a função de remoção.
 */
export function aoPerderSessao(fn: OuvinteSessao): () => void {
  ouvinteSessao = fn;
  return () => {
    if (ouvinteSessao === fn) ouvinteSessao = null;
  };
}

function avisarSessao(e: ErroAdminApi): void {
  if (e.status === 401 && e.codigo !== 'credenciais_invalidas') ouvinteSessao?.('login');
  else if (e.status === 403 && e.codigo && CODIGOS_2FA.has(e.codigo)) ouvinteSessao?.('dois_fatores');
}

async function enviar(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { credentials: 'include', ...init });
  } catch {
    throw new ErroAdminApi(MENSAGEM_SEM_CONEXAO, 0, 'sem_conexao');
  }
}

interface ProblemaZod {
  code: string;
  received?: unknown;
  type?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  validation?: unknown;
}

/** Mensagens padrão do Zod em português (as mensagens próprias dos schemas têm prioridade). */
export function mapaErrosPtBr(p: ProblemaZod, _ctx: { defaultError: string }): { message: string } {
  switch (p.code) {
    case 'invalid_type':
      return { message: p.received === 'undefined' || p.received === 'null' ? 'Campo obrigatório.' : 'Valor inválido.' };
    case 'too_small':
      if (p.type === 'string') {
        return { message: Number(p.minimum) <= 1 ? 'Campo obrigatório.' : `Use pelo menos ${p.minimum} caracteres.` };
      }
      if (p.type === 'array') return { message: `Informe pelo menos ${p.minimum}.` };
      return { message: `O valor mínimo é ${p.minimum}.` };
    case 'too_big':
      if (p.type === 'string') return { message: `Use no máximo ${p.maximum} caracteres.` };
      if (p.type === 'array') return { message: `Informe no máximo ${p.maximum}.` };
      return { message: `O valor máximo é ${p.maximum}.` };
    case 'invalid_string':
      return { message: p.validation === 'url' ? 'Link inválido.' : 'Formato inválido.' };
    case 'invalid_enum_value':
    case 'invalid_union':
    case 'invalid_literal':
      return { message: 'Escolha uma opção válida.' };
    default:
      return { message: 'Valor inválido.' };
  }
}

type ParametrosParse = { errorMap: (p: ProblemaZod, c: { defaultError: string }) => { message: string } };

/** Chama uma rota de `ROTAS` pelo nome. */
export async function api<N extends NomeRota>(
  nome: N,
  ...[opcoes]: [CorpoDe<N>] extends [never] ? [Opcoes<N>?] : [Opcoes<N>]
): Promise<RespostaDe<N>> {
  const def = ROTAS[nome];
  const o = (opcoes ?? {}) as { params?: Record<string, string>; query?: object; corpo?: unknown };
  const caminho = montarCaminho(def.caminho, o.params ?? {});
  const url = `${PREFIXO_API}${caminho}${montarQuery(o.query as Record<string, ValorQuery>)}`;

  const init: RequestInit = { method: def.metodo, headers: { accept: 'application/json' } };
  if ('corpo' in def && def.corpo) {
    const r = def.corpo.safeParse(o.corpo ?? {}, {
      errorMap: mapaErrosPtBr,
    } as ParametrosParse as never);
    if (!r.success) {
      const e = erroDeValidacao(r.error);
      throw new ErroAdminApi(e.erro, 400, 'validacao', e.campos ?? {});
    }
    init.body = JSON.stringify(r.data);
    init.headers = { ...init.headers, 'content-type': 'application/json' };
  }

  const res = await enviar(url, init);
  if (!res.ok) {
    const erro = await lerErro(res);
    avisarSessao(erro);
    throw erro;
  }
  if (res.status === 204 || def.resposta === null) return undefined as RespostaDe<N>;
  return (await res.json()) as RespostaDe<N>;
}

/** POST /admin/uploads (multipart, campo `arquivo`). */
export async function enviarImagem(arquivo: File): Promise<RespostaDe<'adminUpload'>> {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  const res = await enviar(`${PREFIXO_API}${ROTAS.adminUpload.caminho}`, {
    method: 'POST',
    body: dados,
  });
  if (!res.ok) {
    const erro = await lerErro(res);
    avisarSessao(erro);
    throw erro;
  }
  return (await res.json()) as RespostaDe<'adminUpload'>;
}
