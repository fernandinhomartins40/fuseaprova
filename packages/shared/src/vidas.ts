/**
 * Vidas (PRD 6.2).
 * - Máximo 5.
 * - Errar em lição de trilha custa 1 vida. Revisão, simulado e desafio não gastam.
 * - Com 0 vidas não se inicia nem continua lição de trilha.
 * - Recarga: +1 vida a cada 4 h, contadas da perda, até o máximo.
 * - Cada acerto em revisão dá +1 vida.
 * - À meia-noite (São Paulo) as vidas voltam para 5.
 *
 * Persistência: `usuarios.vidas` e `usuarios.vidas_atualizado_em`. O campo
 * `vidas_atualizado_em` é a referência da recarga: a próxima vida chega em
 * `vidas_atualizado_em + 4 h`. Com as vidas cheias ele não importa.
 * O servidor sempre chama `normalizarVidas` antes de ler ou alterar.
 */
import { diaSP, meiaNoiteSP, MS_HORA } from './datas.js';
import type { TipoSessaoEstudo } from './dominio.js';

export const VIDAS_MAX = 5;
export const RECARGA_VIDA_MS = 4 * MS_HORA;

export interface EstadoVidas {
  vidas: number;
  atualizadoEm: Date;
}

export interface EstadoVidasCalculado extends EstadoVidas {
  /** Quando chega a próxima vida, ou null com as vidas cheias. */
  proximaVidaEm: Date | null;
}

function comProxima(e: EstadoVidas): EstadoVidasCalculado {
  return {
    ...e,
    proximaVidaEm:
      e.vidas >= VIDAS_MAX ? null : new Date(e.atualizadoEm.getTime() + RECARGA_VIDA_MS),
  };
}

/** Aplica o reset da meia-noite e as recargas de 4 h até `agora`. */
export function normalizarVidas(estado: EstadoVidas, agora: Date): EstadoVidasCalculado {
  let vidas = Math.min(Math.max(estado.vidas, 0), VIDAS_MAX);
  let atualizadoEm = estado.atualizadoEm;

  if (diaSP(atualizadoEm) !== diaSP(agora) && atualizadoEm < agora) {
    // Passou da meia-noite: volta para 5.
    return comProxima({ vidas: VIDAS_MAX, atualizadoEm: meiaNoiteSP(agora) });
  }

  if (vidas < VIDAS_MAX) {
    const recargas = Math.floor((agora.getTime() - atualizadoEm.getTime()) / RECARGA_VIDA_MS);
    if (recargas > 0) {
      vidas = Math.min(VIDAS_MAX, vidas + recargas);
      atualizadoEm = new Date(atualizadoEm.getTime() + recargas * RECARGA_VIDA_MS);
    }
  }
  return comProxima({ vidas, atualizadoEm });
}

/** Tipos de sessão em que errar custa vida. */
export function sessaoGastaVida(tipo: TipoSessaoEstudo): boolean {
  return tipo === 'licao';
}

/** Pode iniciar ou continuar uma lição de trilha? */
export function podeJogarLicao(estado: EstadoVidas, agora: Date): boolean {
  return normalizarVidas(estado, agora).vidas > 0;
}

/** Desconta 1 vida (erro em lição de trilha). A recarga conta a partir desta perda se estava cheio. */
export function perderVida(estado: EstadoVidas, agora: Date): EstadoVidasCalculado {
  const atual = normalizarVidas(estado, agora);
  if (atual.vidas <= 0) return atual;
  const atualizadoEm = atual.vidas >= VIDAS_MAX ? agora : atual.atualizadoEm;
  return comProxima({ vidas: atual.vidas - 1, atualizadoEm });
}

/** +1 vida (acerto em revisão), até o máximo. Mantém a contagem da recarga. */
export function ganharVida(estado: EstadoVidas, agora: Date): EstadoVidasCalculado {
  const atual = normalizarVidas(estado, agora);
  if (atual.vidas >= VIDAS_MAX) return atual;
  return comProxima({ vidas: atual.vidas + 1, atualizadoEm: atual.atualizadoEm });
}

/** Aplica o efeito de uma resposta nas vidas, conforme o tipo de sessão. */
export function vidasAposResposta(
  estado: EstadoVidas,
  tipo: TipoSessaoEstudo,
  acertou: boolean,
  agora: Date,
): EstadoVidasCalculado {
  if (tipo === 'licao' && !acertou) return perderVida(estado, agora);
  if (tipo === 'revisao' && acertou) return ganharVida(estado, agora);
  return normalizarVidas(estado, agora);
}

/** Milissegundos até a próxima vida (0 se cheio). */
export function msAteProximaVida(estado: EstadoVidas, agora: Date): number {
  const atual = normalizarVidas(estado, agora);
  return atual.proximaVidaEm ? Math.max(0, atual.proximaVidaEm.getTime() - agora.getTime()) : 0;
}

/** Reset diário (job das 00:00). */
export function resetDiarioVidas(agora: Date): EstadoVidas {
  return { vidas: VIDAS_MAX, atualizadoEm: agora };
}
