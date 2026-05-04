/**
 * @dutyhive/audit — Foundation Phase 2 implementation:
 *
 *   auditLog({
 *     tx?: PrismaTransaction,
 *     action: string,            // "auth.login", "org.member.invited", ...
 *     actorUserId?: string,
 *     organizationId?: string | null,
 *     resourceType?: string,
 *     resourceId?: string,
 *     payload?: Record<string, unknown>,
 *     request?: { ip?: string | null; userAgent?: string | null },
 *   }): Promise<void>
 *
 * Hashes IP and User-Agent with sha256(AUDIT_HASH_SALT + value). Never stores raw PII.
 * Action naming convention: `<domain>.<resource>.<verb>` (lowercase, dot-separated).
 *
 * Hard rule: audit entries are written via explicit calls only — never via Prisma
 * middleware — to keep behavior obvious and to avoid hidden writes inside RLS-set-config
 * transactions. Documented in docs/architecture/audit-log.md.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 2 implements auditLog() with PII hashing.';
