/**
 * POST /api/subscribe — newsletter double-opt-in (signup step).
 *
 *   body: { email: string, locale?: 'de' | 'en', source?: string }
 *
 * Always returns 200, regardless of whether the email is new, already
 * pending, already confirmed, or unsubscribed. Revealing which case applies
 * would let an attacker enumerate our subscriber list. The privacy stance
 * here also keeps GDPR-Art.32 happy.
 *
 * Sends a confirmation mail through `@dutyhive/email` (SMTP/Mailpit in dev,
 * Resend in prod). The user must click the embedded link before they
 * receive any further mail (TKG-AT + GDPR opt-in requirement).
 */
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@dutyhive/db';
import { sendMail, render } from '@dutyhive/email';
import NewsletterConfirm from '@dutyhive/email/templates/newsletter-confirm';
import { auditLog } from '@dutyhive/audit';
import { clientEnv } from '@dutyhive/env/client';

const SubscribeSchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(['de', 'en']).default('de'),
  source: z.string().max(64).optional(),
});

const apexUrl = clientEnv.NEXT_PUBLIC_SITE_URL;

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const { email, locale, source } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Look up any existing subscriber. If they exist and are confirmed, we do
  // nothing (idempotent). If they exist but pending, we re-issue the token.
  // If they were previously unsubscribed, we treat them as new.
  const existing = await prisma.emailSubscriber.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing && existing.confirmedAt && !existing.unsubscribedAt) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString('hex');

  const subscriber = await prisma.emailSubscriber.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      confirmationToken: token,
      locale,
      source: source ?? null,
    },
    update: {
      confirmationToken: token,
      unsubscribedAt: null,
      locale,
      source: source ?? null,
    },
  });

  const confirmUrl = `${apexUrl}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = `${apexUrl}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;

  const html = await render(NewsletterConfirm({ confirmUrl, unsubscribeUrl }));
  const result = await sendMail({
    to: normalizedEmail,
    subject: 'DutyHive — bitte bestätige deine Newsletter-Anmeldung',
    html,
    listUnsubscribeUrl: unsubscribeUrl,
  });

  if (!result.ok) {
    // Mail failed — keep the row so a retry endpoint can resend, but log.
    console.error('[subscribe] mail send failed', { backend: result.backend, error: result.error });
  }

  await auditLog({
    action: 'newsletter.subscribe.requested',
    payload: { source: source ?? null, mailSent: result.ok },
    request: {
      ip: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
    resourceType: 'email_subscriber',
    resourceId: subscriber.id,
  });

  return NextResponse.json({ ok: true });
}
