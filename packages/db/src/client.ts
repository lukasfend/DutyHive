/**
 * @dutyhive/db — singleton PrismaClient.
 *
 * One client per Node process. In dev, Next.js hot-reloads server code and
 * would otherwise leak a new PrismaClient on every reload — we cache on
 * `globalThis` to keep the connection pool stable.
 *
 * The connection runs as `dutyhive_app` (BYPASSRLS=false). Tenant-scoped
 * queries MUST happen inside `withTenant()` (see ./with-tenant.ts) so the
 * RLS context (`app.current_user_id`, `app.current_organization_id`) is set.
 *
 * @dutyhive/auth's `withAuthContext()` is the canonical caller — application
 * code should reach Prisma through that wrapper, not by importing `prisma`
 * directly. Direct imports are allowed only for un-scoped contexts: Better
 * Auth's own queries, public newsletter inserts, audit-log boot events.
 */
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __dutyhivePrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__dutyhivePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__dutyhivePrisma = prisma;
}
