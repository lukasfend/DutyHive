/**
 * Sentry — browser configuration.
 *
 * Next 16 picks up this file automatically for client-side Sentry init.
 * We use `NEXT_PUBLIC_SENTRY_DSN` here (not the server DSN) because it's
 * inlined into the client bundle — public-by-design.
 *
 * `replaysOnErrorSampleRate` records the last few seconds before an error
 * so we can debug user-facing breakage. Only-on-error keeps the volume low.
 */
import * as Sentry from '@sentry/nextjs';
import { clientEnv } from '@dutyhive/env/client';

Sentry.init({
  dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(clientEnv.NEXT_PUBLIC_SENTRY_DSN),

  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  beforeSend(event) {
    // Drop request headers + cookies + user PII for the same reasons the
    // server config does — see sentry.server.config.ts.
    if (event.request?.headers) event.request.headers = { '<redacted>': '' };
    if (event.request) delete event.request.cookies;
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
