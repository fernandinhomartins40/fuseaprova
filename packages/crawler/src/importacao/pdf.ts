/**
 * Extração de texto de PDF com `pdftotext` (poppler-utils), via child_process.
 * Sem OCR: PDF escaneado (sem camada de texto) é recusado com mensagem clara.
 *
 * Modos: `raw` (ordem do conteúdo, uma linha por linha; melhor para cadernos de 1 coluna),
 * `layout` (mantém colunas; melhor para a grade do gabarito) e `normal` (padrão do
 * pdftotext; no xpdf 4 ele junta linhas em parágrafos, por isso fica por último).
 */
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const executar = promisify(execFile);

export type ModoPdf = 'normal' | 'layout' | 'raw';

export interface OpcoesPdf {
  /** Atalho para `modo: 'layout'`. */
  layout?: boolean;
  modo?: ModoPdf;
  /** Binário (padrão `pdftotext`, ou PDFTOTEXT_BIN). */
  binario?: string;
}

export class ErroPdf extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroPdf';
  }
}

export async function extrairTextoPdf(caminho: string, opcoes: OpcoesPdf = {}): Promise<string> {
  const binario = opcoes.binario ?? process.env.PDFTOTEXT_BIN ?? 'pdftotext';
  const modo: ModoPdf = opcoes.modo ?? (opcoes.layout ? 'layout' : 'normal');
  const args = ['-enc', 'UTF-8', ...(modo === 'normal' ? [] : [`-${modo}`]), caminho, '-'];
  try {
    const { stdout } = await executar(binario, args, {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
    });
    if (stdout.replace(/\s+/g, '').length < 20) {
      throw new ErroPdf(
        `O PDF ${caminho} não tem texto (provavelmente é escaneado). O coletor não faz OCR.`,
      );
    }
    return stdout;
  } catch (e) {
    if (e instanceof ErroPdf) throw e;
    const err = e as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === 'ENOENT') {
      throw new ErroPdf(
        'pdftotext não encontrado. Instale o poppler-utils (`apt install poppler-utils`) ou defina PDFTOTEXT_BIN.',
      );
    }
    throw new ErroPdf(`pdftotext falhou em ${caminho}: ${(err.stderr || err.message).trim()}`);
  }
}

/** Texto de um arquivo: `.txt` é lido direto; o resto passa pelo pdftotext. */
export async function lerTexto(caminho: string, opcoes: OpcoesPdf = {}): Promise<string> {
  if (/\.txt$/i.test(caminho)) return readFile(caminho, 'utf8');
  return extrairTextoPdf(caminho, opcoes);
}
