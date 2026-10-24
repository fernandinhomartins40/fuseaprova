/**
 * Enumerações do domínio, compartilhadas entre banco (Drizzle), API e PWA.
 * Cada lista é a fonte única dos valores; o schema do banco importa daqui.
 */

export const STATUS_CONCURSO = [
  'aguardando_edital',
  'edital_publicado',
  'prova_realizada',
  'homologado',
] as const;
export type StatusConcurso = (typeof STATUS_CONCURSO)[number];

export const AREAS_CARGO = [
  'administrativo',
  'saude_medio',
  'saude_superior',
  'educacao',
  'operacional',
  'servicos_gerais',
  'social_juridico',
] as const;
export type AreaCargo = (typeof AREAS_CARGO)[number];

export const SLUGS_DISCIPLINA = ['portugues', 'matematica', 'gerais', 'especificos'] as const;
export type SlugDisciplina = (typeof SLUGS_DISCIPLINA)[number];

export const ESCOLARIDADES = ['fundamental', 'medio', 'tecnico', 'superior'] as const;
export type Escolaridade = (typeof ESCOLARIDADES)[number];

export const ORIGENS_QUESTAO = ['fau_real', 'autoral'] as const;
export type OrigemQuestao = (typeof ORIGENS_QUESTAO)[number];

export const STATUS_QUESTAO = ['rascunho', 'revisao', 'publicada', 'anulada', 'retirada'] as const;
export type StatusQuestao = (typeof STATUS_QUESTAO)[number];

/** Status em que a questão pode aparecer para o aluno. */
export const STATUS_QUESTAO_VISIVEL: readonly StatusQuestao[] = ['publicada'];

export const STATUS_PROVA_ORIGEM = ['ativa', 'retirada'] as const;

/** D9: situação do certame no site da banca (o caderno só fica online enquanto não encerra). */
export const SITUACOES_CERTAME = ['aberto', 'andamento', 'encerrado'] as const;
export type SituacaoCertame = (typeof SITUACOES_CERTAME)[number];

/** D9: assunto provisório que o importador cria em cada disciplina; não pode ser publicado. */
export const SLUG_ASSUNTO_A_CLASSIFICAR = 'a-classificar';
export type StatusProvaOrigem = (typeof STATUS_PROVA_ORIGEM)[number];

export const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Letra = (typeof LETRAS)[number];

export const TIPOS_LICAO = ['normal', 'bau', 'desafio'] as const;
export type TipoLicao = (typeof TIPOS_LICAO)[number];

export const PAPEIS = ['aluno', 'admin'] as const;
export type Papel = (typeof PAPEIS)[number];

export const STATUS_PEDIDO = ['pendente', 'pago', 'vencido', 'estornado'] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const TIPOS_SESSAO_ESTUDO = ['licao', 'revisao', 'desafio', 'simulado'] as const;
export type TipoSessaoEstudo = (typeof TIPOS_SESSAO_ESTUDO)[number];

export const STATUS_REVISAO = ['ativa', 'dominada'] as const;
export type StatusRevisao = (typeof STATUS_REVISAO)[number];

export const DIVISOES = ['bronze', 'prata', 'ouro', 'safira', 'diamante'] as const;
export type Divisao = (typeof DIVISOES)[number];

export const NOMES_DIVISAO: Record<Divisao, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  safira: 'Safira',
  diamante: 'Diamante',
};

export const RESULTADOS_LIGA = ['subiu', 'ficou', 'desceu'] as const;
export type ResultadoLiga = (typeof RESULTADOS_LIGA)[number];

export const TIPOS_REPORT = [
  'gabarito_errado',
  'enunciado_com_erro',
  'explicacao_confusa',
  'outro',
] as const;
export type TipoReport = (typeof TIPOS_REPORT)[number];

export const NOMES_TIPO_REPORT: Record<TipoReport, string> = {
  gabarito_errado: 'Gabarito errado',
  enunciado_com_erro: 'Enunciado com erro',
  explicacao_confusa: 'Explicação confusa',
  outro: 'Outro',
};

export const STATUS_REPORT = ['aberto', 'resolvido', 'descartado'] as const;
export type StatusReport = (typeof STATUS_REPORT)[number];

export const TIPOS_XP_EVENTO = [
  'acerto',
  'licao_concluida',
  'licao_perfeita',
  'desafio_aprovado',
  'simulado_acerto',
  'simulado_aprovado',
] as const;
export type TipoXpEvento = (typeof TIPOS_XP_EVENTO)[number];

export const STATUS_IMPORTACAO = [
  'baixado',
  'extraido',
  'confrontado',
  'concluido',
  'erro',
] as const;
export type StatusImportacao = (typeof STATUS_IMPORTACAO)[number];

export const TIPOS_ARQUIVO_COLETA = ['edital', 'caderno', 'gabarito', 'recursos', 'outro'] as const;
export type TipoArquivoColeta = (typeof TIPOS_ARQUIVO_COLETA)[number];

export const FONTES_COLETA = ['fau', 'pci', 'manual'] as const;
export type FonteColeta = (typeof FONTES_COLETA)[number];

export const METAS_DIARIAS = [1, 2, 3] as const;
export type MetaDiaria = (typeof METAS_DIARIAS)[number];

export const NOMES_AREA: Record<AreaCargo, string> = {
  administrativo: 'Administrativo',
  saude_medio: 'Saúde (nível médio e técnico)',
  saude_superior: 'Saúde (nível superior)',
  educacao: 'Educação',
  operacional: 'Operacional',
  servicos_gerais: 'Serviços gerais',
  social_juridico: 'Social, jurídico e contábil',
};

export const NOMES_DISCIPLINA: Record<SlugDisciplina, string> = {
  portugues: 'Língua Portuguesa',
  matematica: 'Matemática e Raciocínio Lógico',
  gerais: 'Conhecimentos Gerais',
  especificos: 'Conhecimentos Específicos',
};

export const NOMES_STATUS_CONCURSO: Record<StatusConcurso, string> = {
  aguardando_edital: 'Edital em elaboração pela FAU',
  edital_publicado: 'Edital publicado',
  prova_realizada: 'Prova realizada',
  homologado: 'Concurso homologado',
};
