/**
 * D44: ferramenta pública "Descubra seu cargo" (edital de Palmital 2026). A IA (DeepSeek pelo
 * Fusai) só interpreta um curso digitado e responde dúvidas com base no texto do edital; quem diz
 * se a pessoa atende ao cargo são as regras de @fuse/shared/palmital2026.
 */
import { z } from 'zod';

const CodigoCargo = z.coerce.number().int().min(101).max(410);

export const EditalCursoEntrada = z.object({
  cargo: CodigoCargo,
  curso: z
    .string()
    .trim()
    .min(3, 'Escreva o nome do seu curso.')
    .max(150, 'Use no máximo 150 caracteres.'),
});
export type EditalCursoEntrada = z.infer<typeof EditalCursoEntrada>;

export const EditalCursoResposta = z.object({
  /** consta: o curso é um dos citados; nao_consta: não é; confirmar: depende da FAU. */
  veredito: z.enum(['consta', 'nao_consta', 'confirmar']),
  explicacao: z.string(),
});
export type EditalCursoResposta = z.infer<typeof EditalCursoResposta>;

export const EditalPerguntaEntrada = z.object({
  pergunta: z
    .string()
    .trim()
    .min(5, 'Escreva a sua dúvida.')
    .max(500, 'Use no máximo 500 caracteres.'),
  cargo: CodigoCargo.optional(),
});
export type EditalPerguntaEntrada = z.infer<typeof EditalPerguntaEntrada>;

export const EditalPerguntaResposta = z.object({ resposta: z.string() });
export type EditalPerguntaResposta = z.infer<typeof EditalPerguntaResposta>;
