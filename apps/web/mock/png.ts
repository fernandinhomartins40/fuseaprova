/**
 * PNG em tons de cinza sem dependências (deflate "stored"), só para o QR de mentira do mock.
 * NÃO é um QR Code válido: o real vem do Asaas.
 */
function crc32(bytes: Uint8Array): number {
  let c = ~0;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function u32(n: number): number[] {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function chunk(tipo: string, dados: Uint8Array): number[] {
  const t = [...tipo].map((c) => c.charCodeAt(0));
  const corpo = new Uint8Array([...t, ...dados]);
  return [...u32(dados.length), ...corpo, ...u32(crc32(corpo))];
}

/** Gera um PNG base64 com um padrão de módulos que lembra um QR. */
export function pngQrFalso(semente = 7, modulos = 29, escala = 6): string {
  const lado = modulos * escala;
  let s = semente;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const grade: boolean[][] = Array.from({ length: modulos }, () =>
    Array.from({ length: modulos }, () => rnd() > 0.5),
  );
  const olho = (x0: number, y0: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const borda = x === 0 || y === 0 || x === 6 || y === 6;
        const miolo = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grade[y0 + y]![x0 + x] = borda || miolo;
      }
  };
  olho(0, 0);
  olho(modulos - 7, 0);
  olho(0, modulos - 7);
  const cru = new Uint8Array((lado + 1) * lado);
  for (let y = 0; y < lado; y++) {
    cru[y * (lado + 1)] = 0;
    for (let x = 0; x < lado; x++) {
      const preto = grade[Math.floor(y / escala)]![Math.floor(x / escala)];
      cru[y * (lado + 1) + 1 + x] = preto ? 0 : 255;
    }
  }
  // zlib com blocos "stored" de até 65535 bytes
  const blocos: number[] = [0x78, 0x01];
  for (let i = 0; i < cru.length; i += 65535) {
    const parte = cru.subarray(i, Math.min(cru.length, i + 65535));
    const ultimo = i + 65535 >= cru.length ? 1 : 0;
    blocos.push(
      ultimo,
      parte.length & 255,
      parte.length >>> 8,
      ~parte.length & 255,
      (~parte.length >>> 8) & 255,
      ...parte,
    );
  }
  blocos.push(...u32(adler32(cru)));
  const ihdr = new Uint8Array([...u32(lado), ...u32(lado), 8, 0, 0, 0, 0]);
  const png = new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk('IHDR', ihdr),
    ...chunk('IDAT', new Uint8Array(blocos)),
    ...chunk('IEND', new Uint8Array()),
  ]);
  let bin = '';
  for (const b of png) bin += String.fromCharCode(b);
  return btoa(bin);
}
