/**
 * SMTP backend — used in development against Mailpit.
 *
 * Mailpit accepts any auth and never delivers outside the dev stack, so we
 * intentionally don't wire credentials here. In production, this backend
 * is replaced by Resend (see ./resend.ts) — env validation enforces that
 * RESEND_API_KEY is set before the prod backend boots.
 */
import { createTransport } from 'nodemailer';
import { env } from '@dutyhive/env/server';
import type { SendMailInput, SendMailResult } from '../types';

let transport: ReturnType<typeof createTransport> | null = null;

function getTransport() {
  if (!transport) {
    transport = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      // Mailpit doesn't enforce auth; nodemailer is happy without creds.
    });
  }
  return transport;
}

export async function smtpSend(input: SendMailInput): Promise<SendMailResult> {
  try {
    const result = await getTransport().sendMail({
      from: input.from ?? env.RESEND_FROM,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: input.listUnsubscribeUrl
        ? {
            'List-Unsubscribe': `<${input.listUnsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined,
    });
    return { ok: true, backend: 'smtp', id: result.messageId ?? 'unknown' };
  } catch (err) {
    return {
      ok: false,
      backend: 'smtp',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
