/**
 * Meus concursos (D21). O acesso é por concurso: cada concurso é uma compra (o primeiro a preço
 * cheio, os adicionais com desconto) e o aluno acompanha vários, com um ativo por vez.
 * Guarda: exigirLogin (quem ainda não pagou também escolhe o concurso antes de pagar); o que
 * realmente libera conteúdo é o acesso do concurso ativo (exigirAcesso nas rotas de conteúdo).
 */
import { z } from 'zod';
import { Dia, Uuid, ZStatusConcurso } from './comum.js';

/** Dados de um concurso para escolher na lista (sem os cargos; use GET /concursos/:id). */
export const ConcursoResumo = z.object({
  id: Uuid,
  nome: z.string(),
  /** "SIQ · FAU" */
  sigla: z.string(),
  banca: z.string(),
  orgao: z.string(),
  municipio: z.string(),
  uf: z.string(),
  ano: z.number().int(),
  status: ZStatusConcurso,
  statusTexto: z.string(),
  dataProva: Dia.nullable(),
  diasParaProva: z.number().int().nullable(),
  /** Quanto este aluno paga agora por este concurso (cheio no 1º, com desconto nos demais). */
  precoCentavos: z.number().int(),
  /** O preço tem o desconto de quem já tem outro concurso. */
  comDesconto: z.boolean(),
});
export type ConcursoResumo = z.infer<typeof ConcursoResumo>;

export const ConcursoSeguido = ConcursoResumo.extend({
  cargo: z.object({ id: Uuid, nome: z.string() }).nullable(),
  /** Concurso liberado (pago ou liberado pelo admin): dá para usar a trilha dele. */
  acesso: z.boolean(),
  ativo: z.boolean(),
});
export type ConcursoSeguido = z.infer<typeof ConcursoSeguido>;

/** GET /me/concursos (e a resposta de todas as ações abaixo). */
export const MeusConcursosResposta = z.object({
  /** Concurso ativo (o da trilha); null só se não houver nenhum concurso. */
  ativoId: Uuid.nullable(),
  seguidos: z.array(ConcursoSeguido),
  /** Concursos abertos que o aluno ainda não acompanha. */
  disponiveis: z.array(ConcursoResumo),
  /** Preço cheio e o de concurso adicional, para a tela de escolha. */
  precoCheioCentavos: z.number().int(),
  precoAdicionalCentavos: z.number().int(),
});
export type MeusConcursosResposta = z.infer<typeof MeusConcursosResposta>;

/**
 * POST /me/concursos — passa a acompanhar um concurso. Se ele já está liberado para o aluno, vira
 * o ativo; se não, o aluno vai pagar (POST /pagamento/pix com este `concursoId`) e só então ele
 * pode ser ativado. Sem `cargoId`, o cargo é escolhido depois (PATCH /me).
 */
export const SeguirConcursoEntrada = z.object({
  concursoId: Uuid,
  cargoId: Uuid.nullable().default(null),
});
export type SeguirConcursoEntrada = z.input<typeof SeguirConcursoEntrada>;
