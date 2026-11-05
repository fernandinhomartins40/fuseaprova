/**
 * Grava um .html de cada e-mail transacional para conferir o visual no navegador.
 *
 *   pnpm --filter @fuse/api exec tsx --conditions=@fuse/source scripts/previa-emails.ts <pasta> [appUrl]
 *
 * O appUrl padrão é o da produção, de onde vêm a logo, a Capi e as fontes (/email/).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { emailAlertaOperacao, emailComunicacao } from '@fuse/shared';
import {
  emailApostilasLiberadas,
  emailAlertaSeguranca,
  emailAvisoTrocaEmail,
  emailBoasVindas,
  emailConvite,
  emailRecuperacao,
  emailReembolso,
} from '../src/integracoes/email.js';

const pasta = process.argv[2] ?? 'previa-emails';
const appUrl = process.argv[3] ?? 'https://www.fuseaprova.com.br';
const pago = {
  nome: 'Marina Souza',
  email: 'marina@exemplo.com',
  valorCentavos: 39700,
  pagoEm: new Date(),
  cobrancaId: 'pay_123456789',
  appUrl,
};

const emails: Record<string, { html: string }> = {
  'boas-vindas': emailBoasVindas(pago),
  apostilas: emailApostilasLiberadas({ ...pago, valorCentavos: 4700 }),
  recuperacao: emailRecuperacao({
    nome: 'Marina Souza',
    email: 'marina@exemplo.com',
    link: `${appUrl}/recuperar/abc`,
    appUrl,
  }),
  reembolso: emailReembolso({ ...pago, produto: 'concurso' }),
  'alerta-seguranca': emailAlertaSeguranca({
    nome: 'Marina Souza',
    email: 'marina@exemplo.com',
    titulo: 'Muitos códigos errados na sua conta',
    texto:
      'Houve 5 tentativas erradas de código na sua conta do painel do Fuse Aprova. Se não foi você, troque a senha.',
    appUrl,
  }),
  'troca-email': emailAvisoTrocaEmail({
    nome: 'Marina Souza',
    emailAntigo: 'a@x.com',
    emailNovo: 'marina@novo.com',
    quando: new Date(),
    appUrl,
  }),
  convite: emailConvite({
    nome: 'Marina Souza',
    email: 'marina@exemplo.com',
    papel: 'Admin',
    link: `${appUrl}/convite/abc`,
    entrar: `${appUrl}/admin`,
    validadeHoras: 48,
    appUrl,
  }),
  'alerta-operacao': emailAlertaOperacao({
    nome: 'Luiz',
    problemas: ['Backup com mais de 26 horas', 'Job lembretes atrasado'],
    painel: `${appUrl}/super/sistema`,
  }),
  comunicacao: emailComunicacao({
    nome: 'Marina Souza',
    assunto: 'Simulado novo no ar',
    mensagem:
      'Saiu um simulado novo no padrão da FAU.\n\nReserve 1 hora e treine como no dia da prova.',
    appUrl,
  }),
};

await mkdir(pasta, { recursive: true });
for (const [nome, e] of Object.entries(emails))
  await writeFile(join(pasta, `${nome}.html`), e.html, 'utf8');
console.info(`${Object.keys(emails).length} e-mails em ${pasta}`);
