/**
 * Resend backend — used in production.
 *
 * Lazy-initialises a single Resend client per process. The presence of
 * RESEND_API_KEY is asserted at boot via @dutyhive/env (see boot-time
 * check below); a missing key in production aborts startup before any
 * request hits this code.
 */
import { Resend } from 'resend';
import { env } from '@dutyhive/env/server';
import type { SendMailInput, SendMailResult } from '../types';

let client: Resend | null = null;

function getClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error(
      '@dutyhive/email: RESEND_API_KEY missing — production cannot send mail. ' +
        'Set it in Coolify before starting the app.',
    );
  }
  if (!client) {
    client = new Resend(env.RESEND_API_KEY);
  }
  return client;
}

export async function resendSend(input: SendMailInput): Promise<SendMailResult> {
  try {
    const headers: Record<string, string> = {};
    if (input.listUnsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${input.listUnsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const resp = await getClient().emails.send({
      from: input.from ?? env.RESEND_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (resp.error) {
      return { ok: false, backend: 'resend', error: resp.error.message };
    }
    return { ok: true, backend: 'resend', id: resp.data?.id ?? 'unknown' };
  } catch (err) {
    return {
      ok: false,
      backend: 'resend',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
