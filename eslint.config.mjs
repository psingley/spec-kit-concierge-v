import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeBuiltins = [
  'child_process',
  'electron',
  'fs',
  'node:child_process',
  'node:fs',
  'node:path',
  'node:process',
  'path',
  'process'
];

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'out/',
      '.vite/',
      'coverage/',
      'specs/',
      'docs/',
      '.specify/',
      '.agents/',
      '.github/',
      'playwright-report/',
      'test-results/'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-undef': 'off',
      'no-var': 'error',
      'prefer-const': 'error'
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}', 'src/renderer/index.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: nodeBuiltins,
          patterns: ['src/main/*', 'src/main/**/*']
        }
      ]
    }
  },
  {
    files: ['src/main/**/*.{ts,tsx}', 'src/main/index.ts', 'src/preload/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', 'react-redux'],
          patterns: ['src/renderer*', 'src/renderer/*', 'src/renderer/**/*']
        }
      ]
    }
  }
);
