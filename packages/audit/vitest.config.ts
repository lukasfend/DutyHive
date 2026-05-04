import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@dutyhive/audit',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
