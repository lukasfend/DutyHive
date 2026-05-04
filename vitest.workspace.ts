/**
 * Vitest workspace — points at per-package vitest configs.
 *
 * Each package owns its own config so node-vs-jsdom environments and the
 * RLS test setup don't bleed across the monorepo.
 */
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './packages/db/vitest.config.ts',
  './packages/audit/vitest.config.ts',
  './packages/env/vitest.config.ts',
]);
