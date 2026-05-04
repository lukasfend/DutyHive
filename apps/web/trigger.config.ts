import { defineConfig } from '@trigger.dev/sdk';

/**
 * Trigger.dev v3 project config.
 *
 * Lives inside `apps/web/` because the Trigger CLI walks up from `cwd`
 * to find this file and the SDK uses it to resolve task paths. The
 * actual task definitions live in `packages/jobs/src/tasks/` so a
 * future dedicated worker app can reuse them without re-importing the
 * Next bundle.
 *
 * Project ref:
 *   - In dev: omit, the SDK runs against the local CLI (`pnpm dlx
 *     trigger.dev@latest dev`).
 *   - In prod: set TRIGGER_PROJECT_REF in Coolify env (Phase 6 setup).
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_dutyhive_local',

  /* Where to look for tasks. Relative to apps/web/. */
  dirs: ['../../packages/jobs/src/tasks'],

  /* Default machine size — Foundation runs are tiny. */
  machine: 'small-1x',

  /* Retry small/medium errors a few times before giving up. */
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 30_000 },
  },

  /* Maximum task duration. Cleanup is fast; welcome mail rarely > 5s. */
  maxDuration: 60,
});
