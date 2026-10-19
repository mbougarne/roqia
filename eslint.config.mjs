import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import hooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react-x';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/.gradle/**',
      '**/.cxx/**',
      '**/Pods/**',
      '**/.venv*/**',
      '.roqia-feasibility/**',
      'web/dist/**',
      'docs/**',
      'design/**',
      'bundled-content/**',
      // Canonical content is validated by its existing provenance/hash tests.
      'src/data/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
    languageOptions: {
      globals: {...globals.es2024, ...globals.node},
      parserOptions: {ecmaFeatures: {jsx: true}},
    },
    plugins: {'import-x': importX, '@stylistic': stylistic, react},
    rules: {
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            ['internal', 'parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          alphabetize: {order: 'asc', caseInsensitive: true},
        },
      ],
      'import-x/newline-after-import': 'error',
      'react/no-missing-key': 'error',
      'react/no-duplicate-key': 'error',
      'no-empty': ['error', {allowEmptyCatch: true}],
      '@stylistic/padding-line-between-statements': [
        'error',
        {blankLine: 'always', prev: '*', next: ['function', 'export']},
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [ts.configs.recommended],
    rules: {
      // Existing native/navigation boundaries are not yet fully typed.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|React$)',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: [
      'src/**/*.{ts,tsx}',
      'web/src/**/*.{js,jsx}',
      '__tests__/**/*.{ts,tsx}',
    ],
    plugins: {'react-hooks': hooks},
    rules: {'react-hooks/rules-of-hooks': 'error'},
  },
  {
    files: ['index.js', 'src/**/*.{ts,tsx}', '__tests__/**/*.{ts,tsx}'],
    languageOptions: {globals: {...globals.browser, __DEV__: 'readonly'}},
  },
  {
    files: ['web/**/*.{js,jsx}'],
    languageOptions: {globals: globals.browser},
  },
  {
    files: ['__tests__/**/*.{ts,tsx,js}'],
    languageOptions: {globals: globals.jest},
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    // React is used implicitly by the mobile app's classic JSX transform.
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|React$)',
          caughtErrors: 'none',
        },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    // Test adapters load modules after installing runtime stubs. Do not reorder require().
    rules: {'import-x/order': 'off'},
  },
  prettier,
);
