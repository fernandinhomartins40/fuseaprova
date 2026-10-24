import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { instalarMensagensPtBr, mapaErrosPtBr } from './zod-ptbr.js';
import { ImportacaoDetalhe, QuestaoAdmin, QuestoesLoteEntrada } from './admin-conteudo.js';

const msg = (schema: z.ZodTypeAny, valor: unknown) => {
  const r = schema.safeParse(valor, { errorMap: mapaErrosPtBr });
  return r.success ? null : r.error.issues[0]!.message;
};

describe('mensagens do Zod em português (D8)', () => {
  afterEach(() => z.setErrorMap(z.defaultErrorMap));

  it('traduz os códigos comuns', () => {
    expect(msg(z.object({ a: z.string() }), {})).toBe('Campo obrigatório.');
    expect(msg(z.string(), 1)).toBe('Valor inválido: esperado texto.');
    expect(msg(z.number(), 'x')).toBe('Valor inválido: esperado número.');
    expect(msg(z.symbol(), 'x')).toBe('Valor inválido: esperado symbol.');
    expect(msg(z.literal('X'), 'Y')).toBe('Valor inválido.');
    expect(msg(z.object({}).strict(), { b: 1 })).toBe('Campo não reconhecido: b.');
    expect(msg(z.union([z.string(), z.number()]), true)).toBe('Valor inválido.');
    expect(msg(z.enum(['a', 'b']), 'c')).toBe('Opção inválida. Use: a, b.');
    expect(msg(z.date(), new Date('x'))).toBe('Data inválida.');
    expect(msg(z.string().email(), 'x')).toBe('E-mail inválido.');
    expect(msg(z.string().url(), 'x')).toBe('Link inválido.');
    expect(msg(z.string().uuid(), 'x')).toBe('Identificador inválido.');
    expect(msg(z.string().datetime(), 'x')).toBe('Data e hora inválidas.');
    expect(msg(z.string().regex(/a/), 'b')).toBe('Formato inválido.');
    expect(msg(z.string().min(3), 'a')).toBe('Use pelo menos 3 caracteres.');
    expect(msg(z.array(z.number()).min(2), [])).toBe('Informe pelo menos 2 item(ns).');
    expect(msg(z.number().min(5), 1)).toBe('O valor mínimo é 5.');
    expect(msg(z.string().max(1), 'ab')).toBe('Use no máximo 1 caracteres.');
    expect(msg(z.array(z.number()).max(0), [1])).toBe('Informe no máximo 0 item(ns).');
    expect(msg(z.number().max(1), 2)).toBe('O valor máximo é 1.');
    expect(msg(z.number().multipleOf(2), 3)).toBe('O valor precisa ser múltiplo de 2.');
    expect(msg(z.number().finite(), Infinity)).toBe('Número inválido.');
    expect(
      msg(
        z.string().superRefine((_v, ctx) => ctx.addIssue({ code: 'custom' })),
        'a',
      ),
    ).toBe('Valor inválido.');
    expect(
      mapaErrosPtBr({ code: 'nao_existe' as never, path: [], message: '' } as never, {
        defaultError: 'padrão',
        data: null,
      }).message,
    ).toBe('padrão');
  });

  it('mantém as mensagens próprias dos schemas', () => {
    expect(msg(z.string().min(3, 'Curto demais.'), 'a')).toBe('Curto demais.');
  });

  it('instala como padrão global', () => {
    instalarMensagensPtBr();
    const r = z.string().safeParse(1);
    expect(r.success ? '' : r.error.issues[0]!.message).toBe('Valor inválido: esperado texto.');
    const r2 = z.string({ required_error: 'Informe o nome.' }).safeParse(undefined);
    expect(r2.success ? '' : r2.error.issues[0]!.message).toBe('Informe o nome.');
  });

  it('lote exige motivo para retirar e anular', () => {
    const id = '3f0c7a8e-2b1d-4c5e-9f00-0123456789ab';
    expect(QuestoesLoteEntrada.safeParse({ ids: [id], acao: 'retirar' }).success).toBe(false);
    expect(msg(QuestoesLoteEntrada, { ids: [id], acao: 'anular' })).toBe('Informe o motivo da anulação.');
    expect(msg(QuestoesLoteEntrada, { ids: [id], acao: 'retirar', motivo: 'x' })).toBe('Informe o motivo da retirada.');
    expect(QuestoesLoteEntrada.safeParse({ ids: [id], acao: 'retirar', motivo: 'erro no gabarito' }).success).toBe(true);
    expect(QuestoesLoteEntrada.safeParse({ ids: [id], acao: 'publicar' }).success).toBe(true);
  });

  it('campos novos têm padrão null (compatível)', () => {
    const c = ImportacaoDetalhe.shape.confronto.element.parse({
      numero: 1,
      questaoId: null,
      gabaritoDefinitivo: 'A',
      observacao: null,
    });
    expect(c.gabaritoExtraido).toBeNull();
    expect(QuestaoAdmin.shape.prova.parse(undefined)).toBeNull();
  });
});
