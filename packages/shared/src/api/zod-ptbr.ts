/**
 * D8: mensagens padrão do Zod em português (as mensagens próprias dos schemas têm prioridade).
 *
 *   instalarMensagensPtBr()   // global (API e PWA): não sobrepõe required_error nem mensagens próprias
 *
 * Evite `safeParse(v, { errorMap })`: o mapa por chamada tem prioridade sobre o `required_error`.
 */
import { z } from 'zod';

const NOMES_TIPO: Record<string, string> = {
  string: 'texto',
  number: 'número',
  integer: 'número inteiro',
  boolean: 'verdadeiro ou falso',
  object: 'objeto',
  array: 'lista',
  date: 'data',
  null: 'nulo',
  undefined: 'vazio',
};

const tipo = (t: string) => NOMES_TIPO[t] ?? t;

export const mapaErrosPtBr: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Campo obrigatório.' };
      return { message: `Valor inválido: esperado ${tipo(issue.expected)}.` };
    case z.ZodIssueCode.invalid_literal:
      return { message: 'Valor inválido.' };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Campo não reconhecido: ${issue.keys.join(', ')}.` };
    case z.ZodIssueCode.invalid_union:
    case z.ZodIssueCode.invalid_union_discriminator:
    case z.ZodIssueCode.invalid_arguments:
    case z.ZodIssueCode.invalid_return_type:
    case z.ZodIssueCode.invalid_intersection_types:
    case z.ZodIssueCode.custom:
      return { message: 'Valor inválido.' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Opção inválida. Use: ${issue.options.join(', ')}.` };
    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida.' };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido.' };
      if (issue.validation === 'url') return { message: 'Link inválido.' };
      if (issue.validation === 'uuid') return { message: 'Identificador inválido.' };
      if (issue.validation === 'datetime') return { message: 'Data e hora inválidas.' };
      return { message: 'Formato inválido.' };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Use pelo menos ${issue.minimum} caracteres.` };
      if (issue.type === 'array') return { message: `Informe pelo menos ${issue.minimum} item(ns).` };
      return { message: `O valor mínimo é ${issue.minimum}.` };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Use no máximo ${issue.maximum} caracteres.` };
      if (issue.type === 'array') return { message: `Informe no máximo ${issue.maximum} item(ns).` };
      return { message: `O valor máximo é ${issue.maximum}.` };
    case z.ZodIssueCode.not_multiple_of:
      return { message: `O valor precisa ser múltiplo de ${issue.multipleOf}.` };
    case z.ZodIssueCode.not_finite:
      return { message: 'Número inválido.' };
    default:
      return { message: ctx.defaultError };
  }
};

/** Liga as mensagens em português como padrão global do Zod. */
export function instalarMensagensPtBr(): void {
  z.setErrorMap(mapaErrosPtBr);
}
