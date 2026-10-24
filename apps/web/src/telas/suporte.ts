/**
 * Contato do suporte (PRD 5.16): WhatsApp ou e-mail do dono. Não há rota na API para isso,
 * então vem das variáveis de build VITE_SUPORTE_WHATSAPP / VITE_SUPORTE_EMAIL.
 */
const whatsapp =
  (import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined)?.replace(/\D/g, '') || '';
const email =
  (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) || 'suporte@fuseaprova.com.br';

export const CONTATO_SUPORTE = {
  url: whatsapp ? `https://wa.me/${whatsapp}` : `mailto:${email}`,
  texto: whatsapp
    ? `WhatsApp (${whatsapp.slice(2, 4)}) ${whatsapp.slice(4, 9)}-${whatsapp.slice(9)}`
    : email,
};
