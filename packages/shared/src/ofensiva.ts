/**
 * Ofensiva (PRD 6.4).
 * - O dia conta com ≥ 1 lição de trilha concluída, OU ≥ 10 questões de revisão, OU 1 simulado.
 * - Dia sem contar: havendo protetor, ele é consumido e a ofensiva continua; sem protetor, zera.
 * - Marcos 7/30/100 dão gemas (veja gemas.ts).
 *
 * Persistência: `usuarios.ofensiva`, `ofensiva_recorde`, `ultimo_dia_estudo` (date), `protetores`.
 * `ultimo_dia_estudo` é o último dia "coberto" pela ofensiva: estudado ou salvo por protetor.
 */
import { diferencaDias, somarDias, type Dia } from './datas.js';
import { gemasPorOfensiva, MARCOS_OFENSIVA, type MarcoOfensiva } from './gemas.js';

export const QUESTOES_REVISAO_PARA_CONTAR = 10;

export interface AtividadeDoDia {
  licoesTrilha: number;
  questoesRevisao: number;
  simulados: number;
}

/** O dia conta para a ofensiva? */
export function diaContaParaOfensiva(a: AtividadeDoDia): boolean {
  return (
    a.licoesTrilha >= 1 || a.questoesRevisao >= QUESTOES_REVISAO_PARA_CONTAR || a.simulados >= 1
  );
}

export interface EstadoOfensiva {
  ofensiva: number;
  recorde: number;
  ultimoDia: Dia | null;
  protetores: number;
}

export interface ResultadoQuebra {
  estado: EstadoOfensiva;
  /** Dias perdidos (sem estudo) antes de hoje. */
  diasPerdidos: number;
  protetoresUsados: number;
  /** A ofensiva zerou agora. */
  zerou: boolean;
  /** Valor da ofensiva antes de zerar (para a tela "Sua ofensiva zerou"). */
  ofensivaAnterior: number;
}

/**
 * Confere os dias perdidos entre `ultimoDia` e `hoje` (exclusive) e consome protetores.
 * Usado pelo job das 00:05 e também, de forma preguiçosa, antes de registrar estudo.
 * Se não houver protetores para todos os dias perdidos, a ofensiva zera e nenhum protetor é gasto.
 */
export function verificarOfensiva(estado: EstadoOfensiva, hoje: Dia): ResultadoQuebra {
  const semMudanca: ResultadoQuebra = {
    estado,
    diasPerdidos: 0,
    protetoresUsados: 0,
    zerou: false,
    ofensivaAnterior: estado.ofensiva,
  };
  if (estado.ultimoDia === null || estado.ofensiva === 0) return semMudanca;
  const perdidos = diferencaDias(hoje, estado.ultimoDia) - 1;
  if (perdidos <= 0) return semMudanca;

  if (estado.protetores >= perdidos) {
    return {
      estado: {
        ...estado,
        protetores: estado.protetores - perdidos,
        ultimoDia: somarDias(hoje, -1),
      },
      diasPerdidos: perdidos,
      protetoresUsados: perdidos,
      zerou: false,
      ofensivaAnterior: estado.ofensiva,
    };
  }
  return {
    estado: { ...estado, ofensiva: 0 },
    diasPerdidos: perdidos,
    protetoresUsados: 0,
    zerou: true,
    ofensivaAnterior: estado.ofensiva,
  };
}

export interface ResultadoRegistro {
  estado: EstadoOfensiva;
  /** Primeira vez que o dia contou (mostra a tela de Ofensiva). */
  primeiroDoDia: boolean;
  /** Marco atingido hoje (7, 30 ou 100), se houver. */
  marco: MarcoOfensiva | null;
  gemasGanhas: number;
  quebra: ResultadoQuebra;
}

/** Registra que o dia `hoje` contou para a ofensiva. Idempotente no mesmo dia. */
export function registrarDiaDeEstudo(estado: EstadoOfensiva, hoje: Dia): ResultadoRegistro {
  const quebra = verificarOfensiva(estado, hoje);
  const atual = quebra.estado;
  if (atual.ultimoDia === hoje) {
    return { estado: atual, primeiroDoDia: false, marco: null, gemasGanhas: 0, quebra };
  }
  const continua = atual.ultimoDia !== null && diferencaDias(hoje, atual.ultimoDia) === 1;
  const ofensiva = continua && atual.ofensiva > 0 ? atual.ofensiva + 1 : 1;
  const marco = (MARCOS_OFENSIVA as readonly number[]).includes(ofensiva)
    ? (ofensiva as MarcoOfensiva)
    : null;
  return {
    estado: {
      ...atual,
      ofensiva,
      recorde: Math.max(atual.recorde, ofensiva),
      ultimoDia: hoje,
    },
    primeiroDoDia: true,
    marco,
    gemasGanhas: gemasPorOfensiva(ofensiva),
    quebra,
  };
}

/** A ofensiva exibida hoje (sem gravar): considera dias perdidos sem protetor como zerada. */
export function ofensivaVisivel(estado: EstadoOfensiva, hoje: Dia): number {
  return verificarOfensiva(estado, hoje).estado.ofensiva;
}

/** Meta diária cumprida? (1, 2 ou 3 lições). Separada da ofensiva. */
export function metaDiariaCumprida(licoesHoje: number, meta: number): boolean {
  return licoesHoje >= meta;
}

/** Progresso da meta (0–1) para o anel da tela de Ofensiva. */
export function progressoMetaDiaria(licoesHoje: number, meta: number): number {
  if (meta <= 0) return 1;
  return Math.min(1, licoesHoje / meta);
}
