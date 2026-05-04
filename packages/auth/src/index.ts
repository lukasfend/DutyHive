/**
 * @dutyhive/auth — public surface.
 *
 * Subpath exports do the heavy lifting; this barrel re-exports the bits that
 * are safe in any context (types, role helpers).
 *
 * For runtime imports use the dedicated subpaths:
 *   import { auth } from '@dutyhive/auth/server'      // Next.js server only
 *   import { authClient } from '@dutyhive/auth/client' // browser
 *   import { withAuthContext } from '@dutyhive/auth/with-tenant' // server actions
 */
export type { Role } from './permissions';
export { ROLES, isRole } from './permissions';
export { UnauthorizedError } from './with-tenant';
export type { AuthContext } from './with-tenant';
