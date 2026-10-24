/**
 * Web Push com chaves VAPID próprias: pede permissão, inscreve o service worker e registra
 * a inscrição na API (POST /push/inscrever). DELETE /push remove.
 */
import { PushInscreverEntrada } from '@fuse/shared/api';
import { chamar } from '../api/cliente';

export function pushSuportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function chaveParaBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const b64 = (base64Url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type ResultadoPush = 'ativado' | 'negado' | 'indisponivel' | 'erro';

export async function ativarPush(): Promise<ResultadoPush> {
  if (!pushSuportado()) return 'indisponivel';
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return 'negado';
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (!reg) return 'indisponivel';
    const { chavePublica } = await chamar('pushChave');
    const insc =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(chavePublica),
      }));
    const corpo = PushInscreverEntrada.parse(insc.toJSON());
    await chamar('pushInscrever', { corpo });
    return 'ativado';
  } catch {
    return 'erro';
  }
}

export async function desativarPush(): Promise<void> {
  try {
    if (pushSuportado()) {
      const reg = await navigator.serviceWorker.getRegistration();
      const insc = await reg?.pushManager.getSubscription();
      if (insc) {
        await chamar('pushRemover', { corpo: { endpoint: insc.endpoint } });
        await insc.unsubscribe();
        return;
      }
    }
    await chamar('pushRemover', { corpo: {} });
  } catch {
    /* sem inscrição */
  }
}
