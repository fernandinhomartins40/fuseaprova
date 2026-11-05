/**
 * E-mail (PRD 8.6): API do Velomail (D37) ou SMTP do próprio dono via nodemailer. Em dev/teste, um transporte em
 * memória (e, em dev, um arquivo .html por e-mail na pasta temporária).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { formatarDataBR, formatarReais, diaSP, horaMinutoSP, primeiroNome } from '@fuse/shared';
import { AVISO_EDITAL, avisoEmail, botaoEmail, CORES_EMAIL, criarEnviadorVelomail, escHtml, layoutEmail, notaEmail, pEmail, reciboEmail } from '@fuse/shared';
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

export function criarMailerVelomail(config: Config): Mailer {
  const v = criarEnviadorVelomail({ apiKey: config.velomail.apiKey, url: config.velomail.url, remetente: config.smtp.remetente });
  return {
    async enviar(m) {
      await v.enviar(m);
    },
  };
}

/** Há um jeito real de enviar e-mail (Velomail ou SMTP)? */
export function emailConfigurado(config: Config): boolean {
  return !!config.velomail.apiKey || !!config.smtp.host;
}

/** Velomail, senão SMTP, senão memória (dev grava os e-mails em $TMP/fuse-emails). */
export function criarMailerPadrao(config: Config): Mailer {
  if (config.velomail.apiKey) return criarMailerVelomail(config);
  if (config.smtp.host) return criarMailerSmtp(config.smtp);
  return criarMailerMemoria(
    config.ambiente === 'development' ? { pasta: join(tmpdir(), 'fuse-emails') } : {},
  );
}

/* ------------------------------------------------------------- templates */

const esc = escHtml;
const botao = botaoEmail;

/** Recibo comum aos e-mails de pagamento confirmado. */
function recibo(produto: string, valor: string, data: string, cobrancaId: string): string {
  return reciboEmail([
    ['Produto', esc(produto)],
    ['Valor', `${esc(valor)}<br><span style="font-size:13px;font-weight:600;color:${CORES_EMAIL.apagado}">Pix, pagamento único</span>`],
    ['Data', esc(data)],
    ['Cobrança', esc(cobrancaId)],
  ]);
}

const ARREPENDIMENTO = 'Você tem 7 dias para desistir da compra com reembolso integral (CDC, art. 49).';

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
  const html = layoutEmail(
    `Bem-vindo(a), ${nome}! Seu acesso está liberado.`,
    `${pEmail('Seu pagamento via Pix foi confirmado e o acesso completo ao Fuse Aprova já está liberado. As lições, a revisão, os simulados e a liga estão esperando por você.')}
${botao(`${d.appUrl}/aprender`, 'COMEÇAR A ESTUDAR')}
${recibo('Fuse Aprova – acesso completo', valor, data, d.cobrancaId)}
${avisoEmail(esc(AVISO_EDITAL))}
${notaEmail(esc(ARREPENDIMENTO))}`,
    { appUrl: d.appUrl, capi: 'celebrando', previa: 'Pagamento confirmado. Seu acesso ao Fuse Aprova já está liberado.' },
  );
  const texto = `Olá, ${nome}! Seu pagamento via Pix foi confirmado e o acesso ao Fuse Aprova está liberado.
Recibo: Fuse Aprova – acesso completo · ${valor} · ${data} · cobrança ${d.cobrancaId}.
${AVISO_EDITAL}
Acesse: ${d.appUrl}/aprender`;
  return { para: d.email, assunto: 'Pagamento confirmado: seu acesso ao Fuse Aprova', html, texto };
}

/** D34: compra das apostilas confirmada, com o recibo e o link da página de download. */
export function emailApostilasLiberadas(d: {
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
  const link = `${d.appUrl}/apostilas`;
  const html = layoutEmail(
    `Pronto, ${nome}! Suas apostilas estão liberadas.`,
    `${pEmail('Seu pagamento via Pix foi confirmado. As 4 apostilas de questões comentadas da banca FAU já podem ser baixadas: entre com o seu e-mail e senha na página das apostilas.')}
${botao(link, 'BAIXAR AS APOSTILAS')}
${recibo('Apostilas Fuse Aprova (4 volumes em PDF)', valor, data, d.cobrancaId)}
${avisoEmail('As apostilas são para o seu uso pessoal. Cada download fica registrado na sua conta.')}
${notaEmail(esc(ARREPENDIMENTO))}`,
    { appUrl: d.appUrl, capi: 'estudando', previa: 'Pagamento confirmado. Suas 4 apostilas já podem ser baixadas.' },
  );
  const texto = `Olá, ${nome}! Seu pagamento via Pix foi confirmado e as 4 apostilas Fuse Aprova estão liberadas.
Recibo: Apostilas Fuse Aprova (4 volumes em PDF) · ${valor} · ${data} · cobrança ${d.cobrancaId}.
Baixe em: ${link}`;
  return { para: d.email, assunto: 'Pagamento confirmado: suas apostilas Fuse Aprova', html, texto };
}

export function emailRecuperacao(d: { nome: string; email: string; link: string; appUrl: string }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layoutEmail(
    'Crie uma nova senha',
    `${pEmail(`Olá, ${esc(nome)}! Recebemos um pedido para criar uma nova senha na sua conta do Fuse Aprova. É só tocar no botão abaixo.`)}
${botao(d.link, 'CRIAR NOVA SENHA')}
${avisoEmail('<b>O link vale por 1 hora.</b> Ao trocar a senha, as outras sessões abertas são encerradas.')}
${notaEmail('Se não foi você, ignore este e-mail: sua senha continua a mesma.')}`,
    { appUrl: d.appUrl, capi: 'explicando', previa: 'Toque no botão para criar uma nova senha. O link vale por 1 hora.' },
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
  appUrl: string;
  /** D34: o estorno das apostilas encerra o download, não o acesso ao app. */
  produto?: 'concurso' | 'apostilas';
}): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const valor = formatarReais(d.valorCentavos);
  const encerrado = d.produto === 'apostilas' ? 'o download das apostilas foi encerrado' : 'o acesso ao Fuse Aprova foi encerrado';
  const html = layoutEmail(
    'Reembolso confirmado',
    `${pEmail(`Olá, ${esc(nome)}. O reembolso de <b>${esc(valor)}</b> foi confirmado e o valor volta pelo Pix para a conta de origem.`)}
${reciboEmail([
  ['Valor devolvido', esc(valor)],
  ['Cobrança', esc(d.cobrancaId)],
])}
${notaEmail(`Com o estorno, ${encerrado}. Obrigado por ter experimentado!`)}`,
    { appUrl: d.appUrl, capi: 'incentivando', previa: `O reembolso de ${valor} foi confirmado.` },
  );
  const texto = `Olá, ${nome}. O reembolso de ${valor} (cobrança ${d.cobrancaId}) foi confirmado. Com o estorno, ${encerrado}.`;
  return { para: d.email, assunto: 'Fuse Aprova: reembolso confirmado', html, texto };
}

/** S-16: aviso de segurança para o dono da conta (ex.: muitos códigos errados). */
export function emailAlertaSeguranca(d: { nome: string; email: string; titulo: string; texto: string; appUrl: string }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layoutEmail(d.titulo, `${pEmail(`Olá, ${esc(nome)}.`)}\n${avisoEmail(esc(d.texto))}`, {
    appUrl: d.appUrl,
    capi: 'explicando',
    previa: d.texto.slice(0, 120),
    assinatura: false,
  });
  return { para: d.email, assunto: `Fuse Aprova: ${d.titulo.toLowerCase()}`, html, texto: `Olá, ${nome}. ${d.texto}` };
}

/**
 * S-11: o e-mail de uma conta da equipe foi trocado pelo superadmin. Vai para o endereço ANTIGO,
 * para o dono perceber uma troca que não pediu.
 */
export function emailAvisoTrocaEmail(d: { nome: string; emailAntigo: string; emailNovo: string; quando: Date; appUrl: string }): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const data = `${formatarDataBR(diaSP(d.quando))} às ${horaMinutoSP(d.quando)}`;
  const novo = d.emailNovo.replace(/^(.).*(@.*)$/, '$1***$2');
  const texto = `O e-mail de acesso da sua conta no painel do Fuse Aprova foi trocado por um superadmin em ${data} (Brasília), para ${novo}. A partir de agora os links de senha vão para o endereço novo. Se você não pediu essa troca, avise o responsável pelo Fuse Aprova imediatamente.`;
  const html = layoutEmail('O e-mail da sua conta foi trocado', `${pEmail(`Olá, ${esc(nome)}.`)}\n${avisoEmail(esc(texto))}`, {
    appUrl: d.appUrl,
    capi: 'explicando',
    previa: `O e-mail de acesso da sua conta foi trocado para ${novo}.`,
    assinatura: false,
  });
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
  appUrl: string;
}): MensagemEmail {
  const nome = primeiroNome(d.nome);
  const html = layoutEmail(
    'Você foi convidado(a) para a equipe do Fuse Aprova',
    `${pEmail(`Olá, ${esc(nome)}! Você recebeu acesso como <b>${esc(d.papel)}</b> no painel do Fuse Aprova.`)}
${botao(d.link, 'DEFINIR MINHA SENHA')}
${avisoEmail(`<b>O link vale por ${d.validadeHoras} horas.</b> Depois de definir a senha, entre em <a href="${esc(d.entrar)}" style="color:${CORES_EMAIL.turquesaAcao};font-weight:800">${esc(d.entrar)}</a>.`)}
${notaEmail('Se você não esperava este convite, ignore este e-mail.')}`,
    { appUrl: d.appUrl, capi: 'boas-vindas', previa: `Você recebeu acesso como ${d.papel} no painel do Fuse Aprova.`, assinatura: false },
  );
  const texto = `Olá, ${nome}. Você recebeu acesso como ${d.papel} no painel do Fuse Aprova. Defina sua senha (o link vale por ${d.validadeHoras} horas): ${d.link}

Depois, entre em ${d.entrar}`;
  return { para: d.email, assunto: 'Fuse Aprova: convite para a equipe', html, texto };
}
