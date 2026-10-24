/**
 * Liga semanal (PRD 6.7).
 * - Semana: segunda 00:00 a domingo 23:59 (São Paulo).
 * - Entra no primeiro ganho de XP da semana, num grupo de até 30 do mesmo concurso e divisão.
 * - Fechamento: 3 primeiros sobem; 3 últimos descem (não se desce da Bronze e não há
 *   rebaixamento em grupos com 10 pessoas ou menos); os demais ficam. Da Diamante não se sobe.
 * - Empate: vence quem chegou ao XP primeiro (`alcancado_em` menor).
 */
import { DIVISOES, type Divisao, type ResultadoLiga } from './dominio.js';

export const TAMANHO_MAX_GRUPO = 30;
export const VAGAS_PROMOCAO = 3;
export const VAGAS_REBAIXAMENTO = 3;
/** Grupos com até este tamanho não têm rebaixamento. */
export const TAMANHO_MINIMO_REBAIXAMENTO = 10;

export interface MembroLiga {
  usuarioId: string;
  xpSemana: number;
  /** Instante em que o membro chegou ao XP atual (atualizado a cada ganho). */
  alcancadoEm: Date;
}

export function proximaDivisao(d: Divisao): Divisao {
  const i = DIVISOES.indexOf(d);
  return DIVISOES[Math.min(i + 1, DIVISOES.length - 1)]!;
}

export function divisaoAnterior(d: Divisao): Divisao {
  const i = DIVISOES.indexOf(d);
  return DIVISOES[Math.max(i - 1, 0)]!;
}

/** Ordena por XP da semana (desc) e, no empate, por quem chegou primeiro. */
export function ordenarRanking<T extends MembroLiga>(membros: readonly T[]): T[] {
  return [...membros].sort(
    (a, b) =>
      b.xpSemana - a.xpSemana ||
      a.alcancadoEm.getTime() - b.alcancadoEm.getTime() ||
      a.usuarioId.localeCompare(b.usuarioId),
  );
}

export function temRebaixamento(tamanhoGrupo: number): boolean {
  return tamanhoGrupo > TAMANHO_MINIMO_REBAIXAMENTO;
}

/** Resultado de cada posição (1-based) num grupo. */
export function resultadoDaPosicao(
  posicao: number,
  tamanhoGrupo: number,
  divisao: Divisao,
): ResultadoLiga {
  if (posicao <= VAGAS_PROMOCAO && divisao !== 'diamante') return 'subiu';
  if (
    temRebaixamento(tamanhoGrupo) &&
    divisao !== 'bronze' &&
    posicao > tamanhoGrupo - VAGAS_REBAIXAMENTO
  ) {
    return 'desceu';
  }
  return 'ficou';
}

export interface ResultadoFechamento<T extends MembroLiga> {
  membro: T;
  posicao: number;
  resultado: ResultadoLiga;
  novaDivisao: Divisao;
}

/** Fecha um grupo: ordena e define quem sobe, fica ou desce. */
export function fecharGrupo<T extends MembroLiga>(
  membros: readonly T[],
  divisao: Divisao,
): ResultadoFechamento<T>[] {
  const ordenados = ordenarRanking(membros);
  return ordenados.map((membro, i) => {
    const posicao = i + 1;
    const resultado = resultadoDaPosicao(posicao, ordenados.length, divisao);
    const novaDivisao =
      resultado === 'subiu'
        ? proximaDivisao(divisao)
        : resultado === 'desceu'
          ? divisaoAnterior(divisao)
          : divisao;
    return { membro, posicao, resultado, novaDivisao };
  });
}

export interface ZonasLiga {
  /** Exibir "ZONA DE PROMOÇÃO" depois desta posição (0 = não exibir). */
  promocaoAte: number;
  /** Exibir "ZONA DE REBAIXAMENTO" antes desta posição (null = não exibir). */
  rebaixamentoDesde: number | null;
}

export function zonasDoGrupo(tamanhoGrupo: number, divisao: Divisao): ZonasLiga {
  return {
    promocaoAte: divisao === 'diamante' ? 0 : Math.min(VAGAS_PROMOCAO, tamanhoGrupo),
    rebaixamentoDesde:
      temRebaixamento(tamanhoGrupo) && divisao !== 'bronze'
        ? tamanhoGrupo - VAGAS_REBAIXAMENTO + 1
        : null,
  };
}

export interface GrupoComVagas {
  id: string;
  membros: number;
}

/** Escolhe o grupo com vaga (o mais cheio primeiro, para formar grupos completos) ou null para criar um novo. */
export function escolherGrupo(grupos: readonly GrupoComVagas[]): string | null {
  const comVaga = grupos.filter((g) => g.membros < TAMANHO_MAX_GRUPO);
  if (comVaga.length === 0) return null;
  comVaga.sort((a, b) => b.membros - a.membros || a.id.localeCompare(b.id));
  return comVaga[0]!.id;
}

/** Atualiza o XP semanal do membro; `alcancadoEm` muda só quando o XP sobe. */
export function somarXpNaLiga(membro: MembroLiga, ganho: number, agora: Date): MembroLiga {
  if (ganho <= 0) return membro;
  return { ...membro, xpSemana: membro.xpSemana + ganho, alcancadoEm: agora };
}

/** "Marina S." (primeiro nome e inicial do último sobrenome) ou o apelido. */
export function nomeNaLiga(nome: string, apelido?: string | null): string {
  const ap = apelido?.trim();
  if (ap) return ap;
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Aluno';
  const primeiro = partes[0]!;
  if (partes.length === 1) return primeiro;
  const ultimo = partes[partes.length - 1]!;
  return `${primeiro} ${ultimo.charAt(0).toUpperCase()}.`;
}
