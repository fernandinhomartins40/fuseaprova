/**
 * E-mail (PRD 8.6): SMTP do próprio dono via nodemailer. Em dev/teste, um transporte em
 * memória (e, em dev, um arquivo .html por e-mail na pasta temporária).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { formatarDataBR, formatarReais, diaSP, horaMinutoSP, primeiroNome } from '@fuse/shared';
import { AVISO_EDITAL, botaoEmail, CORES_EMAIL, escHtml, layoutEmail } from '@fuse/shared';
import type { Config } from '../config.js';

export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export interface Mailer {
  enviar(m: MensagemEmail): Promise<void>;
}

export interface MailerMemoria extends Mailer {
  enviados: MensagemEmail[];
}

export function criarMailerMemoria(opcoes: { pasta?: string } = {}): MailerMemoria {
  const enviados: MensagemEmail[] = [];
  return {
    enviados,
    async enviar(m) {
      enviados.push(m);
      if (opcoes.pasta) {
        await mkdir(opcoes.pasta, { recursive: true });
        const nome = `${Date.now()}-${m.assunto.replace(/[^\w]+/g, '-').slice(0, 40)}.html`;
        await writeFile(join(opcoes.pasta, nome), m.html, 'utf8');
      }
    },
  };
}

export function criarMailerSmtp(smtp: Config['smtp']): Mailer {
  const transporte = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.porta === 465,
    auth: smtp.usuario ? { user: smtp.usuario, pass: smtp.senha } : undefined,
  });
  return {
    async enviar(m) {
      await transporte.sendMail({
        from: smtp.remetente,
        to: m.para,
        subject: m.assunto,
        html: m.html,
        text: m.texto,
      });
    },
  };
}

/** SMTP se configurado; senão memória (dev grava os e-mails em $TMP/fuse-emails). */
export function criarMailerPadrao(config: Config): Mailer {
  if (config.smtp.host) return criarMailerSmtp(config.smtp);
  return criarMailerMemoria(
    config.ambiente === 'development' ? { pasta: join(tmpdir(), 'fuse-emails') } : {},
  );
}

/* ------------------------------------------------------------- templates */

const COR = CORES_EMAIL;
const esc = escHtml;
const layout = layoutEmail;
const botao = botaoEmail;

export function emailBoasVindas(d: {
  nome: string;
  email: string;
  valorCentavos: number;
  pagoEm: Date;
  cobrancaId: string;
  appUrl: string;
}): MensagemEmail {
  const valor = formatarReais(d.valorCentavos);
  const data = `${formatarDataBR(diaSP(d.pagoEm))} às ${horaMinutoSP(d.pagoEm)}`;
  const nome = primeiroNome(d.nome);
  const html = layout(
    `Bem-vindo(a), ${nome}! Seu acesso está liberado.`,
    `<p>Seu pagamento via Pix foi confirmado e o acesso completo ao Fuse Aprova já está liberado.</p>
${botao(`${d.appUrl}/aprender`, 'COMEÇAR A ESTUDAR')}
<h2 style="font-size:18px;color:${COR.turquesa};margin:24px 0 8px">Recibo</h2>
<table role="presentation" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:15px">
<tr><td>Produto</td><td><b>Fuse Aprova – acesso completo</b></td></tr>
<tr><td>Valor</td><td><b>${esc(valor)}</b> (Pix, pagamento único)</td></tr>
<tr><td>Data</td><td>${esc(data)}</td></tr>
<tr><td>Cobrança</td><td>${esc(d.cobrancaId)}</td></tr>
</table>
<p style="margin-top:20px">${esc(AVISO_EDITAL)}</p>
<p style="font-size:14px;color:#5b6b6c">Você tem 7 dias para desistir da compra com reembolso integral (CDC, art. 49).</p>`,
  );
  const texto = `Olá, ${nome}! Seu pagamento via Pix foi confirmado e o acesso ao Fuse Aprova está liberado.
Recibo: Fuse Aprova – acesso completo · ${valor} · ${data} · cobrança ${d.cobrancaId}.
${AVISO_EDITAL}
Acesse: ${d.appUrl}/aprender`;
  return { para: d.email, assunto: 'Pagamento confirmado: seu acesso ao Fuse Aprova', html, texto };
}

export function emailRecuperacao(d: { nome: string; email: string; link: string }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layout(
    'Crie uma nova senha',
    `<p>Olá, ${esc(nome)}. Recebemos um pedido para criar uma nova senha na sua conta.</p>
${botao(d.link, 'CRIAR NOVA SENHA')}
<p>O link vale por 1 hora. Ao trocar a senha, as outras sessões abertas são encerradas.</p>
<p style="font-size:14px;color:#5b6b6c">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`,
  );
  const texto = `Olá, ${nome}. Para criar uma nova senha no Fuse Aprova, abra o link (vale por 1 hora): ${d.link}
Se não foi você, ignore este e-mail.`;
  return { para: d.email, assunto: 'Fuse Aprova: crie uma nova senha', html, texto };
}

export function emailReembolso(d: {
  nome: string;
  email: string;
  valorCentavos: number;
  cobrancaId: string;
}): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const valor = formatarReais(d.valorCentavos);
  const html = layout(
    'Reembolso confirmado',
    `<p>Olá, ${esc(nome)}. O reembolso de <b>${esc(valor)}</b> (cobrança ${esc(d.cobrancaId)}) foi confirmado e o valor volta pelo Pix para a conta de origem.</p>
<p>Com o estorno, o acesso ao Fuse Aprova foi encerrado. Obrigado por ter experimentado!</p>`,
  );
  const texto = `Olá, ${nome}. O reembolso de ${valor} (cobrança ${d.cobrancaId}) foi confirmado. O acesso ao Fuse Aprova foi encerrado.`;
  return { para: d.email, assunto: 'Fuse Aprova: reembolso confirmado', html, texto };
}

/** S-16: aviso de segurança para o dono da conta (ex.: muitos códigos errados). */
export function emailAlertaSeguranca(d: { nome: string; email: string; titulo: string; texto: string }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layout(d.titulo, `<p>Olá, ${esc(nome)}.</p>\n<p>${esc(d.texto)}</p>`);
  return { para: d.email, assunto: `Fuse Aprova: ${d.titulo.toLowerCase()}`, html, texto: `Olá, ${nome}. ${d.texto}` };
}

/**
 * S-11: o e-mail de uma conta da equipe foi trocado pelo superadmin. Vai para o endereço ANTIGO,
 * para o dono perceber uma troca que não pediu.
 */
export function emailAvisoTrocaEmail(d: { nome: string; emailAntigo: string; emailNovo: string; quando: Date }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const data = `${formatarDataBR(diaSP(d.quando))} às ${horaMinutoSP(d.quando)}`;
  const novo = d.emailNovo.replace(/^(.).*(@.*)$/, '$1***$2');
  const texto = `O e-mail de acesso da sua conta no painel do Fuse Aprova foi trocado por um superadmin em ${data} (Brasília), para ${novo}. A partir de agora os links de senha vão para o endereço novo. Se você não pediu essa troca, avise o responsável pelo Fuse Aprova imediatamente.`;
  const html = layout('O e-mail da sua conta foi trocado', `<p>Olá, ${esc(nome)}.</p>\n<p>${esc(texto)}</p>`);
  return { para: d.emailAntigo, assunto: 'Fuse Aprova: o e-mail da sua conta foi trocado', html, texto: `Olá, ${nome}. ${texto}` };
}

/** D13: convite da equipe (admin ou superadmin) com o link para definir a senha. */
export function emailConvite(d: {
  nome: string;
  email: string;
  papel: string;
  link: string;
  entrar: string;
  validadeHoras: number;
}): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layout(
    'Você foi convidado(a) para a equipe do Fuse Aprova',
    `<p>Olá, ${esc(nome)}. Você recebeu acesso como <b>${esc(d.papel)}</b> no painel do Fuse Aprova.</p>
${botao(d.link, 'DEFINIR MINHA SENHA')}
<p>O link vale por ${d.validadeHoras} horas. Depois de definir a senha, entre em ${esc(d.entrar)}.</p>
<p style="font-size:14px;color:#5b6b6c">Se você não esperava este convite, ignore este e-mail.</p>`,
  );
  const texto = `Olá, ${nome}. Você recebeu acesso como ${d.papel} no painel do Fuse Aprova. Defina sua senha (o link vale por ${d.validadeHoras} horas): ${d.link}`;
  return { para: d.email, assunto: 'Fuse Aprova: convite para a equipe', html, texto };
}
