/**
 * @dutyhive/auth — RLS bridge for tenant-scoped server actions.
 *
 *   withAuthContext(req, fn)
 *
 * Opens a Prisma transaction, sets the auth context (`app.current_user_id`,
 * `app.current_organization_id`), and runs `fn(ctx, tx)`. RLS policies on
 * `audit_entry` and `legal_consent` see the right context; queries that
 * forget the context get zero rows back.
 *
 * Failure modes:
 *   • No session  → throws `UnauthorizedError`. The route should respond 401.
 *   • No active organization → `ctx.organizationId` is `null`. RLS policies
 *     gracefully treat NULL as "global" — appropriate for org-switcher and
 *     personal flows.
 *
 * This wrapper is the *only* blessed path to tenant-scoped Prisma queries.
 * Direct `prisma.*` use is reserved for un-scoped contexts (Better Auth's
 * own queries, public newsletter inserts, boot-time audits).
 */
import { prisma, withTenant, type TenantContext } from '@dutyhive/db';
import type { Prisma } from '@dutyhive/db';
import { auth } from './server';

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export type AuthContext = TenantContext & {
  sessionToken: string;
};

export async function withAuthContext<T>(
  req: Request,
  fn: (ctx: AuthContext, tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    throw new UnauthorizedError();
  }

  const ctx: AuthContext = {
    userId: session.user.id,
    organizationId: session.session.activeOrganizationId ?? null,
    sessionToken: session.session.token,
  };

  return prisma.$transaction(async (tx) => {
    return withTenant(tx, ctx, () => fn(ctx, tx));
  });
}
