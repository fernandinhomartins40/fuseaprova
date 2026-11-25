// Os componentes do app web (apps/web/src/ui) esperam a constante de build do Vite.
(globalThis as unknown as { __APP_NATIVO__: boolean }).__APP_NATIVO__ = false;
