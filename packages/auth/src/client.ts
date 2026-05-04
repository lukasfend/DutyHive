/**
 * @dutyhive/auth/client — browser-side auth client.
 *
 * Used by React components ("use client") to read session state, sign in,
 * sign out, switch organization, etc. The plugin set must mirror server.ts so
 * the type-level surface matches the runtime endpoints.
 */
import { createAuthClient } from 'better-auth/client';
import { organizationClient, magicLinkClient, twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // baseURL is read from window.location at runtime when omitted, which is
  // what we want for cross-subdomain support — every subdomain calls its own
  // origin's `/api/auth/*` and the cookies stay shared via the .root domain.
  plugins: [organizationClient(), magicLinkClient(), twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
