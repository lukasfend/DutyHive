import { NextResponse, type NextRequest } from 'next/server';
import { resolveSubdomain } from '@dutyhive/config/subdomains';

/**
 * Next 16 renamed the "middleware" file convention to "proxy". This file
 * runs at the edge before any route handler.
 *
 * What it does
 * ------------
 * 1. Looks at the incoming Host header.
 * 2. Resolves it to one of our known subdomains (`marketing`, `account`,
 *    `planner`, `business`, `checklist`) via `@dutyhive/config/subdomains`.
 * 3. Rewrites the URL to `/subs/<subdomain>/<original-path>` so the rest of
 *    the App Router can dispatch to a per-subdomain page tree under
 *    `app/subs/<subdomain>/...`.
 * 4. Forwards the request with two extra headers:
 *      x-dh-subdomain   — the resolved subdomain (debugging / RSC reads)
 *      x-dh-request-id  — UUID v4 used by Phase 5's logger for correlation
 *
 * Routes that already start with `/subs/` (a recursive request, should not
 * happen but defends against weirdness) and `/api/` (auth handler, health
 * check, newsletter subscribe — all subdomain-agnostic) are NOT rewritten.
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

  const url = req.nextUrl.clone();

  /* /subs/* is internal-only. A request that arrives here directly from the
   * outside (someone typed the URL) is a probe — refuse it. After a proxy
   * rewrite the proxy does NOT run again, so legitimate internal traffic
   * never lands on this branch. */
  if (url.pathname.startsWith('/subs/')) {
    return new NextResponse(null, { status: 404 });
  }

  /* /api/* is subdomain-agnostic (auth handler, health, newsletter). */
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.next({
      request: { headers: enrichedHeaders(req, sub) },
    });
  }

  /* Rewrite "/<path>" → "/subs/<sub>/<path>". Trailing-slash safe. */
  url.pathname = `/subs/${sub}${url.pathname === '/' ? '' : url.pathname}`;

  return NextResponse.rewrite(url, {
    request: { headers: enrichedHeaders(req, sub) },
  });
}

function enrichedHeaders(req: NextRequest, sub: string): Headers {
  const headers = new Headers(req.headers);
  headers.set('x-dh-subdomain', sub);
  headers.set('x-dh-request-id', crypto.randomUUID());
  return headers;
}
