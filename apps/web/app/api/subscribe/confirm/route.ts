/**
 * GET /api/subscribe/confirm?token=…
 *
 * Closes the double-opt-in loop. The token is the random 64-char hex
 * `confirmationToken` issued by `POST /api/subscribe`. We look it up,
 * stamp `confirmedAt`, and redirect to the marketing-side success page.
 *
 * The token stays in the row after confirmation so it can also serve the
 * unsubscribe link (one-click List-Unsubscribe contract). The unsubscribe
 * route nulls the token afterwards.
 *
 * Failures redirect to a generic "link expired" page so an attacker can't
 * distinguish "token unknown" from "token used".
 */
import { NextResponse } from 'next/server';
import { prisma } from '@dutyhive/db';
import { auditLog } from '@dutyhive/audit';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  const fail = NextResponse.redirect(new URL('/newsletter/expired', req.url));

  if (!token || token.length !== 64) return fail;

  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { confirmationToken: token },
  });
  if (!subscriber) return fail;

  // Idempotent: confirming an already-confirmed row is fine.
  await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: { confirmedAt: subscriber.confirmedAt ?? new Date() },
  });

  await auditLog({
    action: 'newsletter.subscribe.confirmed',
    request: {
      ip: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
    resourceType: 'email_subscriber',
    resourceId: subscriber.id,
  });

  return NextResponse.redirect(new URL('/newsletter/confirmed', req.url));
}
