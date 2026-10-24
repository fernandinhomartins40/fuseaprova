/**
 * Configuração do coletor a partir do ambiente (.env).
 *
 * - ARQUIVOS_DIR: raiz dos arquivos (PDFs em `${ARQUIVOS_DIR}/provas/{banca}/{slug}/`).
 * - CRAWLER_USER_AGENT: User-Agent identificado. Sem ele, monta
 *   "FuseAprovaColetor/1.0 (+APP_URL; SUPORTE_EMAIL)".
 * - CRAWLER_INTERVALO_MS: intervalo entre requisições ao mesmo host (mínimo 2000).
 */
export interface ConfigColetor {
  arquivosDir: string;
  userAgent: string;
  intervaloMs: number;
  databaseUrl: string | undefined;
  pdftotext: string;
}

/** O PRD exige no máximo 1 requisição a cada 2 s por host. */
export const INTERVALO_MINIMO_MS = 2000;

export function userAgentPadrao(env: NodeJS.ProcessEnv = process.env): string {
  const contatos = [env.APP_URL, env.SUPORTE_EMAIL].filter((c) => c && c.trim()).join('; ');
  return `FuseAprovaColetor/1.0 (+${contatos || 'contato no .env: defina APP_URL ou SUPORTE_EMAIL'})`;
}

export function lerConfig(env: NodeJS.ProcessEnv = process.env): ConfigColetor {
  const intervalo = Number(env.CRAWLER_INTERVALO_MS);
  return {
    arquivosDir: env.ARQUIVOS_DIR?.trim() || '/srv/fuse/arquivos',
    userAgent: env.CRAWLER_USER_AGENT?.trim() || userAgentPadrao(env),
    intervaloMs: Number.isFinite(intervalo)
      ? Math.max(INTERVALO_MINIMO_MS, intervalo)
      : INTERVALO_MINIMO_MS,
    databaseUrl: env.DATABASE_URL,
    pdftotext: env.PDFTOTEXT_BIN?.trim() || 'pdftotext',
  };
}
