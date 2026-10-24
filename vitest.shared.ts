// Condições de resolução usadas pelo Vite/Vitest para que os pacotes do monorepo
// importem o código-fonte TypeScript de @fuse/* (condição "@fuse/source") sem build.
// Repetimos os padrões do Vite 6+, porque definir `conditions` substitui os padrões.
export const condicoesCliente = ['@fuse/source', 'module', 'browser', 'development|production'];
export const condicoesServidor = ['@fuse/source', 'module', 'node', 'development|production'];

export const resolveFuseNode = {
  resolve: { conditions: condicoesServidor },
  ssr: { resolve: { conditions: condicoesServidor, externalConditions: ['@fuse/source'] } },
};
