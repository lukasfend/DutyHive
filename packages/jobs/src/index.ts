/**
 * @dutyhive/jobs — Trigger.dev v3 task definitions.
 *
 * Every task is a named export so the Trigger.dev CLI can discover them
 * via the `dirs: ['packages/jobs/src/tasks']` entry in `apps/web/trigger.config.ts`.
 *
 * Tasks run inside Trigger.dev's runtime (cloud or self-hosted), not
 * inside the Next.js process. They're triggered from app code through the
 * SDK's `tasks.trigger('id', payload)` call.
 *
 * Foundation Phase 5 ships two demo tasks:
 *   • cleanup-stale-sessions — daily cron, deletes expired Better Auth
 *     session rows.
 *   • send-welcome-email     — event task, fires after user verification.
 *     Wiring from auth lands in Phase 5+; the task body is ready.
 */
export { cleanupStaleSessions } from './tasks/cleanup-stale-sessions';
export { sendWelcomeEmail, type SendWelcomeEmailPayload } from './tasks/send-welcome-email';
