# ADR 0003 — Better Auth as the Foundation auth provider

- **Status**: Accepted
- **Date**: 2026-05-04
- **Deciders**: principal

## Context

DutyHive needs authentication for `app.dutyhive.com` plus cross-subdomain session sharing for `planner`, `business`, and `checklist`. Foundation requirements:

- Email + password with verification.
- Magic-link as a passwordless alternative.
- 2FA available (UI deferred).
- Multi-tenant organizations with role-based membership.
- Cross-subdomain session cookies on `.dutyhive.com`.
- EU data sovereignty: auth data lives in our Hetzner Postgres, never a US cloud.
- Self-hostable with no per-MAU billing — Foundation must run within €35/mo.

## Decision

We adopt **Better Auth** (`better-auth@^1.6`) as the auth provider, with the `organization`, `magic-link`, and `two-factor` plugins enabled. The Better Auth Prisma adapter writes to our Postgres via the `dutyhive_app` role.

The auth instance lives in `packages/auth/src/server.ts`. The Next.js handler at `apps/web/app/api/auth/[...all]/route.ts` exposes every Better Auth endpoint via `toNextJsHandler(auth)`.

## Consequences

### Positive

- Self-hosted from day one — no vendor lock-in, no per-user pricing.
- Built-in organization plugin matches our multi-tenant model directly (`Organization` + `Member` + `Invitation` tables).
- Cross-subdomain cookies via `advanced.crossSubDomainCookies` — no custom cookie middleware.
- Plugin architecture: 2FA, magic-link, password reset are first-party.
- TypeScript-native API with end-to-end inferred types between server and `authClient`.
- EU residency by default (data lives wherever the DB lives).

### Negative / costs

- Newer than NextAuth.js — smaller community and fewer Stack Overflow answers.
- Org plugin defaults are reasonable but the ability matrix is opinionated; customising it later means re-implementing some plumbing.
- Plugin tables (`twoFactor`, `invitation`, etc.) are owned by the framework — schema migrations need a `@better-auth/cli generate` step that we hand-merge. We accept this.
- Audit-log integration relies on `databaseHooks` (after-create on `user` and `session`). The hooks fire outside our `withAuthContext` transaction, so `auditLog()` opens its own transaction with `set_config()` to satisfy the audit_entry RLS policy.

### Neutral

- The auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `twoFactor`) live in `public` schema alongside our own models. Single migration history.

## Alternatives considered

- **NextAuth.js (Auth.js)** — extremely popular, but the org/multi-tenant story is community-driven (no first-party plugin) and the v5 API surface keeps shifting. Rejected for "build org logic ourselves" cost.
- **Clerk** — managed, beautiful UI, US-hosted. Rejected: per-MAU pricing kills the budget at scale and EU residency is paid-tier only.
- **Keycloak** — battle-tested, full-featured. Rejected for Foundation: heavyweight to operate, JVM dependency, separate VPS overhead. Documented as a **future migration target** when an enterprise customer demands SAML/SSO; see [docs/guides/keycloak-migration-path.md](../../guides/keycloak-migration-path.md).
- **Supabase Auth** — would force Supabase the data plane, conflicting with our self-hosted Postgres on Hetzner.
- **Roll our own** — rejected for the obvious reasons (auth bugs are catastrophic, see R-0001).

## References

- Related ADRs: [0004 (RLS multi-tenancy)](0004-rls-multi-tenancy.md), [0006 (Hetzner self-hosting)](0006-hetzner-coolify.md) (planned).
- Better Auth: <https://www.better-auth.com>
- Risk register: [R-0001 (auth bypass)](../../quality/risk-register.md#r-0001--authentication-bypass--session-theft).
