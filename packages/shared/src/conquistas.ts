/**
 * Conquistas (PRD 6.8). Aparecem no Perfil, abaixo do domínio.
 */
import { DIVISOES, type Divisao } from './dominio.js';

export const CONQUISTAS = [
  { codigo: 'primeira_licao', titulo: 'Primeira lição', descricao: 'Concluiu a primeira lição.' },
  { codigo: 'ofensiva_7', titulo: '7 dias de ofensiva', descricao: 'Estudou 7 dias seguidos.' },
  { codigo: 'ofensiva_30', titulo: '30 dias de ofensiva', descricao: 'Estudou 30 dias seguidos.' },
  { codigo: 'questoes_100', titulo: '100 questões', descricao: 'Respondeu 100 questões.' },
  { codigo: 'questoes_500', titulo: '500 questões', descricao: 'Respondeu 500 questões.' },
  {
    codigo: 'primeiro_simulado',
    titulo: 'Primeiro simulado',
    descricao: 'Entregou o primeiro simulado.',
  },
  {
    codigo: 'simulado_aprovado',
    titulo: 'Aprovado no simulado',
    descricao: 'Fez 50 pontos ou mais num simulado.',
  },
  {
    codigo: 'portugues_coroado',
    titulo: 'Português coroado',
    descricao: 'Passou no desafio de uma unidade de Português.',
  },
  { codigo: 'liga_ouro', titulo: 'Liga Ouro', descricao: 'Chegou à Liga Ouro.' },
] as const;

export type CodigoConquista = (typeof CONQUISTAS)[number]['codigo'];
export const CODIGOS_CONQUISTA = CONQUISTAS.map((c) => c.codigo) as [
  CodigoConquista,
  ...CodigoConquista[],
];

export interface EstatisticasConquista {
  licoesConcluidas: number;
  /** Maior ofensiva já atingida (recorde). */
  ofensivaRecorde: number;
  questoesRespondidas: number;
  simuladosEntregues: number;
  simuladosAprovados: number;
  unidadesPortuguesCoroadas: number;
  divisao: Divisao;
}

export function conquistasAtingidas(e: EstatisticasConquista): CodigoConquista[] {
  const ok: Record<CodigoConquista, boolean> = {
    primeira_licao: e.licoesConcluidas >= 1,
    ofensiva_7: e.ofensivaRecorde >= 7,
    ofensiva_30: e.ofensivaRecorde >= 30,
    questoes_100: e.questoesRespondidas >= 100,
    questoes_500: e.questoesRespondidas >= 500,
    primeiro_simulado: e.simuladosEntregues >= 1,
    simulado_aprovado: e.simuladosAprovados >= 1,
    portugues_coroado: e.unidadesPortuguesCoroadas >= 1,
    liga_ouro: DIVISOES.indexOf(e.divisao) >= DIVISOES.indexOf('ouro'),
  };
  return CODIGOS_CONQUISTA.filter((c) => ok[c]);
}

/** Conquistas novas (atingidas e ainda não registradas). */
export function novasConquistas(
  e: EstatisticasConquista,
  jaObtidas: readonly string[],
): CodigoConquista[] {
  const set = new Set(jaObtidas);
  return conquistasAtingidas(e).filter((c) => !set.has(c));
}

export function dadosDaConquista(codigo: CodigoConquista) {
  return CONQUISTAS.find((c) => c.codigo === codigo)!;
}
