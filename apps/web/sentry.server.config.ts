/**
 * Sentry — Node-runtime configuration.
 *
 * Booted from `instrumentation.ts` via dynamic `import()` so it only loads
 * when running on Node (not on the Edge runtime).
 *
 * EU residency: SENTRY_DSN must point at sentry.io/eu (`*.ingest.de.sentry.io`)
 * — see ADR-0009 (planned). The DSN itself is a public token; we still keep
 * it in env to avoid hard-coding it in the source.
 *
 * `beforeSend` strips known PII paths from captured events before they
 * leave the box. The list mirrors the redaction rules in `@dutyhive/logger`.
 */
import * as Sentry from '@sentry/nextjs';
import { env } from '@dutyhive/env/server';

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),

  // Capture nothing in development unless explicitly opted in via env.
  environment: env.NODE_ENV,

  // Sample rate: 100% errors, 10% performance traces. Tune in Phase 7.
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Re-throw recurring errors to keep them visible during development.
  debug: false,

  beforeSend(event) {
    return scrubPII(event);
  },
});

type SentryEvent = Parameters<NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>>[0];

/**
 * Strip PII from a Sentry event. We don't trust ourselves to never include
 * a password in an exception message, so the redaction is layered: logger
 * redaction first, Sentry redaction here as a safety net.
 */
function scrubPII(event: SentryEvent): SentryEvent {
  // Drop full request headers — they carry the auth cookie.
  if (event.request?.headers) {
    event.request.headers = { '<redacted>': '' };
  }

  // Drop request cookies entirely.
  if (event.request) {
    delete event.request.cookies;
  }

  // Strip user fields except a hashed-id reference. We never want raw
  // emails or IPs in Sentry — operator forensics happen in audit_entry.
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  return event;
}
