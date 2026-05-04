/**
 * @dutyhive/auth — Foundation Phase 2 implementation:
 *   - server.ts:       betterAuth() instance with prismaAdapter + organization plugin
 *   - client.ts:       createAuthClient() React hooks + cross-subdomain cookie config
 *   - with-tenant.ts:  withAuthContext(req, fn) — RLS-aware transaction wrapper
 *   - permissions.ts:  role -> ability mapping
 *
 * Cross-subdomain cookie domain `.${NEXT_PUBLIC_ROOT_DOMAIN}` lets the same session
 * be valid on app.*, planner.*, business.*, checklist.*.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 2 wires Better Auth + RLS bridge + cross-sub cookies.';
