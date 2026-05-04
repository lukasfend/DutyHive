/**
 * @dutyhive/db — RLS context helper.
 *
 * `withTenant(tx, ctx, fn)` runs `fn` inside an existing Prisma transaction
 * after setting two transaction-local Postgres GUCs:
 *
 *   app.current_user_id           → matches `current_setting(...)` in legal_consent's RLS
 *   app.current_organization_id   → matches `current_setting(...)` in audit_entry's RLS
 *
 * `set_config(..., true)` makes the setting transaction-local — it is
 * automatically reset on commit/rollback, so a leaked context cannot bleed
 * into the next request even if a connection is re-used from the pool.
 *
 * Boundaries:
 *   • For tenant-scoped reads/writes use this through `@dutyhive/auth`'s
 *     `withAuthContext(req, fn)` rather than calling it directly — the auth
 *     layer is the source of truth for `userId` and `organizationId`.
 *   • `organizationId === null` is intentional for global events (e.g. a
 *     pre-org `auth.signup` audit row). The audit_entry RLS policy permits
 *     `NULL` org inserts; SELECT scopes by exact match so global rows are
 *     invisible to the app role.
 */
import type { Prisma } from '@prisma/client';

export type TenantContext = {
  userId: string;
  organizationId?: string | null;
};

export async function withTenant<T>(
  tx: Prisma.TransactionClient,
  ctx: TenantContext,
  fn: () => Promise<T>,
): Promise<T> {
  // Use parameterized $executeRaw to defeat any chance of GUC injection via
  // a maliciously-crafted user id.
  await tx.$executeRaw`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`;
  await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ctx.organizationId ?? ''}, true)`;
  return fn();
}
