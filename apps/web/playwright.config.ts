import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — runs against the local dev server at 127.0.0.1:3000.
 *
 * We don't auto-start the dev server here because the suite assumes:
 *   • docker-compose is up (Postgres + Mailpit on default ports)
 *   • `apps/web/.env.local` is filled in (Phase 2 setup)
 *
 * Start dev once with `pnpm --filter @dutyhive/web dev` then run
 * `pnpm test:e2e` in another shell. Phase 5+ wires `webServer` here once
 * the dev-server boot stops requiring the docker stack to be live first.
 *
 * lvh.me as the host: every subdomain resolves to 127.0.0.1, so the proxy
 * sees a real `Host` header (`app.lvh.me`, `planner.lvh.me`, etc.) and
 * routing tests behave exactly like production.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://lvh.me:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
