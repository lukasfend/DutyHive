/**
 * Backend-agnostic email entrypoint.
 *
 *   sendMail({ to, subject, html, text? })
 *
 * Production routes through Resend. Development (and test) routes through
 * SMTP/Mailpit so dev mail stays local. The decision is purely env-driven:
 *
 *   process.env.NODE_ENV === 'production'   → Resend
 *   anything else                            → SMTP
 *
 * Failures are returned as `{ ok: false, error }` rather than thrown, so
 * callers can decide whether a mail failure should fail the surrounding
 * operation (rare for newsletter; common for password reset). Callers also
 * see which backend handled the call for log correlation.
 */
import { env } from '@dutyhive/env/server';
import { resendSend } from './backend/resend';
import { smtpSend } from './backend/smtp';
import type { SendMailInput, SendMailResult } from './types';

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (env.NODE_ENV === 'production') {
    return resendSend(input);
  }
  return smtpSend(input);
}

/**
 * Boot-time guard. Calls into this module that read env happen lazily, but
 * apps that import `@dutyhive/email` typically want to fail fast in
 * production if the Resend key is missing. Apps that care should call this
 * from their startup path (e.g. instrumentation.ts).
 */
export function assertProductionMailReady(): void {
  if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
    throw new Error(
      '@dutyhive/email: RESEND_API_KEY missing in production. ' +
        'Refusing to start — see docs/quality/risk-register.md R-0010.',
    );
  }
}
