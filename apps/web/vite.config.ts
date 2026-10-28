import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { condicoesCliente, condicoesServidor } from '../../vitest.shared';

/**
 * PWA do aluno (e /admin). Modos:
 * - `vite` (dev): proxy de /api para a API real (API_URL, padrão http://localhost:3000).
 * - `vite --mode mock` (dev:mock): a API é simulada em memória por `mock/servidor.ts`,
 *   montado como middleware do Vite. Nunca entra no build.
 * - `vite build --mode app` (build:app): o painel do aluno para o app nativo (apps/mobile,
 *   Capacitor) em `dist-app/`: sem service worker (o app já tem os arquivos no aparelho) e
 *   com a API em VITE_API_URL (padrão https://www.fuseaprova.com.br).
 */

/**
 * S-27: o código do painel da equipe (src/admin, src/super e src/painel) não entra no precache
 * da PWA do aluno. Os chunks são lazy; aqui anotamos, no fim do build, os arquivos JS que só têm
 * módulos do painel e o CSS deles, e o `manifestTransforms` do Workbox tira esses arquivos da
 * lista. No /super eles vêm da rede, como qualquer página do painel.
 */
const MODULO_PAINEL = /[\\/]src[\\/](admin|super|painel)[\\/]/;

function arquivosDoPainel(): { plugin: Plugin; arquivos: Set<string> } {
  const arquivos = new Set<string>();
  return {
    arquivos,
    plugin: {
      name: 'fuse-arquivos-do-painel',
      apply: 'build',
      generateBundle(_opcoes, bundle) {
        arquivos.clear();
        for (const saida of Object.values(bundle)) {
          if (saida.type !== 'chunk' || saida.isEntry) continue;
          const ids = saida.moduleIds.filter((id) => !id.startsWith('\0'));
          if (!ids.length || !ids.every((id) => MODULO_PAINEL.test(id))) continue;
          arquivos.add(saida.fileName);
          const meta = (saida as { viteMetadata?: { importedCss?: Set<string> } }).viteMetadata;
          for (const css of meta?.importedCss ?? []) arquivos.add(css);
        }
      },
    },
  };
}

/** Monta a API simulada (mock/servidor.ts) como middleware em /api. */
function apiSimulada(): Plugin {
  return {
    name: 'fuse-api-simulada',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = (await server.ssrLoadModule('/mock/servidor.ts')) as {
            tratar: (req: unknown, res: unknown) => Promise<void>;
          };
          await mod.tratar(req, res);
        } catch (e) {
          server.config.logger.error(String((e as Error).stack ?? e));
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ erro: 'Falha na API simulada.', codigo: 'interno' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const mock = mode === 'mock';
  const app = mode === 'app';
  const painel = arquivosDoPainel();
  return {
    // Literal no bundle: o Rollup descarta o código do outro alvo (app nativo × site).
    define: { __APP_NATIVO__: JSON.stringify(app) },
    resolve: {
      conditions: condicoesCliente,
      // No site, os recursos nativos viram um stub (sem Capacitor no bundle nem no precache).
      alias: app
        ? []
        : [
            {
              find: /^(.*)\/nativo\/nativo$/,
              replacement: fileURLToPath(new URL('./src/nativo/nativo.site.ts', import.meta.url)),
            },
          ],
    },
    ssr: { resolve: { conditions: condicoesServidor, externalConditions: ['@fuse/source'] } },
    plugins: [
      react(),
      mock ? apiSimulada() : null,
      app ? null : painel.plugin,
      app
        ? null
        : VitePWA({
            // Registro por arquivo externo (registerSW.js): nada de script inline (CSP 'self').
            injectRegister: 'script',
            registerType: 'autoUpdate',
            includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon-180.png'],
            manifest: {
              name: 'Fuse Aprova',
              short_name: 'Fuse Aprova',
              description: 'Treine para o concurso da Prefeitura de Palmital com as provas da FAU.',
              lang: 'pt-BR',
              start_url: '/aprender',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              // Paleta D1: petróleo na barra do sistema, marfim no splash.
              theme_color: '#00545D',
              background_color: '#FAF8F2',
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                {
                  src: '/icons/maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              // Precache do shell: JS, CSS, HTML, fontes e imagens geradas (WebP pequenos).
              globPatterns: ['**/*.{js,css,html,woff2,webp,png,svg}'],
              // A landing (public/lp, servida pelo nginx em "/") fica fora do app offline.
              globIgnores: ['lp/**'],
              // S-27: sem o código do painel da equipe (ver arquivosDoPainel).
              manifestTransforms: [
                (entradas) => ({
                  manifest: entradas.filter((e) => !painel.arquivos.has(e.url.replace(/^\//, ''))),
                  warnings: [],
                }),
              ],
              navigateFallback: '/index.html',
              // "/" é a landing: o SW não troca por index.html nem pelo índice do precache.
              navigateFallbackDenylist: [/^\/api\//, /^\/$/, /^\/lp\//],
              directoryIndex: null,
              cleanupOutdatedCaches: true,
              // Mostra os lembretes e as comunicações enviados pelo worker (auditoria PIE R2-01).
              importScripts: ['/sw-push.js'],
              runtimeCaching: [
                {
                  // Conteúdo que muda pouco: stale-while-revalidate. Invalidado pela versao_conteudo.
                  urlPattern: ({ url, request }) =>
                    request.method === 'GET' &&
                    /^\/api\/(concurso|guia\/[^/]+)$/.test(url.pathname),
                  handler: 'StaleWhileRevalidate',
                  options: {
                    cacheName: 'fuse-conteudo',
                    cacheableResponse: { statuses: [200] },
                    expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 },
                  },
                },
                {
                  // Estado do aluno: rede primeiro (o servidor é a fonte da verdade); cache só offline.
                  urlPattern: ({ url, request }) =>
                    request.method === 'GET' &&
                    /^\/api\/(me|trilha|revisao|liga|perfil\/estatisticas|simulados)$/.test(
                      url.pathname,
                    ),
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'fuse-estado',
                    networkTimeoutSeconds: 6,
                    cacheableResponse: { statuses: [200] },
                    expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 },
                  },
                },
              ],
            },
            devOptions: { enabled: false },
          }),
    ],
    server: {
      port: 5173,
      proxy: mock
        ? undefined
        : {
            '/api': {
              target: process.env.API_URL ?? 'http://localhost:3000',
              changeOrigin: true,
            },
          },
    },
    build: {
      outDir: app ? 'dist-app' : 'dist',
      target: 'es2020',
      sourcemap: false,
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
