/**
 * Admin de conteúdo (PRD 5.17): concursos, cargos, provas de origem, questões, importação,
 * assuntos, trilhas e edital. Prefixo /admin, guarda: exigirAdmin (403).
 */
import { z } from 'zod';
import { AREAS_CARGO, SITUACOES_CERTAME, STATUS_IMPORTACAO, STATUS_PROVA_ORIGEM } from '../dominio.js';
import {
  Alternativas,
  BoolQuery,
  CargoResumo,
  DataHora,
  Dia,
  DisciplinaResumo,
  Distribuicao,
  LinkOficial,
  PaginacaoQuery,
  paginada,
  QuestaoParaAluno,
  Uuid,
  ZAreaCargo,
  ZEscolaridade,
  ZLetra,
  ZOrigemQuestao,
  ZSlugDisciplina,
  ZStatusConcurso,
  ZStatusQuestao,
  ZTipoLicao,
} from './comum.js';

const textoObrigatorio = (msg: string) => z.string().trim().min(1, msg);
const textoOpcional = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

/* -------------------------------------------------------------- concursos */

export const ConcursoAdmin = z.object({
  id: Uuid,
  nome: z.string(),
  slug: z.string(),
  banca: z.string(),
  orgao: z.string(),
  municipio: z.string(),
  uf: z.string(),
  ano: z.number().int(),
  status: ZStatusConcurso,
  dataProva: Dia.nullable(),
  links: z.array(LinkOficial),
  ativo: z.boolean(),
  versaoConteudo: z.number().int(),
  editalPublicadoEm: DataHora.nullable(),
  criadoEm: DataHora,
});
export type ConcursoAdmin = z.infer<typeof ConcursoAdmin>;

/** POST /admin/concursos · PATCH /admin/concursos/:id (parcial) */
export const ConcursoEntrada = z.object({
  nome: textoObrigatorio('Informe o nome.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Use só letras minúsculas, números e hífen.'),
  banca: textoObrigatorio('Informe a banca.'),
  orgao: textoObrigatorio('Informe o órgão.'),
  municipio: textoObrigatorio('Informe o município.'),
  uf: z.string().length(2, 'UF com 2 letras.').toUpperCase(),
  ano: z.number().int().min(2000).max(2100),
  status: ZStatusConcurso,
  dataProva: Dia.nullable().default(null),
  links: z.array(LinkOficial).default([]),
  ativo: z.boolean().default(true),
});
export type ConcursoEntrada = z.input<typeof ConcursoEntrada>;
export const ConcursoAtualizarEntrada = ConcursoEntrada.partial();

/** GET /admin/concursos */
export const ConcursosListaResposta = z.object({ itens: z.array(ConcursoAdmin) });

/* ----------------------------------------------------------------- cargos */

export const CargoAdmin = CargoResumo.extend({
  concursoId: Uuid,
  conteudoProgramatico: z.string().nullable(),
  ordem: z.number().int(),
  ativo: z.boolean(),
});
export type CargoAdmin = z.infer<typeof CargoAdmin>;

/** POST /admin/cargos · PATCH /admin/cargos/:id */
export const CargoEntrada = z.object({
  concursoId: Uuid,
  nome: textoObrigatorio('Informe o nome do cargo.'),
  area: ZAreaCargo,
  escolaridade: ZEscolaridade.nullable().default(null),
  vagas: z.number().int().min(0).nullable().default(null),
  generico: z.boolean().default(false),
  distribuicao: Distribuicao.default({ portugues: 5, matematica: 5, gerais: 5, especificos: 25 }),
  conteudoProgramatico: textoOpcional,
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(true),
});
export type CargoEntrada = z.input<typeof CargoEntrada>;
export const CargoAtualizarEntrada = CargoEntrada.partial();

/** GET /admin/cargos?concursoId= */
export const CargosQuery = z.object({ concursoId: Uuid.optional() });
export const CargosListaResposta = z.object({ itens: z.array(CargoAdmin) });

/* ---------------------------------------------------------- provas_origem */

export const ZStatusProvaOrigem = z.enum(STATUS_PROVA_ORIGEM);
export const ZSituacaoCertame = z.enum(SITUACOES_CERTAME);

export const ProvaOrigemAdmin = z.object({
  id: Uuid,
  banca: z.string(),
  nome: z.string().nullable(),
  tipo: z.string().nullable(),
  orgao: z.string(),
  municipio: z.string().nullable(),
  uf: z.string().nullable(),
  ano: z.number().int().nullable(),
  dataProva: Dia.nullable(),
  cargo: z.string().nullable(),
  nivel: z.string().nullable(),
  urlPagina: z.string().nullable(),
  urlCaderno: z.string().nullable(),
  urlGabarito: z.string().nullable(),
  urlRecursos: z.string().nullable(),
  hashPdf: z.string().nullable(),
  slugFau: z.string().nullable(),
  relevanciaPalmital: z.boolean(),
  status: ZStatusProvaOrigem,
  /** D9: aberto · andamento · encerrado (null = não informado). */
  situacaoCertame: ZSituacaoCertame.nullable().default(null),
  totalQuestoes: z.number().int(),
  criadoEm: DataHora,
});
export type ProvaOrigemAdmin = z.infer<typeof ProvaOrigemAdmin>;

/** GET /admin/provas */
export const ProvasQuery = PaginacaoQuery.extend({
  q: z.string().trim().optional(),
  banca: z.string().optional(),
  uf: z.string().length(2).optional(),
  ano: z.coerce.number().int().optional(),
  status: ZStatusProvaOrigem.optional(),
  relevanciaPalmital: BoolQuery.optional(),
});
export type ProvasQuery = z.input<typeof ProvasQuery>;
export const ProvasListaResposta = paginada(ProvaOrigemAdmin);
export type ProvasListaResposta = z.infer<typeof ProvasListaResposta>;

const urlOpcional = z
  .string()
  .trim()
  .url('Link inválido.')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

/** POST /admin/provas · PATCH /admin/provas/:id */
export const ProvaOrigemEntrada = z.object({
  banca: z.string().trim().default('FAU-Unicentro'),
  nome: textoOpcional,
  tipo: textoOpcional,
  orgao: textoObrigatorio('Informe o órgão.'),
  municipio: textoOpcional,
  uf: z.string().length(2).toUpperCase().nullable().default(null),
  ano: z.number().int().min(1990).max(2100).nullable().default(null),
  dataProva: Dia.nullable().default(null),
  cargo: textoOpcional,
  nivel: textoOpcional,
  urlPagina: urlOpcional,
  urlCaderno: urlOpcional,
  urlGabarito: urlOpcional,
  urlRecursos: urlOpcional,
  slugFau: textoOpcional,
  relevanciaPalmital: z.boolean().default(false),
  status: ZStatusProvaOrigem.default('ativa'),
  situacaoCertame: ZSituacaoCertame.nullable().optional(),
});
export type ProvaOrigemEntrada = z.input<typeof ProvaOrigemEntrada>;
export const ProvaOrigemAtualizarEntrada = ProvaOrigemEntrada.partial();

/* ---------------------------------------------------------------- questões */

/** GET /admin/questoes — lista com filtros. */
export const QuestoesQuery = PaginacaoQuery.extend({
  q: z.string().trim().optional(),
  disciplina: ZSlugDisciplina.optional(),
  assuntoId: Uuid.optional(),
  status: ZStatusQuestao.optional(),
  origem: ZOrigemQuestao.optional(),
  area: ZAreaCargo.optional(),
  provaOrigemId: Uuid.optional(),
  dificuldade: z.coerce.number().int().min(1).max(3).optional(),
  /** Só questões com reports abertos. */
  comReports: BoolQuery.optional(),
  ordenar: z.enum(['recentes', 'antigas', 'numero', 'reports']).default('recentes'),
});
export type QuestoesQuery = z.input<typeof QuestoesQuery>;

export const QuestaoAdminResumo = z.object({
  id: Uuid,
  status: ZStatusQuestao,
  origem: ZOrigemQuestao,
  disciplina: DisciplinaResumo,
  assunto: z.object({ id: Uuid, nome: z.string() }),
  areas: z.array(ZAreaCargo),
  dificuldade: z.number().int(),
  /** Começo do enunciado (até ~140 caracteres). */
  trecho: z.string(),
  provaOrigem: z
    .object({ id: Uuid, orgao: z.string(), ano: z.number().int().nullable() })
    .nullable(),
  numeroOrigem: z.number().int().nullable(),
  reportsAbertos: z.number().int(),
  versao: z.number().int(),
  atualizadoEm: DataHora,
});
export type QuestaoAdminResumo = z.infer<typeof QuestaoAdminResumo>;

export const QuestoesListaResposta = paginada(QuestaoAdminResumo);
export type QuestoesListaResposta = z.infer<typeof QuestoesListaResposta>;

/** GET /admin/questoes/:id — tudo, inclusive gabarito. */
/** D8: resumo da prova de origem no detalhe da questão. */
export const ProvaOrigemResumo = z.object({
  id: Uuid,
  banca: z.string(),
  nome: z.string().nullable(),
  orgao: z.string(),
  municipio: z.string().nullable(),
  uf: z.string().nullable(),
  ano: z.number().int().nullable(),
  cargo: z.string().nullable(),
  status: ZStatusProvaOrigem,
  urlPagina: z.string().nullable(),
});
export type ProvaOrigemResumo = z.infer<typeof ProvaOrigemResumo>;

export const QuestaoAdmin = z.object({
  id: Uuid,
  /** D8: dados da prova de origem (null para autoral). */
  prova: ProvaOrigemResumo.nullable().default(null),
  provaOrigemId: Uuid.nullable(),
  numeroOrigem: z.number().int().nullable(),
  origem: ZOrigemQuestao,
  disciplinaId: Uuid,
  assuntoId: Uuid,
  areas: z.array(ZAreaCargo),
  dificuldade: z.number().int().min(1).max(3),
  textoApoio: z.string().nullable(),
  enunciado: z.string(),
  alternativas: Alternativas,
  /** D9: null só em questão anulada importada sem letra. */
  gabarito: ZLetra.nullable(),
  dica: z.string().nullable(),
  explicacao: z.string().nullable(),
  dicaBolso: z.string().nullable(),
  status: ZStatusQuestao,
  anuladaMotivo: z.string().nullable(),
  versao: z.number().int(),
  criadoPor: Uuid.nullable(),
  revisadoPor: Uuid.nullable(),
  publicadoEm: DataHora.nullable(),
  criadoEm: DataHora,
  atualizadoEm: DataHora,
  reportsAbertos: z.number().int(),
  /** O que falta para publicar (vazio = pode publicar). */
  pendencias: z.array(z.string()),
});
export type QuestaoAdmin = z.infer<typeof QuestaoAdmin>;

/** POST /admin/questoes · PUT /admin/questoes/:id */
export const QuestaoEntrada = z
  .object({
    provaOrigemId: Uuid.nullable().default(null),
    numeroOrigem: z.number().int().min(1).nullable().default(null),
    origem: ZOrigemQuestao,
    disciplinaId: Uuid,
    assuntoId: Uuid,
    areas: z.array(z.enum(AREAS_CARGO)).default([]),
    dificuldade: z.number().int().min(1).max(3).default(2),
    textoApoio: textoOpcional,
    enunciado: textoObrigatorio('Informe o enunciado.'),
    alternativas: Alternativas,
    gabarito: ZLetra,
    dica: textoOpcional,
    explicacao: textoOpcional,
    dicaBolso: textoOpcional,
    status: ZStatusQuestao.default('rascunho'),
    anuladaMotivo: textoOpcional,
    /** Marca a revisão humana feita por quem está salvando. */
    revisada: z.boolean().default(false),
  })
  .superRefine((q, ctx) => {
    if (q.origem === 'fau_real' && !q.provaOrigemId) {
      ctx.addIssue({
        code: 'custom',
        path: ['provaOrigemId'],
        message: 'Questão real da FAU precisa da prova de origem.',
      });
    }
    if (q.origem === 'autoral' && q.provaOrigemId) {
      ctx.addIssue({
        code: 'custom',
        path: ['provaOrigemId'],
        message: 'Questão autoral não pode ser atribuída a uma prova real.',
      });
    }
    if (q.status === 'anulada' && !q.anuladaMotivo) {
      ctx.addIssue({
        code: 'custom',
        path: ['anuladaMotivo'],
        message: 'Informe o motivo da anulação.',
      });
    }
  });
export type QuestaoEntrada = z.input<typeof QuestaoEntrada>;

/** POST /admin/questoes/lote — ações em lote. */
export const AcaoLoteQuestoes = z.enum(['publicar', 'retirar', 'revisao', 'rascunho', 'anular']);
export const QuestoesLoteEntrada = z
  .object({
    ids: z.array(Uuid).min(1, 'Selecione ao menos uma questão.').max(500),
    acao: AcaoLoteQuestoes,
    motivo: z.string().trim().max(500).optional(),
  })
  .superRefine((o, ctx) => {
    // D8: retirar e anular tiram questões do ar; o motivo fica na auditoria.
    if ((o.acao === 'retirar' || o.acao === 'anular') && (o.motivo ?? '').length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivo'],
        message: o.acao === 'anular' ? 'Informe o motivo da anulação.' : 'Informe o motivo da retirada.',
      });
    }
  });
export type QuestoesLoteEntrada = z.infer<typeof QuestoesLoteEntrada>;

export const QuestoesLoteResposta = z.object({
  atualizadas: z.number().int(),
  ignoradas: z.array(z.object({ id: Uuid, motivo: z.string() })),
});
export type QuestoesLoteResposta = z.infer<typeof QuestoesLoteResposta>;

/** POST /admin/questoes/retirar-origem — retirada rápida de uma prova ou de toda a origem fau_real de uma banca. */
export const RetirarOrigemEntrada = z
  .object({
    provaOrigemId: Uuid.optional(),
    banca: z.string().trim().min(1).optional(),
    motivo: z.string().trim().min(3, 'Informe o motivo.'),
  })
  .refine((o) => o.provaOrigemId || o.banca, 'Informe a prova ou a banca.');
export type RetirarOrigemEntrada = z.infer<typeof RetirarOrigemEntrada>;

export const RetirarOrigemResposta = z.object({ questoesRetiradas: z.number().int() });

/** GET /admin/questoes/:id/previa — no formato da tela de Pergunta, com a correção. */
export const QuestaoPreviaResposta = z.object({
  questao: QuestaoParaAluno,
  gabarito: ZLetra.nullable(),
  explicacao: z.string().nullable(),
  dicaBolso: z.string().nullable(),
  dica: z.string().nullable(),
});

/** POST /admin/uploads (multipart, campo `arquivo`) — imagem para o enunciado. */
export const UploadResposta = z.object({
  url: z.string(),
  nome: z.string(),
  bytes: z.number().int(),
});

/* ------------------------------------------------------- disciplinas e assuntos */

/** GET /admin/disciplinas */
export const DisciplinasListaResposta = z.object({ itens: z.array(DisciplinaResumo) });

export const AssuntoAdmin = z.object({
  id: Uuid,
  disciplinaId: Uuid,
  nome: z.string(),
  slug: z.string(),
  dicaTitulo: z.string().nullable(),
  dicaTexto: z.string().nullable(),
  dicaExemplo: z.string().nullable(),
  totalQuestoes: z.number().int(),
  publicadas: z.number().int(),
});
export type AssuntoAdmin = z.infer<typeof AssuntoAdmin>;

/** GET /admin/assuntos?disciplina= */
export const AssuntosQuery = z.object({
  disciplina: ZSlugDisciplina.optional(),
  q: z.string().optional(),
});
export const AssuntosListaResposta = z.object({ itens: z.array(AssuntoAdmin) });

/** POST /admin/assuntos · PATCH /admin/assuntos/:id */
export const AssuntoEntrada = z.object({
  disciplinaId: Uuid,
  nome: textoObrigatorio('Informe o nome do assunto.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Use só letras minúsculas, números e hífen.'),
  dicaTitulo: textoOpcional,
  dicaTexto: textoOpcional,
  dicaExemplo: textoOpcional,
});
export type AssuntoEntrada = z.input<typeof AssuntoEntrada>;
export const AssuntoAtualizarEntrada = AssuntoEntrada.partial();

/* ----------------------------------------------------------------- trilhas */

export const LicaoAdmin = z.object({
  id: Uuid,
  secaoId: Uuid,
  ordem: z.number().int(),
  tipo: ZTipoLicao,
  tamanho: z.number().int(),
  titulo: z.string().nullable(),
  dicaTitulo: z.string().nullable(),
  dicaTexto: z.string().nullable(),
  dicaExemplo: z.string().nullable(),
});
export type LicaoAdmin = z.infer<typeof LicaoAdmin>;

export const SecaoAdmin = z.object({
  id: Uuid,
  unidadeId: Uuid,
  ordem: z.number().int(),
  titulo: z.string(),
  assuntoId: Uuid,
  noEdital: z.boolean().nullable(),
  licoes: z.array(LicaoAdmin),
});
export type SecaoAdmin = z.infer<typeof SecaoAdmin>;

export const UnidadeAdmin = z.object({
  id: Uuid,
  concursoId: Uuid,
  area: ZAreaCargo.nullable(),
  ordem: z.number().int(),
  titulo: z.string(),
  disciplinaId: Uuid,
  secoes: z.array(SecaoAdmin),
});
export type UnidadeAdmin = z.infer<typeof UnidadeAdmin>;

/** GET /admin/trilhas?concursoId=&area= (area vazia = comuns) */
export const TrilhasQuery = z.object({
  concursoId: Uuid.optional(),
  area: z.union([ZAreaCargo, z.literal('comum')]).optional(),
});
export const TrilhasResposta = z.object({ unidades: z.array(UnidadeAdmin) });
export type TrilhasResposta = z.infer<typeof TrilhasResposta>;

/** POST /admin/unidades · PATCH /admin/unidades/:id */
export const UnidadeEntrada = z.object({
  concursoId: Uuid,
  area: ZAreaCargo.nullable(),
  ordem: z.number().int().min(0),
  titulo: textoObrigatorio('Informe o título da unidade.'),
  disciplinaId: Uuid,
});
export type UnidadeEntrada = z.infer<typeof UnidadeEntrada>;
export const UnidadeAtualizarEntrada = UnidadeEntrada.partial();

/** POST /admin/secoes · PATCH /admin/secoes/:id */
export const SecaoEntrada = z.object({
  unidadeId: Uuid,
  ordem: z.number().int().min(0),
  titulo: textoObrigatorio('Informe o título da seção.'),
  assuntoId: Uuid,
  noEdital: z.boolean().nullable().default(null),
});
export type SecaoEntrada = z.input<typeof SecaoEntrada>;
export const SecaoAtualizarEntrada = SecaoEntrada.partial();

/** POST /admin/licoes · PATCH /admin/licoes/:id */
export const LicaoEntrada = z
  .object({
    secaoId: Uuid,
    ordem: z.number().int().min(0),
    tipo: ZTipoLicao.default('normal'),
    tamanho: z.union([z.literal(5), z.literal(10)]).default(5),
    titulo: textoOpcional,
    dicaTitulo: textoOpcional,
    dicaTexto: textoOpcional,
    dicaExemplo: textoOpcional,
  })
  .refine((l) => l.tipo !== 'desafio' || l.tamanho === 10, {
    message: 'O desafio da unidade tem 10 questões.',
    path: ['tamanho'],
  });
export type LicaoEntrada = z.input<typeof LicaoEntrada>;
export const LicaoAtualizarEntrada = z.object({
  ordem: z.number().int().min(0).optional(),
  tipo: ZTipoLicao.optional(),
  tamanho: z.union([z.literal(5), z.literal(10)]).optional(),
  titulo: textoOpcional,
  dicaTitulo: textoOpcional,
  dicaTexto: textoOpcional,
  dicaExemplo: textoOpcional,
});

/** PUT /admin/trilhas/ordem — reordenar (arrastar e soltar). */
export const ReordenarEntrada = z.object({
  nivel: z.enum(['unidades', 'secoes', 'licoes']),
  /** concursoId (unidades), unidadeId (seções) ou secaoId (lições). */
  paiId: Uuid,
  ids: z.array(Uuid).min(1),
});
export type ReordenarEntrada = z.infer<typeof ReordenarEntrada>;

/* ------------------------------------------------------------------ edital */

/** GET /admin/edital?concursoId= */
export const EditalQuery = z.object({ concursoId: Uuid });
export const EditalResposta = z.object({
  concurso: ConcursoAdmin,
  cargos: z.array(CargoAdmin),
  secoes: z.array(
    z.object({
      id: Uuid,
      titulo: z.string(),
      unidadeTitulo: z.string(),
      area: ZAreaCargo.nullable(),
      noEdital: z.boolean().nullable(),
    }),
  ),
});
export type EditalResposta = z.infer<typeof EditalResposta>;

/** PUT /admin/edital — rascunho do edital (não liga o modo edital). */
export const EditalEntrada = z.object({
  concursoId: Uuid,
  dataProva: Dia.nullable(),
  links: z.array(LinkOficial),
  cargos: z
    .array(
      z.object({
        id: Uuid.optional(),
        nome: textoObrigatorio('Informe o nome do cargo.'),
        area: ZAreaCargo,
        escolaridade: ZEscolaridade.nullable(),
        vagas: z.number().int().min(0).nullable(),
        distribuicao: Distribuicao,
        conteudoProgramatico: z.string().nullable(),
      }),
    )
    .min(1, 'Cadastre ao menos um cargo do edital.'),
  secoes: z.array(z.object({ secaoId: Uuid, noEdital: z.boolean() })).default([]),
});
export type EditalEntrada = z.input<typeof EditalEntrada>;

/** POST /admin/edital/publicar — liga o modo edital (status edital_publicado). */
export const PublicarEditalEntrada = z.object({ concursoId: Uuid });
export const PublicarEditalResposta = z.object({
  ok: z.literal(true),
  usuariosParaConfirmar: z.number().int(),
});

/* -------------------------------------------------------------- importação */

export const ZStatusImportacao = z.enum(STATUS_IMPORTACAO);

export const ImportacaoResumo = z.object({
  id: Uuid,
  provaOrigem: z
    .object({
      id: Uuid,
      orgao: z.string(),
      ano: z.number().int().nullable(),
      cargo: z.string().nullable(),
    })
    .nullable(),
  arquivoCaderno: z.string().nullable(),
  arquivoGabarito: z.string().nullable(),
  /** D9: gabarito preliminar usado no confronto, se houver. */
  arquivoPreliminar: z.string().nullable().default(null),
  /** D9: cargo do bloco do gabarito usado. */
  cargo: z.string().nullable().default(null),
  status: ZStatusImportacao,
  questoesExtraidas: z.number().int(),
  divergencias: z.number().int(),
  criadoEm: DataHora,
  atualizadoEm: DataHora,
});
export type ImportacaoResumo = z.infer<typeof ImportacaoResumo>;

/** GET /admin/importacoes */
export const ImportacoesQuery = PaginacaoQuery.extend({ status: ZStatusImportacao.optional() });
export const ImportacoesListaResposta = paginada(ImportacaoResumo);

/** GET /admin/importacoes/:id */
export const ImportacaoDetalhe = ImportacaoResumo.extend({
  log: z.string().nullable(),
  /** Confronto com o gabarito definitivo: número → letras extraída/definitiva. */
  confronto: z.array(
    z.object({
      numero: z.number().int(),
      questaoId: Uuid.nullable(),
      gabaritoDefinitivo: z.union([ZLetra, z.literal('ANULADA')]).nullable(),
      /** D8: letra marcada no caderno extraído (null se não houver). */
      gabaritoExtraido: ZLetra.nullable().default(null),
      /** D9: letra do gabarito preliminar (null sem preliminar). */
      letraPreliminar: ZLetra.nullable().default(null),
      /** D9: status com que a questão foi gravada (null = não gravada). */
      statusGravado: ZStatusQuestao.nullable().default(null),
      observacao: z.string().nullable(),
    }),
  ),
});
export type ImportacaoDetalhe = z.infer<typeof ImportacaoDetalhe>;

/** PATCH /admin/importacoes/:id */
export const ImportacaoAtualizarEntrada = z.object({ status: ZStatusImportacao });
