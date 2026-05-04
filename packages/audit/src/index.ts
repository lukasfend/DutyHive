/**
 * @dutyhive/audit — append-only audit log.
 *
 *   await auditLog({
 *     action: 'auth.login',
 *     actorUserId: user.id,
 *     organizationId: ctx.organizationId,
 *     payload: { method: 'email-password' },
 *     request: { ip: '1.2.3.4', userAgent: 'Mozilla/...' },
 *   });
 *
 * Hard rules:
 *   • Audit entries are written via explicit calls only — never via Prisma
 *     middleware or hooks. This keeps writes obvious and predictable, and
 *     it side-steps the GUC-set transaction wrapper that would otherwise
 *     fire RLS WITH-CHECK violations on un-scoped writes.
 *   • IP and User-Agent are stored as `sha256(AUDIT_HASH_SALT || value)`.
 *     Raw PII never lands in the audit table. Salt rotates yearly; old
 *     entries remain valid (forensics still work, you just can't link a
 *     post-rotation IP to a pre-rotation hash).
 *   • The application role has only INSERT on `audit_entry` (R-0004). UPDATE
 *     and DELETE are revoked. Forensic operators query via `dutyhive_migrate`
 *     or by direct DB access.
 *
 * Action naming convention: `<domain>.<resource>.<verb>`, lowercase, dot-
 * separated. Documented in docs/architecture/audit-log.md.
 */
import { createHash } from 'node:crypto';
import { prisma, Prisma } from '@dutyhive/db';
import { env } from '@dutyhive/env/server';

export type AuditPayload = Record<string, unknown>;

export type AuditLogInput = {
  /** When provided, the audit row is written inside this transaction so it commits or rolls back atomically with surrounding work. */
  tx?: Prisma.TransactionClient;
  /** `<domain>.<resource>.<verb>` — see audit-log.md for the taxonomy. */
  action: string;
  actorUserId?: string | null;
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  payload?: AuditPayload | null;
  request?: { ip?: string | null; userAgent?: string | null } | null;
};

function hashOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash('sha256')
    .update(env.AUDIT_HASH_SALT + value)
    .digest('hex');
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  const data: Prisma.AuditEntryCreateInput = {
    action: input.action,
    actor: input.actorUserId ? { connect: { id: input.actorUserId } } : undefined,
    organization: input.organizationId ? { connect: { id: input.organizationId } } : undefined,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    payload: input.payload ? (input.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
    ipHash: hashOrNull(input.request?.ip),
    userAgentHash: hashOrNull(input.request?.userAgent),
  };

  // When called inside an existing transaction (e.g. from withAuthContext),
  // assume the GUCs are already set and just write the row.
  if (input.tx) {
    await input.tx.auditEntry.create({ data });
    return;
  }

  // Standalone call: open a private transaction and set the GUCs needed for
  // the SELECT policy on audit_entry to pass the RETURNING clause.
  // - For tenant rows: set app.current_organization_id.
  // - For global rows with an actor (e.g. auth.signup): set app.current_user_id.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${input.actorUserId ?? ''}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${input.organizationId ?? ''}, true)`;
    await tx.auditEntry.create({ data });
  });
}

/** Helper for tests and tools that want the raw hash without writing a row. */
export function hashForAudit(value: string): string {
  return createHash('sha256')
    .update(env.AUDIT_HASH_SALT + value)
    .digest('hex');
}
