// ESLint da PWA: base do monorepo + regras de hooks do React e globais de navegador.
import base from '../../eslint.config.js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...base,
  { ignores: ['dev-dist/**', 'dist/**', 'capturas/**', 'src/assets/gerados/**'] },
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
