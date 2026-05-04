import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@dutyhive/db',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // RLS integration tests share a single dutyhive_test database — running
    // them sequentially keeps state predictable. We can revisit
    // schema-per-worker once the test count justifies the complexity.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
  },
});
