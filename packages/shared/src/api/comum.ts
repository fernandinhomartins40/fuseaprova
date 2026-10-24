/**
 * Peças comuns dos contratos da API (prefixo /api).
 *
 * Convenções:
 * - Entradas: schemas `*Entrada` (corpo), `*Query` (query string, com coerção) e `*Params`.
 * - Respostas: schemas `*Resposta`. Datas viajam como ISO 8601 (string) e dias como 'AAAA-MM-DD'.
 * - Erros: sempre `{ erro, codigo?, campos? }` com mensagem pronta para o usuário.
 */
import { z } from 'zod';
import {
  AREAS_CARGO,
  DIVISOES,
  ESCOLARIDADES,
  LETRAS,
  ORIGENS_QUESTAO,
  SLUGS_DISCIPLINA,
  STATUS_CONCURSO,
  STATUS_PEDIDO,
  STATUS_QUESTAO,
  TIPOS_LICAO,
  TIPOS_SESSAO_ESTUDO,
} from '../dominio.js';
import { ehDiaValido } from '../datas.js';

/* ------------------------------------------------------------------ erros */

export const CODIGOS_ERRO = {
  validacao: 400,
  credenciais_invalidas: 401,
  nao_autenticado: 401,
  webhook_token_invalido: 401,
  sem_acesso: 402,
  proibido: 403,
  nao_encontrado: 404,
  conta_existente: 409,
  conflito: 409,
  licao_bloqueada: 409,
  sem_vidas: 409,
  gemas_insuficientes: 409,
  limite_protetores: 409,
  sessao_encerrada: 409,
  simulado_encerrado: 409,
  questoes_insuficientes: 409,
  fora_do_prazo: 409,
  assunto_a_classificar: 422,
  token_invalido: 400,
  limite_requisicoes: 429,
  pix_indisponivel: 502,
  interno: 500,
} as const;
export type CodigoErro = keyof typeof CODIGOS_ERRO;

export const MENSAGENS_ERRO: Record<CodigoErro, string> = {
  validacao: 'Confira os campos destacados.',
  credenciais_invalidas: 'E-mail ou senha incorretos.',
  nao_autenticado: 'Entre na sua conta para continuar.',
  webhook_token_invalido: 'Token do webhook inválido.',
  sem_acesso: 'Seu acesso ainda não foi liberado. Conclua o pagamento via Pix.',
  proibido: 'Você não tem permissão para isso.',
  nao_encontrado: 'Não encontramos o que você procurou.',
  conta_existente: 'Já existe uma conta com este e-mail ou CPF. Entre com sua senha.',
  conflito: 'Essa ação não pode ser feita agora.',
  licao_bloqueada: 'Essa lição ainda está bloqueada. Conclua as anteriores primeiro.',
  sem_vidas: 'Suas vidas acabaram. Pratique seus erros para recuperar.',
  gemas_insuficientes: 'Você não tem gemas suficientes.',
  limite_protetores: 'Você já tem 2 protetores guardados, que é o máximo.',
  sessao_encerrada: 'Esta sessão de estudo já foi encerrada.',
  simulado_encerrado: 'O tempo deste simulado acabou e a prova foi entregue.',
  questoes_insuficientes: 'Ainda não há questões suficientes para montar isso.',
  fora_do_prazo: 'O prazo para essa ação já passou.',
  assunto_a_classificar:
    'Classifique o assunto da questão antes de publicar (ela ainda está em "A classificar").',
  token_invalido: 'Este link é inválido ou expirou. Peça um novo.',
  limite_requisicoes: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  pix_indisponivel: 'Não foi possível gerar o Pix agora. Tente de novo em alguns minutos.',
  interno: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
};

/** Formato de erro de toda a API. `campos` traz erros por campo de formulário. */
export const ErroApi = z.object({
  erro: z.string(),
  codigo: z.string().optional(),
  campos: z.record(z.string()).optional(),
});
export type ErroApi = z.infer<typeof ErroApi>;

/** Monta o corpo de erro padrão. */
export function erroApi(
  codigo: CodigoErro,
  erro?: string,
  campos?: Record<string, string>,
): ErroApi {
  return { erro: erro ?? MENSAGENS_ERRO[codigo], codigo, ...(campos ? { campos } : {}) };
}

/** Converte um ZodError em `{ erro, codigo: 'validacao', campos }`. */
export function erroDeValidacao(e: z.ZodError): ErroApi {
  const campos: Record<string, string> = {};
  for (const issue of e.issues) {
    const chave = issue.path.join('.') || '_';
    if (!(chave in campos)) campos[chave] = issue.message;
  }
  const primeira = e.issues[0]?.message;
  return erroApi('validacao', e.issues.length === 1 && primeira ? primeira : undefined, campos);
}

/* --------------------------------------------------------------- primitivos */

export const Uuid = z.string().uuid('Identificador inválido.');
export const DataHora = z.string().datetime({ offset: true });
export const Dia = z.string().refine(ehDiaValido, 'Data inválida (use AAAA-MM-DD).');
export const Hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido (use HH:MM).');

export const ZStatusConcurso = z.enum(STATUS_CONCURSO);
export const ZAreaCargo = z.enum(AREAS_CARGO);
export const ZSlugDisciplina = z.enum(SLUGS_DISCIPLINA);
export const ZEscolaridade = z.enum(ESCOLARIDADES);
export const ZOrigemQuestao = z.enum(ORIGENS_QUESTAO);
export const ZStatusQuestao = z.enum(STATUS_QUESTAO);
export const ZLetra = z.enum(LETRAS);
export const ZTipoLicao = z.enum(TIPOS_LICAO);
export const ZStatusPedido = z.enum(STATUS_PEDIDO);
export const ZTipoSessaoEstudo = z.enum(TIPOS_SESSAO_ESTUDO);
export const ZDivisao = z.enum(DIVISOES);

export const IdParams = z.object({ id: Uuid });
export type IdParams = z.infer<typeof IdParams>;

export const OkResposta = z.object({ ok: z.literal(true) });
export type OkResposta = z.infer<typeof OkResposta>;

/** Booleano vindo de query string ("true"/"false"/"1"/"0"). */
export const BoolQuery = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const PaginacaoQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginacaoQuery = z.infer<typeof PaginacaoQuery>;

/** Resposta paginada genérica. */
export function paginada<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    itens: z.array(item),
    total: z.number().int().min(0),
    pagina: z.number().int().min(1),
    porPagina: z.number().int().min(1),
  });
}

/* --------------------------------------------------------- blocos de domínio */

export const Alternativa = z.object({ letra: ZLetra, texto: z.string().min(1) });
export type Alternativa = z.infer<typeof Alternativa>;

/** Exatamente 5 alternativas, A a E, nessa ordem. */
export const Alternativas = z
  .array(Alternativa)
  .length(5, 'A questão precisa de 5 alternativas.')
  .refine(
    (l) => l.map((a) => a.letra).join('') === 'ABCDE',
    'As alternativas devem ser A, B, C, D e E, em ordem.',
  );

export const DisciplinaResumo = z.object({
  id: Uuid,
  slug: ZSlugDisciplina,
  nome: z.string(),
  cor: z.string(),
});
export type DisciplinaResumo = z.infer<typeof DisciplinaResumo>;

export const Distribuicao = z.object({
  portugues: z.number().int().min(0),
  matematica: z.number().int().min(0),
  gerais: z.number().int().min(0),
  especificos: z.number().int().min(0),
  /** Pesos por bloco, se o edital mudar o padrão 2,0/2,8. */
  pesos: z
    .object({
      portugues: z.number().positive(),
      matematica: z.number().positive(),
      gerais: z.number().positive(),
      especificos: z.number().positive(),
    })
    .optional(),
});
export type Distribuicao = z.infer<typeof Distribuicao>;

export const LinkOficial = z.object({
  titulo: z.string().min(1),
  url: z.string().url('Link inválido.'),
});
export type LinkOficial = z.infer<typeof LinkOficial>;

export const CargoResumo = z.object({
  id: Uuid,
  nome: z.string(),
  area: ZAreaCargo,
  escolaridade: ZEscolaridade.nullable(),
  vagas: z.number().int().nullable(),
  /** true = cargo genérico (antes do edital); false = cargo do edital. */
  generico: z.boolean(),
  distribuicao: Distribuicao,
});
export type CargoResumo = z.infer<typeof CargoResumo>;

export const Avatar = z.object({ iniciais: z.string(), cor: z.string() });

/**
 * Questão como o aluno a vê ANTES de responder. Nunca inclui gabarito, explicação ou dica.
 */
export const QuestaoParaAluno = z.object({
  id: Uuid,
  origem: ZOrigemQuestao,
  /** "FAU-Unicentro · Órgão · Ano" ou "Questão Fuse Aprova · estilo FAU". */
  chipOrigem: z.string(),
  provaOrigem: z
    .object({ orgao: z.string(), ano: z.number().int().nullable(), cargo: z.string().nullable() })
    .nullable(),
  disciplina: DisciplinaResumo,
  assunto: z.object({ id: Uuid, nome: z.string() }),
  dificuldade: z.number().int().min(1).max(3),
  textoApoio: z.string().nullable(),
  enunciado: z.string(),
  alternativas: Alternativas,
  /** Há dica disponível (custa 5 gemas). */
  temDica: z.boolean(),
  /** Veio da fila de revisão vencida. */
  revisao: z.boolean(),
});
export type QuestaoParaAluno = z.infer<typeof QuestaoParaAluno>;

/** Dica da lição (cartão antes da 1ª questão). */
export const DicaLicao = z.object({
  titulo: z.string(),
  texto: z.string(),
  exemplo: z.string().nullable(),
});
export type DicaLicao = z.infer<typeof DicaLicao>;

/** Gabarito e comentários, depois da resposta. */
export const CorrecaoQuestao = z.object({
  gabarito: ZLetra,
  explicacao: z.string(),
  dicaBolso: z.string().nullable(),
});
export type CorrecaoQuestao = z.infer<typeof CorrecaoQuestao>;

export const ContadoresUsuario = z.object({
  xpTotal: z.number().int(),
  gemas: z.number().int(),
  vidas: z.number().int().min(0).max(5),
  proximaVidaEm: DataHora.nullable(),
  ofensiva: z.number().int(),
  protetores: z.number().int(),
  revisoesPendentes: z.number().int(),
});
export type ContadoresUsuario = z.infer<typeof ContadoresUsuario>;
