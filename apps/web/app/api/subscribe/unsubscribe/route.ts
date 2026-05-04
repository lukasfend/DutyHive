/**
 * GET  /api/subscribe/unsubscribe?token=…
 * POST /api/subscribe/unsubscribe?token=…   (List-Unsubscribe-Post one-click)
 *
 * RFC 8058: mailbox providers (Gmail, Yahoo, Outlook) prefer the one-click
 * POST flow when the `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 * header is set. Our newsletter mail sets it. Both verbs do the same thing
 * here: stamp `unsubscribedAt` and null the token.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@dutyhive/db';
import { auditLog } from '@dutyhive/audit';

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  const fail = NextResponse.redirect(new URL('/newsletter/expired', req.url));

  if (!token || token.length !== 64) return fail;

  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { confirmationToken: token },
  });
  if (!subscriber) return fail;

  await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: {
      unsubscribedAt: subscriber.unsubscribedAt ?? new Date(),
      confirmationToken: null,
    },
  });

  await auditLog({
    action: 'newsletter.subscribe.unsubscribed',
    request: {
      ip: req.headers.get('x-forwarded-for') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
    resourceType: 'email_subscriber',
    resourceId: subscriber.id,
  });

  if (req.method === 'POST') {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL('/newsletter/unsubscribed', req.url));
}

export const GET = handle;
export const POST = handle;
