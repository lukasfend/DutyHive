# System Overview

> Phase 3 expansion target. Phase 1 lands the structure; details fill in as components ship.

## At a glance

DutyHive is a single Next.js 15 application that serves multiple subdomain "products" off the same code base, the same auth session, and the same Postgres database (with strict tenant isolation via Row-Level Security).

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
                  │ Next.js (app-01)    │  middleware → /_sub/<sub>/...
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

Filling-in roadmap:

- **Phase 2:** Database & Auth — explain RLS, transaction wrapper, Better Auth org plugin
- **Phase 3:** Subdomain routing — explain middleware rewrite to `/_sub/[sub]`, route groups
- **Phase 5:** Observability — explain logger correlation, Sentry environments, Beszel agents
- **Phase 6:** Hosting — explain Hetzner topology (private network, firewall, Storage Box)
