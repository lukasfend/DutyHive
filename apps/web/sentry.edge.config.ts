/**
 * Sentry — Edge-runtime configuration.
 *
 * The Edge runtime runs `proxy.ts` and any future `runtime: 'edge'` route
 * handlers. It can't reach Node-only APIs (no `fs`, no `Buffer`, restricted
 * crypto), so we keep the Sentry config here minimal and skip features
 * that pull in Node modules (e.g. ProfilingIntegration).
 */
import * as Sentry from '@sentry/nextjs';
import { env } from '@dutyhive/env/server';

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
});
