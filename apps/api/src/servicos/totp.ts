/**
 * 2FA do superadmin (D13): TOTP RFC 6238 (SHA-1, 6 dígitos, passo de 30 s) com node:crypto,
 * sem serviço externo. O segredo fica cifrado no banco (AES-256-GCM, chave derivada do
 * SESSION_SECRET por HKDF) e os códigos de recuperação ficam só como hash SHA-256.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';

export const PASSO_TOTP_S = 30;
export const DIGITOS_TOTP = 6;
/** Aceita o passo anterior e o seguinte (relógio do celular adiantado ou atrasado). */
export const JANELA_TOTP = 1;
export const EMISSOR_TOTP = 'Fuse Aprova';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let saida = '';
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

export function deBase32(texto: string): Buffer {
  const limpo = texto.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let valor = 0;
  const out: number[] = [];
  for (const c of limpo) {
    const i = BASE32.indexOf(c);
    if (i < 0) throw new Error('base32 inválido');
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Novo segredo de 160 bits em base32 (o tamanho que os apps autenticadores esperam). */
export function gerarSegredoTotp(): string {
  return base32(randomBytes(20));
}

export function passoTotp(agora: Date): number {
  return Math.floor(agora.getTime() / 1000 / PASSO_TOTP_S);
}

/** HOTP (RFC 4226) para um passo. */
export function codigoDoPasso(segredoBase32: string, passo: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const h = createHmac('sha1', deBase32(segredoBase32)).update(contador).digest();
  const o = h[h.length - 1]! & 0x0f;
  const bin = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(bin % 10 ** DIGITOS_TOTP).padStart(DIGITOS_TOTP, '0');
}

/** Código TOTP do instante (usado nos testes e no E2E). */
export function gerarCodigoTotp(segredoBase32: string, agora: Date = new Date()): string {
  return codigoDoPasso(segredoBase32, passoTotp(agora));
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Confere o código e devolve o passo aceito (para guardar e impedir reuso) ou null.
 * `ultimoPasso`: o último passo já aceito; códigos desse passo ou anteriores são recusados.
 */
export function verificarTotp(
  segredoBase32: string,
  codigo: string,
  agora: Date,
  ultimoPasso: number | null | undefined,
): number | null {
  if (!/^\d{6}$/.test(codigo)) return null;
  const atual = passoTotp(agora);
  for (let d = -JANELA_TOTP; d <= JANELA_TOTP; d++) {
    const passo = atual + d;
    if (ultimoPasso !== null && ultimoPasso !== undefined && passo <= ultimoPasso) continue;
    if (iguais(codigoDoPasso(segredoBase32, passo), codigo)) return passo;
  }
  return null;
}

export function uriTotp(segredoBase32: string, conta: string, emissor = EMISSOR_TOTP): string {
  const rotulo = encodeURIComponent(`${emissor}:${conta}`);
  const p = new URLSearchParams({
    secret: segredoBase32,
    issuer: emissor,
    algorithm: 'SHA1',
    digits: String(DIGITOS_TOTP),
    period: String(PASSO_TOTP_S),
  });
  return `otpauth://totp/${rotulo}?${p.toString()}`;
}

/** QR em SVG, gerado aqui no servidor (sem serviço externo). */
export function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 220 });
}

/* ------------------------------------------------------- cifra do segredo */

function chave(segredoSessao: string): Buffer {
  return Buffer.from(hkdfSync('sha256', segredoSessao, 'fuse-aprova', 'totp-segredo-v1', 32));
}

/** "v1.<iv>.<tag>.<dados>" em base64url. */
export function cifrarSegredo(segredoSessao: string, texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(segredoSessao), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), dados.toString('base64url')].join('.');
}

export function decifrarSegredo(segredoSessao: string, cifrado: string): string | null {
  const [v, iv, tag, dados] = cifrado.split('.');
  if (v !== 'v1' || !iv || !tag || !dados) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', chave(segredoSessao), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(dados, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/* --------------------------------------------------- códigos de recuperação */

const ALFABETO_RECUPERACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const QTD_CODIGOS_RECUPERACAO = 10;

/** "ABCDE-FGHJK" (10 caracteres sem 0/O/1/I). */
export function gerarCodigoRecuperacao(): string {
  const b = randomBytes(10);
  let s = '';
  for (const x of b) s += ALFABETO_RECUPERACAO[x % ALFABETO_RECUPERACAO.length];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export function hashCodigoRecuperacao(codigo: string): string {
  return createHash('sha256').update(codigo.replace(/[\s-]+/g, '').toUpperCase()).digest('hex');
}
