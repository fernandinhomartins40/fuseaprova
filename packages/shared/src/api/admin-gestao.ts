/**
 * Admin de gestão de conteúdo (PRD 5.17 e 13): painel de conteúdo e reports. Prefixo /admin,
 * guarda `conteudo` (D24). Pedidos, reembolso, usuários, liberação e auditoria saíram do /admin:
 * são negócio e ficam só no /super.
 */
import { z } from 'zod';
import { STATUS_REPORT, TIPOS_REPORT } from '../dominio.js';
import { DataHora, PaginacaoQuery, paginada, Uuid, ZStatusQuestao } from './comum.js';

/* ------------------------------------------------------------------ painel */

const Percentual = z.number().nullable();

/** Métricas da seção 13 do PRD (calculadas por SQL). */
export const MetricasProduto = z.object({
  /** Cadastro → pago (%). Meta ≥ 40. */
  conversaoCadastroPago: Percentual,
  /** Retenção D7 dos pagantes (%). Meta ≥ 30. */
  retencaoD7: Percentual,
  /** Lições por aluno por semana. Meta ≥ 5. */
  licoesPorAlunoSemana: z.number().nullable(),
  /** Pagantes com ofensiva ≥ 7 (%). Meta ≥ 25. */
  pagantesOfensiva7: Percentual,
  /** Pedidos de reembolso (%). Meta ≤ 5. */
  pedidosReembolso: Percentual,
  /** Melhora de acerto por assunto entre a 1ª e a 5ª tentativa (pontos percentuais). Meta ≥ +20. */
  melhoraAcertoPp: z.number().nullable(),
});
export type MetricasProduto = z.infer<typeof MetricasProduto>;

/** As métricas de aprendizagem, que a equipe de conteúdo acompanha (sem números de venda). */
export const MetricasConteudo = MetricasProduto.pick({ licoesPorAlunoSemana: true, melhoraAcertoPp: true });
export type MetricasConteudo = z.infer<typeof MetricasConteudo>;

/**
 * GET /admin/painel — painel de CONTEÚDO (D24): reports abertos, questões por status e as
 * métricas de aprendizagem. Receita, vendas e conversão ficam só no /super.
 */
export const PainelResposta = z.object({
  reportsAbertos: z.number().int(),
  questoesRascunho: z.number().int(),
  questoesPorStatus: z.record(ZStatusQuestao, z.number().int()),
  metricas: MetricasConteudo,
  geradoEm: DataHora,
});
export type PainelResposta = z.infer<typeof PainelResposta>;

/** GET /super/metricas — as seis métricas da seção 13 (D24: saíram do painel do admin). */
export const MetricasSuperResposta = z.object({
  metricas: MetricasProduto,
  geradoEm: DataHora,
});
export type MetricasSuperResposta = z.infer<typeof MetricasSuperResposta>;

export const METAS_PAINEL = {
  conversaoCadastroPago: { meta: 40, sentido: 'min' },
  retencaoD7: { meta: 30, sentido: 'min' },
  licoesPorAlunoSemana: { meta: 5, sentido: 'min' },
  pagantesOfensiva7: { meta: 25, sentido: 'min' },
  pedidosReembolso: { meta: 5, sentido: 'max' },
  melhoraAcertoPp: { meta: 20, sentido: 'min' },
} as const;

/** POST /super/pagamentos/:id/reembolso — o estorno no Asaas foi pedido; o acesso cai no webhook. */
export const ReembolsoResposta = z.object({
  ok: z.literal(true),
  status: z.literal('aguardando_webhook'),
});

/* ----------------------------------------------------------------- reports */

export const ZTipoReport = z.enum(TIPOS_REPORT);
export const ZStatusReport = z.enum(STATUS_REPORT);

export const ReportAdmin = z.object({
  id: Uuid,
  questao: z.object({
    id: Uuid,
    trecho: z.string(),
    status: ZStatusQuestao,
    reportsAbertos: z.number().int(),
  }),
  usuario: z.object({ id: Uuid, nome: z.string() }).nullable(),
  tipo: ZTipoReport,
  texto: z.string().nullable(),
  status: ZStatusReport,
  resolvidoPor: Uuid.nullable(),
  criadoEm: DataHora,
});
export type ReportAdmin = z.infer<typeof ReportAdmin>;

/** GET /admin/reports */
export const ReportsQuery = PaginacaoQuery.extend({
  status: ZStatusReport.optional(),
  tipo: ZTipoReport.optional(),
  questaoId: Uuid.optional(),
});
export const ReportsListaResposta = paginada(ReportAdmin);
export type ReportsListaResposta = z.infer<typeof ReportsListaResposta>;

/** PATCH /admin/reports/:id — resolver ou descartar. */
export const ReportAtualizarEntrada = z.object({
  status: z.enum(['resolvido', 'descartado']),
  nota: z.string().trim().max(500).optional(),
});
export type ReportAtualizarEntrada = z.infer<typeof ReportAtualizarEntrada>;

/** Ações registradas na tabela `auditoria`. */
export const ACOES_AUDITORIA = [
  'acesso.liberar',
  'acesso.revogar',
  'pedido.reembolso',
  'questao.criar',
  'questao.editar',
  'questao.lote',
  'questao.retirar_origem',
  'questao.auto_retirada',
  'prova.editar',
  'concurso.editar',
  'cargo.editar',
  'edital.salvar',
  'edital.publicar',
  'trilha.editar',
  'report.atualizar',
  'usuario.revogar_sessoes',
  'admin.criar',
  // D13: superadmin
  'superadmin.criar',
  '2fa.ativar',
  '2fa.codigos',
  '2fa.recuperacao_usada',
  '2fa.resetar',
  'pedido.conciliar',
  'pedido.conciliar_lote',
  'pedido.cancelar_pix',
  'pedido.reenviar_email',
  'pedido.aprovar_manual',
  'pedido.desfazer_manual',
  'pedido.liberar',
  'pedido.estornar',
  'comprovante.enviar',
  'webhook.reprocessar',
  'webhook.reprocessar_lote',
  'asaas.testar',
  'asaas.webhook_salvar',
  'asaas.webhook_reativar',
  'usuario.editar',
  'usuario.forcar_senha',
  'usuario.bloquear',
  'usuario.desbloquear',
  'usuario.papel',
  'usuario.exportar',
  'usuario.anonimizar',
  'usuario.revogar_sessao',
  'exportar.csv',
  'equipe.convidar',
  'comunicacao.criar',
  'comunicacao.cancelar',
  'config.salvar',
  'precos.salvar',
  'cupom.criar',
  'cupom.atualizar',
] as const;
export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number];
