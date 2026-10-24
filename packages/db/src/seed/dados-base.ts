import type { AreaCargo, Escolaridade, SlugDisciplina } from '@fuse/shared';
import type { LinkJson } from '../schema/tabelas.js';

export const CONCURSO_PALMITAL = {
  chave: 'concurso:palmital-pr-2026',
  slug: 'palmital-pr-2026',
  nome: 'Concurso da Prefeitura de Palmital-PR 2026/27',
  banca: 'FAU-Unicentro',
  orgao: 'Prefeitura Municipal de Palmital',
  municipio: 'Palmital',
  uf: 'PR',
  ano: 2026,
  status: 'aguardando_edital' as const,
  links: [
    {
      titulo: 'Portal de concursos da Prefeitura de Palmital-PR',
      url: 'https://palmital.pr.gov.br/portal/portal-concursos.php?pesquisar=1',
    },
    {
      titulo: 'Portal Douglas: FAU elabora o edital de Palmital (10/09/2026)',
      url: 'https://www.portaldouglas.com.br/2026/09/concurso-publico-de-palmital.html',
    },
    {
      titulo: 'FAU-Unicentro: concursos',
      url: 'https://www.concursosfau.com.br/novo/encerrados/',
    },
  ] satisfies LinkJson[],
};

export const DISCIPLINAS: { slug: SlugDisciplina; nome: string; cor: string; ordem: number }[] = [
  { slug: 'portugues', nome: 'Língua Portuguesa', cor: '#008A92', ordem: 1 },
  { slug: 'matematica', nome: 'Matemática e Raciocínio Lógico', cor: '#FF6A16', ordem: 2 },
  { slug: 'gerais', nome: 'Conhecimentos Gerais', cor: '#00545D', ordem: 3 },
  { slug: 'especificos', nome: 'Conhecimentos Específicos', cor: '#8B5CF6', ordem: 4 },
];

/** Cargos genéricos por área (PRD 7.2), usados antes do edital. */
export const CARGOS_GENERICOS: {
  nome: string;
  area: AreaCargo;
  escolaridade: Escolaridade | null;
}[] = [
  { nome: 'Agente Administrativo', area: 'administrativo', escolaridade: 'medio' },
  { nome: 'Auxiliar Administrativo', area: 'administrativo', escolaridade: null },
  { nome: 'Assistente Administrativo', area: 'administrativo', escolaridade: 'medio' },
  { nome: 'Recepcionista', area: 'administrativo', escolaridade: null },
  { nome: 'Técnico de Enfermagem', area: 'saude_medio', escolaridade: 'tecnico' },
  { nome: 'Auxiliar de Saúde Bucal', area: 'saude_medio', escolaridade: null },
  { nome: 'Agente Comunitário de Saúde', area: 'saude_medio', escolaridade: 'medio' },
  { nome: 'Agente de Endemias', area: 'saude_medio', escolaridade: 'medio' },
  { nome: 'Enfermeiro', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Farmacêutico', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Fisioterapeuta', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Psicólogo', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Nutricionista', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Odontólogo', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Médico', area: 'saude_superior', escolaridade: 'superior' },
  { nome: 'Professor', area: 'educacao', escolaridade: 'superior' },
  { nome: 'Educador Infantil', area: 'educacao', escolaridade: null },
  { nome: 'Auxiliar de Educação', area: 'educacao', escolaridade: null },
  { nome: 'Motorista', area: 'operacional', escolaridade: null },
  { nome: 'Operador de Máquinas', area: 'operacional', escolaridade: null },
  { nome: 'Mecânico', area: 'operacional', escolaridade: null },
  { nome: 'Auxiliar de Serviços Gerais', area: 'servicos_gerais', escolaridade: 'fundamental' },
  { nome: 'Merendeira', area: 'servicos_gerais', escolaridade: 'fundamental' },
  { nome: 'Zelador', area: 'servicos_gerais', escolaridade: 'fundamental' },
  { nome: 'Gari', area: 'servicos_gerais', escolaridade: 'fundamental' },
  { nome: 'Assistente Social', area: 'social_juridico', escolaridade: 'superior' },
  { nome: 'Advogado', area: 'social_juridico', escolaridade: 'superior' },
  { nome: 'Contador', area: 'social_juridico', escolaridade: 'superior' },
  { nome: 'Fiscal', area: 'social_juridico', escolaridade: null },
];
