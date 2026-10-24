/**
 * Conteúdo da API simulada (dev:mock). Todas as questões aqui são AUTORAIS, de exemplo,
 * e aparecem como "Questão Fuse Aprova · estilo FAU". Nenhuma é atribuída a prova real da FAU.
 */
import type { Letra, SlugDisciplina } from '@fuse/shared';

let contador = 0x1000;
/** UUID determinístico (formato válido) para o conteúdo simulado. */
export function idFixo(): string {
  contador += 1;
  return `00000000-0000-4000-8000-${contador.toString(16).padStart(12, '0')}`;
}

export interface DisciplinaMock {
  id: string;
  slug: SlugDisciplina;
  nome: string;
  cor: string;
}

export const DISCIPLINAS: Record<SlugDisciplina, DisciplinaMock> = {
  portugues: { id: idFixo(), slug: 'portugues', nome: 'Língua Portuguesa', cor: '#0E9A98' },
  matematica: {
    id: idFixo(),
    slug: 'matematica',
    nome: 'Matemática e Raciocínio Lógico',
    cor: '#FF7A2E',
  },
  gerais: { id: idFixo(), slug: 'gerais', nome: 'Conhecimentos Gerais', cor: '#3B82F6' },
  especificos: {
    id: idFixo(),
    slug: 'especificos',
    nome: 'Conhecimentos Específicos',
    cor: '#8B5CF6',
  },
};

export interface QuestaoMock {
  id: string;
  disciplina: SlugDisciplina;
  assuntoId: string;
  assunto: string;
  textoApoio: string | null;
  enunciado: string;
  alternativas: [string, string, string, string, string];
  gabarito: Letra;
  explicacao: string;
  dicaBolso: string;
  dica: string;
}

export interface AssuntoMock {
  id: string;
  nome: string;
  disciplina: SlugDisciplina;
  dica: { titulo: string; texto: string; exemplo: string };
}

function assunto(nome: string, disciplina: SlugDisciplina, dica: AssuntoMock['dica']): AssuntoMock {
  return { id: idFixo(), nome, disciplina, dica };
}

export const ASSUNTOS = {
  crase: assunto('Crase', 'portugues', {
    titulo: 'Crase = a + a',
    texto:
      'A crase junta a preposição "a" com o artigo "a". Se trocar a palavra feminina por uma masculina e aparecer "ao", tem crase.',
    exemplo: 'Vou à prefeitura → Vou ao fórum. Tem crase!',
  }),
  concordancia: assunto('Concordância verbal', 'portugues', {
    titulo: 'O verbo segue o sujeito',
    texto:
      'Ache o sujeito e pergunte: é singular ou plural? O verbo acompanha, mesmo quando o sujeito vem depois dele.',
    exemplo: 'Faltam dois documentos. (dois documentos faltam)',
  }),
  porcentagem: assunto('Porcentagem', 'matematica', {
    titulo: 'Porcentagem é fração de 100',
    texto: '25% = 25/100 = 0,25. Para achar 25% de um valor, multiplique por 0,25.',
    exemplo: '25% de 80 = 0,25 × 80 = 20',
  }),
  lei_organica: assunto('Organização do município', 'gerais', {
    titulo: 'Os Poderes do município',
    texto:
      'O município tem dois Poderes: o Executivo (prefeito) e o Legislativo (Câmara de Vereadores). Não há Judiciário municipal.',
    exemplo: 'Quem faz as leis municipais é a Câmara.',
  }),
  atos: assunto('Atos administrativos', 'especificos', {
    titulo: 'Atributos do ato administrativo',
    texto:
      'Lembre do PATI: Presunção de legitimidade, Autoexecutoriedade, Tipicidade e Imperatividade.',
    exemplo: 'A multa de trânsito vale até prova em contrário (presunção).',
  }),
  redacao: assunto('Redação oficial', 'especificos', {
    titulo: 'Clareza e impessoalidade',
    texto:
      'O texto oficial é claro, conciso, formal e impessoal. Use "Vossa Senhoria" para autoridades em geral e "Vossa Excelência" para altas autoridades.',
    exemplo: 'Prefeito: Vossa Excelência.',
  }),
} satisfies Record<string, AssuntoMock>;

type ChaveAssunto = keyof typeof ASSUNTOS;

function q(
  a: ChaveAssunto,
  enunciado: string,
  alternativas: QuestaoMock['alternativas'],
  gabarito: Letra,
  explicacao: string,
  dicaBolso: string,
  dica: string,
  textoApoio: string | null = null,
): QuestaoMock {
  const as = ASSUNTOS[a];
  return {
    id: idFixo(),
    disciplina: as.disciplina,
    assuntoId: as.id,
    assunto: as.nome,
    textoApoio,
    enunciado,
    alternativas,
    gabarito,
    explicacao,
    dicaBolso,
    dica,
  };
}

export const QUESTOES: QuestaoMock[] = [
  q(
    'crase',
    'Assinale a frase em que a crase foi usada corretamente.',
    [
      'Fomos à Curitiba no feriado.',
      'Entregue o documento à ela.',
      'O candidato chegou à prefeitura às 8 horas.',
      'Comprei uma bicicleta à prazo.',
      'Começou à chover no fim da prova.',
    ],
    'C',
    'A preposição "a" encontra o artigo "a" em "à prefeitura". Em "às 8 horas", a crase indica hora determinada.',
    'Troque por um termo masculino: se virar "ao", há crase.',
    'Veja qual frase tem um nome feminino que aceita artigo.',
  ),
  q(
    'crase',
    'Em qual alternativa o acento grave está INCORRETO?',
    [
      'Refiro-me à servidora do setor.',
      'Fui à reunião de pais.',
      'Assisti à palestra sobre o edital.',
      'Ele fez referência à Vossa Senhoria.',
      'Voltamos à cidade natal.',
    ],
    'D',
    'Pronomes de tratamento como "Vossa Senhoria" não aceitam artigo, então não há crase.',
    'Antes de pronome de tratamento, não use crase.',
    'Um dos termos não aceita artigo feminino.',
  ),
  q(
    'crase',
    'Complete corretamente: "O protocolo fica ___ direita, ___ duas quadras daqui."',
    ['a — à', 'à — a', 'à — à', 'a — a', 'ao — a'],
    'B',
    'Locução feminina "à direita" leva crase. Em "a duas quadras" há só preposição antes de numeral no plural sem artigo.',
    'Locuções adverbiais femininas pedem crase: à direita, às vezes.',
    'Pense em "ao lado direito" para a primeira lacuna.',
  ),
  q(
    'crase',
    'Assinale a frase correta quanto ao uso da crase.',
    [
      'Ele saiu à pé.',
      'Pagou à vista.',
      'Ficou cara à cara.',
      'Escreveu à lápis.',
      'Chegou à uma conclusão.',
    ],
    'B',
    '"À vista" é locução adverbial feminina, com crase. Antes de palavra masculina (pé, lápis) e em palavras repetidas não há crase.',
    'Palavra repetida (cara a cara) nunca tem crase.',
    'Só uma das locuções é feminina de verdade.',
  ),
  q(
    'crase',
    'Indique a alternativa em que NÃO deve haver crase.',
    [
      'Dirigiu-se ___ secretaria.',
      'Obedeceu ___ norma.',
      'Começou ___ estudar.',
      'Chegou ___ escola.',
      'Foi ___ feira.',
    ],
    'C',
    'Antes de verbo não há artigo, logo não há crase: "começou a estudar".',
    'Antes de verbo, nunca crase.',
    'Olhe a palavra que vem depois da lacuna.',
  ),
  q(
    'concordancia',
    'Assinale a frase com concordância verbal correta.',
    [
      'Fazem dois anos que moro aqui.',
      'Houveram muitos problemas.',
      'Faltam três dias para a prova.',
      'Existe muitas vagas.',
      'Chegou os documentos.',
    ],
    'C',
    'O sujeito "três dias" está no plural, então "faltam" fica no plural. "Fazer" (tempo) e "haver" (existir) são impessoais.',
    'Haver = existir fica no singular.',
    'Ache o sujeito de cada verbo.',
  ),
  q(
    'concordancia',
    'Qual frase está de acordo com a norma-padrão?',
    [
      'A maioria dos servidores aprovaram a medida.',
      'Os Estados Unidos é um país grande.',
      'Mais de um candidato faltaram.',
      'Vossa Excelência estais certo.',
      'Cada um dos alunos levou seu material.',
    ],
    'E',
    '"Cada um" pede verbo no singular: "levou". Nas demais, há erro de concordância.',
    '"Cada um" e "nenhum" puxam o singular.',
    'Uma das expressões sempre pede singular.',
  ),
  q(
    'concordancia',
    'Leia o texto e responda: qual verbo concorda corretamente?',
    ['surgiram', 'surgiu', 'surgia', 'surgem-se', 'surgiria-se'],
    'A',
    'O sujeito é "várias dúvidas", no plural. Logo: "surgiram".',
    'Sujeito posposto continua mandando no verbo.',
    'Quem surgiu? Várias dúvidas.',
    'Durante a reunião do conselho municipal, ______ várias dúvidas sobre o novo calendário de vacinação.\n\nOs conselheiros pediram que a secretaria explicasse as mudanças por escrito.',
  ),
  q(
    'porcentagem',
    'Um servidor recebe R$ 2.000,00 e teve aumento de 15%. Qual o novo salário?',
    ['R$ 2.150,00', 'R$ 2.300,00', 'R$ 2.015,00', 'R$ 2.250,00', 'R$ 3.000,00'],
    'B',
    '15% de 2.000 = 300. 2.000 + 300 = 2.300.',
    'Aumento de x%: multiplique por (1 + x/100).',
    'Calcule 10% e depois 5%.',
  ),
  q(
    'porcentagem',
    'Em uma turma de 40 alunos, 30% faltaram. Quantos compareceram?',
    ['12', '28', '30', '10', '26'],
    'B',
    '30% de 40 = 12 faltaram. 40 − 12 = 28 compareceram.',
    'Compareceram = 70% de 40.',
    'Ache quantos faltaram primeiro.',
  ),
  q(
    'lei_organica',
    'No município, a função de elaborar as leis locais cabe:',
    [
      'ao Prefeito.',
      'ao Juiz da comarca.',
      'à Câmara Municipal.',
      'ao Governador.',
      'ao Secretário de Administração.',
    ],
    'C',
    'A Câmara Municipal exerce o Poder Legislativo local. O prefeito sanciona ou veta.',
    'Executivo executa; Legislativo legisla.',
    'Pense em quem são os vereadores.',
  ),
  q(
    'lei_organica',
    'Sobre o município, é correto afirmar que:',
    [
      'possui Poder Judiciário próprio.',
      'é regido por lei orgânica.',
      'não pode cobrar tributos.',
      'é subordinado ao Estado.',
      'não tem autonomia administrativa.',
    ],
    'B',
    'O município é regido por sua lei orgânica (CF, art. 29) e tem autonomia política, administrativa e financeira.',
    'Lei Orgânica é a "constituição" do município.',
    'Pense na autonomia do município na Constituição.',
  ),
  q(
    'atos',
    'O atributo que permite à Administração executar suas decisões sem ordem judicial é a:',
    [
      'tipicidade.',
      'presunção de legitimidade.',
      'autoexecutoriedade.',
      'imperatividade.',
      'motivação.',
    ],
    'C',
    'Autoexecutoriedade: a Administração executa diretamente, sem precisar do Judiciário (ex.: apreensão de mercadoria estragada).',
    'Auto = por conta própria.',
    'Procure a palavra que lembra "fazer sozinho".',
  ),
  q(
    'atos',
    'A anulação de um ato administrativo ocorre quando o ato é:',
    ['inconveniente.', 'ilegal.', 'inoportuno.', 'antigo.', 'discricionário.'],
    'B',
    'Anula-se o ato ilegal; revoga-se o ato legal que deixou de ser conveniente ou oportuno.',
    'Anular = ilegalidade. Revogar = conveniência.',
    'Uma alternativa fala de lei.',
  ),
  q(
    'redacao',
    'Na redação oficial, o pronome de tratamento adequado para o Prefeito é:',
    [
      'Vossa Senhoria.',
      'Vossa Magnificência.',
      'Vossa Excelência.',
      'Vossa Reverendíssima.',
      'Vossa Mercê.',
    ],
    'C',
    'Prefeitos recebem "Vossa Excelência", como as demais altas autoridades dos Poderes.',
    'Chefes de Poder: Excelência.',
    'Lembre como se trata um deputado.',
  ),
  q(
    'redacao',
    'É característica da redação oficial:',
    [
      'uso de gírias para aproximar o leitor.',
      'impessoalidade.',
      'linguagem rebuscada.',
      'opinião pessoal do redator.',
      'textos longos e detalhados.',
    ],
    'B',
    'A redação oficial é impessoal, clara, concisa e formal.',
    'O texto fala pela instituição, não pela pessoa.',
    'Pense em quem "assina" o documento.',
  ),
];

export function questoesDoAssunto(assuntoId: string): QuestaoMock[] {
  return QUESTOES.filter((x) => x.assuntoId === assuntoId);
}

export function questaoPorId(id: string): QuestaoMock | undefined {
  return QUESTOES.find((x) => x.id === id);
}

/* ------------------------------------------------------------ trilha */

export interface LicaoMock {
  id: string;
  ordem: number;
  tipo: 'normal' | 'bau' | 'desafio';
  tamanho: number;
  titulo: string;
}
export interface SecaoMock {
  id: string;
  ordem: number;
  titulo: string;
  assunto: AssuntoMock;
  licoes: LicaoMock[];
}
export interface UnidadeMock {
  id: string;
  numero: number;
  titulo: string;
  disciplina: SlugDisciplina;
  area: string | null;
  secoes: SecaoMock[];
}

function secao(ordem: number, titulo: string, a: AssuntoMock, comDesafio = false): SecaoMock {
  const licoes: LicaoMock[] = [
    { id: idFixo(), ordem: 1, tipo: 'normal', tamanho: 5, titulo: `${titulo} 1` },
    { id: idFixo(), ordem: 2, tipo: 'normal', tamanho: 5, titulo: `${titulo} 2` },
    { id: idFixo(), ordem: 3, tipo: 'normal', tamanho: 5, titulo: `${titulo} 3` },
    { id: idFixo(), ordem: 4, tipo: 'bau', tamanho: 5, titulo: 'Baú' },
  ];
  if (comDesafio)
    licoes.push({
      id: idFixo(),
      ordem: 5,
      tipo: 'desafio',
      tamanho: 10,
      titulo: 'Desafio da unidade',
    });
  return { id: idFixo(), ordem, titulo, assunto: a, licoes };
}

export const UNIDADES: UnidadeMock[] = [
  {
    id: idFixo(),
    numero: 1,
    titulo: 'Português: crase e concordância',
    disciplina: 'portugues',
    area: null,
    secoes: [
      secao(1, 'Crase', ASSUNTOS.crase),
      secao(2, 'Concordância verbal', ASSUNTOS.concordancia, true),
    ],
  },
  {
    id: idFixo(),
    numero: 2,
    titulo: 'Matemática: porcentagem',
    disciplina: 'matematica',
    area: null,
    secoes: [secao(1, 'Porcentagem', ASSUNTOS.porcentagem, true)],
  },
  {
    id: idFixo(),
    numero: 3,
    titulo: 'Administrativo: atos e redação oficial',
    disciplina: 'especificos',
    area: 'administrativo',
    secoes: [
      secao(1, 'Atos administrativos', ASSUNTOS.atos),
      secao(2, 'Redação oficial', ASSUNTOS.redacao, true),
    ],
  },
  {
    id: idFixo(),
    numero: 4,
    titulo: 'Conhecimentos Gerais: Palmital',
    disciplina: 'gerais',
    area: null,
    secoes: [secao(1, 'Organização do município', ASSUNTOS.lei_organica, true)],
  },
];

export const NOMES_LIGA = [
  'Rafael T.',
  'Juliana P.',
  'Lucas M.',
  'Ana C.',
  'Pedro H.',
  'Carla F.',
  'Gabriel B.',
  'Tatiana R.',
  'Eduardo L.',
  'Bruna K.',
  'Diego S.',
  'Fernanda O.',
];
