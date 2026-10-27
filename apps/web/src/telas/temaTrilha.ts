/**
 * Identidade visual de cada trilha (unidade): uma cor por disciplina e, em Conhecimentos
 * Específicos, uma por área do cargo. A coleção de ícones dos nós segue o mesmo tema
 * (docs/ICONES-TRILHA.md): cada trilha tem os seus 6 ícones de lição, o baú e o troféu.
 */
import type { AreaCargo, SlugDisciplina } from '@fuse/shared';
import type { UnidadeTrilha } from '@fuse/shared/api';

export const TEMAS_TRILHA = [
  'portugues',
  'matematica',
  'gerais',
  'administrativo',
  'saude_medio',
  'saude_superior',
  'educacao',
  'operacional',
  'servicos_gerais',
  'social_juridico',
] as const;
export type NomeTema = (typeof TEMAS_TRILHA)[number];

export interface TemaTrilha {
  nome: NomeTema;
  /** Cor do nó e do banner. */
  cor: string;
  /** Sombra 3D (o "degrau" de baixo do nó). */
  sombra: string;
  /** Fundo suave (faixa da seção, anel). */
  suave: string;
  /** Cor do texto de destaque sobre fundo claro (contraste AA). */
  tinta: string;
}

export const TEMAS: Record<NomeTema, TemaTrilha> = {
  portugues: {
    nome: 'portugues',
    cor: '#0e9a98',
    sombra: '#0a6f6e',
    suave: '#ddf2f0',
    tinta: '#0a6360',
  },
  matematica: {
    nome: 'matematica',
    cor: '#ff7a2e',
    sombra: '#c2561a',
    suave: '#ffe9dc',
    tinta: '#a8470f',
  },
  gerais: { nome: 'gerais', cor: '#3b82f6', sombra: '#2559b8', suave: '#e2edfe', tinta: '#1f4fa3' },
  administrativo: {
    nome: 'administrativo',
    cor: '#8b5cf6',
    sombra: '#5b34c4',
    suave: '#eee8fe',
    tinta: '#5b34c4',
  },
  saude_medio: {
    nome: 'saude_medio',
    cor: '#22a06b',
    sombra: '#177048',
    suave: '#dcf4e8',
    tinta: '#146240',
  },
  saude_superior: {
    nome: 'saude_superior',
    cor: '#ec4899',
    sombra: '#b32a70',
    suave: '#fde4f0',
    tinta: '#a0245f',
  },
  educacao: {
    nome: 'educacao',
    cor: '#f2b100',
    sombra: '#b88300',
    suave: '#fff3cc',
    tinta: '#7a5600',
  },
  operacional: {
    nome: 'operacional',
    cor: '#7cb518',
    sombra: '#527a0c',
    suave: '#eaf5d3',
    tinta: '#476a0a',
  },
  servicos_gerais: {
    nome: 'servicos_gerais',
    cor: '#c026d3',
    sombra: '#8a1698',
    suave: '#f8e1fb',
    tinta: '#7d1489',
  },
  social_juridico: {
    nome: 'social_juridico',
    cor: '#b0173f',
    sombra: '#780f2b',
    suave: '#fbe3ea',
    tinta: '#8c1032',
  },
};

const TEMA_POR_DISCIPLINA: Record<Exclude<SlugDisciplina, 'especificos'>, NomeTema> = {
  portugues: 'portugues',
  matematica: 'matematica',
  gerais: 'gerais',
};

/** Tema da unidade: pela disciplina; nos específicos, pela área do cargo (padrão: administrativo). */
export function temaDaUnidade(u: Pick<UnidadeTrilha, 'disciplina' | 'area'>): TemaTrilha {
  const slug = u.disciplina.slug;
  if (slug !== 'especificos') return TEMAS[TEMA_POR_DISCIPLINA[slug]];
  const area: AreaCargo = u.area ?? 'administrativo';
  return TEMAS[area];
}

/** Variáveis CSS do tema, para `style` do elemento raiz da trilha. */
export function variaveisDoTema(t: TemaTrilha): Record<string, string> {
  return {
    '--tema': t.cor,
    '--tema-sombra': t.sombra,
    '--tema-suave': t.suave,
    '--tema-tinta': t.tinta,
  };
}

/* ------------------------------------------------------------------- ícones */

/** Ícones de lição por tema: `NN-licao-K` (K de 1 a 6), baú, baú aberto, troféu e emblema. */
export const LICOES_POR_TEMA = 6;

const arquivos = import.meta.glob('../assets/trilha/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const URLS = new Map<string, string>(
  Object.entries(arquivos).map(([caminho, url]) => [
    caminho
      .split('/')
      .pop()!
      .replace(/\.webp$/, ''),
    url,
  ]),
);

export type TipoIconeTrilha = 'bau' | 'bau-aberto' | 'trofeu' | 'emblema';

/** URL do ícone `{tema}-{nome}` se a coleção já foi gerada; senão null (o nó usa o ícone simples). */
export function iconeDoTema(tema: NomeTema, nome: string): string | null {
  return URLS.get(`${tema}-${nome}`) ?? null;
}

/** Ícone da lição de ordem `posicao` (0, 1, 2…): percorre os 6 do tema sem repetir em sequência. */
export function iconeDaLicao(tema: NomeTema, posicao: number): string | null {
  return iconeDoTema(tema, `licao-${(posicao % LICOES_POR_TEMA) + 1}`);
}

export function iconeEspecial(tema: NomeTema, tipo: TipoIconeTrilha): string | null {
  return iconeDoTema(tema, tipo);
}
