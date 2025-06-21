import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        NodeJS: true
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'svelte/require-each-key': 'off',
      'svelte/no-useless-mustaches': 'off',
      'svelte/no-reactive-reassign': 'off'
    }
  },
  {
    files: ['**/*.config.js', '**/tailwind.config.js', '**/postcss.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^\\$\\$(Props|Events|Slots)$' }
      ],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-console': 'off'
    }
  },
  {
    ignores: ['.svelte-kit/**', 'build/**', 'dist/**', 'packages/db/drizzle/**']
  }
);
