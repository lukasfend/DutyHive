/**
 * /api/health — minimal liveness endpoint for Coolify's container healthcheck
 * and any external uptime probe (Beszel agent, Cloudflare, etc.).
 *
 * Foundation scope: liveness only. A fuller readiness probe (DB ping, Redis
 * ping, etc.) is post-Foundation — the moment we add it, this endpoint must
 * not gate Coolify's healthcheck on shared infrastructure (otherwise a DB
 * blip cascades into a redeploy loop). Docs: docs/guides/coolify-build.md.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'dutyhive-web',
      ts: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
