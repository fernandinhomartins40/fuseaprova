/**
 * D30: regras puras das notificações locais do app nativo (sem Capacitor, testáveis no jsdom).
 *
 * - `rotaDaNotificacao`: converte o `extra` da notificação tocada na tela a abrir (lista fechada
 *   de @fuse/shared; qualquer outra coisa vira a trilha).
 * - `paraNotificacoesLocais`: converte o plano da API (GET /me/lembretes) nas notificações do
 *   plugin, com agendamento INEXATO (a Play Store restringe alarme exato e o manifesto remove a
 *   permissão; o lembrete tolera alguns minutos) e `allowWhileIdle` (dispara em modo soneca).
 */
import { normalizarRotaNotificacao } from '@fuse/shared';
import type { ItemLembrete } from '@fuse/shared/api';

/** Canal Android dos lembretes (criado antes de agendar; sem canal, o Android descarta). */
export const CANAL_LEMBRETES = 'lembrete-diario';
/** Faixa de ids dos lembretes do Fuse (1000…1099). As versões antigas usavam 1000…1007. */
export const ID_BASE_LEMBRETE = 1000;
export const MAX_LEMBRETES = 64; // limite de notificações pendentes do iOS

/** A tela que a notificação tocada deve abrir. Aceita `rota` (D30) e `url` (versões antigas). */
export function rotaDaNotificacao(extra: unknown): string {
  if (!extra || typeof extra !== 'object') return normalizarRotaNotificacao(null);
  const e = extra as { rota?: unknown; url?: unknown };
  return normalizarRotaNotificacao(e.rota ?? e.url);
}

export interface NotificacaoLocal {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle: boolean };
  channelId: string;
  extra: { rota: string; tipo: string };
  /** Plugin 8.3+: sem isto ele abre a tela "Alarmes e lembretes" a cada agendamento. */
  isExactNotification: false;
  autoCancel: true;
}

/** Itens futuros do plano → notificações do plugin (ids estáveis por posição). */
export function paraNotificacoesLocais(
  itens: readonly ItemLembrete[],
  agora: Date = new Date(),
): NotificacaoLocal[] {
  return itens
    .map((i) => ({ ...i, at: new Date(i.quando) }))
    .filter((i) => i.at.getTime() > agora.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_LEMBRETES)
    .map((i, n) => ({
      id: ID_BASE_LEMBRETE + n,
      title: i.titulo,
      body: i.corpo,
      schedule: { at: i.at, allowWhileIdle: true },
      channelId: CANAL_LEMBRETES,
      extra: { rota: normalizarRotaNotificacao(i.rota), tipo: i.tipo },
      isExactNotification: false,
      autoCancel: true,
    }));
}

/** Ids que o app pode ter agendado (o plano atual e os das versões antigas). */
export function idsDosLembretes(): number[] {
  return Array.from({ length: 100 }, (_, i) => ID_BASE_LEMBRETE + i);
}

/** Evento da janela que pede o reagendamento (ex.: a permissão acabou de ser concedida). */
export const EVENTO_REAGENDAR_LEMBRETES = 'fuse:reagendar-lembretes';

/** Pede ao app nativo para buscar o plano e reagendar os lembretes. */
export function pedirReagendamentoLembretes(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_REAGENDAR_LEMBRETES));
}
