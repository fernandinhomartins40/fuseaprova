/**
 * Layout dos e-mails (PRD 8.6), compartilhado entre a API (transacionais) e o worker
 * (comunicação do superadmin, D13). HTML de tabela com estilos inline, na identidade do app (D1):
 * logo e Capi em PNG servidos pelo próprio domínio (`<appUrl>/email/`, apps/web/public/email),
 * botão turquesa 3D, cartão branco sobre marfim. Sem CDN nem imagem de terceiros.
 */
import { EMPRESA, primeiroNome, RODAPE_LEGAL } from './copy.js';

// Paleta D1 (apps/web/src/styles/tokens.css).
export const CORES_EMAIL = {
  petroleo: '#00545D',
  turquesa: '#008A92',
  turquesaAcao: '#007C83',
  turquesaSoft: '#E3F3F2',
  laranja: '#FF6A16',
  laranjaSoft: '#FFEDE2',
  laranjaTexto: '#B84308',
  marfim: '#FAF8F2',
  superficie: '#F3F1EA',
  texto: '#123F42',
  apagado: '#50696B',
  linha: '#E4E0D5',
} as const;

const FONTE_TITULO = `'Baloo 2','Nunito','Trebuchet MS',Arial,Helvetica,sans-serif`;
const FONTE_CORPO = `'Nunito','Segoe UI',Arial,Helvetica,sans-serif`;

/** Poses da Capi publicadas em `<appUrl>/email/capi-<pose>.png` (gerar-assets.mjs). */
export type PoseCapiEmail =
  | 'boas-vindas'
  | 'celebrando'
  | 'estudando'
  | 'explicando'
  | 'incentivando';

export interface OpcoesLayoutEmail {
  /** Origem do app (APP_URL): as imagens e as fontes vêm de `<appUrl>/email/`. */
  appUrl: string;
  capi?: PoseCapiEmail;
  /** Resumo que o leitor de e-mail mostra ao lado do assunto. */
  previa?: string;
  /** HTML (já escapado) antes do rodapé legal. */
  rodapeExtra?: string;
  /** "Bons estudos! Equipe Fuse Aprova" no fim do cartão (padrão: sim). */
  assinatura?: boolean;
}

export function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, '');
}

export function layoutEmail(titulo: string, corpoHtml: string, o: OpcoesLayoutEmail): string {
  const COR = CORES_EMAIL;
  const app = semBarraFinal(o.appUrl);
  const img = `${app}/email`;
  const previa = o.previa
    ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all">${escHtml(o.previa)}&#8202;${'&#847;&#8203; '.repeat(40)}</div>`
    : '';
  const assinatura =
    o.assinatura === false
      ? ''
      : `<p style="margin:28px 0 0;font-size:16px;line-height:1.5;color:${COR.texto}">Bons estudos!<br><b style="color:${COR.petroleo}">Equipe Fuse Aprova</b></p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escHtml(titulo)}</title>
<style>
@font-face{font-family:'Baloo 2';font-weight:800;src:url('${img}/fontes/baloo-2-latin-800-normal.woff2') format('woff2')}
@font-face{font-family:'Nunito';font-weight:600;src:url('${img}/fontes/nunito-latin-600-normal.woff2') format('woff2')}
@font-face{font-family:'Nunito';font-weight:800;src:url('${img}/fontes/nunito-latin-800-normal.woff2') format('woff2')}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
a{color:${COR.turquesaAcao}}
@media (max-width:600px){.fa-pad{padding-left:22px!important;padding-right:22px!important}.fa-titulo{font-size:24px!important}}
</style></head>
<body style="margin:0;padding:0;background:${COR.marfim};font-family:${FONTE_CORPO};color:${COR.texto}">
${previa}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.marfim}">
<tr><td align="center" style="padding:28px 12px 32px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
<tr><td align="center" style="padding:0 0 20px"><a href="${escHtml(app)}" style="text-decoration:none"><img src="${img}/logo.png" width="176" height="88" alt="Fuse Aprova" style="display:block;border:0;outline:none;width:176px;height:auto"></a></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${COR.linha};border-bottom:5px solid ${COR.linha};border-radius:24px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${COR.laranja};border-radius:24px 24px 0 0">&nbsp;</td></tr>
<tr><td align="center" style="background:${COR.turquesaSoft};padding:24px 24px 0"><img src="${img}/capi-${o.capi ?? 'boas-vindas'}.png" width="134" height="200" alt="" style="display:block;border:0;outline:none;width:134px;height:auto"></td></tr>
<tr><td class="fa-pad" style="padding:30px 36px 34px;font-family:${FONTE_CORPO};font-size:16px;line-height:1.6;color:${COR.texto}">
<h1 class="fa-titulo" style="margin:0 0 18px;font-family:${FONTE_TITULO};font-size:27px;line-height:1.2;font-weight:800;color:${COR.petroleo};text-align:center">${escHtml(titulo)}</h1>
${corpoHtml}
${assinatura}
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:24px 20px 0;font-family:${FONTE_CORPO};font-size:12px;line-height:1.6;color:${COR.apagado}">
<p style="margin:0 0 10px"><a href="${escHtml(app)}" style="color:${COR.turquesaAcao};font-weight:800;text-decoration:none">fuseaprova.com.br</a></p>
${o.rodapeExtra ?? ''}${escHtml(RODAPE_LEGAL)}<br>${escHtml(`${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj}`)}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Botão 3D do app (turquesa com a "sombra" sólida em petróleo), centralizado. */
export function botaoEmail(url: string, texto: string): string {
  const COR = CORES_EMAIL;
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto">
<tr><td align="center" bgcolor="${COR.turquesaAcao}" style="background:${COR.turquesaAcao};border-radius:14px;border-bottom:5px solid ${COR.petroleo}">
<a href="${escHtml(url)}" style="display:inline-block;padding:16px 34px;font-family:${FONTE_CORPO};font-size:16px;font-weight:800;letter-spacing:0.8px;line-height:1.2;color:#ffffff;text-decoration:none">${escHtml(texto)}</a>
</td></tr></table>`;
}

/** Recibo: cartão marfim com linhas rótulo → valor (valores já escapados pelo chamador, se HTML). */
export function reciboEmail(linhas: readonly (readonly [string, string])[]): string {
  const COR = CORES_EMAIL;
  const tr = linhas
    .map(
      ([rotulo, valor], i) =>
        `<tr><td style="padding:10px 0;${i ? `border-top:1px solid ${COR.linha};` : ''}font-size:14px;color:${COR.apagado};vertical-align:top">${escHtml(rotulo)}</td><td align="right" style="padding:10px 0 10px 12px;${i ? `border-top:1px solid ${COR.linha};` : ''}font-size:15px;font-weight:800;color:${COR.texto};text-align:right">${valor}</td></tr>`,
    )
    .join('\n');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;background:${COR.superficie};border-radius:16px">
<tr><td style="padding:18px 22px 8px;font-family:${FONTE_TITULO};font-size:13px;font-weight:800;letter-spacing:1.2px;color:${COR.laranjaTexto}">RECIBO</td></tr>
<tr><td style="padding:0 22px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONTE_CORPO}">
${tr}
</table></td></tr></table>`;
}

/** Destaque em laranja suave com a faixa da marca (avisos importantes). */
export function avisoEmail(html: string): string {
  const COR = CORES_EMAIL;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0">
<tr><td style="background:${COR.laranjaSoft};border-left:4px solid ${COR.laranja};border-radius:12px;padding:14px 18px;font-size:14px;line-height:1.55;color:${COR.texto}">${html}</td></tr></table>`;
}

/** Observação em letra menor (prazos, "se não foi você"). */
export function notaEmail(html: string): string {
  return `<p style="margin:16px 0 0;font-size:14px;line-height:1.55;color:${CORES_EMAIL.apagado}">${html}</p>`;
}

/** Parágrafo do corpo. */
export function pEmail(html: string): string {
  return `<p style="margin:0 0 14px">${html}</p>`;
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
  const lista = d.problemas.map((p) => `<li style="margin:0 0 6px">${escHtml(p)}</li>`).join('\n');
  const html = layoutEmail(
    'Alerta do Fuse Aprova',
    `${pEmail(`${escHtml(ola)} O monitoramento encontrou ${qtd}:`)}
<ul style="margin:0 0 8px;padding-left:22px">${lista}</ul>
${botaoEmail(d.painel, 'ABRIR O PAINEL SISTEMA')}
${notaEmail('O mesmo alerta não se repete antes de 6 horas.')}`,
    {
      appUrl: /^https?:\/\/[^/]+/.exec(d.painel)?.[0] ?? '',
      capi: 'explicando',
      previa: `O monitoramento encontrou ${qtd}.`,
      assinatura: false,
    },
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
    `${pEmail(escHtml(ola))}\n${paragrafosHtml(d.mensagem)}\n${botaoEmail(url, 'ABRIR O FUSE APROVA')}`,
    {
      appUrl: d.appUrl,
      capi: 'incentivando',
      previa: d.mensagem.slice(0, 120),
      rodapeExtra: `${escHtml(sair)}<br>`,
    },
  );
  const texto = `${ola}\n\n${d.mensagem}\n\nAcesse: ${url}\n\n${sair}`;
  return { assunto: d.assunto, html, texto };
}
