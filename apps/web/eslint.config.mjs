// @ts-check
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Flat ESLint config for Next.js 16. eslint-config-next 16 ships native flat
 * configs (FlatCompat is no longer needed and was incompatible with the
 * legacy/flat plugin bridge — produced a circular structure error).
 *
 * Foundation-strict: zero warnings tolerated (`pnpm lint` runs with --max-warnings=0).
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    /* In addition to the global ignores eslint-config-next ships with. */
    ignores: ['.turbo/**', 'node_modules/**'],
  },
];

export default config;
