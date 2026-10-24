/**
 * Armazenamento dos arquivos coletados.
 *
 * - Caminho: `${ARQUIVOS_DIR}/provas/{banca}/{slug}/{arquivo}` (fora do diretório público).
 * - Hash SHA-256 de cada arquivo em `arquivos_coletados`: uma URL já baixada (com o arquivo
 *   presente e o mesmo hash) não é pedida de novo; o mesmo conteúdo vindo de outra URL não
 *   é gravado duas vezes no disco.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { BancoDados } from '@fuse/db';
import { arquivosColetados } from '@fuse/db/schema';
import type { FonteColeta, TipoArquivoColeta } from '@fuse/shared';
import type { ClienteHttp } from '../rede/cliente.js';
import { slugificar } from '../util/texto.js';

export function sha256(dados: Buffer | string): string {
  return createHash('sha256').update(dados).digest('hex');
}

export async function sha256DoArquivo(caminho: string): Promise<string> {
  const h = createHash('sha256');
  for await (const parte of createReadStream(caminho)) h.update(parte as Buffer);
  return h.digest('hex');
}

/** Pasta da prova: `${dir}/provas/{banca}/{slug}` (banca e slug saneados). */
export function pastaDaProva(arquivosDir: string, banca: string, slug: string): string {
  return join(arquivosDir, 'provas', slugificar(banca), slugificar(decodificarSeguro(slug)));
}

/** Nome de arquivo seguro a partir da URL ("GABARITO_DEFINITIVO_-_X.pdf" → "gabarito-definitivo-x.pdf"). */
export function nomeArquivoDaUrl(url: string, extensaoPadrao = '.pdf'): string {
  const ultimo = decodificarSeguro(new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'arquivo');
  const ext = (extname(ultimo) || extensaoPadrao).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = slugificar(basename(ultimo, extname(ultimo)));
  return `${base}${ext}`;
}

function decodificarSeguro(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function ehPdf(dados: Buffer): boolean {
  return dados.subarray(0, 1024).includes('%PDF-');
}

async function existe(caminho: string): Promise<boolean> {
  try {
    return (await stat(caminho)).isFile();
  } catch {
    return false;
  }
}

/** Grava de forma atômica (arquivo temporário + rename). */
export async function gravarArquivo(caminho: string, dados: Buffer): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  const tmp = `${caminho}.${process.pid}.${Date.now()}.parcial`;
  await writeFile(tmp, dados);
  await rename(tmp, caminho);
}

export type SituacaoArquivo = 'novo' | 'ja_baixado' | 'atualizado' | 'conteudo_repetido';

export interface ResultadoArquivo {
  url: string;
  caminho: string;
  hash: string;
  bytes: number;
  situacao: SituacaoArquivo;
  arquivoId: string;
}

export interface OpcoesSalvar {
  db: BancoDados;
  cliente: ClienteHttp;
  url: string;
  fonte: FonteColeta;
  tipo: TipoArquivoColeta;
  provaOrigemId: string | null;
  arquivosDir: string;
  banca: string;
  slug: string;
  /** Baixa de novo mesmo se já houver o arquivo com o hash registrado. */
  forcar?: boolean;
  /** Exige PDF (padrão true). */
  exigirPdf?: boolean;
  /** Relógio (testes). */
  agora?: () => Date;
}

/** Baixa (se preciso) e registra um arquivo em `arquivos_coletados`. */
export async function baixarERegistrar(o: OpcoesSalvar): Promise<ResultadoArquivo> {
  const agora = o.agora ?? (() => new Date());
  const [registro] = await o.db
    .select()
    .from(arquivosColetados)
    .where(eq(arquivosColetados.url, o.url))
    .limit(1);

  // Já baixado: confere o arquivo no disco pelo hash e não pede a URL de novo.
  if (registro?.hashSha256 && registro.caminho && !o.forcar && (await existe(registro.caminho))) {
    const hashDisco = await sha256DoArquivo(registro.caminho);
    if (hashDisco === registro.hashSha256) {
      if (o.provaOrigemId && registro.provaOrigemId !== o.provaOrigemId) {
        await o.db
          .update(arquivosColetados)
          .set({ provaOrigemId: o.provaOrigemId, tipo: o.tipo })
          .where(eq(arquivosColetados.id, registro.id));
      }
      return {
        url: o.url,
        caminho: registro.caminho,
        hash: registro.hashSha256,
        bytes: registro.bytes ?? 0,
        situacao: 'ja_baixado',
        arquivoId: registro.id,
      };
    }
  }

  const resp = await o.cliente.obterBinario(o.url);
  if ((o.exigirPdf ?? true) && !ehPdf(resp.dados)) {
    throw new Error(
      `O arquivo de ${o.url} não é um PDF (Content-Type ${resp.tipoConteudo || 'desconhecido'}). Nada foi gravado.`,
    );
  }
  const hash = sha256(resp.dados);

  // Mesmo conteúdo já guardado por outra URL: reaproveita o arquivo do disco.
  const [mesmoConteudo] = await o.db
    .select()
    .from(arquivosColetados)
    .where(eq(arquivosColetados.hashSha256, hash))
    .limit(1);
  let caminho = join(pastaDaProva(o.arquivosDir, o.banca, o.slug), nomeArquivoDaUrl(resp.url));
  let situacao: SituacaoArquivo = registro ? 'atualizado' : 'novo';
  if (mesmoConteudo?.caminho && (await existe(mesmoConteudo.caminho))) {
    caminho = mesmoConteudo.caminho;
    situacao = mesmoConteudo.url === o.url ? 'ja_baixado' : 'conteudo_repetido';
  } else {
    // Evita sobrescrever um arquivo diferente com o mesmo nome.
    if ((await existe(caminho)) && sha256(await readFile(caminho)) !== hash) {
      const ext = extname(caminho);
      caminho = `${caminho.slice(0, -ext.length || undefined)}-${hash.slice(0, 8)}${ext}`;
    }
    await gravarArquivo(caminho, resp.dados);
  }

  const valores = {
    url: o.url,
    fonte: o.fonte,
    tipo: o.tipo,
    provaOrigemId: o.provaOrigemId,
    caminho,
    hashSha256: hash,
    bytes: resp.dados.length,
    baixadoEm: agora(),
  };
  const [linha] = await o.db
    .insert(arquivosColetados)
    .values(valores)
    .onConflictDoUpdate({ target: arquivosColetados.url, set: valores })
    .returning({ id: arquivosColetados.id });
  return { url: o.url, caminho, hash, bytes: resp.dados.length, situacao, arquivoId: linha!.id };
}
