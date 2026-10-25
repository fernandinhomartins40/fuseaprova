import { describe, expect, it } from 'vitest';
import {
  base32,
  cifrarSegredo,
  codigoDoPasso,
  deBase32,
  decifrarSegredo,
  gerarCodigoRecuperacao,
  gerarSegredoTotp,
  hashCodigoRecuperacao,
  passoTotp,
  qrSvg,
  uriTotp,
  verificarTotp,
} from '../src/servicos/totp.js';

// RFC 6238, apêndice B (SHA-1, segredo ASCII "12345678901234567890"), 6 últimos dígitos.
const SEGREDO_RFC = base32(Buffer.from('12345678901234567890'));
const VETORES: [number, string][] = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
];

describe('TOTP (RFC 6238)', () => {
  it.each(VETORES)('t=%i → %s', (t, codigo) => {
    expect(codigoDoPasso(SEGREDO_RFC, Math.floor(t / 30))).toBe(codigo);
  });

  it('base32 ida e volta; segredo de 160 bits', () => {
    const s = gerarSegredoTotp();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32(deBase32(s))).toBe(s);
    expect(() => deBase32('01')).toThrow();
  });

  it('aceita o passo vizinho e recusa o mesmo passo de novo (sem reuso)', () => {
    const agora = new Date(1_111_111_111_000);
    const passo = passoTotp(agora);
    expect(verificarTotp(SEGREDO_RFC, '050471', agora, null)).toBe(passo);
    expect(verificarTotp(SEGREDO_RFC, '050471', agora, passo)).toBeNull();
    const anterior = codigoDoPasso(SEGREDO_RFC, passo - 1);
    expect(verificarTotp(SEGREDO_RFC, anterior, agora, null)).toBe(passo - 1);
    expect(verificarTotp(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, passo - 2), agora, null)).toBeNull();
    expect(verificarTotp(SEGREDO_RFC, 'abc123', agora, null)).toBeNull();
  });

  it('segredo cifrado com AES-GCM; outra chave não decifra', () => {
    const c = cifrarSegredo('segredo-sessao-a', 'JBSWY3DPEHPK3PXP');
    expect(c).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decifrarSegredo('segredo-sessao-a', c)).toBe('JBSWY3DPEHPK3PXP');
    expect(decifrarSegredo('segredo-sessao-b', c)).toBeNull();
    expect(decifrarSegredo('segredo-sessao-a', 'lixo')).toBeNull();
  });

  it('URI otpauth e QR em SVG gerado localmente', async () => {
    const uri = uriTotp('JBSWY3DPEHPK3PXP', 'dono@fuse.com');
    expect(uri).toMatch(/^otpauth:\/\/totp\/Fuse%20Aprova%3Adono%40fuse\.com\?secret=JBSWY3DPEHPK3PXP&issuer=Fuse\+Aprova/);
    expect(await qrSvg(uri)).toMatch(/^<svg/);
  });

  it('códigos de recuperação: formato e hash insensível a hífen e caixa', () => {
    const c = gerarCodigoRecuperacao();
    expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(hashCodigoRecuperacao(c)).toBe(hashCodigoRecuperacao(c.replace('-', '').toLowerCase()));
  });
});
