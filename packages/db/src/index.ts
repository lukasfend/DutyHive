/**
 * @dutyhive/db — public surface.
 *
 * Two named exports:
 *
 *   prisma     — singleton PrismaClient. Direct use only for un-scoped contexts
 *                (Better Auth, public newsletter, boot-time audits). Tenant code
 *                must go through @dutyhive/auth's `withAuthContext()`.
 *
 *   withTenant — RLS bridge. Sets transaction-local app.current_user_id and
 *                app.current_organization_id GUCs. See ./with-tenant.ts.
 *
 * Re-exports Prisma's namespace so callers don't need to import @prisma/client
 * separately for Prisma.TransactionClient or generated model types.
 */
export { prisma } from './client';
export { withTenant, type TenantContext } from './with-tenant';
export { Prisma } from '@prisma/client';
export type {
  PrismaClient,
  User,
  Session,
  Account,
  Verification,
  Organization,
  Member,
  Invitation,
  TwoFactor,
  AuditEntry,
  EmailSubscriber,
  LegalConsent,
} from '@prisma/client';
