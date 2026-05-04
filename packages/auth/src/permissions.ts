/**
 * @dutyhive/auth — role + permission types.
 *
 * Foundation: just the role enum. The full ability matrix (which role can do
 * what on which resource) is built when product features arrive (Phase 5+).
 * Better Auth's `organization` plugin currently enforces the basics:
 *   - `owner` can do anything in the org.
 *   - `admin` can manage members and invitations.
 *   - `member` is a regular user.
 */

export type Role = 'owner' | 'admin' | 'member';

export const ROLES: readonly Role[] = ['owner', 'admin', 'member'] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
