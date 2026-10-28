// ESLint da PWA: base do monorepo + regras de hooks do React e globais de navegador.
import base from '../../eslint.config.js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...base,
  { ignores: ['dev-dist/**', 'dist/**', 'capturas/**', 'src/assets/gerados/**'] },
  {
    // Landing de venda (servida pelo nginx em "/"): script clássico de navegador, sem bundler.
    files: ['public/lp/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
