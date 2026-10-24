/** Utilitários dos testes: PDF mínimo com texto, relógio falso e MockAgent do undici. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { MockAgent } from 'undici';
import type { RelogioLimitador } from '../src/rede/limitador.js';

export const UA = 'FuseAprovaColetor/1.0 (+https://app.exemplo.test; suporte@exemplo.test)';

export const fixture = (n: string) =>
  readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

export function relogioFalso(): RelogioLimitador & { esperas: number[] } {
  let t = 1_000_000;
  const esperas: number[] = [];
  return {
    esperas,
    agora: () => t,
    dormir: async (ms) => {
      esperas.push(ms);
      t += ms;
    },
  };
}

export function mockAgent(): MockAgent {
  const agent = new MockAgent();
  agent.disableNetConnect();
  return agent;
}

function escaparPdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** PDF válido (Helvetica, WinAnsi) com as linhas dadas; `\f` numa linha quebra a página. */
export function pdfComTexto(linhas: string[], porPagina = 50): Buffer {
  const paginas: string[][] = [[]];
  for (const l of linhas) {
    const atual = paginas[paginas.length - 1]!;
    if (l === '\f' || atual.length >= porPagina) paginas.push([]);
    if (l !== '\f') paginas[paginas.length - 1]!.push(l);
  }
  const objs: string[] = [];
  const nPag = paginas.length;
  // 1 catálogo, 2 páginas, 3 fonte, depois (página, conteúdo) por página.
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = paginas.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${nPag} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  for (const [i, p] of paginas.entries()) {
    const conteudo = `BT /F1 10 Tf 40 800 Td 14 TL ${p.map((l) => `(${escaparPdf(l)}) Tj T*`).join(' ')} ET`;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
    objs.push(
      `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    );
  }
  let corpo = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(corpo, 'latin1'));
    corpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(corpo, 'latin1');
  corpo += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) corpo += `${String(off).padStart(10, '0')} 00000 n \n`;
  corpo += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(corpo, 'latin1');
}

/** O binário existe? (`pdftotext -v` sai com 99 no xpdf e 0 no poppler; só ENOENT conta.) */
export const temPdftotext = (() => {
  try {
    execFileSync(process.env.PDFTOTEXT_BIN ?? 'pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== 'ENOENT';
  }
})();
