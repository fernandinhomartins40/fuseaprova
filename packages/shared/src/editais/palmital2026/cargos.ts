/**
 * "Descubra seu cargo" — Concurso Público nº 01/2026 da Prefeitura de Palmital/PR (banca FAU).
 *
 * Regra de ouro: quem diz se a pessoa atende ou não ao cargo são as regras abaixo, escritas a
 * partir do edital e testadas contra o texto do PDF (cada `citacao` do Anexo I é conferida no
 * teste). A IA só ajuda a interpretar um curso digitado e a tirar dúvidas, nunca decide.
 *
 * Os textos longos (requisitos, tarefas, conteúdo) vêm de `textos.gerado.ts`, gerado dos PDFs
 * por dados/editais/palmital-2026/gerar.py.
 */
import { AREAS_ACS, CONHECIMENTOS_COMUNS, QUADRO_CARGOS, TEXTOS_CARGOS } from './textos.gerado.js';

export { AREAS_ACS, CONHECIMENTOS_COMUNS, TEXTOS_CARGOS };

export type NivelCargo = 'superior' | 'medio' | 'fundamental';
/** Resposta a uma pergunta do wizard. `ate_prazo` = "ainda não, mas terei até o prazo". */
export type RespostaRequisito = 'sim' | 'ate_prazo' | 'nao' | 'nao_sei';
export type SituacaoCargo = 'atende' | 'pendente' | 'confirmar' | 'nao_atende';
/** Até quando o requisito precisa estar cumprido. `null` = não dá para cumprir depois. */
export type PrazoRequisito = 'posse' | 'pratica' | null;

export type CursoSuperior =
  | 'administracao'
  | 'administracao_publica'
  | 'agronomia'
  | 'arquitetura_urbanismo'
  | 'biomedicina'
  | 'bioquimica'
  | 'ciencias_contabeis'
  | 'comunicacao_social'
  | 'direito'
  | 'economia'
  | 'enfermagem'
  | 'farmacia'
  | 'fisioterapia'
  | 'fonoaudiologia'
  | 'gestao_publica'
  | 'jornalismo'
  | 'licenciatura'
  | 'medicina'
  | 'medicina_veterinaria'
  | 'nutricao'
  | 'odontologia'
  | 'pedagogia'
  | 'psicologia'
  | 'servico_social'
  | 'tecnologia_informacao';

/** Cursos citados nos requisitos do Anexo I, para o caminho "Me ajude a descobrir". */
export const CURSOS_SUPERIORES: Record<CursoSuperior, string> = {
  administracao: 'Administração',
  administracao_publica: 'Administração Pública',
  agronomia: 'Agronomia',
  arquitetura_urbanismo: 'Arquitetura e Urbanismo',
  biomedicina: 'Biomedicina',
  bioquimica: 'Bioquímica',
  ciencias_contabeis: 'Ciências Contábeis',
  comunicacao_social: 'Comunicação Social',
  direito: 'Direito',
  economia: 'Economia',
  enfermagem: 'Enfermagem',
  farmacia: 'Farmácia',
  fisioterapia: 'Fisioterapia',
  fonoaudiologia: 'Fonoaudiologia',
  gestao_publica: 'Gestão Pública',
  jornalismo: 'Jornalismo',
  licenciatura: 'Licenciatura (qualquer área)',
  medicina: 'Medicina',
  medicina_veterinaria: 'Medicina Veterinária',
  nutricao: 'Nutrição',
  odontologia: 'Odontologia',
  pedagogia: 'Pedagogia',
  psicologia: 'Psicologia',
  servico_social: 'Serviço Social',
  tecnologia_informacao: 'Tecnologia da Informação',
};

export type CategoriaCnh = 'A' | 'B' | 'C' | 'D' | 'E';

/** O que a pergunta verifica, para preencher respostas a partir do perfil (caminho "descobrir"). */
export type ChaveRequisito =
  /** `especifico`: pede um ensino médio específico (técnico); o perfil só consegue dizer "não". */
  | { tipo: 'escolaridade'; nivel: 'fundamental' | 'medio'; especifico?: boolean }
  | { tipo: 'curso'; cursos: readonly CursoSuperior[] | 'qualquer' }
  | { tipo: 'cnh'; categorias: readonly CategoriaCnh[] }
  | { tipo: 'outro' };

export interface PerguntaRequisito {
  id: string;
  texto: string;
  ajuda?: string;
  /** Onde está no edital (ex.: "Anexo I, requisitos" ou "Item 4.1, b"). */
  fonte: string;
  /** Trecho literal do edital. Quando `fonte` começa com "Anexo I", o teste confere no PDF. */
  citacao: string;
  prazo: PrazoRequisito;
  chave: ChaveRequisito;
  /** Mostra "Meu curso não está na lista" (a IA compara com o texto do edital). */
  cursoLivre?: boolean;
  /** Texto do botão "sim" quando "Sim" sozinho fica estranho. */
  rotuloSim?: string;
  rotuloNao?: string;
}

export interface FaseProva {
  tipo: 'objetiva' | 'titulos' | 'pratica' | 'redacao';
  nome: string;
  pontos: number;
  carater: string;
  detalhe: string;
  fonte: string;
}

export interface MateriaProva {
  nome: string;
  questoes: number;
  /** Valor de cada questão; null quando o edital tem erro (ver `nota`). */
  valor: number | null;
  total: number;
  nota?: string;
}

export interface AlertaEdital {
  titulo: string;
  texto: string;
  fonte: string;
}

export interface CargoPalmital {
  codigo: number;
  nome: string;
  nivel: NivelCargo;
  tabela: '3.1' | '3.2' | '3.3' | '3.4';
  carga: string;
  /** Como está no quadro: "02 + CR" ou "CR". */
  vagas: string;
  vagasAmpla: number;
  pcd: number;
  afro: number;
  remuneracao: string;
  taxa: string;
  perguntas: PerguntaRequisito[];
  /** Requisitos que não viram pergunta (ex.: "conhecimento em informática"). */
  avisos: { texto: string; fonte: string }[];
  alertas: AlertaEdital[];
  fases: FaseProva[];
  materias: MateriaProva[];
  notaFinal: { texto: string; fonte: string };
  /** O edital não traz requisitos para o cargo: nunca dizer "atende" sem a FAU confirmar. */
  semRequisitosNoEdital?: boolean;
}

/* ------------------------------------------------------------------ datas e informações gerais */

export const EDITAL_PALMITAL = {
  titulo: 'Concurso Público nº 01/2026 — Prefeitura de Palmital/PR',
  banca: 'FAU — Fundação de Apoio ao Desenvolvimento da UNICENTRO',
  publicacao: '2026-11-18',
  regime: 'Estatutário',
  validade: '2 anos, prorrogável uma vez por igual período',
  site: 'https://www.concursosfau.com.br/novo/concurso/pmpal',
  emailFau: 'secreconcursosfau@fundacaounicentro.com.br',
} as const;

export interface DataEdital {
  /** AAAA-MM-DD (fuso de São Paulo). `fim` quando é um período. */
  inicio: string;
  fim?: string;
  texto: string;
  fonte: string;
  provavel?: boolean;
}

export const DATAS_PALMITAL: DataEdital[] = [
  {
    inicio: '2026-11-18',
    fim: '2026-11-23',
    texto:
      'Prazo para impugnar o edital (5 dias corridos da publicação), pelo e-mail da FAU, pessoalmente ou por Sedex',
    fonte: 'Itens 1.4, 19.11 e 19.12',
  },
  {
    inicio: '2026-11-25',
    fim: '2026-12-27',
    texto: 'Inscrições pelo site da FAU (de 25/11 às 12h até 27/12 às 23h59)',
    fonte: 'Item 5.3',
  },
  {
    inicio: '2026-11-26',
    fim: '2026-11-27',
    texto: 'Pedido de isenção da taxa (CadÚnico ou doador de medula óssea), pela área do candidato',
    fonte: 'Itens 5.14 e 5.16',
  },
  { inicio: '2026-12-02', texto: 'Resultado dos pedidos de isenção', fonte: 'Item 5.21' },
  {
    inicio: '2026-12-27',
    texto:
      'Último dia para enviar laudo (PcD), pedido de condição especial e documentos de afrodescendente',
    fonte: 'Itens 6 e 7',
  },
  {
    inicio: '2026-12-28',
    texto: 'Último dia para pagar o boleto (não aceita Pix, depósito nem transferência)',
    fonte: 'Itens 5.8 e 5.12',
  },
  {
    inicio: '2027-01-25',
    texto: 'Lista das inscrições deferidas',
    fonte: 'Item 8',
    provavel: true,
  },
  { inicio: '2027-02-17', texto: 'Cartão de informação com o local de prova', fonte: 'Item 10.3' },
  {
    inicio: '2027-02-18',
    fim: '2027-02-20',
    texto:
      'Formulário da prova de títulos (das 9h de 18/02 às 23h59 de 20/02), só para quem faz títulos',
    fonte: 'Item 12.3, retificado em 18/11/2026',
  },
  {
    inicio: '2027-02-21',
    texto: 'Prova objetiva (e redação do Professor), em Palmital ou cidades vizinhas',
    fonte: 'Itens 10.1, 10.2 e 10.29.1',
    provavel: true,
  },
];

export const TAXAS_PALMITAL: Record<NivelCargo, string> = {
  superior: 'R$ 200,00',
  medio: 'R$ 150,00',
  fundamental: 'R$ 100,00',
};

/** Item 4.1: requisitos de todos os cargos que não viram pergunta. */
export const REQUISITOS_GERAIS_INFORMATIVOS: { texto: string; fonte: string }[] = [
  {
    texto: 'Não ter condenação criminal transitada em julgado incompatível com o cargo',
    fonte: 'Item 4.1, c',
  },
  {
    texto: 'Ser julgado apto física e mentalmente na inspeção médica oficial do Município',
    fonte: 'Item 4.1, d',
  },
  {
    texto: 'Declarar se exerce outro cargo, emprego ou função pública (acúmulo de cargos)',
    fonte: 'Item 4.1, f',
  },
  { texto: 'Estar quite com as obrigações eleitorais e militares', fonte: 'Item 4.1, g' },
  {
    texto: 'Não ter sido demitido a bem do serviço público ou por justa causa nos últimos 5 anos',
    fonte: 'Item 4.1, h',
  },
  {
    texto: 'Estar inscrito e quite com o conselho profissional, quando for o caso',
    fonte: 'Item 4.1, i',
  },
];

/** Perguntas que valem para todos os cargos (item 4.1). */
export const PERGUNTAS_GERAIS: PerguntaRequisito[] = [
  {
    id: 'brasileiro',
    texto: 'Você é brasileiro(a)?',
    ajuda: 'Vale brasileiro nato ou naturalizado, nos termos da Constituição Federal.',
    fonte: 'Item 4.1, a',
    citacao: 'ser brasileiro, nos termos da Constituição Federal;',
    prazo: null,
    chave: { tipo: 'outro' },
  },
  {
    id: 'idade',
    texto: 'Você terá 18 anos completos na data da posse?',
    ajuda: 'A idade é conferida na posse, não na inscrição. A data da posse ainda não foi marcada.',
    fonte: 'Item 4.1, b',
    citacao: 'ter completado 18 (dezoito) anos na data da posse;',
    prazo: null,
    chave: { tipo: 'outro' },
  },
];

/* ------------------------------------------------------------------------------ provas */

const OBJETIVA_PONTOS = 100;
const MINIMO_OBJETIVA =
  'Eliminatória e classificatória: precisa de pelo menos 50% dos pontos (item 10.27). Cada questão tem 5 alternativas.';

export const MATERIAS_POR_NIVEL: Record<NivelCargo, MateriaProva[]> = {
  superior: [
    { nome: 'Língua Portuguesa', questoes: 7, valor: 2, total: 14 },
    { nome: 'Matemática/Raciocínio Lógico', questoes: 7, valor: 2, total: 14 },
    { nome: 'Conhecimentos Gerais/Atualidades', questoes: 6, valor: 2, total: 12 },
    { nome: 'Conhecimentos Específicos', questoes: 20, valor: 3, total: 60 },
  ],
  medio: [
    {
      nome: 'Língua Portuguesa',
      questoes: 5,
      valor: null,
      total: 17.5,
      nota: 'A Tabela 9.3 diz 3,00 por questão, mas o total é 17,50. Para fechar 100 pontos, cada questão valeria 3,50.',
    },
    { nome: 'Matemática/Raciocínio Lógico', questoes: 5, valor: 2.5, total: 12.5 },
    { nome: 'Conhecimentos Gerais/Atualidades', questoes: 5, valor: 2, total: 10 },
    { nome: 'Conhecimentos Específicos', questoes: 20, valor: 3, total: 60 },
  ],
  fundamental: [
    { nome: 'Língua Portuguesa', questoes: 5, valor: 4, total: 20 },
    { nome: 'Matemática/Raciocínio Lógico', questoes: 5, valor: 2, total: 10 },
    { nome: 'Conhecimentos Gerais/Atualidades', questoes: 5, valor: 2, total: 10 },
    { nome: 'Conhecimentos Específicos', questoes: 10, valor: 6, total: 60 },
  ],
};

const TABELA_PROVA: Record<CargoPalmital['tabela'], string> = {
  '3.1': '9.1',
  '3.2': '9.2',
  '3.3': '9.3',
  '3.4': '9.4',
};

function objetiva(tabela: CargoPalmital['tabela'], nivel: NivelCargo): FaseProva {
  const q = MATERIAS_POR_NIVEL[nivel].reduce((s, m) => s + m.questoes, 0);
  return {
    tipo: 'objetiva',
    nome: 'Prova objetiva',
    pontos: OBJETIVA_PONTOS,
    carater: 'Eliminatória e classificatória',
    detalhe: `${q} questões, 4 horas de prova. ${MINIMO_OBJETIVA}`,
    fonte: `Tabela ${TABELA_PROVA[tabela]} e item 10`,
  };
}

const TITULOS_SUPERIOR: FaseProva = {
  tipo: 'titulos',
  nome: 'Prova de títulos',
  pontos: 20,
  carater: 'Classificatória',
  detalhe:
    'Doutorado 10 pontos, mestrado 6 e especialização de 360 h 2 por título (até 4), na área do cargo. Teto de 20 pontos. Título usado como requisito do cargo não pontua. Os documentos vão em envelope lacrado, entregue nos primeiros 60 minutos da prova objetiva, com o formulário preenchido de 18 a 20/02/2027.',
  fonte: 'Itens 12.1.1, 12.2, 12.3 (retificado) e 12.4.1; Tabela 12.1',
};

const TITULOS_MOTORISTA: FaseProva = {
  tipo: 'titulos',
  nome: 'Prova de títulos',
  pontos: 20,
  carater: 'Classificatória',
  detalhe:
    'Curso de transporte de passageiros 10 pontos, de transporte de emergência 6 e de transporte escolar 2 por certificado (até 4). Teto de 20 pontos. Entrega em envelope lacrado nos primeiros 60 minutos da prova objetiva.',
  fonte: 'Itens 12.1.2 e 12.2; Tabela 12.2',
};

function pratica(detalhe: string, fonte: string): FaseProva {
  return {
    tipo: 'pratica',
    nome: 'Prova prática',
    pontos: 100,
    carater: 'Eliminatória e classificatória',
    detalhe: `${detalhe} Precisa de pelo menos 50 pontos (item 13.10). Só é chamado quem passa na objetiva.`,
    fonte,
  };
}

const PRATICA_ENFERMAGEM = pratica(
  'Procedimentos de enfermagem avaliados por itens, em até 15 minutos.',
  'Item 13 e Tabela 13.3',
);
const PRATICA_VEICULO = (cnh: string) =>
  pratica(
    `Condução do veículo ou da máquina, em até 20 minutos: começa com 100 pontos e perde por falta (leve 5, média 10, grave 20; há faltas eliminatórias). É obrigatório apresentar a CNH ${cnh} original ou digital no dia (itens 13.7.1 e 13.9).`,
    'Item 13, Tabelas 13.1 e 13.2',
  );

const REDACAO: FaseProva = {
  tipo: 'redacao',
  nome: 'Redação',
  pontos: 100,
  carater: 'Eliminatória e classificatória',
  detalhe:
    'Texto dissertativo-argumentativo de 20 a 30 linhas, no mesmo dia da objetiva. Só é corrigida até a 100ª posição na ampla concorrência, 5ª para PcD e 10ª para afrodescendentes.',
  fonte: 'Itens 10.28 a 10.31',
};

/* -------------------------------------------------------------------- construtores de pergunta */

const ANEXO = 'Anexo I, requisitos';

function curso(
  id: string,
  texto: string,
  citacao: string,
  cursos: readonly CursoSuperior[] | 'qualquer',
  ajuda?: string,
): PerguntaRequisito {
  return {
    id,
    texto,
    citacao,
    ajuda,
    fonte: ANEXO,
    prazo: 'posse',
    chave: { tipo: 'curso', cursos },
    cursoLivre: cursos !== 'qualquer',
  };
}

function conselho(nome: string, citacao: string, ajuda?: string): PerguntaRequisito {
  return {
    id: 'conselho',
    texto: `Você tem registro ativo no ${nome}?`,
    ajuda:
      ajuda ??
      'O registro é conferido na posse (item 4.1, i). Pode se inscrever no concurso antes de ter o registro.',
    citacao,
    fonte: ANEXO,
    prazo: 'posse',
    chave: { tipo: 'outro' },
  };
}

function especializacao(area: string, citacao: string): PerguntaRequisito {
  return {
    id: 'especializacao',
    texto: `Você tem especialização (residência ou título de especialista) em ${area}?`,
    ajuda:
      'Como é requisito do cargo, essa especialização não vale ponto na prova de títulos (item 12.4.1).',
    citacao,
    fonte: ANEXO,
    prazo: 'posse',
    chave: { tipo: 'outro' },
  };
}

function escolaridade(
  nivel: 'fundamental' | 'medio',
  citacao: string,
  fonte = ANEXO,
): PerguntaRequisito {
  return {
    id: 'escolaridade',
    texto:
      nivel === 'medio'
        ? 'Você tem ensino médio completo (antigo 2º grau)?'
        : 'Você tem ensino fundamental completo (antigo 1º grau, até o 9º ano)?',
    ajuda:
      'A escolaridade é comprovada na posse (itens 4.1, e e 18.5.12). Dá para se inscrever terminando os estudos.',
    citacao,
    fonte,
    prazo: 'posse',
    chave: { tipo: 'escolaridade', nivel },
  };
}

function cursoTecnico(id: string, texto: string, citacao: string): PerguntaRequisito {
  return { id, texto, citacao, fonte: ANEXO, prazo: 'posse', chave: { tipo: 'outro' } };
}

function experiencia(texto: string, citacao: string): PerguntaRequisito {
  return {
    id: 'experiencia',
    texto,
    ajuda:
      'A experiência só é cobrada na posse (item 18.5.14, Súmula 266 do STJ). Guarde carteira de trabalho, contratos ou declarações.',
    citacao,
    fonte: ANEXO,
    prazo: 'posse',
    chave: { tipo: 'outro' },
  };
}

function cnh(
  texto: string,
  citacao: string,
  categorias: readonly CategoriaCnh[],
  prazo: PrazoRequisito,
  ajuda: string,
): PerguntaRequisito {
  return {
    id: 'cnh',
    texto,
    citacao,
    ajuda,
    fonte: ANEXO,
    prazo,
    chave: { tipo: 'cnh', categorias },
  };
}

const SEM_CONSELHO_CITADO = (conselhoProfissao: string): AlertaEdital => ({
  titulo: 'O Anexo I não cita o conselho',
  texto: `Os requisitos do cargo não falam em registro no conselho, mas o item 4.1, i exige estar inscrito e quite com o conselho profissional "quando for o caso". Para exercer a profissão, normalmente é preciso o registro no ${conselhoProfissao}.`,
  fonte: 'Anexo I e item 4.1, i',
});

const BACHAREL_GESTAO: string =
  'O edital fala em bacharel. Se o seu curso de Gestão Pública é tecnólogo, confirme com a FAU antes de se inscrever.';

const PLANTAO_1236: AlertaEdital = {
  titulo: 'Plantão 12x36',
  texto: 'A carga horária é em plantões de 12 horas trabalhadas por 36 de descanso.',
  fonte: 'Quadro de cargos',
};

const CONTEUDO_COMUM_TROCADO = (onde: string, quadro: string): AlertaEdital => ({
  titulo: 'Conteúdo comum no lugar errado',
  texto: `O Anexo II lista este cargo no bloco do nível ${onde}, mas no quadro ${quadro} ele é de outro nível. Pelo quadro, a prova segue a tabela do nível do cargo. Vale pedir à FAU que confirme quais conteúdos comuns serão cobrados.`,
  fonte: `Quadro ${quadro} e Anexo II`,
});

/* --------------------------------------------------------------- requisitos de cada cargo */

type Regras = Pick<CargoPalmital, 'perguntas'> &
  Partial<Pick<CargoPalmital, 'avisos' | 'alertas' | 'semRequisitosNoEdital'>>;

const INFORMATICA_OFFICE = {
  texto:
    'Conhecimento em informática, em especial nos módulos MS Office (não é exigida experiência)',
  fonte: ANEXO,
};
const INFORMATICA = {
  texto: 'Conhecimento em informática (não é exigida experiência)',
  fonte: ANEXO,
};
const CURSOS_CONTROLE: CursoSuperior[] = [
  'direito',
  'administracao',
  'economia',
  'ciencias_contabeis',
  'gestao_publica',
];

const REGRAS: Record<number, Regras> = {
  101: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Farmácia, Medicina Veterinária, Enfermagem, Biomedicina, Nutrição ou Bioquímica?',
        '1. Instrução: Superior completo em qualquer destas áreas: Farmácia, Medicina Veterinária, Enfermagem, Biomedicina, Nutrição ou Bioquímica.',
        ['farmacia', 'medicina_veterinaria', 'enfermagem', 'biomedicina', 'nutricao', 'bioquimica'],
      ),
    ],
  },
  102: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Serviço Social?',
        '1. Instrução: superior completo - Curso de Serviço Social, Registro no Conselho Regional de Assistentes Sociais CRAS;',
        ['servico_social'],
      ),
      conselho(
        'Conselho Regional de Serviço Social (CRESS)',
        'Registro no Conselho Regional de Assistentes Sociais CRAS;',
      ),
    ],
    alertas: [
      {
        titulo: 'Nome do conselho',
        texto:
          'O Anexo I escreve "Conselho Regional de Assistentes Sociais CRAS". O conselho da profissão de assistente social é o CRESS (Conselho Regional de Serviço Social).',
        fonte: ANEXO,
      },
    ],
  },
  103: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Arquitetura e Urbanismo?',
        '1. Instrução: Superior completo em Arquitetura e Urbanismo.',
        ['arquitetura_urbanismo'],
      ),
    ],
    alertas: [SEM_CONSELHO_CITADO('CAU (Conselho de Arquitetura e Urbanismo)')],
  },
  104: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Enfermagem?',
        '1. Instrução: superior completo - Curso de Enfermagem e Registro no Conselho Regional de Enfermagem (COREN);',
        ['enfermagem'],
      ),
      conselho(
        'COREN (Conselho Regional de Enfermagem)',
        'Registro no Conselho Regional de Enfermagem (COREN);',
      ),
    ],
  },
  105: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Enfermagem?',
        '1. Instrução: superior completo - Curso de Enfermagem e Registro no Conselho Regional de Enfermagem (COREN);',
        ['enfermagem'],
      ),
      conselho(
        'COREN (Conselho Regional de Enfermagem)',
        'Registro no Conselho Regional de Enfermagem (COREN);',
      ),
    ],
    alertas: [
      {
        ...PLANTAO_1236,
        texto:
          'Plantão de 12 horas trabalhadas por 36 de descanso, diurno (o Anexo II chama o cargo de "Enfermeiro 12x36 Diurno").',
      },
    ],
  },
  106: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Agronomia?',
        '1. Instrução: 3º grau completo - Curso de Agronomia e Registro no Conselho Regional de Agronomia;',
        ['agronomia'],
      ),
      conselho(
        'conselho regional da profissão (CREA)',
        'Registro no Conselho Regional de Agronomia;',
      ),
    ],
  },
  107: {
    perguntas: [
      curso('curso', 'Você é bacharel em Farmácia?', '1. Instrução Mínima: Bacharel em Farmácia.', [
        'farmacia',
      ]),
    ],
    alertas: [SEM_CONSELHO_CITADO('CRF (Conselho Regional de Farmácia)')],
  },
  108: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em qualquer área?',
        '1. Instrução Mínima: Superior completo em qualquer área;',
        'qualquer',
        'Qualquer graduação serve: bacharelado, licenciatura ou tecnólogo reconhecido pelo MEC.',
      ),
    ],
  },
  109: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Fisioterapia?',
        '1. Instrução: superior completo - Curso de Fisioterapia e Registro no Conselho da classe.',
        ['fisioterapia'],
      ),
      conselho('CREFITO (Conselho Regional de Fisioterapia)', 'Registro no Conselho da classe.'),
    ],
  },
  110: {
    perguntas: [
      curso(
        'curso',
        'Você tem graduação completa em Fonoaudiologia?',
        'a) Instrução: superior completo - Curso de graduação em Fonoaudiologia e Registro no Conselho Regional de Fonoaudiologia;',
        ['fonoaudiologia'],
      ),
      conselho(
        'Conselho Regional de Fonoaudiologia (CRFa)',
        'Registro no Conselho Regional de Fonoaudiologia;',
      ),
    ],
  },
  111: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Jornalismo ou Comunicação Social?',
        '1. Instrução Mínima: Superior completo em Jornalismo ou Comunicação Social;',
        ['jornalismo', 'comunicacao_social'],
      ),
    ],
  },
  112: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina Veterinária?',
        'superior completo - Veterinário e Registro no Conselho Regional de Veterinários;',
        ['medicina_veterinaria'],
      ),
      conselho(
        'CRMV (Conselho Regional de Medicina Veterinária)',
        'Registro no Conselho Regional de Veterinários;',
      ),
    ],
  },
  113: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina?',
        '1. Instrução: superior completo - Curso de Medicina e Registro no Conselho Regional de Medicina (CRM);',
        ['medicina'],
      ),
      conselho(
        'CRM (Conselho Regional de Medicina)',
        'Registro no Conselho Regional de Medicina (CRM);',
      ),
    ],
  },
  114: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina?',
        '1. Instrução: superior completo - Curso de Medicina e Registro no Conselho Regional de Medicina (CRM);',
        ['medicina'],
      ),
      conselho(
        'CRM (Conselho Regional de Medicina)',
        'Registro no Conselho Regional de Medicina (CRM);',
      ),
    ],
  },
  115: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina?',
        'a) Instrução: superior completo - Curso de Medicina com especialização em Ginecologia e Obstetrícia e Registro no Conselho Regional de Medicina (CRM);',
        ['medicina'],
      ),
      especializacao(
        'Ginecologia e Obstetrícia',
        'Curso de Medicina com especialização em Ginecologia e Obstetrícia',
      ),
      conselho(
        'CRM (Conselho Regional de Medicina)',
        'Registro no Conselho Regional de Medicina (CRM);',
      ),
    ],
  },
  116: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina?',
        '1. Instrução Mínima - Superior em Medicina com especialização em Neuropediatria;',
        ['medicina'],
      ),
      especializacao(
        'Neuropediatria (neurologia pediátrica)',
        'Superior em Medicina com especialização em Neuropediatria;',
      ),
    ],
    alertas: [SEM_CONSELHO_CITADO('CRM (Conselho Regional de Medicina)')],
  },
  117: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Medicina?',
        '1. Instrução: superior completo - Curso de Medicina com especialização em Pediatria e Registro no Conselho Regional de Medicina (CRM);',
        ['medicina'],
      ),
      especializacao('Pediatria', 'Curso de Medicina com especialização em Pediatria'),
      conselho(
        'CRM (Conselho Regional de Medicina)',
        'Registro no Conselho Regional de Medicina (CRM);',
      ),
    ],
  },
  118: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Nutrição?',
        'Instrução: superior completo - Curso de Nutricionista e Registro no Conselho Regional da categoria profissional;',
        ['nutricao'],
      ),
      conselho(
        'CRN (Conselho Regional de Nutricionistas)',
        'Registro no Conselho Regional da categoria profissional;',
      ),
    ],
  },
  119: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Odontologia?',
        'Instrução: superior completo - Curso de Odontologia e Registro no Conselho Regional de Odontologia (CRO);',
        ['odontologia'],
      ),
      conselho(
        'CRO (Conselho Regional de Odontologia)',
        'Registro no Conselho Regional de Odontologia (CRO);',
      ),
    ],
  },
  120: {
    perguntas: [
      curso(
        'curso',
        'Você é bacharel em Tecnologia da Informação?',
        '1. Instrução Mínima: Bacharel em Tecnologia da Informação.',
        ['tecnologia_informacao'],
        'O edital usa só este nome. Se o seu curso tem outro nome (Ciência da Computação, Sistemas de Informação, Engenharia de Software, Análise e Desenvolvimento de Sistemas…), escolha "Não sei se meu curso vale".',
      ),
    ],
    alertas: [
      {
        titulo: 'Nome do curso muito específico',
        texto:
          'O Anexo I pede "Bacharel em Tecnologia da Informação" e não cita cursos parecidos, como Ciência da Computação ou Sistemas de Informação. Se o seu diploma tem outro nome, confirme com a FAU antes de pagar a inscrição.',
        fonte: ANEXO,
      },
    ],
  },
  121: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Psicologia?',
        '1. Instrução: superior completo - Curso de Psicologia e Registro no Conselho Regional de Psicologia;',
        ['psicologia'],
      ),
      conselho(
        'CRP (Conselho Regional de Psicologia)',
        'Registro no Conselho Regional de Psicologia;',
      ),
    ],
  },
  122: {
    perguntas: [
      curso(
        'curso',
        'Você é bacharel em Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública?',
        '1. Instrução Mínima: Bacharel Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública;',
        CURSOS_CONTROLE,
        BACHAREL_GESTAO,
      ),
    ],
    avisos: [INFORMATICA_OFFICE],
  },
  123: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em qualquer área?',
        '1. Instrução: superior completo em qualquer área;',
        'qualquer',
        'Qualquer graduação serve.',
      ),
    ],
    avisos: [INFORMATICA_OFFICE],
  },
  124: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo em Direito, Administração, Economia, Ciências Contábeis ou Gestão/Administração Pública?',
        '1. Instrução: superior completo nas áreas de Direito, Administração, Economia, Ciências Contábeis ou Gestão/Administração Pública;',
        [...CURSOS_CONTROLE, 'administracao_publica'],
      ),
    ],
    avisos: [INFORMATICA_OFFICE],
  },
  125: {
    perguntas: [
      curso(
        'curso',
        'Você é bacharel em Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública?',
        '1. Instrução Mínima: bacharel em Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública;',
        CURSOS_CONTROLE,
        BACHAREL_GESTAO,
      ),
    ],
    avisos: [INFORMATICA],
  },
  126: {
    perguntas: [
      curso(
        'curso',
        'Você é bacharel em Administração, Economia ou Ciências Contábeis?',
        '1. Instrução Mínima: Bacharel em Administração, Economia ou Ciências Contábeis;',
        ['administracao', 'economia', 'ciencias_contabeis'],
      ),
    ],
  },
  127: {
    perguntas: [
      curso(
        'curso',
        'Você é bacharel em Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública?',
        '1. Instrução Mínima: Bacharel em Direito, Administração, Economia, Ciências Contábeis ou Gestão Pública;',
        CURSOS_CONTROLE,
        BACHAREL_GESTAO,
      ),
    ],
    avisos: [INFORMATICA],
  },
  128: {
    perguntas: [
      curso(
        'curso',
        'Você tem curso superior completo?',
        '1. Instrução: superior completo preferencialmente nas Áreas de Administração, Economia, Ciências Contábeis, Administração Pública ou Gestão Pública ou qualquer área, desde que tenha afinidade com os serviços técnicos e burocráticos da área da saúde.',
        'qualquer',
        'O edital prefere Administração, Economia, Ciências Contábeis, Administração Pública ou Gestão Pública, mas aceita qualquer área "desde que tenha afinidade com os serviços técnicos e burocráticos da área da saúde". Quem avalia a afinidade é a Prefeitura.',
      ),
    ],
  },
  129: {
    perguntas: [
      curso('curso', 'Você é bacharel em Direito?', '1. Instrução Mínima: Bacharel em Direito;', [
        'direito',
      ]),
    ],
  },
  201: {
    perguntas: [
      {
        ...curso(
          'curso',
          'Você tem graduação em licenciatura plena (Pedagogia ou outra licenciatura)?',
          'Professor Licenciatura Plena',
          ['licenciatura', 'pedagogia'],
          'O próprio nome do cargo pede licenciatura plena. As atribuições do Anexo I cobrem a docência na Educação Infantil e no Ensino Fundamental.',
        ),
        fonte: 'Quadro 3.2 (nome do cargo)',
      },
    ],
    avisos: [
      {
        texto:
          'Para funções do magistério que não são de docência (planejamento, supervisão, orientação, coordenação, direção), o Anexo I pede formação específica e pelo menos 2 anos de experiência docente',
        fonte: ANEXO,
      },
    ],
    alertas: [
      {
        titulo: 'Requisito de docência pouco claro',
        texto:
          'O Anexo I descreve a formação exigida para planejamento, supervisão, orientação, coordenação e direção, mas não diz com clareza qual formação é pedida para dar aula. O quadro remete ao art. 14 da Lei Municipal nº 1176/2021. Se a sua licenciatura não é em Pedagogia, confirme com a FAU se ela atende à vaga.',
        fonte: 'Quadro 3.2, nota 1, e Anexo I',
      },
    ],
  },
  301: {
    perguntas: [
      escolaridade('medio', '1. Instrução mínima: ensino médio completo;'),
      {
        id: 'residencia',
        texto:
          'Você mora, desde 18/11/2026 (ou antes), em um dos bairros das áreas de saúde da família (ESF) listadas no edital?',
        ajuda:
          'Na inscrição você escolhe a região e precisa morar nela desde a publicação do edital. Também precisa continuar morando lá para continuar no cargo. Procure o seu bairro na lista abaixo.',
        citacao:
          '2. Residência: residir na área da comunidade em que atuar, desde a data da publicação do edital do concurso público ou do processo seletivo público;',
        fonte: ANEXO,
        prazo: null,
        chave: { tipo: 'outro' },
        rotuloSim: 'Sim, moro em um desses bairros desde 18/11/2026 ou antes',
        rotuloNao: 'Não',
      },
    ],
    avisos: [
      {
        texto:
          'Para exercer o cargo, é preciso concluir com aproveitamento um curso de formação inicial de no mínimo 40 horas',
        fonte: ANEXO,
      },
      {
        texto:
          'Na inscrição, é obrigatório escolher a região (ESF) onde mora (Lei Federal nº 11.350/2006 e Lei Municipal nº 1387/2026)',
        fonte: 'Quadro 3.3, nota 1',
      },
      {
        texto:
          'O cargo tem direito ao complemento de insalubridade, e a Prefeitura pode mudar a região de atuação por necessidade do serviço',
        fonte: 'Quadro 3.3, notas 3 e 4',
      },
    ],
    alertas: [
      {
        titulo: 'Conteúdo específico parece de outro cargo',
        texto:
          'O conteúdo específico do Agente Comunitário de Saúde no Anexo II fala de formas farmacêuticas, farmacologia e Portaria 344/98, e é praticamente igual ao do Atendente de Farmácia. Parece um erro de cópia. Vale pedir à FAU que confirme o conteúdo.',
        fonte: 'Anexo II',
      },
      {
        titulo: 'Áreas sem a ESF II e sem vagas por área',
        texto:
          'A lista de bairros vai da ESF I direto para a ESF III, e o edital não diz quantas das 6 vagas são de cada área.',
        fonte: 'Quadro 3.3, nota 2',
      },
    ],
  },
  302: {
    perguntas: [
      escolaridade(
        'medio',
        '1. Instrução Mínima: Ensino Médio, com comprovação de curso técnico na área.',
      ),
      cursoTecnico(
        'tecnico',
        'Você tem curso técnico na área de farmácia?',
        'com comprovação de curso técnico na área.',
      ),
    ],
  },
  303: {
    perguntas: [
      escolaridade('medio', '1. Instrução Mínima: Ensino Médio.'),
      cnh(
        'Você tem CNH categoria B (ou C, D ou E)?',
        '2. Experiência: Não exigida, mas deve possuir CNH Categoria B, no mínimo.',
        ['B', 'C', 'D', 'E'],
        'posse',
        'O Anexo I pede "CNH Categoria B, no mínimo". Ela é conferida na posse.',
      ),
      {
        id: 'sexo',
        texto: 'Você é do sexo feminino?',
        ajuda: 'É o que está escrito no Anexo I, item 13 dos requisitos do cargo.',
        citacao: '13. Só pode ser exercido por pessoa do sexo feminino.',
        fonte: ANEXO,
        prazo: null,
        chave: { tipo: 'outro' },
      },
    ],
    alertas: [
      {
        titulo: 'Cargo só para mulheres',
        texto:
          'O Anexo I diz que o cargo "só pode ser exercido por pessoa do sexo feminino". Quem discordar dessa restrição pode impugnar o edital até 23/11/2026.',
        fonte: 'Anexo I e item 19.11',
      },
    ],
  },
  304: {
    perguntas: [
      escolaridade(
        'medio',
        '1. Instrução Mínima: Ensino Médio e Curso Básico de 40 horas de segurança em eletricidade conforme NR10;',
      ),
      cursoTecnico(
        'nr10',
        'Você tem o curso básico de 40 horas de segurança em eletricidade (NR10)?',
        'Curso Básico de 40 horas de segurança em eletricidade conforme NR10;',
      ),
      experiencia(
        'Você tem (ou terá até a posse) 12 meses de experiência como eletricista?',
        '2. Experiência: 12 meses de experiência relacionada a área de atuação;',
      ),
    ],
    alertas: [CONTEUDO_COMUM_TROCADO('fundamental', '3.3')],
  },
  305: { perguntas: [escolaridade('medio', '1. Instrução: segundo grau completo;')] },
  306: {
    perguntas: [
      escolaridade('medio', '1. Instrução Mínima: Ensino Médio;'),
      experiencia(
        'Você tem (ou terá até a posse) 24 meses de experiência comprovada como mecânico?',
        '2. Experiência: 24 meses de experiência comprovada;',
      ),
    ],
    alertas: [CONTEUDO_COMUM_TROCADO('fundamental', '3.3')],
  },
  307: {
    perguntas: [
      {
        ...escolaridade('medio', '1. Instrução Mínima: Ensino Médio de Técnico Ambiental;'),
        texto: 'Você tem o ensino médio técnico em Técnico Ambiental (ou Meio Ambiente)?',
        chave: { tipo: 'escolaridade', nivel: 'medio', especifico: true },
      },
    ],
  },
  308: {
    perguntas: [
      escolaridade(
        'medio',
        'Instrução: 2º grau completo mais Curso de Técnico em Enfermagem e Registro no Conselho Regional da Enfermagem (COREN).',
      ),
      cursoTecnico(
        'tecnico',
        'Você tem o curso de Técnico em Enfermagem?',
        'Curso de Técnico em Enfermagem',
      ),
      conselho(
        'COREN (Conselho Regional de Enfermagem)',
        'Registro no Conselho Regional da Enfermagem (COREN).',
      ),
    ],
  },
  309: {
    perguntas: [
      escolaridade(
        'medio',
        'Instrução: 2º grau completo mais Curso de Técnico de Raio X e Registro no Conselho Regional da Categoria.',
      ),
      cursoTecnico(
        'tecnico',
        'Você tem o curso técnico em Radiologia (Raio X)?',
        'Curso de Técnico de Raio X',
      ),
      conselho(
        'CRTR (Conselho Regional de Técnicos em Radiologia)',
        'Registro no Conselho Regional da Categoria.',
      ),
    ],
  },
  401: {
    perguntas: [escolaridade('fundamental', '1. Instrução: 1º grau;')],
    alertas: [CONTEUDO_COMUM_TROCADO('médio', '3.4')],
  },
  402: {
    perguntas: [
      escolaridade('fundamental', '1. Instrução: 1º grau mais curso especifico de ACD;'),
      cursoTecnico(
        'acd',
        'Você tem o curso específico de Auxiliar de Consultório Dentário (ACD/ASB)?',
        'curso especifico de ACD;',
      ),
    ],
  },
  403: { perguntas: [escolaridade('fundamental', '1. Instrução: Ensino Fundamental completo.')] },
  404: { perguntas: [escolaridade('fundamental', '1. Instrução Mínima: Ensino Fundamental.')] },
  405: { perguntas: [escolaridade('fundamental', '1. Instrução Mínima: Ensino Fundamental.')] },
  406: {
    perguntas: [
      escolaridade('fundamental', '1. Instrução; 1º grau mais Carteira de Habilitação C, D e E;'),
      cnh(
        'Você tem CNH categoria C, D ou E?',
        '1º grau mais Carteira de Habilitação C, D e E;',
        ['C', 'D', 'E'],
        'pratica',
        'A CNH precisa estar em mãos (original ou digital, vigente) no dia da prova prática. Sem ela, o candidato é eliminado (itens 13.7.1, 13.8 e 13.9).',
      ),
      experiencia(
        'Você tem (ou terá até a posse) 1 ano de experiência como motorista?',
        '2. Experiência: um ano;',
      ),
    ],
  },
  407: {
    perguntas: [
      escolaridade(
        'fundamental',
        '1. Instrução: 1º grau - Carteira Nacional de Habilitação (CNH) categoria B ou C, admitidas também as categorias D e E (art. 144 da Lei Federal nº 9.503/1997);',
      ),
      cnh(
        'Você tem CNH categoria B, C, D ou E?',
        'Carteira Nacional de Habilitação (CNH) categoria B ou C, admitidas também as categorias D e E (art. 144 da Lei Federal nº 9.503/1997);',
        ['B', 'C', 'D', 'E'],
        'pratica',
        'A CNH precisa estar em mãos (original ou digital, vigente) no dia da prova prática. Sem ela, o candidato é eliminado (itens 13.7.1, 13.8.1 e 13.9).',
      ),
      experiencia(
        'Você tem (ou terá até a posse) 1 ano de experiência como operador de máquinas?',
        '2. Experiência; mínima 01 (um) ano;',
      ),
    ],
  },
  408: {
    perguntas: [escolaridade('fundamental', 'NÍVEL FUNDAMENTAL COMPLETO', 'Quadro 3.4 (título)')],
    semRequisitosNoEdital: true,
    alertas: [
      {
        titulo: 'Cargo sem requisitos no edital',
        texto:
          'O Pedreiro tem 1 vaga no quadro 3.4, mas não aparece no Anexo I (requisitos e atribuições) nem no Anexo II (conteúdo específico). Só se sabe que é de nível fundamental. Confirme com a FAU o que será exigido e cobrado antes de se inscrever.',
        fonte: 'Quadro 3.4, Anexo I e Anexo II',
      },
    ],
  },
  409: {
    perguntas: [
      escolaridade(
        'fundamental',
        '1. Instrução: 1º grau - ter conhecimento de normas e equipamentos de segurança atinentes ao seu cargo;',
      ),
    ],
    avisos: [
      { texto: 'Conhecimento de normas e equipamentos de segurança do cargo', fonte: ANEXO },
    ],
  },
  410: {
    perguntas: [escolaridade('fundamental', '1. Instrução Mínima: Ensino Fundamental.')],
    alertas: [PLANTAO_1236],
  },
};

/* ------------------------------------------------------------------------ montagem final */

function nivelDaTabela(t: CargoPalmital['tabela']): NivelCargo {
  return t === '3.3' ? 'medio' : t === '3.4' ? 'fundamental' : 'superior';
}

function fasesDe(codigo: number, tabela: CargoPalmital['tabela'], nivel: NivelCargo): FaseProva[] {
  const f = [objetiva(tabela, nivel)];
  if (nivel === 'superior') f.push(TITULOS_SUPERIOR);
  if (codigo === 104 || codigo === 105 || codigo === 308) f.push(PRATICA_ENFERMAGEM);
  if (codigo === 201) f.push(REDACAO);
  if (codigo === 406) f.push(TITULOS_MOTORISTA, PRATICA_VEICULO('categoria C, D ou E'));
  if (codigo === 407) f.push(PRATICA_VEICULO('categoria B, C, D ou E'));
  return f;
}

function notaFinalDe(codigo: number, tabela: CargoPalmital['tabela']): CargoPalmital['notaFinal'] {
  if (codigo === 104 || codigo === 105)
    return { texto: '(objetiva + prática) ÷ 2 + títulos', fonte: 'Item 14.2.1' };
  if (codigo === 201) return { texto: '(objetiva + redação) ÷ 2 + títulos', fonte: 'Item 14.3' };
  if (codigo === 308) return { texto: '(objetiva + prática) ÷ 2', fonte: 'Item 14.4.1' };
  if (codigo === 406) return { texto: '(objetiva + prática) ÷ 2 + títulos', fonte: 'Item 14.5.1' };
  if (codigo === 407) return { texto: '(objetiva + prática) ÷ 2', fonte: 'Item 14.5.2' };
  if (tabela === '3.1') return { texto: 'objetiva + títulos', fonte: 'Item 14.2' };
  return { texto: 'nota da objetiva', fonte: tabela === '3.3' ? 'Item 14.4' : 'Item 14.5' };
}

function tabelaDoCodigo(codigo: number): CargoPalmital['tabela'] {
  if (codigo >= 400) return '3.4';
  if (codigo >= 300) return '3.3';
  if (codigo >= 200) return '3.2';
  return '3.1';
}

export const CARGOS_PALMITAL: CargoPalmital[] = QUADRO_CARGOS.map((q) => {
  const tabela = tabelaDoCodigo(q.codigo);
  const nivel = nivelDaTabela(tabela);
  const r = REGRAS[q.codigo];
  if (!r) throw new Error(`Cargo ${q.codigo} sem regras.`);
  const vagasAmpla = /^(\d+)/.exec(q.vagas)?.[1];
  return {
    codigo: q.codigo,
    // O quadro repete "Médico Clínico Geral" para 20h e 40h.
    nome: q.codigo === 113 || q.codigo === 114 ? `${q.nome} ${q.carga}` : q.nome,
    nivel,
    tabela,
    carga: q.carga,
    vagas: q.vagas,
    vagasAmpla: vagasAmpla ? Number(vagasAmpla) : 0,
    pcd: q.pcd,
    afro: q.afro,
    remuneracao: q.remuneracao,
    taxa: q.taxa,
    perguntas: [...r.perguntas, ...PERGUNTAS_GERAIS],
    avisos: r.avisos ?? [],
    alertas: r.alertas ?? [],
    fases: fasesDe(q.codigo, tabela, nivel),
    materias: MATERIAS_POR_NIVEL[nivel],
    notaFinal: notaFinalDe(q.codigo, tabela),
    semRequisitosNoEdital: r.semRequisitosNoEdital,
  };
});

export function cargoPalmital(codigo: number): CargoPalmital | undefined {
  return CARGOS_PALMITAL.find((c) => c.codigo === codigo);
}

/* --------------------------------------------------------------------------- avaliação */

export interface ItemAvaliado {
  pergunta: PerguntaRequisito;
  resposta: RespostaRequisito | undefined;
  situacao: SituacaoCargo | 'sem_resposta';
  explicacao: string;
}

export interface AvaliacaoCargo {
  situacao: SituacaoCargo;
  titulo: string;
  resumo: string;
  itens: ItemAvaliado[];
}

const PRAZO_TEXTO: Record<Exclude<PrazoRequisito, null>, string> = {
  posse: 'até a posse',
  pratica: 'até o dia da prova prática',
};

function avaliarItem(p: PerguntaRequisito, r: RespostaRequisito | undefined): ItemAvaliado {
  const base = { pergunta: p, resposta: r };
  switch (r) {
    case undefined:
      return { ...base, situacao: 'sem_resposta', explicacao: 'Sem resposta.' };
    case 'sim':
      return { ...base, situacao: 'atende', explicacao: 'Você atende a este requisito.' };
    case 'ate_prazo':
      return p.prazo
        ? {
            ...base,
            situacao: 'pendente',
            explicacao: `Você precisa ter isso ${PRAZO_TEXTO[p.prazo]}. Sem isso, perde a vaga.`,
          }
        : {
            ...base,
            situacao: 'nao_atende',
            explicacao: 'Este requisito não pode ser cumprido depois.',
          };
    case 'nao_sei':
      return {
        ...base,
        situacao: 'confirmar',
        explicacao: 'Confirme com a FAU antes de pagar a inscrição.',
      };
    case 'nao':
      return {
        ...base,
        situacao: 'nao_atende',
        explicacao: p.prazo
          ? `O edital exige isso ${PRAZO_TEXTO[p.prazo]}.`
          : 'O edital exige isso e não dá para cumprir depois.',
      };
  }
}

/**
 * Avalia as respostas contra os requisitos do cargo. Ordem de gravidade: não atende > confirmar >
 * pendente > atende. Pergunta sem resposta conta como "confirmar" (nunca como "atende").
 */
export function avaliarCargo(
  cargo: CargoPalmital,
  respostas: Partial<Record<string, RespostaRequisito>>,
): AvaliacaoCargo {
  const itens = cargo.perguntas.map((p) => avaliarItem(p, respostas[p.id]));
  const tem = (s: ItemAvaliado['situacao']) => itens.some((i) => i.situacao === s);
  let situacao: SituacaoCargo = tem('nao_atende')
    ? 'nao_atende'
    : tem('confirmar') || tem('sem_resposta')
      ? 'confirmar'
      : tem('pendente')
        ? 'pendente'
        : 'atende';
  if (cargo.semRequisitosNoEdital && (situacao === 'atende' || situacao === 'pendente'))
    situacao = 'confirmar';
  const textos: Record<SituacaoCargo, [string, string]> = {
    atende: [
      'Você atende aos requisitos',
      `Pelo que você respondeu, você atende ao que o edital pede para ${cargo.nome}. Agora é se inscrever e estudar.`,
    ],
    pendente: [
      'Você pode concorrer, com pendências',
      'Você pode se inscrever, mas precisa cumprir os itens em amarelo até o prazo de cada um. Sem eles, perde a vaga mesmo aprovado.',
    ],
    confirmar: [
      'Confirme antes de se inscrever',
      cargo.semRequisitosNoEdital
        ? 'O edital não traz os requisitos deste cargo. Pergunte à FAU antes de pagar a inscrição.'
        : 'Alguns pontos dependem de confirmação. Tire a dúvida com a FAU antes de pagar a inscrição.',
    ],
    nao_atende: [
      'Este cargo não é para você agora',
      'Pelo que você respondeu, falta um requisito obrigatório do edital. Veja abaixo outros cargos que podem combinar com você.',
    ],
  };
  const [titulo, resumo] = textos[situacao];
  return { situacao, titulo, resumo, itens };
}

/* ------------------------------------------------------------ caminho "Me ajude a descobrir" */

export type Escolaridade = 'fundamental_incompleto' | 'fundamental' | 'medio' | 'superior';

export interface PerfilCandidato {
  escolaridade: Escolaridade;
  /** Só para quem tem superior. Vazio = "meu curso não está na lista". */
  cursos: CursoSuperior[];
  /** Categorias da CNH (vazio = não tem). */
  cnh: CategoriaCnh[];
}

const ORDEM_ESCOLARIDADE: Record<Escolaridade, number> = {
  fundamental_incompleto: 0,
  fundamental: 1,
  medio: 2,
  superior: 3,
};

/** Respostas que dá para deduzir do perfil (o resto o wizard pergunta). */
export function respostasDoPerfil(
  cargo: CargoPalmital,
  perfil: PerfilCandidato,
): Partial<Record<string, RespostaRequisito>> {
  const r: Partial<Record<string, RespostaRequisito>> = {};
  const nivel = ORDEM_ESCOLARIDADE[perfil.escolaridade];
  for (const p of cargo.perguntas) {
    const c = p.chave;
    if (c.tipo === 'escolaridade') {
      const tem = nivel >= (c.nivel === 'medio' ? 2 : 1);
      r[p.id] = !tem ? 'nao' : c.especifico ? undefined : 'sim';
    } else if (c.tipo === 'curso') {
      if (nivel < 3) r[p.id] = 'nao';
      else if (c.cursos === 'qualquer' || perfil.cursos.some((x) => c.cursos.includes(x)))
        r[p.id] = 'sim';
      // Sem curso marcado = "meu curso não está na lista": o wizard pergunta.
      else if (perfil.cursos.length > 0) r[p.id] = 'nao';
    } else if (c.tipo === 'cnh')
      r[p.id] = perfil.cnh.some((x) => c.categorias.includes(x)) ? 'sim' : undefined;
  }
  return r;
}

export interface Sugestao {
  cargo: CargoPalmital;
  /** Perguntas que ainda faltam responder no wizard do cargo. */
  faltam: number;
}

/**
 * Cargos que não esbarram em nenhum "não" deduzido do perfil, do maior salário para o menor.
 * Quem tem nível superior também pode concorrer aos cargos de nível médio e fundamental.
 */
export function sugerirCargos(perfil: PerfilCandidato): Sugestao[] {
  return CARGOS_PALMITAL.map((cargo) => {
    const r = respostasDoPerfil(cargo, perfil);
    const bloqueado = Object.values(r).includes('nao');
    const faltam = cargo.perguntas.filter((p) => r[p.id] === undefined).length;
    return { cargo, faltam, bloqueado };
  })
    .filter((s) => !s.bloqueado)
    .sort((a, b) => valorEmCentavos(b.cargo.remuneracao) - valorEmCentavos(a.cargo.remuneracao))
    .map(({ cargo, faltam }) => ({ cargo, faltam }));
}

/** "R$ 22.836,51" → 2283651. */
export function valorEmCentavos(brl: string): number {
  return Number(brl.replace(/[^\d,]/g, '').replace(',', '')) || 0;
}

/** Procura o bairro nas áreas do ACS, sem acento e sem diferenciar maiúsculas. */
export function buscarBairroAcs(termo: string): { area: string; bairro: string }[] {
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const t = n(termo);
  if (t.length < 2) return [];
  return AREAS_ACS.flatMap((a) =>
    a.bairros.filter((b) => n(b).includes(t)).map((bairro) => ({ area: a.area, bairro })),
  );
}
