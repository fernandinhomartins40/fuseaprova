/**
 * Gabarito cifrado do pacote offline (PRD 8.4 e 10, "regra de ouro").
 *
 * A API gera uma chave AES-GCM de 256 bits por pacote/sessão offline, cifra o gabarito
 * (e a explicação, se quiser) de cada questão e envia a chave no pacote. A PWA decifra
 * só na hora da correção local. O XP é sempre recalculado no servidor no sync, então a
 * cifra serve para que o gabarito não fique legível em cache/IndexedDB nem em respostas
 * de rede inspecionadas por acaso; não é uma barreira contra um aluno determinado.
 *
 * Usa Web Crypto (globalThis.crypto.subtle), disponível no Node 20+ e nos navegadores.
 * Formato do texto cifrado: "<iv base64url>.<dados base64url>". AAD = id da questão.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function paraBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function importarChave(chave: string) {
  return crypto.subtle.importKey('raw', deBase64Url(chave), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Nova chave aleatória (base64url, 32 bytes). */
export function gerarChaveOffline(): string {
  return paraBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Cifra um texto (ex.: a letra do gabarito) amarrado ao id da questão. */
export async function cifrarTexto(
  chave: string,
  questaoId: string,
  texto: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(questaoId) },
    await importarChave(chave),
    enc.encode(texto),
  );
  return `${paraBase64Url(iv)}.${paraBase64Url(new Uint8Array(dados))}`;
}

/** Decifra. Lança erro se a chave, o id ou o texto não baterem. */
export async function decifrarTexto(
  chave: string,
  questaoId: string,
  cifrado: string,
): Promise<string> {
  const [iv, dados] = cifrado.split('.');
  if (!iv || !dados) throw new Error('Texto cifrado inválido.');
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deBase64Url(iv), additionalData: enc.encode(questaoId) },
    await importarChave(chave),
    deBase64Url(dados),
  );
  return dec.decode(claro);
}
