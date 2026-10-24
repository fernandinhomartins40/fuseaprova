import { horaMinutoSP, primeiroNome, type SlugDisciplina } from '@fuse/shared';
import type { CorBarra } from '../ui';
import type { NomeAsset } from '../assets/gerados';

export const NOME_CURTO_DISCIPLINA: Record<SlugDisciplina, string> = {
  portugues: 'Português',
  matematica: 'Matemática e RL',
  gerais: 'Conhecimentos Gerais',
  especificos: 'Específicos do cargo',
};

export const ICONE_DISCIPLINA: Record<SlugDisciplina, NomeAsset> = {
  portugues: 'icone-portugues',
  matematica: 'icone-matematica',
  gerais: 'icone-gerais',
  especificos: 'icone-especificos',
};

export const COR_DISCIPLINA: Record<SlugDisciplina, CorBarra> = {
  portugues: 'portugues',
  matematica: 'matematica',
  gerais: 'gerais',
  especificos: 'especificos',
};

/** "Bom dia, Marina" pelo horário de São Paulo. */
export function saudacao(nome: string, agora = new Date()): string {
  const h = Number(horaMinutoSP(agora).slice(0, 2));
  const periodo = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `${periodo}, ${primeiroNome(nome)}`;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
}

export function formatarNumero(n: number): string {
  return n.toLocaleString('pt-BR');
}
