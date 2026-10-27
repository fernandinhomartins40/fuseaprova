/**
 * Alvo do build. `vite build --mode app` gera o painel do aluno para o app nativo
 * (apps/mobile, Capacitor); o resto é o site/PWA. Constante em tempo de build: o código do
 * app some do bundle do site e vice-versa.
 */
export const EH_APP: boolean = __APP_NATIVO__;

/** Origem da API: vazia no site (mesmo domínio); absoluta no app (os arquivos estão no aparelho). */
export const ORIGEM_API: string = EH_APP
  ? (
      (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://www.fuseaprova.com.br'
    ).replace(/\/$/, '')
  : '';

/** URL de um caminho da API ou de arquivo do servidor (`/api/...`). */
export function urlDoServidor(caminho: string): string {
  return caminho.startsWith('/') ? `${ORIGEM_API}${caminho}` : caminho;
}
