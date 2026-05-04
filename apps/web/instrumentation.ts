/**
 * Next.js instrumentation — runs once per runtime (Node, Edge) at boot.
 *
 * We use this hook to:
 *   1. Initialise Sentry for the Node and Edge runtimes (the browser is
 *      handled separately in instrumentation-client.ts).
 *   2. Boot-check that production has the env vars it needs to send mail
 *      (R-0010 mitigation; refuses to start if RESEND_API_KEY is missing).
 *
 * `instrumentation.ts` is also where `@vercel/otel` would land if we ever
 * want OpenTelemetry traces alongside Sentry.
 */
import { assertProductionMailReady } from '@dutyhive/email';

export async function register() {
  // Boot-check before any request hits the app.
  assertProductionMailReady();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Sentry's request-error hook (Next 15+). Re-exported under the name
 * Next looks for. We use a local function so the type matches what Next
 * expects even if the SDK renames the helper later.
 */
import * as Sentry from '@sentry/nextjs';

export const onRequestError: typeof Sentry.captureRequestError = Sentry.captureRequestError;
