// ESLint (flat config) compartilhado por todo o monorepo.
// Os pacotes rodam `eslint .` e o ESLint encontra este arquivo subindo os diretórios.
// apps/web pode criar o próprio eslint.config.js importando este e somando as regras de React.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/dev-dist/**',
      '**/dist-app/**',
      // Projetos nativos do app (Capacitor): têm o build web copiado e código gerado.
      'apps/mobile/android/**',
      'apps/mobile/ios/**',
      'packages/db/drizzle/**',
      'design/**',
      'dados/**',
      'Fuse_Aprova_Assets_4K/**',
      'Guias_visuais/**',
      'Telas_referencia/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**', '**/scripts/**', '**/cli*.ts'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
