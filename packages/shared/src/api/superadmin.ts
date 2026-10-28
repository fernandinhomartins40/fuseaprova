/**
 * Área do superadmin (D13): 2FA, financeiro, pagamentos, conta Asaas, usuários, equipe,
 * comunicação, sistema e configurações. Prefixo /super, guarda: exigirSuperadmin (403).
 *
 * Ações sensíveis levam `confirmacao` (senha ou código TOTP) e `motivo` obrigatório.
 * Exportações CSV voltam como `{ nomeArquivo, conteudo }` (a PWA monta o download).
 */
import { z } from 'zod';
import {
  CANAIS_COMUNICACAO,
  FORMAS_PAGAMENTO_MANUAL,
  SEGMENTOS_COMUNICACAO,
  STATUS_COMUNICACAO,
  STATUS_ENVIO_COMUNICACAO,
  type StatusPedido,
} from '../dominio.js';
import { ExportarResposta } from './me.js';
import { CampoCelular, CampoEmail, CampoNome } from './auth.js';
import {
  BoolQuery,
  DataHora,
  Dia,
  PaginacaoQuery,
  paginada,
  Uuid,
  ZAreaCargo,
  ZDivisao,
  ZMetodoPedido,
  ZPapel,
  ZSlugDisciplina,
  ZStatusPedido,
} from './comum.js';

/* ------------------------------------------------------------- primitivos */

export const ZFormaPagamentoManual = z.enum(FORMAS_PAGAMENTO_MANUAL);
export const ZCanalComunicacao = z.enum(CANAIS_COMUNICACAO);
export const ZSegmentoComunicacao = z.enum(SEGMENTOS_COMUNICACAO);
export const ZStatusComunicacao = z.enum(STATUS_COMUNICACAO);
export const ZStatusEnvioComunicacao = z.enum(STATUS_ENVIO_COMUNICACAO);

/** Código TOTP de 6 dígitos (aceita espaços). */
export const CodigoTotp = z
  .string({ required_error: 'Digite o código de 6 dígitos.' })
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^\d{6}$/.test(v), 'Digite o código de 6 dígitos do app autenticador.');

/** Código de recuperação: 10 caracteres (aceita hífen e minúsculas). */
export const CodigoRecuperacao = z
  .string()
  .transform((v) => v.replace(/[\s-]+/g, '').toUpperCase())
  .refine((v) => /^[A-Z0-9]{10}$/.test(v), 'Código de recuperação inválido.');

/**
 * Reconfirmação das ações sensíveis: a senha da conta ou um código TOTP novo.
 */
export const Reconfirmacao = z
  .object({
    senha: z.string().min(1).max(200).optional(),
    codigo: CodigoTotp.optional(),
  })
  .refine((c) => !!c.senha || !!c.codigo, 'Confirme com sua senha ou com o código do app.');
export type Reconfirmacao = z.input<typeof Reconfirmacao>;

export const MotivoObrigatorio = z
  .string({ required_error: 'Informe o motivo.' })
  .trim()
  .min(5, 'Descreva o motivo (pelo menos 5 caracteres).')
  .max(500, 'O motivo pode ter no máximo 500 caracteres.');

export const MotivoOpcional = z.string().trim().max(500).optional();

/** Exportação: o CSV (separador `;`, UTF-8 com BOM) pronto para baixar. */
export const ArquivoCsvResposta = z.object({ nomeArquivo: z.string(), conteudo: z.string() });
export type ArquivoCsvResposta = z.infer<typeof ArquivoCsvResposta>;

/** Período padrão de consultas: `de` e `ate` em 'AAAA-MM-DD' (São Paulo). */
export const PeriodoQuery = z.object({ de: Dia.optional(), ate: Dia.optional() });

/* -------------------------------------------------------------------- 2FA */

/** GET /super/2fa — estado da verificação em duas etapas da conta e da sessão. */
export const DoisFatoresStatusResposta = z.object({
  configurado: z.boolean(),
  verificadoNestaSessao: z.boolean(),
  ativadoEm: DataHora.nullable(),
  codigosRecuperacaoRestantes: z.number().int(),
});
export type DoisFatoresStatusResposta = z.infer<typeof DoisFatoresStatusResposta>;

/**
 * POST /super/2fa/iniciar — novo segredo (pendente até ativar). O QR é um SVG gerado no
 * próprio servidor. A chave só aparece aqui, uma vez, para digitar no app sem câmera.
 */
export const DoisFatoresIniciarResposta = z.object({
  qrSvg: z.string(),
  chaveManual: z.string(),
  emissor: z.string(),
  conta: z.string(),
});
export type DoisFatoresIniciarResposta = z.infer<typeof DoisFatoresIniciarResposta>;

/** POST /super/2fa/ativar */
export const DoisFatoresAtivarEntrada = z.object({ codigo: CodigoTotp });
export type DoisFatoresAtivarEntrada = z.input<typeof DoisFatoresAtivarEntrada>;

/** Códigos de recuperação, mostrados uma única vez (o banco guarda só o hash). */
export const CodigosRecuperacaoResposta = z.object({ codigos: z.array(z.string()) });
export type CodigosRecuperacaoResposta = z.infer<typeof CodigosRecuperacaoResposta>;

/** POST /super/2fa/verificar — código do app ou um código de recuperação. */
export const DoisFatoresVerificarEntrada = z
  .object({ codigo: CodigoTotp.optional(), codigoRecuperacao: CodigoRecuperacao.optional() })
  .refine((c) => !!c.codigo || !!c.codigoRecuperacao, 'Digite o código do app autenticador.');
export type DoisFatoresVerificarEntrada = z.input<typeof DoisFatoresVerificarEntrada>;

/** POST /super/2fa/codigos — gera novos códigos (invalida os anteriores). */
export const NovosCodigosEntrada = z.object({ confirmacao: Reconfirmacao });
export type NovosCodigosEntrada = z.input<typeof NovosCodigosEntrada>;

/* -------------------------------------------------------------- financeiro */

export const AGRUPAMENTOS = ['dia', 'semana', 'mes'] as const;
export const ZAgrupamento = z.enum(AGRUPAMENTOS);
export const FiltroMetodo = z.enum(['todos', 'asaas', 'manual']);

/** GET /super/financeiro */
export const FinanceiroQuery = PeriodoQuery.extend({
  agrupamento: ZAgrupamento.default('dia'),
  metodo: FiltroMetodo.default('todos'),
});
export type FinanceiroQuery = z.input<typeof FinanceiroQuery>;

const Soma = z.object({ quantidade: z.number().int(), centavos: z.number().int() });

export const PontoFinanceiro = z.object({
  /** Início do período ('AAAA-MM-DD'). */
  periodo: Dia,
  pagos: z.number().int(),
  brutoCentavos: z.number().int(),
  taxasCentavos: z.number().int(),
  reembolsosCentavos: z.number().int(),
  liquidoCentavos: z.number().int(),
  asaasCentavos: z.number().int(),
  manualCentavos: z.number().int(),
  novosAlunos: z.number().int(),
});
export type PontoFinanceiro = z.infer<typeof PontoFinanceiro>;

export const FinanceiroResposta = z.object({
  de: Dia,
  ate: Dia,
  agrupamento: ZAgrupamento,
  metodo: FiltroMetodo,
  precoCentavos: z.number().int(),
  serie: z.array(PontoFinanceiro),
  totais: z.object({
    brutoCentavos: z.number().int(),
    /** Taxas do Asaas (valor − valor líquido informado pelo Asaas). */
    taxasCentavos: z.number().int(),
    reembolsos: Soma,
    /** Bruto − taxas − reembolsos. */
    liquidoCentavos: z.number().int(),
    pagos: z.number().int(),
    asaas: Soma,
    manual: Soma,
    /** Pedidos pagos pelo Asaas sem o valor líquido conhecido (taxa contada como 0). */
    semValorLiquido: z.number().int(),
  }),
  pedidosPorStatus: z.record(ZStatusPedido, z.number().int()),
  pix: z.object({
    gerados: z.number().int(),
    pagos: z.number().int(),
    expirados: z.number().int(),
    cancelados: z.number().int(),
    pendentes: z.number().int(),
  }),
  alunos: z.object({
    novos: z.number().int(),
    /** Dos cadastrados no período, quantos pagaram (%). */
    conversaoCadastroPago: z.number().nullable(),
    dau: z.number().int(),
    wau: z.number().int(),
    mau: z.number().int(),
    comAcesso: z.number().int(),
  }),
  geradoEm: DataHora,
});
export type FinanceiroResposta = z.infer<typeof FinanceiroResposta>;

/* -------------------------------------------------------------- pagamentos */

export const UsuarioPagamento = z.object({
  id: Uuid,
  nome: z.string(),
  email: z.string(),
  cpfOculto: z.string(),
  acesso: z.boolean(),
});

export const DadosManual = z.object({
  forma: ZFormaPagamentoManual,
  recebidoEm: Dia,
  observacao: z.string(),
  referencia: z.string().nullable(),
  comprovante: z.string().nullable(),
  aprovadoPor: z.object({ id: Uuid, nome: z.string() }).nullable(),
});

export const PagamentoSuper = z.object({
  id: Uuid,
  usuario: UsuarioPagamento,
  metodo: ZMetodoPedido,
  status: ZStatusPedido,
  valorCentavos: z.number().int(),
  valorLiquidoCentavos: z.number().int().nullable(),
  asaasPaymentId: z.string().nullable(),
  asaasCustomerId: z.string().nullable(),
  criadoEm: DataHora,
  pagoEm: DataHora.nullable(),
  pixExpiraEm: DataHora.nullable(),
  canceladoEm: DataHora.nullable(),
  reembolsoSolicitadoEm: DataHora.nullable(),
  estornadoEm: DataHora.nullable(),
  conciliadoEm: DataHora.nullable(),
  dentroDoArrependimento: z.boolean(),
  manual: DadosManual.nullable(),
});
export type PagamentoSuper = z.infer<typeof PagamentoSuper>;

/** GET /super/pagamentos — busca por nome, e-mail, CPF ou id do Asaas. */
export const PagamentosQuery = PaginacaoQuery.merge(PeriodoQuery).extend({
  q: z.string().trim().max(120).optional(),
  status: ZStatusPedido.optional(),
  metodo: ZMetodoPedido.optional(),
});
export type PagamentosQuery = z.input<typeof PagamentosQuery>;
export const PagamentosListaResposta = paginada(PagamentoSuper);
export type PagamentosListaResposta = z.infer<typeof PagamentosListaResposta>;

export const EventoLinhaTempo = z.object({
  em: DataHora,
  tipo: z.enum(['pedido', 'webhook', 'auditoria', 'pagamento', 'estorno']),
  titulo: z.string(),
  detalhe: z.string().nullable(),
  erro: z.string().nullable(),
});
export type EventoLinhaTempo = z.infer<typeof EventoLinhaTempo>;

export const WebhookEventoSuper = z.object({
  id: z.string(),
  evento: z.string(),
  paymentId: z.string().nullable(),
  pedidoId: Uuid.nullable(),
  recebidoEm: DataHora,
  processadoEm: DataHora.nullable(),
  erro: z.string().nullable(),
  resultado: z.string().nullable(),
  tentativas: z.number().int(),
  /** Corpo recebido (sem dados pessoais além do id do cliente Asaas). */
  corpo: z.record(z.unknown()),
});
export type WebhookEventoSuper = z.infer<typeof WebhookEventoSuper>;

/** GET /super/pagamentos/:id */
export const PagamentoDetalheResposta = z.object({
  pagamento: PagamentoSuper,
  linhaDoTempo: z.array(EventoLinhaTempo),
  webhooks: z.array(WebhookEventoSuper),
});
export type PagamentoDetalheResposta = z.infer<typeof PagamentoDetalheResposta>;

/** Status de cobrança do Asaas → status local esperado (null = não muda nada). */
export function statusLocalDoAsaas(statusAsaas: string, removida = false): StatusPedido | null {
  if (removida) return 'vencido';
  switch (statusAsaas) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'pago';
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pendente';
    case 'OVERDUE':
      return 'vencido';
    case 'REFUNDED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'estornado';
    default:
      return null;
  }
}

/** POST /super/pagamentos/:id/conciliar */
export const ConciliarEntrada = z.object({ motivo: MotivoOpcional });
export const ConciliacaoItem = z.object({
  pedidoId: Uuid,
  asaasPaymentId: z.string().nullable(),
  usuario: z.string(),
  statusLocalAntes: ZStatusPedido,
  statusLocalDepois: ZStatusPedido,
  statusAsaas: z.string().nullable(),
  divergente: z.boolean(),
  corrigido: z.boolean(),
  mensagem: z.string(),
});
export type ConciliacaoItem = z.infer<typeof ConciliacaoItem>;
export const ConciliarResposta = ConciliacaoItem;

/** POST /super/pagamentos/conciliar-lote — até 200 pedidos Asaas do período. */
export const ConciliarLoteEntrada = z.object({
  de: Dia,
  ate: Dia,
  /** false = só o relatório (não corrige nada). */
  corrigir: z.boolean().default(false),
  motivo: MotivoOpcional,
});
export type ConciliarLoteEntrada = z.input<typeof ConciliarLoteEntrada>;
export const ConciliarLoteResposta = z.object({
  verificados: z.number().int(),
  divergentes: z.number().int(),
  corrigidos: z.number().int(),
  erros: z.number().int(),
  /** Pedidos manuais do período (não são conciliados com o Asaas). */
  ignoradosManuais: z.number().int(),
  /** Havia mais pedidos que o limite; rode de novo com um período menor. */
  limiteAtingido: z.boolean(),
  itens: z.array(ConciliacaoItem),
});
export type ConciliarLoteResposta = z.infer<typeof ConciliarLoteResposta>;

/** POST /super/pagamentos/:id/reembolso — estorno total no Asaas. */
export const SuperReembolsoEntrada = z.object({
  motivo: MotivoObrigatorio,
  foraDoPrazo: z.boolean().default(false),
  confirmacao: Reconfirmacao,
});
export type SuperReembolsoEntrada = z.input<typeof SuperReembolsoEntrada>;

/** POST /super/pagamentos/:id/cancelar — remove a cobrança Pix pendente no Asaas. */
export const CancelarPixEntrada = z.object({ motivo: MotivoObrigatorio });
export type CancelarPixEntrada = z.input<typeof CancelarPixEntrada>;

/** POST /super/pagamentos/:id/reenviar-email */
export const ReenviarEmailResposta = z.object({ ok: z.literal(true), para: z.string() });

/**
 * POST /super/usuarios/:id/aprovar-pagamento — pagamento recebido por fora (transferência,
 * dinheiro, Pix direto). Valor sempre PRICE_CENTS. Não é acesso gratuito.
 */
export const AcaoAsaasManual = z.enum(['receber_em_dinheiro', 'cancelar', 'nenhuma']);
export const AprovarManualEntrada = z.object({
  recebidoEm: Dia,
  forma: ZFormaPagamentoManual,
  observacao: MotivoObrigatorio,
  referencia: z.string().trim().max(120).optional(),
  /** Nome devolvido por POST /super/comprovantes. */
  comprovante: z
    .string()
    .regex(/^[0-9a-f-]{36}\.(png|jpg|webp|pdf)$/, 'Comprovante inválido.')
    .optional(),
  /** O que fazer com a cobrança Pix pendente no Asaas, se houver. */
  acaoAsaas: AcaoAsaasManual.default('receber_em_dinheiro'),
  confirmacao: Reconfirmacao,
});
export type AprovarManualEntrada = z.input<typeof AprovarManualEntrada>;
export const AprovarManualResposta = z.object({
  pedidoId: Uuid,
  /** O aluno já tinha pagamento aprovado: nada foi duplicado. */
  jaAprovado: z.boolean(),
  asaas: z.object({
    acao: AcaoAsaasManual,
    ok: z.boolean(),
    mensagem: z.string(),
  }),
});
export type AprovarManualResposta = z.infer<typeof AprovarManualResposta>;

/** POST /super/pagamentos/:id/desfazer-manual — estorno manual: revoga o acesso. */
export const DesfazerManualEntrada = z.object({
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type DesfazerManualEntrada = z.input<typeof DesfazerManualEntrada>;

/** POST /super/comprovantes (multipart, campo "arquivo"): imagem ou PDF até 5 MB. */
export const ComprovanteResposta = z.object({ arquivo: z.string(), url: z.string() });

/* --------------------------------------------------------------- webhooks */

export const WebhooksQuery = PaginacaoQuery.extend({
  situacao: z.enum(['todos', 'erro', 'pendente', 'processado']).default('todos'),
  evento: z.string().trim().max(80).optional(),
  q: z.string().trim().max(120).optional(),
});
export type WebhooksQuery = z.input<typeof WebhooksQuery>;
export const WebhooksListaResposta = paginada(WebhookEventoSuper);
export type WebhooksListaResposta = z.infer<typeof WebhooksListaResposta>;

/** Id do evento do Asaas (texto, não uuid). */
export const EventoParams = z.object({ id: z.string().min(1).max(200) });

export const ReprocessarResposta = z.object({
  id: z.string(),
  ok: z.boolean(),
  resultado: z.string(),
  erro: z.string().nullable(),
});
export type ReprocessarResposta = z.infer<typeof ReprocessarResposta>;

/** POST /super/webhooks/reprocessar-lote — os com erro (ou os ids informados). */
export const ReprocessarLoteEntrada = z.object({
  ids: z.array(z.string().min(1).max(200)).max(200).optional(),
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type ReprocessarLoteEntrada = z.input<typeof ReprocessarLoteEntrada>;
export const ReprocessarLoteResposta = z.object({
  total: z.number().int(),
  ok: z.number().int(),
  falhas: z.number().int(),
  itens: z.array(ReprocessarResposta),
});

/* ------------------------------------------------------------- conta Asaas */

export const AmbienteAsaas = z.enum(['sandbox', 'producao', 'outro']);

/** GET /super/asaas — status da integração (a chave NUNCA é exibida). */
export const AsaasStatusResposta = z.object({
  ambiente: AmbienteAsaas,
  baseUrl: z.string(),
  chaveConfigurada: z.boolean(),
  tokenWebhookConfigurado: z.boolean(),
  urlWebhookEsperada: z.string(),
  conta: z
    .object({
      nome: z.string().nullable(),
      email: z.string().nullable(),
      cpfCnpjOculto: z.string().nullable(),
      tipoPessoa: z.string().nullable(),
      status: z.string().nullable(),
      cidade: z.string().nullable(),
    })
    .nullable(),
  erro: z.string().nullable(),
  /** Como trocar a chave (fica só no .env da VPS). */
  comoTrocarChave: z.string(),
});
export type AsaasStatusResposta = z.infer<typeof AsaasStatusResposta>;

/** POST /super/asaas/testar */
export const AsaasTesteResposta = z.object({ ok: z.boolean(), ms: z.number().int(), mensagem: z.string() });

/** GET /super/asaas/saldo — saldo da conta INTEIRA (a conta Asaas é compartilhada, D14). */
export const AsaasSaldoResposta = z.object({
  saldoCentavos: z.number().int(),
  consultadoEm: DataHora,
  /** Aviso de que o saldo inclui outras aplicações da mesma conta. */
  aviso: z.string(),
});

/** GET /super/asaas/extrato */
export const ExtratoQuery = PeriodoQuery.extend({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ExtratoQuery = z.input<typeof ExtratoQuery>;
export const AsaasExtratoResposta = z.object({
  de: Dia,
  ate: Dia,
  itens: z.array(
    z.object({
      id: z.string(),
      data: z.string(),
      tipo: z.string(),
      descricao: z.string().nullable(),
      valorCentavos: z.number().int(),
      saldoCentavos: z.number().int().nullable(),
      paymentId: z.string().nullable(),
    }),
  ),
  temMais: z.boolean(),
  /** Lançamentos do Fuse Aprova no período (só os ligados a cobranças nossas). */
  total: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
  /** Lançamentos da conta lidos no Asaas (inclui os de outras aplicações, descartados). */
  examinados: z.number().int(),
  /** A leitura parou no limite de páginas; reduza o período. */
  incompleto: z.boolean(),
});
export type AsaasExtratoResposta = z.infer<typeof AsaasExtratoResposta>;

/**
 * GET /super/asaas/estatisticas — cobranças Pix do Fuse Aprova no período, por status, a partir
 * dos pedidos (o endpoint de estatísticas do Asaas soma a conta compartilhada inteira, D14).
 */
export const AsaasEstatisticasResposta = z.object({
  de: Dia,
  ate: Dia,
  porStatus: z.array(
    z.object({
      status: z.string(),
      quantidade: z.number().int(),
      valorCentavos: z.number().int(),
      liquidoCentavos: z.number().int(),
    }),
  ),
});
export type AsaasEstatisticasResposta = z.infer<typeof AsaasEstatisticasResposta>;

export const WebhookAsaasConfig = z.object({
  id: z.string(),
  nome: z.string().nullable(),
  url: z.string(),
  email: z.string().nullable(),
  ativo: z.boolean(),
  filaInterrompida: z.boolean(),
  temToken: z.boolean(),
  tipoEnvio: z.string().nullable(),
  versaoApi: z.number().int().nullable(),
  penalizadas: z.number().int().nullable(),
  eventos: z.array(z.string()),
  /** Aponta para `${APP_URL}/api/webhooks/asaas`. */
  ehDoApp: z.boolean(),
});
export type WebhookAsaasConfig = z.infer<typeof WebhookAsaasConfig>;

/** GET /super/asaas/webhook */
export const AsaasWebhookResposta = z.object({
  urlEsperada: z.string(),
  tokenLocalConfigurado: z.boolean(),
  doApp: WebhookAsaasConfig.nullable(),
  todos: z.array(WebhookAsaasConfig),
  eventosRecomendados: z.array(z.string()),
});
export type AsaasWebhookResposta = z.infer<typeof AsaasWebhookResposta>;

/** PUT /super/asaas/webhook — cria ou atualiza o webhook do app no Asaas. */
export const AsaasWebhookSalvarEntrada = z.object({
  email: CampoEmail,
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type AsaasWebhookSalvarEntrada = z.input<typeof AsaasWebhookSalvarEntrada>;

/** POST /super/asaas/webhook/reativar — reativa a fila interrompida. */
export const AsaasWebhookReativarEntrada = z.object({
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type AsaasWebhookReativarEntrada = z.input<typeof AsaasWebhookReativarEntrada>;


/* --------------------------------------------------------------- usuários */

export const UsuarioSuperResumo = z.object({
  id: Uuid,
  nome: z.string(),
  email: z.string(),
  cpfOculto: z.string(),
  celularOculto: z.string(),
  papel: ZPapel,
  acesso: z.boolean(),
  pago: z.boolean(),
  bloqueado: z.boolean(),
  doisFatores: z.boolean(),
  marketing: z.boolean(),
  xpTotal: z.number().int(),
  ofensiva: z.number().int(),
  ultimaAtividadeEm: DataHora.nullable(),
  criadoEm: DataHora,
  excluidoEm: DataHora.nullable(),
});
export type UsuarioSuperResumo = z.infer<typeof UsuarioSuperResumo>;

/** GET /super/usuarios */
export const SuperUsuariosQuery = PaginacaoQuery.merge(PeriodoQuery).extend({
  q: z.string().trim().max(120).optional(),
  papel: ZPapel.optional(),
  acesso: BoolQuery.optional(),
  pago: BoolQuery.optional(),
  bloqueado: BoolQuery.optional(),
  /** Ativo = respondeu questão nos últimos N dias. */
  ativoDias: z.coerce.number().int().min(1).max(365).optional(),
  inativoDias: z.coerce.number().int().min(1).max(365).optional(),
  incluirExcluidos: BoolQuery.optional(),
});
export type SuperUsuariosQuery = z.input<typeof SuperUsuariosQuery>;
export const SuperUsuariosListaResposta = paginada(UsuarioSuperResumo);
export type SuperUsuariosListaResposta = z.infer<typeof SuperUsuariosListaResposta>;

export const AuditoriaSuperItem = z.object({
  id: Uuid,
  admin: z.object({ id: Uuid, nome: z.string() }).nullable(),
  acao: z.string(),
  alvo: z.string().nullable(),
  motivo: z.string().nullable(),
  ip: z.string().nullable(),
  antes: z.record(z.unknown()).nullable(),
  depois: z.record(z.unknown()).nullable(),
  detalhes: z.record(z.unknown()).nullable(),
  criadoEm: DataHora,
});
export type AuditoriaSuperItem = z.infer<typeof AuditoriaSuperItem>;

/** GET /super/usuarios/:id — ficha completa. */
export const FichaUsuarioResposta = z.object({
  usuario: UsuarioSuperResumo.extend({
    /** E-mail e celular completos (o superadmin pode editar). */
    celular: z.string().nullable(),
    bloqueadoEm: DataHora.nullable(),
    bloqueioMotivo: z.string().nullable(),
    doisFatoresAtivadoEm: DataHora.nullable(),
    cargo: z.string().nullable(),
    area: ZAreaCargo.nullable(),
    notificacoes: z.boolean(),
    lembreteHora: z.string().nullable(),
    aceiteTermosEm: DataHora.nullable(),
    versaoTermos: z.string().nullable(),
  }),
  progresso: z.object({
    xpTotal: z.number().int(),
    gemas: z.number().int(),
    vidas: z.number().int(),
    ofensiva: z.number().int(),
    ofensivaRecorde: z.number().int(),
    divisao: ZDivisao,
    ultimoDiaEstudo: Dia.nullable(),
    licoesConcluidas: z.number().int(),
    questoesFeitas: z.number().int(),
    precisao: z.number().int().nullable(),
    sessoesEstudo: z.number().int(),
    simuladosEntregues: z.number().int(),
    revisoesPendentes: z.number().int(),
    dominio: z.array(z.object({ slug: ZSlugDisciplina, nome: z.string(), valor: z.number().nullable() })),
  }),
  pedidos: z.array(PagamentoSuper.omit({ usuario: true })),
  sessoes: z.array(
    z.object({
      id: Uuid,
      userAgent: z.string().nullable(),
      ip: z.string().nullable(),
      criadoEm: DataHora,
      ultimoUsoEm: DataHora,
      expiraEm: DataHora,
      doisFatores: z.boolean(),
    }),
  ),
  push: z.array(z.object({ id: Uuid, navegador: z.string(), criadoEm: DataHora })),
  auditoria: z.array(AuditoriaSuperItem),
});
export type FichaUsuarioResposta = z.infer<typeof FichaUsuarioResposta>;

/** PATCH /super/usuarios/:id — nome, e-mail e celular. */
export const EditarUsuarioEntrada = z
  .object({
    nome: CampoNome.optional(),
    email: CampoEmail.optional(),
    celular: CampoCelular.optional(),
    motivo: MotivoObrigatorio,
  })
  .refine((o) => o.nome !== undefined || o.email !== undefined || o.celular !== undefined, 'Nada para atualizar.');
export type EditarUsuarioEntrada = z.input<typeof EditarUsuarioEntrada>;

/** POST /super/usuarios/:id/forcar-senha — envia o link de redefinição. */
export const ForcarSenhaEntrada = z.object({
  motivo: MotivoObrigatorio,
  /** Também encerra as sessões abertas. */
  revogarSessoes: z.boolean().default(true),
});
export type ForcarSenhaEntrada = z.input<typeof ForcarSenhaEntrada>;

/** POST /super/usuarios/:id/bloquear e /desbloquear */
export const BloqueioEntrada = z.object({ motivo: MotivoObrigatorio });
export type BloqueioEntrada = z.input<typeof BloqueioEntrada>;

/** POST /super/usuarios/:id/papel */
export const MudarPapelEntrada = z.object({
  papel: ZPapel,
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type MudarPapelEntrada = z.input<typeof MudarPapelEntrada>;

/** POST /super/usuarios/:id/anonimizar — LGPD: excluir = anonimizar (mantém os pedidos). */
export const AnonimizarEntrada = z.object({
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
  /** Digite o e-mail do usuário para confirmar. */
  emailConfirmado: z.string().trim().min(3, 'Digite o e-mail do usuário para confirmar.'),
});
export type AnonimizarEntrada = z.input<typeof AnonimizarEntrada>;

/** GET /super/usuarios/:id/exportar (LGPD). */
export const ExportarUsuarioResposta = ExportarResposta;

/** DELETE /super/usuarios/:id/sessoes/:sessaoId */
export const SessaoUsuarioParams = z.object({ id: Uuid, sessaoId: Uuid });

/* ------------------------------------------------------------------ equipe */

export const MembroEquipe = z.object({
  id: Uuid,
  nome: z.string(),
  email: z.string(),
  papel: ZPapel,
  doisFatores: z.boolean(),
  doisFatoresAtivadoEm: DataHora.nullable(),
  /** Convite enviado e senha ainda não definida. */
  convitePendente: z.boolean(),
  bloqueado: z.boolean(),
  ultimoAcessoEm: DataHora.nullable(),
  criadoEm: DataHora,
});
export type MembroEquipe = z.infer<typeof MembroEquipe>;
export const EquipeResposta = z.object({ itens: z.array(MembroEquipe) });
export type EquipeResposta = z.infer<typeof EquipeResposta>;

/** POST /super/equipe/convites — cria a conta e manda o link para definir a senha (72 h). */
export const ConvidarEntrada = z.object({
  nome: CampoNome,
  email: CampoEmail,
  papel: z.enum(['admin', 'superadmin']),
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type ConvidarEntrada = z.input<typeof ConvidarEntrada>;
export const ConvidarResposta = z.object({ id: Uuid, email: z.string(), expiraEm: DataHora });

export const VALIDADE_CONVITE_MS = 72 * 60 * 60 * 1000;

/* ------------------------------------------------------------- comunicação */

export const ComunicacaoBase = z.object({
  canal: ZCanalComunicacao,
  segmento: ZSegmentoComunicacao,
  /** Só para o segmento "inativos". */
  diasInativo: z.number().int().min(1).max(365).optional(),
  assunto: z.string().trim().min(3, 'Informe o assunto (ou o título do push).').max(120),
  mensagem: z.string().trim().min(5, 'Escreva a mensagem.').max(4000),
  /** Link do botão (caminho do app, como /aprender). */
  link: z
    .string()
    .trim()
    .regex(/^\/[\w\-/?=&#.]*$/, 'Use um caminho do app, como /aprender.')
    .max(200)
    .optional(),
});
const comInativos = <T extends z.ZodTypeAny>(s: T) =>
  s.refine(
    (c: { segmento: string; diasInativo?: number | undefined }) =>
      c.segmento !== 'inativos' || !!c.diasInativo,
    { message: 'Informe há quantos dias o aluno está inativo.', path: ['diasInativo'] },
  );

/** POST /super/comunicacoes/previa */
export const ComunicacaoPreviaEntrada = comInativos(ComunicacaoBase);
export type ComunicacaoPreviaEntrada = z.input<typeof ComunicacaoPreviaEntrada>;
export const ComunicacaoPreviaResposta = z.object({
  destinatarios: z.number().int(),
  /** Alunos do segmento sem opt-in (não recebem). */
  semOptIn: z.number().int(),
  amostra: z.array(z.string()),
  assunto: z.string(),
  html: z.string().nullable(),
  texto: z.string(),
  limitePorMinuto: z.number().int(),
  minutosEstimados: z.number().int(),
});
export type ComunicacaoPreviaResposta = z.infer<typeof ComunicacaoPreviaResposta>;

/** POST /super/comunicacoes — entra na fila do worker. */
export const ComunicacaoCriarEntrada = comInativos(ComunicacaoBase.extend({ motivo: MotivoOpcional }));
export type ComunicacaoCriarEntrada = z.input<typeof ComunicacaoCriarEntrada>;

export const ComunicacaoSuper = z.object({
  id: Uuid,
  canal: ZCanalComunicacao,
  segmento: ZSegmentoComunicacao,
  diasInativo: z.number().int().nullable(),
  assunto: z.string(),
  mensagem: z.string(),
  link: z.string().nullable(),
  status: ZStatusComunicacao,
  total: z.number().int(),
  enviados: z.number().int(),
  falhas: z.number().int(),
  ignorados: z.number().int(),
  pendentes: z.number().int(),
  criadoPor: z.object({ id: Uuid, nome: z.string() }).nullable(),
  criadoEm: DataHora,
  iniciadoEm: DataHora.nullable(),
  concluidoEm: DataHora.nullable(),
});
export type ComunicacaoSuper = z.infer<typeof ComunicacaoSuper>;
export const ComunicacoesQuery = PaginacaoQuery;
export const ComunicacoesListaResposta = paginada(ComunicacaoSuper);
export type ComunicacoesListaResposta = z.infer<typeof ComunicacoesListaResposta>;

/** Limites da fila (o worker respeita). */
export const LIMITE_COMUNICACAO = {
  emailPorMinuto: 30,
  pushPorMinuto: 120,
  /** Um aluno recebe no máximo uma comunicação de marketing a cada 24 h. */
  intervaloPorAlunoMs: 24 * 60 * 60 * 1000,
  /** Comunicações criadas por dia (todas as contas). */
  porDia: 5,
} as const;

/* ----------------------------------------------------------------- sistema */

export const ExecucaoJob = z.object({
  job: z.string(),
  cron: z.string().nullable(),
  ultima: z
    .object({
      iniciadoEm: DataHora,
      terminadoEm: DataHora.nullable(),
      ok: z.boolean().nullable(),
      erro: z.string().nullable(),
      ms: z.number().int().nullable(),
    })
    .nullable(),
  ultimoSucessoEm: DataHora.nullable(),
  falhas24h: z.number().int(),
});
export type ExecucaoJob = z.infer<typeof ExecucaoJob>;

/** GET /super/sistema */
export const SistemaResposta = z.object({
  api: z.object({
    versao: z.string(),
    imagem: z.string().nullable(),
    ambiente: z.string(),
    node: z.string(),
    iniciadaEm: DataHora,
    uptimeS: z.number().int(),
    memoriaMb: z.number().int(),
  }),
  banco: z.object({
    ok: z.boolean(),
    versao: z.string().nullable(),
    tamanhoBytes: z.number().nullable(),
    conexoes: z.number().int().nullable(),
    maxConexoes: z.number().int().nullable(),
  }),
  worker: z.object({ jobs: z.array(ExecucaoJob) }),
  backup: z.object({
    ultimo: z.string().nullable(),
    ultimoJob: DataHora.nullable(),
    ultimoJobOk: z.boolean().nullable(),
    fonte: z.string(),
    aviso: z.string().nullable(),
  }),
  smtp: z.object({ configurado: z.boolean(), host: z.string().nullable() }),
  asaas: z.object({ chaveConfigurada: z.boolean(), ambiente: AmbienteAsaas }),
  push: z.object({ configurado: z.boolean() }),
  precoCentavos: z.number().int(),
  geradoEm: DataHora,
});
export type SistemaResposta = z.infer<typeof SistemaResposta>;

/* ---------------------------------------------------------- configurações */

export const TOM_AVISO = ['info', 'aviso', 'sucesso'] as const;

export const ConfiguracoesProduto = z.object({
  suporteWhatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || /^\d{12,13}$/.test(v), 'Use DDI + DDD + número, como 5542999999999.'),
  suporteEmail: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Informe um e-mail válido.'),
  manutencao: z.object({
    ativa: z.boolean(),
    mensagem: z.string().trim().max(300),
  }),
  aviso: z.object({
    ativo: z.boolean(),
    texto: z.string().trim().max(300),
    tom: z.enum(TOM_AVISO),
  }),
  avisoEdital: z.string().trim().max(600),
});
export type ConfiguracoesProduto = z.output<typeof ConfiguracoesProduto>;

/** GET /super/configuracoes */
export const ConfiguracoesResposta = z.object({
  valores: ConfiguracoesProduto,
  atualizadoEm: DataHora.nullable(),
  atualizadoPor: z.object({ id: Uuid, nome: z.string() }).nullable(),
  /** Preço vigente do 1º concurso (D23: editável em /super/precos). */
  precoCentavos: z.number().int(),
});
export type ConfiguracoesResposta = z.infer<typeof ConfiguracoesResposta>;

/** PUT /super/configuracoes */
export const ConfiguracoesSalvarEntrada = ConfiguracoesProduto.extend({
  motivo: MotivoObrigatorio,
  confirmacao: Reconfirmacao,
});
export type ConfiguracoesSalvarEntrada = z.input<typeof ConfiguracoesSalvarEntrada>;

/** GET /config/publica — o que a PWA mostra para todos (sem login). */
export const ConfigPublicaResposta = z.object({
  suporte: z.object({ whatsapp: z.string(), email: z.string() }),
  manutencao: z.object({ ativa: z.boolean(), mensagem: z.string() }),
  aviso: z.object({ texto: z.string(), tom: z.enum(TOM_AVISO) }).nullable(),
  avisoEdital: z.string(),
  /** D23: preços vigentes (editáveis em /super/precos). */
  precoCentavos: z.number().int(),
  precoAdicionalCentavos: z.number().int(),
  /** Preço "de" (riscado); null = sem preço riscado. */
  precoDeCentavos: z.number().int().nullable(),
});
export type ConfigPublicaResposta = z.infer<typeof ConfigPublicaResposta>;

/* --------------------------------------------------------------- auditoria */

export const SuperAuditoriaQuery = PaginacaoQuery.merge(PeriodoQuery).extend({
  acao: z.string().trim().max(80).optional(),
  adminId: Uuid.optional(),
  alvo: z.string().trim().max(120).optional(),
});
export type SuperAuditoriaQuery = z.input<typeof SuperAuditoriaQuery>;
export const SuperAuditoriaListaResposta = paginada(AuditoriaSuperItem);
export type SuperAuditoriaListaResposta = z.infer<typeof SuperAuditoriaListaResposta>;

/* -------------------------------------------------------------------- CSV */

/** Escapa um valor para CSV com `;` (Excel pt-BR). Fórmulas viram texto. */
export function celulaCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta o CSV: cabeçalho + linhas, CRLF, com BOM para o Excel abrir em UTF-8. */
export function gerarCsv(cabecalho: readonly string[], linhas: readonly (readonly unknown[])[]): string {
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(';')).join('\r\n') + '\r\n';
}

/* --------------------------------------------------------- jobs do worker */

/** Jobs do worker (PRD 8.7 + D13), no fuso de São Paulo. O worker agenda exatamente estes. */
export const JOBS_WORKER = [
  {
    nome: 'fechar-liga',
    cron: '59 * * * *',
    descricao: 'Fecha a liga da semana (domingo 23:59; de hora em hora recupera um fechamento perdido)',
  },
  { nome: 'resetar-vidas', cron: '0 0 * * *', descricao: 'Recarrega as vidas à meia-noite' },
  { nome: 'verificar-ofensivas', cron: '5 0 * * *', descricao: 'Zera ofensivas e gasta protetores' },
  { nome: 'enviar-lembretes', cron: '*/5 * * * *', descricao: 'Lembretes por push' },
  { nome: 'expirar-pix', cron: '*/10 * * * *', descricao: 'Marca Pix vencidos' },
  { nome: 'limpar-sessoes', cron: '0 3 * * *', descricao: 'Apaga sessões expiradas e execuções antigas' },
  { nome: 'backup', cron: '30 3 * * *', descricao: 'pg_dump diário' },
  { nome: 'enviar-comunicacoes', cron: '* * * * *', descricao: 'Fila de e-mail e push do superadmin' },
] as const;
export type NomeJobWorker = (typeof JOBS_WORKER)[number]['nome'];
