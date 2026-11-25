// Tipos que o Vite dá ao apps/web e que o Remotion não tem (os componentes do app entram nos vídeos de venda).
declare module '*.webp' { const url: string; export default url; }
declare module '*.module.css' { const classes: Record<string, string>; export default classes; }
declare const __APP_NATIVO__: boolean;
interface ImportMeta { readonly env: Record<string, string | undefined> }
