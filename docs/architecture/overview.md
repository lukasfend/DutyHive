# System Overview

> Living document. Each phase fills in the part it shipped.

## At a glance

DutyHive is a single Next.js 16 application that serves multiple subdomain "products" off the same code base, the same auth session, and the same Postgres database (with strict tenant isolation via Row-Level Security).

```
                    ┌─────────────────────────────────┐
                    │  Cloudflare DNS + Email Routing │
                    └────────┬────────────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │ Coolify (mgmt-01)   │  reverse proxy + TLS (Caddy)
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │ Next.js (app-01)    │  proxy.ts rewrites Host → /subs/<sub>/*
                  │   ┌──────────────┐  │
                  │   │  Marketing   │  │  dutyhive.com
                  │   │  Account     │  │  app.dutyhive.com
                  │   │  Planner     │  │  planner.dutyhive.com
                  │   │  Business    │  │  business.dutyhive.com
                  │   │  Checklist   │  │  checklist.dutyhive.com
                  │   └──────────────┘  │
                  └────┬─────────────┬──┘
                       │             │
              ┌────────▼─────┐  ┌────▼─────────────┐
              │ Postgres 17  │  │ Trigger.dev,     │
              │ (db-01, RLS) │  │ Sentry, Resend   │
              └──────────────┘  └──────────────────┘
```

## Subdomain routing (Phase 3)

Each subdomain shares the same Next.js process. `apps/web/proxy.ts` (Next 16's renamed `middleware`) reads the `Host` header on every incoming request and rewrites the URL based on the resolved subdomain:

```
Host header                     pathname before  →  pathname after
dutyhive.com                    /                →  /subs/marketing
app.dutyhive.com                /sign-in         →  /subs/account/sign-in
planner.dutyhive.com            /                →  /subs/planner
business.dutyhive.com           /<anything>      →  /subs/business/<anything>
checklist.dutyhive.com          /<anything>      →  /subs/checklist/<anything>
```

The dispatch tree under `apps/web/app/subs/<sub>/` is dispatched after the rewrite and never appears in the user-visible URL.

Two carve-outs:

- `/api/*` is **not** rewritten — handlers like `/api/auth/[...all]` (Better Auth) and `/api/health` are subdomain-agnostic.
- A direct external request to `/subs/...` is **refused** with a 404. The rewrite target is internal-only — Next does not re-run the proxy on rewrite, so legitimate traffic never lands here.

Subdomain resolution lives in `@dutyhive/config/subdomains` (`resolveSubdomain(host)`), which maps both production hosts (`*.dutyhive.com`) and the dev convention (`*.lvh.me:3000`, since `lvh.me` resolves to `127.0.0.1`).

## UI system (Phase 3)

`@dutyhive/ui` ships shadcn-style primitives (Button, Card, Input, Label) plus the design-token CSS that the rest of the platform reads via Tailwind utilities.

```
@dutyhive/ui/styles/tokens.css     ← @theme { --color-brand-*, --color-bg, ... }
@dutyhive/ui/styles/globals.css    ← imports tokens + base styles
       │
       └─→ apps/web/app/globals.css imports the bundle ↑
              │
              └─→ Pages use utility classes (`bg-brand-500`, `text-[color:var(--color-fg)]`)
                  Components in @dutyhive/ui apply the same tokens
```

Single source of truth for color/radius — a brand refresh edits `tokens.css` and propagates everywhere. The dark theme overrides land in a `.dark` class for a future theme toggle.

## Internationalisation (Phase 3)

`next-intl` handles message catalogues. The plugin is registered in `apps/web/next.config.ts` pointing at `apps/web/i18n/request.ts`, which delegates to `@dutyhive/i18n/config`.

Foundation supports `de` (translated) and `en` (stub — every value prefixed `__EN_TODO__`). Locale is hard-coded to DE in Foundation; cookie + Accept-Language detection lands in Phase 4.

URL-based locale routing is **off** in Foundation — links never carry a locale prefix. The trade-off: language preference is per-user, not per-link, which matches our German-speaking primary audience and simplifies SEO.

## Database & Auth (Phase 2)

Multi-tenant access via Row-Level Security on Postgres. Two roles: `dutyhive_app` (BYPASSRLS=false, runtime) and `dutyhive_migrate` (BYPASSRLS=true, migrations only). `withAuthContext(req, fn)` from `@dutyhive/auth` is the canonical entry point — it opens a Prisma transaction with `set_config('app.current_user_id', …, true)` and `set_config('app.current_organization_id', …, true)` so RLS policies see the right context.

See [`rls-strategy.md`](rls-strategy.md), [`data-model.md`](data-model.md), and [`audit-log.md`](audit-log.md) for the full picture.

## Filling-in roadmap

- **Phase 4:** marketing copy + newsletter (Resend double-opt-in) + legal pages.
- **Phase 5:** observability — `@dutyhive/logger` with request-id correlation, Sentry environments, Beszel agents.
- **Phase 6:** hosting — explain Hetzner topology (private network, firewall, Storage Box) — see [`../guides/setup-hetzner-from-scratch.md`](../guides/setup-hetzner-from-scratch.md).
- **Phase 7:** backups, monitoring dashboards, release procedure validation.
