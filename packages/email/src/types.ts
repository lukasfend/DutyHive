/**
 * Shared email types.
 */

export type EmailAddress = string;

export type SendMailInput = {
  to: EmailAddress | EmailAddress[];
  /** Sender. Defaults to env.RESEND_FROM. */
  from?: EmailAddress;
  subject: string;
  /** Pre-rendered HTML body. */
  html: string;
  /** Optional plaintext fallback. Recommended for deliverability. */
  text?: string;
  /** Optional list-unsubscribe header (RFC 8058). Set for newsletter mail. */
  listUnsubscribeUrl?: string;
};

export type SendMailResult =
  | { ok: true; backend: 'resend' | 'smtp'; id: string }
  | { ok: false; backend: 'resend' | 'smtp'; error: string };
