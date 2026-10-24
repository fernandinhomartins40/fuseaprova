/**
 * Schema completo (PRD 9). Ids uuid, datas timestamptz, colunas snake_case.
 * Colunas além do PRD estão marcadas com "extra" e explicadas em docs/DECISOES.md.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  areaCargoEnum,
  divisaoEnum,
  escolaridadeEnum,
  fonteColetaEnum,
  letraEnum,
  origemQuestaoEnum,
  papelEnum,
  resultadoLigaEnum,
  situacaoCertameEnum,
  slugDisciplinaEnum,
  statusConcursoEnum,
  statusImportacaoEnum,
  statusPedidoEnum,
  statusProvaOrigemEnum,
  statusQuestaoEnum,
  statusReportEnum,
  statusRevisaoEnum,
  tipoArquivoColetaEnum,
  tipoLicaoEnum,
  tipoReportEnum,
  tipoSessaoEstudoEnum,
  tipoXpEventoEnum,
} from './enums.js';

/* ------------------------------------------------------------- tipos jsonb */

export interface LinkJson {
  titulo: string;
  url: string;
}

export interface DistribuicaoJson {
  portugues: number;
  matematica: number;
  gerais: number;
  especificos: number;
  pesos?: { portugues: number; matematica: number; gerais: number; especificos: number };
}

export interface AlternativaJson {
  letra: 'A' | 'B' | 'C' | 'D' | 'E';
  texto: string;
}

export interface RespostaSimuladoJson {
  letra: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  revisarDepois: boolean;
}

export interface AcertosPorBlocoJson {
  portugues: number;
  matematica: number;
  gerais: number;
  especificos: number;
}

export interface ConfrontoJson {
  numero: number;
  questaoId: string | null;
  gabaritoDefinitivo: 'A' | 'B' | 'C' | 'D' | 'E' | 'ANULADA' | null;
  /** D8/D9: letra lida no gabarito definitivo para o número (null se anulada ou ausente). */
  gabaritoExtraido?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  /** D9: letra do gabarito preliminar (null sem preliminar). */
  letraPreliminar?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  /** D9: status com que a questão foi gravada (null = não gravada). */
  statusGravado?: 'rascunho' | 'revisao' | 'publicada' | 'anulada' | 'retirada' | null;
  observacao: string | null;
}

export const DISTRIBUICAO_PADRAO_JSON: DistribuicaoJson = {
  portugues: 5,
  matematica: 5,
  gerais: 5,
  especificos: 25,
};

/* ---------------------------------------------------------------- helpers */

const id = () => uuid('id').primaryKey().defaultRandom();
const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () =>
  timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const ts = (nome: string) => timestamp(nome, { withTimezone: true });
const dia = (nome: string) => date(nome, { mode: 'string' });

/* ------------------------------------------------------- concurso e cargos */

export const concursos = pgTable('concursos', {
  id: id(),
  /** extra: identificador legível e estável. */
  slug: text('slug').notNull().unique(),
  nome: text('nome').notNull(),
  banca: text('banca').notNull(),
  orgao: text('orgao').notNull(),
  municipio: text('municipio').notNull(),
  uf: varchar('uf', { length: 2 }).notNull(),
  ano: integer('ano').notNull(),
  status: statusConcursoEnum('status').notNull().default('aguardando_edital'),
  dataProva: dia('data_prova'),
  links: jsonb('links').$type<LinkJson[]>().notNull().default([]),
  ativo: boolean('ativo').notNull().default(true),
  /** extra: sobe a cada mudança de conteúdo; invalida cache e pacote offline. */
  versaoConteudo: integer('versao_conteudo').notNull().default(1),
  /** extra */
  editalPublicadoEm: ts('edital_publicado_em'),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const cargos = pgTable(
  'cargos',
  {
    id: id(),
    concursoId: uuid('concurso_id')
      .notNull()
      .references(() => concursos.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    area: areaCargoEnum('area').notNull(),
    escolaridade: escolaridadeEnum('escolaridade'),
    vagas: integer('vagas'),
    distribuicao: jsonb('distribuicao')
      .$type<DistribuicaoJson>()
      .notNull()
      .default(DISTRIBUICAO_PADRAO_JSON),
    /** extra: true = cargo genérico por área (antes do edital). */
    generico: boolean('generico').notNull().default(true),
    /** extra: conteúdo programático do edital. */
    conteudoProgramatico: text('conteudo_programatico'),
    /** extra */
    ordem: integer('ordem').notNull().default(0),
    /** extra */
    ativo: boolean('ativo').notNull().default(true),
    criadoEm: criadoEm(),
  },
  (t) => [unique('cargos_concurso_nome_uq').on(t.concursoId, t.nome)],
);

/* ---------------------------------------------------------- provas_origem */

export const provasOrigem = pgTable(
  'provas_origem',
  {
    id: id(),
    banca: text('banca').notNull().default('FAU-Unicentro'),
    /** extra: nome do certame no site da banca. */
    nome: text('nome'),
    /** extra: Prefeitura, Câmara, Consórcio de saúde… */
    tipo: text('tipo'),
    orgao: text('orgao').notNull(),
    municipio: text('municipio'),
    uf: varchar('uf', { length: 2 }),
    ano: integer('ano'),
    /** extra */
    dataProva: dia('data_prova'),
    cargo: text('cargo'),
    nivel: text('nivel'),
    /** extra: Estatutário, Processo seletivo… */
    regime: text('regime'),
    /** extra: página do certame (FAU) ou da prova (PCI). */
    urlPagina: text('url_pagina'),
    urlCaderno: text('url_caderno'),
    urlGabarito: text('url_gabarito'),
    urlRecursos: text('url_recursos'),
    hashPdf: text('hash_pdf'),
    slugFau: text('slug_fau'),
    /** extra: prioridade 1 de importação (PR, 2022+). */
    relevanciaPalmital: boolean('relevancia_palmital').notNull().default(false),
    /** extra */
    fonte: fonteColetaEnum('fonte').notNull().default('fau'),
    /** extra: retirada rápida de uma prova inteira. */
    status: statusProvaOrigemEnum('status').notNull().default('ativa'),
    /** extra (D9): situação do certame no site da banca. */
    situacaoCertame: situacaoCertameEnum('situacao_certame'),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index('provas_origem_slug_fau_idx').on(t.slugFau),
    index('provas_origem_banca_status_idx').on(t.banca, t.status),
  ],
);

/* ------------------------------------------------- disciplinas e assuntos */

export const disciplinas = pgTable('disciplinas', {
  id: id(),
  slug: slugDisciplinaEnum('slug').notNull().unique(),
  nome: text('nome').notNull(),
  cor: text('cor').notNull(),
  /** extra */
  ordem: integer('ordem').notNull().default(0),
});

export const assuntos = pgTable(
  'assuntos',
  {
    id: id(),
    disciplinaId: uuid('disciplina_id')
      .notNull()
      .references(() => disciplinas.id),
    nome: text('nome').notNull(),
    slug: text('slug').notNull(),
    dicaTitulo: text('dica_titulo'),
    dicaTexto: text('dica_texto'),
    dicaExemplo: text('dica_exemplo'),
    criadoEm: criadoEm(),
  },
  (t) => [unique('assuntos_disciplina_slug_uq').on(t.disciplinaId, t.slug)],
);

/* ---------------------------------------------------------------- usuarios */

export const usuarios = pgTable(
  'usuarios',
  {
    id: id(),
    nome: text('nome').notNull(),
    email: text('email').notNull().unique(),
    /** Só dígitos. Nulo depois da exclusão de conta (anonimização). */
    cpf: varchar('cpf', { length: 11 }).unique(),
    celular: varchar('celular', { length: 11 }),
    senhaHash: text('senha_hash'),
    papel: papelEnum('papel').notNull().default('aluno'),
    acesso: boolean('acesso').notNull().default(false),
    concursoId: uuid('concurso_id').references(() => concursos.id),
    cargoId: uuid('cargo_id').references(() => cargos.id),
    area: areaCargoEnum('area'),
    metaDiaria: smallint('meta_diaria').notNull().default(1),
    /** 'HH:MM' em São Paulo. */
    lembreteHora: varchar('lembrete_hora', { length: 5 }),
    /** extra: liga/desliga o lembrete sem perder o horário. */
    notificacoes: boolean('notificacoes').notNull().default(true),
    apelidoLiga: text('apelido_liga'),
    sons: boolean('sons').notNull().default(true),
    xpTotal: integer('xp_total').notNull().default(0),
    gemas: integer('gemas').notNull().default(0),
    vidas: smallint('vidas').notNull().default(5),
    vidasAtualizadoEm: ts('vidas_atualizado_em').notNull().defaultNow(),
    ofensiva: integer('ofensiva').notNull().default(0),
    ofensivaRecorde: integer('ofensiva_recorde').notNull().default(0),
    ultimoDiaEstudo: dia('ultimo_dia_estudo'),
    protetores: smallint('protetores').notNull().default(0),
    divisao: divisaoEnum('divisao').notNull().default('bronze'),
    /** extra: cliente no Asaas, reaproveitado entre pedidos. */
    asaasCustomerId: text('asaas_customer_id'),
    /** extra */
    onboardingConcluidoEm: ts('onboarding_concluido_em'),
    /** extra: no máximo 1 push por dia. */
    ultimoPushEm: ts('ultimo_push_em'),
    aceiteTermosEm: ts('aceite_termos_em'),
    versaoTermos: text('versao_termos'),
    criadoEm: criadoEm(),
    /** extra */
    atualizadoEm: atualizadoEm(),
    excluidoEm: ts('excluido_em'),
  },
  (t) => [
    index('usuarios_lembrete_idx')
      .on(t.lembreteHora)
      .where(sql`${t.notificacoes} = true`),
    check('usuarios_meta_diaria_ck', sql`${t.metaDiaria} between 1 and 3`),
    check('usuarios_vidas_ck', sql`${t.vidas} between 0 and 5`),
    check('usuarios_protetores_ck', sql`${t.protetores} between 0 and 2`),
  ],
);

export const sessoes = pgTable(
  'sessoes',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiraEm: ts('expira_em').notNull(),
    criadoEm: criadoEm(),
    /** extra */
    ultimoUsoEm: ts('ultimo_uso_em').notNull().defaultNow(),
  },
  (t) => [index('sessoes_usuario_idx').on(t.usuarioId), index('sessoes_expira_idx').on(t.expiraEm)],
);

export const redefinicoesSenha = pgTable(
  'redefinicoes_senha',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiraEm: ts('expira_em').notNull(),
    usadoEm: ts('usado_em'),
    criadoEm: criadoEm(),
  },
  (t) => [index('redefinicoes_usuario_idx').on(t.usuarioId)],
);

/* ---------------------------------------------------------------- questões */

export const questoes = pgTable(
  'questoes',
  {
    id: id(),
    provaOrigemId: uuid('prova_origem_id').references(() => provasOrigem.id),
    numeroOrigem: integer('numero_origem'),
    origem: origemQuestaoEnum('origem').notNull(),
    disciplinaId: uuid('disciplina_id')
      .notNull()
      .references(() => disciplinas.id),
    assuntoId: uuid('assunto_id')
      .notNull()
      .references(() => assuntos.id),
    areas: text('areas')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    dificuldade: smallint('dificuldade').notNull().default(2),
    textoApoio: text('texto_apoio'),
    enunciado: text('enunciado').notNull(),
    alternativas: jsonb('alternativas').$type<AlternativaJson[]>().notNull(),
    /** D9: anulável só em questão anulada (importada sem letra). */
    gabarito: letraEnum('gabarito'),
    /** extra: dica da questão (botão DICA, 5 gemas). Sem ela, usa a dica do assunto. */
    dica: text('dica'),
    explicacao: text('explicacao'),
    dicaBolso: text('dica_bolso'),
    status: statusQuestaoEnum('status').notNull().default('rascunho'),
    anuladaMotivo: text('anulada_motivo'),
    versao: integer('versao').notNull().default(1),
    criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    revisadoPor: uuid('revisado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    publicadoEm: ts('publicado_em'),
    criadoEm: criadoEm(),
    /** extra */
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index('questoes_status_assunto_idx').on(t.status, t.assuntoId),
    index('questoes_areas_gin_idx').using('gin', t.areas),
    uniqueIndex('questoes_prova_numero_uq').on(t.provaOrigemId, t.numeroOrigem),
    check('questoes_dificuldade_ck', sql`${t.dificuldade} between 1 and 3`),
    check('questoes_gabarito_ck', sql`${t.gabarito} is not null or ${t.status} = 'anulada'`),
    check(
      'questoes_origem_prova_ck',
      sql`(${t.origem} = 'autoral' and ${t.provaOrigemId} is null) or (${t.origem} = 'fau_real' and ${t.provaOrigemId} is not null)`,
    ),
  ],
);

/* ------------------------------------------------------------------ trilha */

export const unidades = pgTable(
  'unidades',
  {
    id: id(),
    concursoId: uuid('concurso_id')
      .notNull()
      .references(() => concursos.id, { onDelete: 'cascade' }),
    /** null = unidade comum a todas as áreas. */
    area: areaCargoEnum('area'),
    ordem: integer('ordem').notNull(),
    titulo: text('titulo').notNull(),
    disciplinaId: uuid('disciplina_id')
      .notNull()
      .references(() => disciplinas.id),
    criadoEm: criadoEm(),
  },
  (t) => [index('unidades_concurso_area_ordem_idx').on(t.concursoId, t.area, t.ordem)],
);

export const secoes = pgTable(
  'secoes',
  {
    id: id(),
    unidadeId: uuid('unidade_id')
      .notNull()
      .references(() => unidades.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    titulo: text('titulo').notNull(),
    assuntoId: uuid('assunto_id')
      .notNull()
      .references(() => assuntos.id),
    noEdital: boolean('no_edital'),
  },
  (t) => [index('secoes_unidade_ordem_idx').on(t.unidadeId, t.ordem)],
);

export const licoes = pgTable(
  'licoes',
  {
    id: id(),
    secaoId: uuid('secao_id')
      .notNull()
      .references(() => secoes.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    tipo: tipoLicaoEnum('tipo').notNull().default('normal'),
    tamanho: smallint('tamanho').notNull().default(5),
    /** extra: nome exibido no fim da lição. */
    titulo: text('titulo'),
    /** extra: dica própria da lição (sobrepõe a do assunto). */
    dicaTitulo: text('dica_titulo'),
    dicaTexto: text('dica_texto'),
    dicaExemplo: text('dica_exemplo'),
  },
  (t) => [
    index('licoes_secao_ordem_idx').on(t.secaoId, t.ordem),
    check('licoes_tamanho_ck', sql`${t.tamanho} in (5, 10)`),
  ],
);

/* -------------------------------------------------------------- pagamento */

export const pedidos = pgTable(
  'pedidos',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    asaasCustomerId: text('asaas_customer_id'),
    asaasPaymentId: text('asaas_payment_id').unique(),
    valorCentavos: integer('valor_centavos').notNull(),
    status: statusPedidoEnum('status').notNull().default('pendente'),
    pixPayload: text('pix_payload'),
    pixImagem: text('pix_imagem'),
    pixExpiraEm: ts('pix_expira_em'),
    pagoEm: ts('pago_em'),
    /** extra */
    reembolsoSolicitadoEm: ts('reembolso_solicitado_em'),
    /** extra */
    estornadoEm: ts('estornado_em'),
    criadoEm: criadoEm(),
    /** extra */
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index('pedidos_usuario_status_idx').on(t.usuarioId, t.status),
    index('pedidos_status_expira_idx').on(t.status, t.pixExpiraEm),
    index('pedidos_pago_em_idx').on(t.pagoEm),
  ],
);

export const webhookEventos = pgTable('webhook_eventos', {
  /** id do evento no Asaas */
  id: text('id').primaryKey(),
  evento: text('evento').notNull(),
  corpo: jsonb('corpo').notNull(),
  recebidoEm: ts('recebido_em').notNull().defaultNow(),
  processadoEm: ts('processado_em'),
  /** extra */
  erro: text('erro'),
});

/* ------------------------------------------------------------------ estudo */

export const progressoLicoes = pgTable(
  'progresso_licoes',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    licaoId: uuid('licao_id')
      .notNull()
      .references(() => licoes.id, { onDelete: 'cascade' }),
    vezes: integer('vezes').notNull().default(0),
    melhorPrecisao: smallint('melhor_precisao'),
    concluidaEm: ts('concluida_em'),
    /** extra */
    atualizadoEm: atualizadoEm(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.licaoId] })],
);

export const sessoesEstudo = pgTable(
  'sessoes_estudo',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: tipoSessaoEstudoEnum('tipo').notNull(),
    licaoId: uuid('licao_id').references(() => licoes.id, { onDelete: 'set null' }),
    /** extra: questões sorteadas, em ordem. */
    questoes: uuid('questoes')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** extra: revisão "REVISAR ERROS" criada a partir desta sessão. */
    sessaoOrigemId: uuid('sessao_origem_id'),
    /** extra: id gerado no cliente para sessões feitas offline. */
    idCliente: uuid('id_cliente'),
    /** extra (D8): questões em que o aluno comprou a dica nesta sessão (não cobra 2 vezes). */
    dicasUsadas: uuid('dicas_usadas')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    iniciadaEm: ts('iniciada_em').notNull().defaultNow(),
    concluidaEm: ts('concluida_em'),
    xpGanho: integer('xp_ganho').notNull().default(0),
    acertos: integer('acertos').notNull().default(0),
    total: integer('total').notNull().default(0),
  },
  (t) => [
    index('sessoes_estudo_usuario_iniciada_idx').on(t.usuarioId, t.iniciadaEm),
    unique('sessoes_estudo_usuario_id_cliente_uq').on(t.usuarioId, t.idCliente),
  ],
);

export const tentativas = pgTable(
  'tentativas',
  {
    id: id(),
    /** Único por usuário (sync offline idempotente). */
    idCliente: uuid('id_cliente'),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    questaoId: uuid('questao_id')
      .notNull()
      .references(() => questoes.id),
    sessaoEstudoId: uuid('sessao_estudo_id').references(() => sessoesEstudo.id, {
      onDelete: 'set null',
    }),
    resposta: letraEnum('resposta').notNull(),
    acertou: boolean('acertou').notNull(),
    usouDica: boolean('usou_dica').notNull().default(false),
    tempoMs: integer('tempo_ms').notNull().default(0),
    respondidaEm: ts('respondida_em').notNull().defaultNow(),
    /** extra */
    offline: boolean('offline').notNull().default(false),
  },
  (t) => [
    unique('tentativas_usuario_id_cliente_uq').on(t.usuarioId, t.idCliente),
    index('tentativas_usuario_questao_respondida_idx').on(
      t.usuarioId,
      t.questaoId,
      t.respondidaEm.desc(),
    ),
    index('tentativas_sessao_idx').on(t.sessaoEstudoId),
  ],
);

export const revisoes = pgTable(
  'revisoes',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    questaoId: uuid('questao_id')
      .notNull()
      .references(() => questoes.id, { onDelete: 'cascade' }),
    etapa: smallint('etapa').notNull().default(0),
    venceEm: ts('vence_em').notNull(),
    status: statusRevisaoEnum('status').notNull().default('ativa'),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    primaryKey({ columns: [t.usuarioId, t.questaoId] }),
    index('revisoes_usuario_vence_ativa_idx')
      .on(t.usuarioId, t.venceEm)
      .where(sql`${t.status} = 'ativa'`),
    check('revisoes_etapa_ck', sql`${t.etapa} between 0 and 4`),
  ],
);

export const simulados = pgTable(
  'simulados',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    cargoId: uuid('cargo_id')
      .notNull()
      .references(() => cargos.id),
    questoes: uuid('questoes').array().notNull(),
    /** extra: distribuição usada (padrão ou do edital), com pesos. */
    distribuicao: jsonb('distribuicao')
      .$type<DistribuicaoJson>()
      .notNull()
      .default(DISTRIBUICAO_PADRAO_JSON),
    respostas: jsonb('respostas')
      .$type<Record<string, RespostaSimuladoJson>>()
      .notNull()
      .default({}),
    iniciadoEm: ts('iniciado_em').notNull().defaultNow(),
    terminaEm: ts('termina_em').notNull(),
    entregueEm: ts('entregue_em'),
    /** extra */
    entregaAutomatica: boolean('entrega_automatica').notNull().default(false),
    pontos: numeric('pontos', { precision: 5, scale: 1, mode: 'number' }),
    acertosPorBloco: jsonb('acertos_por_bloco').$type<AcertosPorBlocoJson>(),
    /** extra */
    xpGanho: integer('xp_ganho').notNull().default(0),
  },
  (t) => [
    index('simulados_usuario_iniciado_idx').on(t.usuarioId, t.iniciadoEm),
    index('simulados_abertos_idx')
      .on(t.terminaEm)
      .where(sql`${t.entregueEm} is null`),
  ],
);

export const xpEventos = pgTable(
  'xp_eventos',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: tipoXpEventoEnum('tipo').notNull(),
    valor: integer('valor').notNull(),
    /** extra */
    sessaoEstudoId: uuid('sessao_estudo_id').references(() => sessoesEstudo.id, {
      onDelete: 'set null',
    }),
    /** extra */
    simuladoId: uuid('simulado_id').references(() => simulados.id, { onDelete: 'set null' }),
    criadoEm: criadoEm(),
    /** Segunda-feira da semana (São Paulo). */
    semana: dia('semana').notNull(),
  },
  (t) => [index('xp_eventos_usuario_semana_idx').on(t.usuarioId, t.semana)],
);

/* -------------------------------------------------------------------- liga */

export const ligasGrupos = pgTable(
  'ligas_grupos',
  {
    id: id(),
    semana: dia('semana').notNull(),
    divisao: divisaoEnum('divisao').notNull(),
    concursoId: uuid('concurso_id')
      .notNull()
      .references(() => concursos.id, { onDelete: 'cascade' }),
    /** extra */
    fechadoEm: ts('fechado_em'),
    /** extra */
    criadoEm: criadoEm(),
  },
  (t) => [index('ligas_grupos_semana_idx').on(t.semana, t.concursoId, t.divisao)],
);

export const ligasMembros = pgTable(
  'ligas_membros',
  {
    grupoId: uuid('grupo_id')
      .notNull()
      .references(() => ligasGrupos.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** extra: garante um grupo por usuário por semana. */
    semana: dia('semana').notNull(),
    xpSemana: integer('xp_semana').notNull().default(0),
    alcancadoEm: ts('alcancado_em').notNull().defaultNow(),
    resultado: resultadoLigaEnum('resultado'),
    /** extra */
    posicaoFinal: integer('posicao_final'),
    /** extra: modal de resultado semanal já visto. */
    resultadoVistoEm: ts('resultado_visto_em'),
  },
  (t) => [
    primaryKey({ columns: [t.grupoId, t.usuarioId] }),
    unique('ligas_membros_usuario_semana_uq').on(t.usuarioId, t.semana),
    index('ligas_membros_ranking_idx').on(t.grupoId, t.xpSemana.desc(), t.alcancadoEm),
  ],
);

/* ------------------------------------------------------- conquistas e cia. */

export const conquistasUsuario = pgTable(
  'conquistas_usuario',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    codigo: text('codigo').notNull(),
    obtidaEm: ts('obtida_em').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.codigo] })],
);

export const reports = pgTable(
  'reports',
  {
    id: id(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    questaoId: uuid('questao_id')
      .notNull()
      .references(() => questoes.id, { onDelete: 'cascade' }),
    tipo: tipoReportEnum('tipo').notNull(),
    texto: text('texto'),
    status: statusReportEnum('status').notNull().default('aberto'),
    resolvidoPor: uuid('resolvido_por').references(() => usuarios.id, { onDelete: 'set null' }),
    /** extra */
    nota: text('nota'),
    criadoEm: criadoEm(),
    /** extra */
    resolvidoEm: ts('resolvido_em'),
  },
  (t) => [
    index('reports_questao_status_idx').on(t.questaoId, t.status),
    index('reports_status_criado_idx').on(t.status, t.criadoEm),
  ],
);

export const pushInscricoes = pgTable(
  'push_inscricoes',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index('push_inscricoes_usuario_idx').on(t.usuarioId)],
);

export const auditoria = pgTable(
  'auditoria',
  {
    id: id(),
    adminId: uuid('admin_id').references(() => usuarios.id, { onDelete: 'set null' }),
    acao: text('acao').notNull(),
    alvo: text('alvo'),
    detalhes: jsonb('detalhes').$type<Record<string, unknown>>(),
    criadoEm: criadoEm(),
  },
  (t) => [index('auditoria_criado_idx').on(t.criadoEm), index('auditoria_acao_idx').on(t.acao)],
);

/* ------------------------------------------------- extra: coletor/importação */

/** extra: arquivos baixados pelo coletor (hash para não baixar de novo). */
export const arquivosColetados = pgTable(
  'arquivos_coletados',
  {
    id: id(),
    url: text('url').notNull().unique(),
    fonte: fonteColetaEnum('fonte').notNull(),
    tipo: tipoArquivoColetaEnum('tipo').notNull().default('outro'),
    provaOrigemId: uuid('prova_origem_id').references(() => provasOrigem.id, {
      onDelete: 'set null',
    }),
    /** Caminho em ARQUIVOS_DIR (fora do diretório público). */
    caminho: text('caminho'),
    hashSha256: text('hash_sha256'),
    bytes: integer('bytes'),
    baixadoEm: ts('baixado_em'),
    criadoEm: criadoEm(),
  },
  (t) => [index('arquivos_coletados_hash_idx').on(t.hashSha256)],
);

/** extra: fila de importação de PDFs para o painel admin. */
export const importacoes = pgTable(
  'importacoes',
  {
    id: id(),
    provaOrigemId: uuid('prova_origem_id').references(() => provasOrigem.id, {
      onDelete: 'set null',
    }),
    arquivoCaderno: text('arquivo_caderno'),
    arquivoGabarito: text('arquivo_gabarito'),
    /** D9: gabarito preliminar usado no confronto. */
    arquivoPreliminar: text('arquivo_preliminar'),
    /** D9: cargo do bloco do gabarito usado. */
    cargo: text('cargo'),
    hashCaderno: text('hash_caderno'),
    status: statusImportacaoEnum('status').notNull().default('baixado'),
    questoesExtraidas: integer('questoes_extraidas').notNull().default(0),
    divergencias: integer('divergencias').notNull().default(0),
    confronto: jsonb('confronto').$type<ConfrontoJson[]>().notNull().default([]),
    log: text('log'),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index('importacoes_status_idx').on(t.status, t.criadoEm)],
);
