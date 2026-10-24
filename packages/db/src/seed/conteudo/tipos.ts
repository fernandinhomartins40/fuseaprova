import type { AreaCargo, Letra, SlugDisciplina } from '@fuse/shared';

/**
 * Conteúdo de exemplo do seed. TODAS as questões são AUTORAIS (origem `autoral`,
 * sem prova de origem) e entram como `rascunho`. Nunca atribua uma questão daqui a
 * uma prova real da FAU.
 */
export interface QuestaoSeed {
  /** Chave estável (gera o uuid determinístico). */
  chave: string;
  textoApoio?: string;
  enunciado: string;
  /** Textos das alternativas A, B, C, D e E, nessa ordem. */
  alternativas: [string, string, string, string, string];
  gabarito: Letra;
  explicacao: string;
  dicaBolso: string;
  /** Dica da questão (botão DICA, 5 gemas). Não entrega a resposta. */
  dica: string;
  dificuldade?: 1 | 2 | 3;
}

export interface AssuntoSeed {
  slug: string;
  nome: string;
  dicaTitulo: string;
  dicaTexto: string;
  dicaExemplo: string;
}

export interface SecaoSeed {
  chave: string;
  titulo: string;
  assunto: AssuntoSeed;
  questoes: QuestaoSeed[];
}

export interface UnidadeSeed {
  chave: string;
  titulo: string;
  disciplina: SlugDisciplina;
  /** null = comum a todas as áreas. */
  area: AreaCargo | null;
  ordem: number;
  secoes: SecaoSeed[];
  /** Pendência de conteúdo (ex.: obter o texto vigente da lei). */
  todo?: string;
}
