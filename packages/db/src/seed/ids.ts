import { createHash } from 'node:crypto';

/** Namespace fixo do Fuse Aprova para os ids do seed. */
const NAMESPACE = 'fuse-aprova:seed:v1';

/**
 * UUID determinístico (formato v5, SHA-1) a partir de uma chave legível.
 * Rodar o seed de novo gera os mesmos ids, o que o torna idempotente.
 */
export function idFixo(chave: string): string {
  const h = createHash('sha1').update(`${NAMESPACE}:${chave}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
