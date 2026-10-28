/**
 * Layout dos e-mails (PRD 8.6), compartilhado entre a API (transacionais) e o worker
 * (comunicação do superadmin, D13). HTML de tabela, sem imagem externa nem CDN.
 */
import { EMPRESA, primeiroNome, RODAPE_LEGAL } from './copy.js';

// Paleta D1: petróleo, turquesa, laranja, marfim, texto.
export const CORES_EMAIL = {
  petroleo: '#00545D',
  turquesa: '#008A92',
  laranja: '#FF6A16',
  marfim: '#FAF8F2',
  texto: '#123F42',
} as const;

export function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function layoutEmail(titulo: string, corpoHtml: string, rodapeExtra = ''): string {
  const COR = CORES_EMAIL;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escHtml(titulo)}</title></head>
<body style="margin:0;background:${COR.marfim};font-family:Arial,Helvetica,sans-serif;color:${COR.texto}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.marfim};padding:24px 0">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${COR.petroleo};padding:20px 28px;font-size:26px;font-weight:bold">
<span style="color:${COR.laranja}">fuse</span><span style="color:#ffffff">aprova</span></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.5">
<h1 style="margin:0 0 16px;font-size:22px;color:${COR.petroleo}">${escHtml(titulo)}</h1>
${corpoHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:${COR.marfim};font-size:12px;color:#5b6b6c">${rodapeExtra}${escHtml(RODAPE_LEGAL)}<br>${escHtml(`${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj}`)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function botaoEmail(url: string, texto: string): string {
  return `<p style="margin:24px 0"><a href="${escHtml(url)}" style="background:${CORES_EMAIL.laranja};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">${escHtml(texto)}</a></p>`;
}

/** Texto simples → parágrafos HTML (escapado). */
export function paragrafosHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((p) => `<p>${escHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * S-09: alerta da operação para os superadmins (job falho ou atrasado, backup velho, rajada de
 * 5xx, disco cheio), enviado pelo job `alertas` do worker com o SMTP do .env.
 */
export function emailAlertaOperacao(d: {
  nome: string;
  problemas: readonly string[];
  painel: string;
}): { assunto: string; html: string; texto: string } {
  const ola = `Olá, ${primeiroNome(d.nome)}.`;
  const qtd = d.problemas.length === 1 ? 'um problema' : `${d.problemas.length} problemas`;
  const lista = d.problemas.map((p) => `<li>${escHtml(p)}</li>`).join('\n');
  const html = layoutEmail(
    'Alerta do Fuse Aprova',
    `<p>${escHtml(ola)} O monitoramento encontrou ${qtd}:</p>\n<ul>${lista}</ul>\n${botaoEmail(d.painel, 'ABRIR O PAINEL SISTEMA')}\n<p style="font-size:14px;color:#5b6b6c">O mesmo alerta não se repete antes de 6 horas.</p>`,
  );
  const texto = `${ola} O monitoramento do Fuse Aprova encontrou ${qtd}:\n${d.problemas.map((p) => `- ${p}`).join('\n')}\n\nPainel: ${d.painel}`;
  return { assunto: `Fuse Aprova: alerta da operação (${d.problemas.length})`, html, texto };
}

/**
 * E-mail de comunicação (marketing, só para quem deu opt-in). Leva no rodapé como deixar
 * de receber (Configurações → Novidades por e-mail e push).
 */
export function emailComunicacao(d: {
  nome: string;
  assunto: string;
  mensagem: string;
  link?: string | null | undefined;
  appUrl: string;
}): { assunto: string; html: string; texto: string } {
  const ola = `Olá, ${primeiroNome(d.nome)}!`;
  const url = d.link ? `${d.appUrl}${d.link}` : `${d.appUrl}/aprender`;
  const sair = `Você recebe este e-mail porque ativou as novidades do Fuse Aprova. Para não receber mais, desligue em ${d.appUrl}/configuracoes. `;
  const html = layoutEmail(
    d.assunto,
    `<p>${escHtml(ola)}</p>\n${paragrafosHtml(d.mensagem)}\n${botaoEmail(url, 'ABRIR O FUSE APROVA')}`,
    `${escHtml(sair)}<br>`,
  );
  const texto = `${ola}\n\n${d.mensagem}\n\nAcesse: ${url}\n\n${sair}`;
  return { assunto: d.assunto, html, texto };
}
