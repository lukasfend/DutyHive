/**
 * Better Auth's catch-all handler for `/api/auth/*`.
 *
 * The single `auth` instance from `@dutyhive/auth/server` exposes every
 * endpoint Better Auth supports (sign-up, sign-in, magic-link, organization
 * management, 2FA setup, …). `toNextJsHandler` adapts the framework-agnostic
 * handler to Next.js App Router's `GET`/`POST` exports.
 */
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@dutyhive/auth/server';

export const { GET, POST } = toNextJsHandler(auth);
