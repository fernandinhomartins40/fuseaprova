/**
 * Erros da API: sempre `{ erro, codigo?, campos? }` em português (CLAUDE.md, PRD 10).
 */
import { CODIGOS_ERRO, MENSAGENS_ERRO, type CodigoErro, type ErroApi } from '@fuse/shared/api';

export class ErroHttp extends Error {
  readonly status: number;
  readonly codigo: CodigoErro;
  readonly campos: Record<string, string> | undefined;

  constructor(codigo: CodigoErro, mensagem?: string, campos?: Record<string, string>) {
    super(mensagem ?? MENSAGENS_ERRO[codigo]);
    this.codigo = codigo;
    this.status = CODIGOS_ERRO[codigo];
    this.campos = campos;
  }

  corpo(): ErroApi {
    return { erro: this.message, codigo: this.codigo, ...(this.campos ? { campos: this.campos } : {}) };
  }
}

/** Atalho: `throw falha('nao_encontrado')`. */
export function falha(
  codigo: CodigoErro,
  mensagem?: string,
  campos?: Record<string, string>,
): ErroHttp {
  return new ErroHttp(codigo, mensagem, campos);
}

/** Garante que o valor existe; senão 404. */
export function existe<T>(valor: T | null | undefined, mensagem?: string): T {
  if (valor === null || valor === undefined) throw falha('nao_encontrado', mensagem);
  return valor;
}

/** Erro de violação de unicidade do Postgres (23505). */
export function ehViolacaoUnica(e: unknown): boolean {
  const cod = (e as { code?: string; cause?: { code?: string } })?.code ??
    (e as { cause?: { code?: string } })?.cause?.code;
  return cod === '23505';
}
