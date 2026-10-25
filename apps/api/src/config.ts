/**
 * Configuração da API, lida do ambiente (.env). Tudo tem padrão seguro para dev/teste.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  ambiente: 'development' | 'production' | 'test';
  host: string;
  porta: number;
  appUrl: string;
  /** Segredo do HMAC que transforma o token da sessão no hash guardado no banco. */
  segredoSessao: string;
  cookieDominio: string | undefined;
  /** Cookie com `Secure` (padrão true; COOKIE_SECURE=0 só para dev em http fora de localhost). */
  cookieSeguro: boolean;
  precoCentavos: number;
  asaas: { apiKey: string; baseUrl: string; webhookToken: string };
  smtp: { host: string; porta: number; usuario: string; senha: string; remetente: string };
  vapid: { publica: string; privada: string; assunto: string };
  arquivosDir: string;
  suporte: { whatsapp: string; email: string };
  nivelLog: string;
  /** D13: versão em produção (APP_VERSION embutida na imagem, ou DEPLOY_COMMIT). */
  versao: string;
  /** D13: imagem da API em uso (FUSEAPROVA_API_IMAGE do .env, por digest). */
  imagem: string | null;
  /** D13: pasta dos backups montada só para leitura (ULTIMO_BACKUP). */
  backupDir: string;
}

function numero(v: string | undefined, padrao: number): number {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) ? n : padrao;
}

export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const ambiente =
    env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development';
  const segredo = env.SESSION_SECRET ?? '';
  if (ambiente === 'production' && segredo.length < 32) {
    throw new Error('SESSION_SECRET precisa ter pelo menos 32 caracteres em produção.');
  }
  return {
    ambiente,
    host: env.HOST ?? env.API_HOST ?? '0.0.0.0',
    porta: numero(env.PORT ?? env.API_PORT, 3000),
    appUrl: (env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
    segredoSessao: segredo || 'segredo-de-desenvolvimento-nao-use-em-producao',
    cookieDominio: env.COOKIE_DOMAIN || undefined,
    cookieSeguro: !(env.COOKIE_SECURE === '0' || env.COOKIE_SECURE === 'false'),
    precoCentavos: numero(env.PRICE_CENTS, 39700),
    asaas: {
      apiKey: env.ASAAS_API_KEY ?? '',
      baseUrl: (env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/v3').replace(/\/+$/, ''),
      webhookToken: env.ASAAS_WEBHOOK_TOKEN ?? '',
    },
    smtp: {
      host: env.SMTP_HOST ?? '',
      porta: numero(env.SMTP_PORT, 587),
      usuario: env.SMTP_USER ?? '',
      senha: env.SMTP_PASS ?? '',
      remetente: env.SMTP_FROM ?? 'Fuse Aprova <nao-responda@localhost>',
    },
    vapid: {
      publica: env.VAPID_PUBLIC_KEY ?? '',
      privada: env.VAPID_PRIVATE_KEY ?? '',
      assunto: env.VAPID_SUBJECT ?? 'mailto:contato@localhost',
    },
    arquivosDir: env.ARQUIVOS_DIR ?? join(tmpdir(), 'fuse-arquivos'),
    suporte: { whatsapp: env.SUPORTE_WHATSAPP ?? '', email: env.SUPORTE_EMAIL ?? '' },
    nivelLog: env.LOG_LEVEL ?? (ambiente === 'test' ? 'silent' : 'info'),
    versao: env.APP_VERSION || env.DEPLOY_COMMIT || 'desenvolvimento',
    imagem: env.FUSEAPROVA_API_IMAGE || null,
    backupDir: env.BACKUP_DIR ?? join(tmpdir(), 'fuse-backups'),
  };
}

/** Configuração para testes: tokens conhecidos e nada externo. */
export function configTeste(sobrescrever: Partial<Config> = {}): Config {
  const base = lerConfig({ NODE_ENV: 'test' });
  return {
    ...base,
    appUrl: 'http://localhost:5173',
    asaas: { apiKey: 'chave-teste', baseUrl: 'http://asaas.invalido/v3', webhookToken: 'token-webhook-teste' },
    vapid: { publica: 'BChaveVapidPublicaDeTeste', privada: 'privada', assunto: 'mailto:teste@localhost' },
    ...sobrescrever,
  };
}
