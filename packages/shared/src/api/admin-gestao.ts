/**
 * Admin de gestão (PRD 5.17 e 13): painel de métricas, pedidos, reembolso, liberação
 * manual, reports, usuários e auditoria. Prefixo /admin, guarda: exigirAdmin (403).
 */
import { z } from 'zod';
import { STATUS_REPORT, TIPOS_REPORT } from '../dominio.js';
import {
  BoolQuery,
  DataHora,
  Dia,
  PaginacaoQuery,
  paginada,
  Uuid,
  ZAreaCargo,
  ZDivisao,
  ZPapel,
  ZSlugDisciplina,
  ZStatusPedido,
  ZStatusQuestao,
} from './comum.js';

/* ------------------------------------------------------------------ painel */

const Vendas = z.object({ quantidade: z.number().int(), centavos: z.number().int() });
const Percentual = z.number().nullable();

/** GET /admin/painel — números do topo e métricas da seção 13 (calculadas por SQL). */
export const PainelResposta = z.object({
  vendasHoje: Vendas,
  vendasMes: Vendas,
  usuariosAtivos7d: z.number().int(),
  reportsAbertos: z.number().int(),
  questoesRascunho: z.number().int(),
  questoesPorStatus: z.record(ZStatusQuestao, z.number().int()),
  metricas: z.object({
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
  }),
  geradoEm: DataHora,
});
export type PainelResposta = z.infer<typeof PainelResposta>;

export const METAS_PAINEL = {
  conversaoCadastroPago: { meta: 40, sentido: 'min' },
  retencaoD7: { meta: 30, sentido: 'min' },
  licoesPorAlunoSemana: { meta: 5, sentido: 'min' },
  pagantesOfensiva7: { meta: 25, sentido: 'min' },
  pedidosReembolso: { meta: 5, sentido: 'max' },
  melhoraAcertoPp: { meta: 20, sentido: 'min' },
} as const;

/* ----------------------------------------------------------------- pedidos */

export const UsuarioMini = z.object({
  id: Uuid,
  nome: z.string(),
  email: z.string(),
  cpfOculto: z.string(),
});

export const PedidoAdmin = z.object({
  id: Uuid,
  usuario: UsuarioMini,
  valorCentavos: z.number().int(),
  status: ZStatusPedido,
  asaasPaymentId: z.string().nullable(),
  asaasCustomerId: z.string().nullable(),
  criadoEm: DataHora,
  pagoEm: DataHora.nullable(),
  pixExpiraEm: DataHora.nullable(),
  reembolsoSolicitadoEm: DataHora.nullable(),
  /** Pago há 7 dias ou menos (direito de arrependimento). */
  dentroDoArrependimento: z.boolean(),
});
export type PedidoAdmin = z.infer<typeof PedidoAdmin>;

/** GET /admin/pedidos */
export const PedidosQuery = PaginacaoQuery.extend({
  status: ZStatusPedido.optional(),
  q: z.string().trim().optional(),
  de: Dia.optional(),
  ate: Dia.optional(),
});
export type PedidosQuery = z.input<typeof PedidosQuery>;
export const PedidosListaResposta = paginada(PedidoAdmin);
export type PedidosListaResposta = z.infer<typeof PedidosListaResposta>;

/** POST /admin/pedidos/:id/reembolso — chama o estorno no Asaas e espera o webhook. */
export const ReembolsoEntrada = z.object({
  motivo: z.string().trim().min(3, 'Informe o motivo do reembolso.').max(500),
  /** Permite reembolsar fora dos 7 dias (exige motivo, fica na auditoria). */
  foraDoPrazo: z.boolean().default(false),
});
export type ReembolsoEntrada = z.input<typeof ReembolsoEntrada>;
export const ReembolsoResposta = z.object({
  ok: z.literal(true),
  status: z.literal('aguardando_webhook'),
});

/** POST /admin/usuarios/:id/liberar-acesso — exige motivo, fica na auditoria. */
export const LiberarAcessoEntrada = z.object({
  motivo: z.string().trim().min(10, 'Descreva o motivo (pelo menos 10 caracteres).').max(500),
});
export type LiberarAcessoEntrada = z.infer<typeof LiberarAcessoEntrada>;

/** POST /admin/usuarios/:id/revogar-acesso */
export const RevogarAcessoEntrada = LiberarAcessoEntrada;

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

/* ---------------------------------------------------------------- usuários */

export const UsuarioAdminResumo = z.object({
  id: Uuid,
  nome: z.string(),
  email: z.string(),
  cpfOculto: z.string(),
  celular: z.string(),
  papel: ZPapel,
  acesso: z.boolean(),
  area: ZAreaCargo.nullable(),
  xpTotal: z.number().int(),
  ofensiva: z.number().int(),
  criadoEm: DataHora,
  excluidoEm: DataHora.nullable(),
});
export type UsuarioAdminResumo = z.infer<typeof UsuarioAdminResumo>;

/** GET /admin/usuarios */
export const UsuariosQuery = PaginacaoQuery.extend({
  q: z.string().trim().optional(),
  acesso: BoolQuery.optional(),
  papel: ZPapel.optional(),
});
export type UsuariosQuery = z.input<typeof UsuariosQuery>;
export const UsuariosListaResposta = paginada(UsuarioAdminResumo);
export type UsuariosListaResposta = z.infer<typeof UsuariosListaResposta>;

/** GET /admin/usuarios/:id — progresso e sessões. */
export const UsuarioAdminDetalhe = z.object({
  usuario: UsuarioAdminResumo.extend({
    cargo: z.string().nullable(),
    metaDiaria: z.number().int(),
    gemas: z.number().int(),
    vidas: z.number().int(),
    divisao: ZDivisao,
    ofensivaRecorde: z.number().int(),
    ultimoDiaEstudo: Dia.nullable(),
    aceiteTermosEm: DataHora.nullable(),
    versaoTermos: z.string().nullable(),
  }),
  progresso: z.object({
    licoesConcluidas: z.number().int(),
    questoesFeitas: z.number().int(),
    precisao: z.number().int().nullable(),
    simuladosEntregues: z.number().int(),
    revisoesPendentes: z.number().int(),
    dominio: z.array(
      z.object({ slug: ZSlugDisciplina, nome: z.string(), valor: z.number().nullable() }),
    ),
  }),
  pedidos: z.array(PedidoAdmin.omit({ usuario: true })),
  sessoes: z.array(
    z.object({
      id: Uuid,
      userAgent: z.string().nullable(),
      ip: z.string().nullable(),
      criadoEm: DataHora,
      expiraEm: DataHora,
    }),
  ),
});
export type UsuarioAdminDetalhe = z.infer<typeof UsuarioAdminDetalhe>;

/** POST /admin/usuarios/:id/revogar-sessoes */
export const RevogarSessoesResposta = z.object({ revogadas: z.number().int() });

/* --------------------------------------------------------------- auditoria */

export const AuditoriaItem = z.object({
  id: Uuid,
  admin: z.object({ id: Uuid, nome: z.string() }).nullable(),
  acao: z.string(),
  alvo: z.string().nullable(),
  detalhes: z.record(z.unknown()).nullable(),
  criadoEm: DataHora,
});

/** GET /admin/auditoria */
export const AuditoriaQuery = PaginacaoQuery.extend({
  acao: z.string().optional(),
  adminId: Uuid.optional(),
});
export const AuditoriaListaResposta = paginada(AuditoriaItem);

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
