/**
 * @dutyhive/jobs — Foundation Phase 5:
 *   - tasks/cleanup-stale-sessions.ts (cron "0 3 * * *" — deletes Better Auth sessions > 90d)
 *   - tasks/send-welcome-email.ts     (event-triggered from "user.created")
 *
 * Trigger.dev v3 project lives in apps/web/trigger.config.ts (Trigger expects it inside
 * the Next app for type-sharing). Tasks live here so a future worker app can reuse them.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 5 wires Trigger.dev v3 tasks.';
