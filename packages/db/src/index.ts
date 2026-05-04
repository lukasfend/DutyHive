/**
 * @dutyhive/db — Foundation Phase 2 will populate this with:
 *   - Prisma Client export (after `prisma init` and Better Auth schema generation).
 *   - `withTenant(tx, { userId, organizationId })` — sets transaction-local RLS vars.
 *   - A guarded `prisma` proxy that throws if used outside `withAuthContext`.
 *
 * RLS pattern (Phase 2):
 *   inside a transaction we run:
 *     SELECT set_config('app.current_user_id', $1, true);
 *     SELECT set_config('app.current_organization_id', $2, true);
 *   then perform queries as role `dutyhive_app` (no BYPASSRLS).
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 2 wires Prisma Client + RLS transaction wrapper.';
