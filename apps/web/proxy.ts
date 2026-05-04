import { NextResponse, type NextRequest } from 'next/server';
import { resolveSubdomain } from '@dutyhive/config/subdomains';

/**
 * Next.js 16 renamed the "middleware" file convention to "proxy". This file
 * lives at apps/web/proxy.ts and runs at the edge before any route handler.
 *
 * Foundation Phase 1: minimal proxy that ATTACHES the resolved subdomain
 * as a header. The rewrite to `/_sub/<sub>/...` lands in Phase 3 once the
 * route groups exist.
 *
 * Today the only effect is enriching request headers so the page can show
 * which subdomain it sees — a crude but useful smoke test.
 */
export const config = {
  matcher: [
    /* Skip Next internals and static assets. */
    '/((?!_next/|_static/|favicon\\.ico|.*\\..*).*)',
  ],
};

export default function proxy(req: NextRequest) {
  const host = req.headers.get('host');
  const sub = resolveSubdomain(host);

  const headers = new Headers(req.headers);
  headers.set('x-dh-subdomain', sub);
  /* request-id correlation — Phase 5 wires this into the logger. */
  headers.set('x-dh-request-id', crypto.randomUUID());

  return NextResponse.next({ request: { headers } });
}
