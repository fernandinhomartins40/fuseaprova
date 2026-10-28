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
  canalComunicacaoEnum,
  divisaoEnum,
  escolaridadeEnum,
  fonteColetaEnum,
  formaPagamentoManualEnum,
  tipoCupomEnum,
  letraEnum,
  metodoPedidoEnum,
  origemQuestaoEnum,
  papelEnum,
  resultadoLigaEnum,
  segmentoComunicacaoEnum,
  situacaoCertameEnum,
  slugDisciplinaEnum,
  statusComunicacaoEnum,
  statusConcursoEnum,
  statusEnvioComunicacaoEnum,
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

/**
 * Concursos que o aluno acompanha (D21). O acesso é POR CONCURSO: cada concurso é uma compra
 * (R$ 397 o primeiro, R$ 197 cada adicional) e `acesso` diz se este está liberado. A linha guarda
 * também o cargo e a área do aluno NAQUELE concurso. `usuarios.concurso_id`, `cargo_id` e `area`
 * continuam sendo o concurso ATIVO (a trilha, o simulado e a liga leem deles) e
 * `usuarios.acesso` = algum concurso liberado (a guarda 402 lê dele); trocar de concurso copia a
 * linha para lá. Progresso, XP, ofensiva e revisão são do aluno, não do concurso.
 */
export const usuariosConcursos = pgTable(
  'usuarios_concursos',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    concursoId: uuid('concurso_id')
      .notNull()
      .references(() => concursos.id, { onDelete: 'cascade' }),
    cargoId: uuid('cargo_id').references(() => cargos.id, { onDelete: 'set null' }),
    area: areaCargoEnum('area'),
    /** Este concurso está liberado para o aluno (pago, ou liberado à mão pelo admin). */
    acesso: boolean('acesso').notNull().default(false),
    acessoEm: ts('acesso_em'),
    criadoEm: criadoEm(),
  },
  (t) => [
    primaryKey({ columns: [t.usuarioId, t.concursoId] }),
    index('usuarios_concursos_concurso_idx').on(t.concursoId),
  ],
);

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
    /** extra D13: opt-in de e-mail e push de novidades (marketing). */
    marketing: boolean('marketing').notNull().default(false),
    /** extra D13: conta bloqueada pelo superadmin (não entra nem usa sessões abertas). */
    bloqueadoEm: ts('bloqueado_em'),
    bloqueioMotivo: text('bloqueio_motivo'),
    /** extra D13: segredo TOTP cifrado (AES-256-GCM com chave derivada do SESSION_SECRET). */
    totpSegredo: text('totp_segredo'),
    /** extra D13: null = 2FA ainda não ativado (o segredo acima pode estar pendente). */
    totpAtivadoEm: ts('totp_ativado_em'),
    /** extra D13: último passo de 30 s aceito (impede reutilizar o mesmo código). */
    totpUltimoPasso: integer('totp_ultimo_passo'),
    criadoEm: criadoEm(),
    /** extra */
    atualizadoEm: atualizadoEm(),
    excluidoEm: ts('excluido_em'),
  },
  (t) => [
    index('usuarios_lembrete_idx')
      .on(t.lembreteHora)
      .where(sql`${t.notificacoes} = true`),
    // S-22: lista e CSV do /super ordenam por criado_em; a busca usa ilike '%…%' (pg_trgm).
    index('usuarios_criado_idx').on(t.criadoEm),
    index('usuarios_nome_trgm_idx').using('gin', t.nome.op('gin_trgm_ops')),
    index('usuarios_email_trgm_idx').using('gin', t.email.op('gin_trgm_ops')),
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
    /** extra D13: quando a sessão foi confirmada com o 2FA (superadmin). */
    doisFatoresEm: ts('dois_fatores_em'),
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

/** extra D23: cupom de desconto criado pelo superadmin. O código é único (maiúsculo). */
export const cupons = pgTable('cupons', {
  id: id(),
  codigo: text('codigo').notNull().unique(),
  descricao: text('descricao').notNull().default(''),
  tipo: tipoCupomEnum('tipo').notNull(),
  /** Percentual (1 a 90) ou centavos. */
  valor: integer('valor').notNull(),
  validoAte: ts('valido_ate'),
  limiteUsos: integer('limite_usos'),
  /** Só para este concurso; null = qualquer um. */
  concursoId: uuid('concurso_id').references(() => concursos.id, { onDelete: 'cascade' }),
  ativo: boolean('ativo').notNull().default(true),
  criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const pedidos = pgTable(
  'pedidos',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** extra D21: de qual concurso é a compra (o acesso é por concurso). Pedidos antigos: o do aluno. */
    concursoId: uuid('concurso_id').references(() => concursos.id),
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
    /** extra D13: asaas (Pix) ou manual (aprovado pelo superadmin). */
    metodo: metodoPedidoEnum('metodo').notNull().default('asaas'),
    /** extra D13: valor líquido informado pelo Asaas (valor − taxas). */
    valorLiquidoCentavos: integer('valor_liquido_centavos'),
    /** extra D13: cobrança Pix cancelada pelo superadmin (o status fica 'vencido'). */
    canceladoEm: ts('cancelado_em'),
    /** extra D13: última conciliação com o Asaas. */
    conciliadoEm: ts('conciliado_em'),
    /** extra D13: aprovação manual (pagamento recebido por fora). */
    manualForma: formaPagamentoManualEnum('manual_forma'),
    manualRecebidoEm: dia('manual_recebido_em'),
    manualObservacao: text('manual_observacao'),
    manualReferencia: text('manual_referencia'),
    /** Nome do arquivo em ARQUIVOS_DIR/comprovantes (servido só ao superadmin). */
    manualComprovante: text('manual_comprovante'),
    aprovadoPor: uuid('aprovado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    /** extra D23: cupom usado e o preço antes dele. */
    cupomId: uuid('cupom_id').references(() => cupons.id, { onDelete: 'set null' }),
    valorOriginalCentavos: integer('valor_original_centavos'),
    criadoEm: criadoEm(),
    /** extra */
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index('pedidos_usuario_status_idx').on(t.usuarioId, t.status),
    index('pedidos_status_expira_idx').on(t.status, t.pixExpiraEm),
    index('pedidos_pago_em_idx').on(t.pagoEm),
    index('pedidos_criado_em_idx').on(t.criadoEm),
    index('pedidos_cupom_idx').on(t.cupomId),
    // S-22: reembolsos por período no financeiro.
    index('pedidos_estornado_em_idx').on(t.estornadoEm),
  ],
);

export const webhookEventos = pgTable(
  'webhook_eventos',
  {
    /** id do evento no Asaas */
    id: text('id').primaryKey(),
    evento: text('evento').notNull(),
    corpo: jsonb('corpo').notNull(),
    recebidoEm: ts('recebido_em').notNull().defaultNow(),
    processadoEm: ts('processado_em'),
    /** extra */
    erro: text('erro'),
    /** extra D13: quantas vezes o evento foi processado (recebido de novo ou reprocessado). */
    tentativas: integer('tentativas').notNull().default(1),
    /** extra D13: o que o processamento fez (pago, estornado, vencido, ignorado, sem_pedido). */
    resultado: text('resultado'),
    /** extra D13 */
    ultimaTentativaEm: ts('ultima_tentativa_em'),
  },
  // S-22 (R3-15): linha do tempo e lista de webhooks filtram pelo id da cobrança no corpo.
  (t) => [index('webhook_eventos_payment_idx').on(sql`(${t.corpo} -> 'payment' ->> 'id')`)],
);

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
    // S-22 (R3-15): DAU/WAU/MAU (faixa de respondida_em, só o usuario_id: index-only scan) e
    // "última atividade"/inativos por aluno.
    index('tentativas_respondida_usuario_idx').on(t.respondidaEm, t.usuarioId),
    index('tentativas_usuario_respondida_idx').on(t.usuarioId, t.respondidaEm.desc()),
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

/**
 * extra (auditoria PIE): pacotes offline emitidos. O sync só aceita datas entre a geração
 * do pacote e o envio, para o aparelho não forjar dias de ofensiva no passado.
 */
export const pacotesOffline = pgTable(
  'pacotes_offline',
  {
    id: uuid('id').primaryKey(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    geradoEm: ts('gerado_em').notNull(),
    expiraEm: ts('expira_em').notNull(),
  },
  (t) => [index('pacotes_offline_usuario_idx').on(t.usuarioId)],
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
    /** extra D13 */
    ip: text('ip'),
    motivo: text('motivo'),
    antes: jsonb('antes').$type<Record<string, unknown>>(),
    depois: jsonb('depois').$type<Record<string, unknown>>(),
    criadoEm: criadoEm(),
  },
  (t) => [
    index('auditoria_criado_idx').on(t.criadoEm),
    index('auditoria_acao_idx').on(t.acao),
    index('auditoria_alvo_idx').on(t.alvo),
    // S-22: busca por alvo com ilike '%…%' (pg_trgm).
    index('auditoria_alvo_trgm_idx').using('gin', t.alvo.op('gin_trgm_ops')),
  ],
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

/* ------------------------------------------------------ extra D13: superadmin */

/** Códigos de recuperação do 2FA (só o hash SHA-256; cada um vale uma vez). */
export const codigosRecuperacao = pgTable(
  'codigos_recuperacao',
  {
    id: id(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    usadoEm: ts('usado_em'),
    criadoEm: criadoEm(),
  },
  (t) => [index('codigos_recuperacao_usuario_idx').on(t.usuarioId)],
);

/** Cada execução de job do worker (saúde no painel /super/sistema). */
export const jobsExecucoes = pgTable(
  'jobs_execucoes',
  {
    id: id(),
    job: text('job').notNull(),
    iniciadoEm: ts('iniciado_em').notNull().defaultNow(),
    terminadoEm: ts('terminado_em'),
    ok: boolean('ok'),
    resultado: jsonb('resultado').$type<Record<string, unknown>>(),
    erro: text('erro'),
  },
  (t) => [index('jobs_execucoes_job_idx').on(t.job, t.iniciadoEm)],
);

/** Configurações do produto que não são segredo (chave → valor), com auditoria. */
export const configuracoes = pgTable('configuracoes', {
  chave: text('chave').primaryKey(),
  valor: jsonb('valor').$type<unknown>().notNull(),
  atualizadoEm: ts('atualizado_em').notNull().defaultNow(),
  atualizadoPor: uuid('atualizado_por').references(() => usuarios.id, { onDelete: 'set null' }),
});

/** Comunicação em massa (e-mail ou push), enviada pelo worker em fila. */
export const comunicacoes = pgTable(
  'comunicacoes',
  {
    id: id(),
    canal: canalComunicacaoEnum('canal').notNull(),
    segmento: segmentoComunicacaoEnum('segmento').notNull(),
    diasInativo: integer('dias_inativo'),
    assunto: text('assunto').notNull(),
    mensagem: text('mensagem').notNull(),
    link: text('link'),
    status: statusComunicacaoEnum('status').notNull().default('na_fila'),
    total: integer('total').notNull().default(0),
    criadoPor: uuid('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    criadoEm: criadoEm(),
    iniciadoEm: ts('iniciado_em'),
    concluidoEm: ts('concluido_em'),
    /** S-17: chave enviada pela tela; o 2º clique devolve a mesma comunicação. */
    chaveIdempotencia: uuid('chave_idempotencia').unique(),
    /** S-17: o disjuntor pausou a fila (SMTP fora); os envios continuam pendentes. */
    pausadaMotivo: text('pausada_motivo'),
    pausadaEm: ts('pausada_em'),
  },
  (t) => [index('comunicacoes_status_idx').on(t.status, t.criadoEm)],
);

export const comunicacoesEnvios = pgTable(
  'comunicacoes_envios',
  {
    id: id(),
    comunicacaoId: uuid('comunicacao_id')
      .notNull()
      .references(() => comunicacoes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    status: statusEnvioComunicacaoEnum('status').notNull().default('pendente'),
    enviadoEm: ts('enviado_em'),
    erro: text('erro'),
    /** S-17: tentativas com falha temporária do SMTP e quando tentar de novo. */
    tentativas: integer('tentativas').notNull().default(0),
    proximaTentativaEm: ts('proxima_tentativa_em'),
  },
  (t) => [
    unique('comunicacoes_envios_unico').on(t.comunicacaoId, t.usuarioId),
    index('comunicacoes_envios_status_idx').on(t.comunicacaoId, t.status),
    index('comunicacoes_envios_usuario_idx').on(t.usuarioId, t.enviadoEm),
  ],
);

/* ------------------------------------------- Lote 2 da auditoria do painel */

/**
 * S-09: cada resposta 5xx da API (rota do registro, método, código e hora), sem dados pessoais.
 * Alimenta o /super/sistema e o alerta de rajada; o job de limpeza apaga as antigas.
 */
export const errosApi = pgTable(
  'erros_api',
  {
    id: id(),
    rota: text('rota').notNull(),
    metodo: text('metodo').notNull(),
    status: smallint('status').notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index('erros_api_criado_idx').on(t.criadoEm)],
);

/**
 * D26 (Marco Civil da Internet, Lei 12.965/2014, art. 15): registro de acesso à aplicação (data,
 * hora e IP de cada login, cadastro ou redefinição de senha). Guardado por 6 meses e então apagado
 * pelo worker (`limpezaLegal`). Fica mesmo depois da exclusão da conta (obrigação legal, LGPD
 * art. 16, I): o vínculo é só o id, e a conta anonimizada não tem mais nome, e-mail nem CPF.
 */
export const registrosAcesso = pgTable(
  'registros_acesso',
  {
    id: id(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    evento: text('evento').notNull(),
    ip: text('ip').notNull(),
    porta: integer('porta'),
    userAgent: text('user_agent'),
    criadoEm: criadoEm(),
  },
  (t) => [index('registros_acesso_criado_idx').on(t.criadoEm), index('registros_acesso_usuario_idx').on(t.usuarioId, t.criadoEm)],
);

/**
 * S-09: estado pequeno da operação, chave → valor. Guarda o sinal de vida do worker
 * (`worker:sinal`) e quando cada alerta foi enviado (`alerta:<id>`), para não repetir.
 */
export const estadoSistema = pgTable('estado_sistema', {
  chave: text('chave').primaryKey(),
  valor: jsonb('valor').$type<Record<string, unknown>>().notNull().default({}),
  atualizadoEm: ts('atualizado_em').notNull().defaultNow(),
});

/**
 * S-16: contador persistente de rate limit (janela fixa), que sobrevive a deploy e reinício.
 * `chave` = "<balde>:<quem>" (ex.: "2fa:u:<id>"). Linhas vencidas são apagadas pela limpeza.
 */
export const limitesContagem = pgTable(
  'limites_contagem',
  {
    chave: text('chave').primaryKey(),
    n: integer('n').notNull().default(0),
    janelaFim: ts('janela_fim').notNull(),
  },
  (t) => [index('limites_contagem_fim_idx').on(t.janelaFim)],
);
