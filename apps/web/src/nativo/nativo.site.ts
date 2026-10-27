/**
 * No build do site (PWA), `vite.config.ts` troca `nativo/nativo` por este arquivo: o código do
 * Capacitor não entra no bundle nem no precache do service worker. Nada aqui é chamado, porque
 * todo uso fica atrás de `EH_APP` (falso no site).
 */
function soNoApp(): never {
  throw new Error('Recurso disponível só no app nativo.');
}

export const iniciarApp = soNoApp;
export const pedirPermissaoLembrete = soNoApp;
export const cancelarLembretes = soNoApp;
export const agendarLembretes = soNoApp;
export const aoTocarLembrete = soNoApp;
export const compartilharArquivo = soNoApp;
export const carregarImagem = soNoApp;
