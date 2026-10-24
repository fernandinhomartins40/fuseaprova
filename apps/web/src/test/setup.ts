/**
 * Setup dos testes da PWA (Vitest + jsdom): matchers do jest-dom, IndexedDB em memória,
 * limpeza do DOM entre testes e stubs de APIs que o jsdom não tem.
 */
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Os testes de tela rodam em paralelo com os do admin; 1 s padrão é curto sob carga.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

window.scrollTo = (() => undefined) as typeof window.scrollTo;

// Canvas não existe no jsdom (confete): getContext devolve null sem logar erro.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
