import { pgEnum } from 'drizzle-orm/pg-core';
import {
  AREAS_CARGO,
  CANAIS_COMUNICACAO,
  DIVISOES,
  ESCOLARIDADES,
  FONTES_COLETA,
  FORMAS_PAGAMENTO_MANUAL,
  LETRAS,
  METODOS_PEDIDO,
  ORIGENS_QUESTAO,
  PAPEIS,
  RESULTADOS_LIGA,
  SEGMENTOS_COMUNICACAO,
  SITUACOES_CERTAME,
  SLUGS_DISCIPLINA,
  STATUS_COMUNICACAO,
  STATUS_CONCURSO,
  STATUS_ENVIO_COMUNICACAO,
  STATUS_IMPORTACAO,
  TIPOS_CUPOM,
  STATUS_PEDIDO,
  STATUS_PROVA_ORIGEM,
  STATUS_QUESTAO,
  STATUS_REPORT,
  STATUS_REVISAO,
  TIPOS_ARQUIVO_COLETA,
  TIPOS_LICAO,
  TIPOS_REPORT,
  TIPOS_SESSAO_ESTUDO,
  TIPOS_XP_EVENTO,
} from '@fuse/shared';

// Os valores vêm de @fuse/shared (fonte única); o banco só os materializa.
export const statusConcursoEnum = pgEnum('status_concurso', STATUS_CONCURSO);
export const areaCargoEnum = pgEnum('area_cargo', AREAS_CARGO);
export const slugDisciplinaEnum = pgEnum('slug_disciplina', SLUGS_DISCIPLINA);
export const escolaridadeEnum = pgEnum('escolaridade', ESCOLARIDADES);
export const origemQuestaoEnum = pgEnum('origem_questao', ORIGENS_QUESTAO);
export const statusQuestaoEnum = pgEnum('status_questao', STATUS_QUESTAO);
export const statusProvaOrigemEnum = pgEnum('status_prova_origem', STATUS_PROVA_ORIGEM);
export const letraEnum = pgEnum('letra', LETRAS);
export const tipoLicaoEnum = pgEnum('tipo_licao', TIPOS_LICAO);
export const papelEnum = pgEnum('papel', PAPEIS);
export const statusPedidoEnum = pgEnum('status_pedido', STATUS_PEDIDO);
export const tipoSessaoEstudoEnum = pgEnum('tipo_sessao_estudo', TIPOS_SESSAO_ESTUDO);
export const statusRevisaoEnum = pgEnum('status_revisao', STATUS_REVISAO);
export const divisaoEnum = pgEnum('divisao', DIVISOES);
export const resultadoLigaEnum = pgEnum('resultado_liga', RESULTADOS_LIGA);
export const tipoReportEnum = pgEnum('tipo_report', TIPOS_REPORT);
export const statusReportEnum = pgEnum('status_report', STATUS_REPORT);
export const tipoXpEventoEnum = pgEnum('tipo_xp_evento', TIPOS_XP_EVENTO);
export const statusImportacaoEnum = pgEnum('status_importacao', STATUS_IMPORTACAO);
export const tipoArquivoColetaEnum = pgEnum('tipo_arquivo_coleta', TIPOS_ARQUIVO_COLETA);
export const fonteColetaEnum = pgEnum('fonte_coleta', FONTES_COLETA);
export const situacaoCertameEnum = pgEnum('situacao_certame', SITUACOES_CERTAME);

// D13: superadmin (pagamento manual, comunicação em massa).
export const metodoPedidoEnum = pgEnum('metodo_pedido', METODOS_PEDIDO);
export const formaPagamentoManualEnum = pgEnum('forma_pagamento_manual', FORMAS_PAGAMENTO_MANUAL);
/** D23 */
export const tipoCupomEnum = pgEnum('tipo_cupom', TIPOS_CUPOM);
export const canalComunicacaoEnum = pgEnum('canal_comunicacao', CANAIS_COMUNICACAO);
export const segmentoComunicacaoEnum = pgEnum('segmento_comunicacao', SEGMENTOS_COMUNICACAO);
export const statusComunicacaoEnum = pgEnum('status_comunicacao', STATUS_COMUNICACAO);
export const statusEnvioComunicacaoEnum = pgEnum('status_envio_comunicacao', STATUS_ENVIO_COMUNICACAO);
