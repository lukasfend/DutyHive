# Change Log

> Human-readable release notes. Pairs with git history but stays readable for non-engineers.

## [Unreleased]

### Added

- Phase 1.5 quality scaffold: `docs/quality/` directory with non-medical-device statement, intended-purpose register, risk register, software development plan, release procedure, and versioning policy.
- Machine-readable intended-purpose declarations in `packages/config/src/intended-purpose.ts`.
- `<VersionBadge />` component in `@dutyhive/ui` and version injection via `next.config.ts`.
- GitHub issue templates: bug report, feature request, security issue.

### Changed

- Repo positioning: explicitly out-of-scope for EU MDR. Architectural guardrails documented to prevent accidental medical-device classification.

---

## v0.1.0-foundation.5 — 2026-05-04 — Phase 5: Observability, jobs, PWA scaffold, e2e tests

### Added

- **`@dutyhive/logger` — pino with PII redaction.** Process-wide `logger` instance with structured JSON output in production (Coolify-ingestable) and pretty-printing in dev. Redaction list scrubs known PII paths (`password`, `*.password`, `token`, `*.token`, `cookie`, `authorization`, `email`, `req.headers`, …). `withRequestContext(logger, { requestId, subdomain, userId })` builds a child logger bound to per-request correlation. Request id flows through from `apps/web/proxy.ts`'s `x-dh-request-id` header set in Phase 3.
- **Sentry server + edge + client.** `apps/web/instrumentation.ts` bootstraps the Node and Edge runtimes; `apps/web/instrumentation-client.ts` initialises the browser SDK. `sentry.server.config.ts` and `sentry.edge.config.ts` mirror each other minimally. `beforeSend` strips request headers, cookies, and user PII before any event leaves the box — defence in depth on top of the logger redaction. EU residency note pinned for the production DSN (Phase 6).
- **`withSentryConfig`** wraps `next.config.ts`. Source-map upload skipped when `SENTRY_AUTH_TOKEN` is missing so local builds don't fail. `silent: true` keeps build noise down. `disableLogger: true` (Sentry's own debug logger, not `@dutyhive/logger`).
- **Boot-time mail check.** `instrumentation.ts` calls `assertProductionMailReady()` from `@dutyhive/email` so production refuses to start without `RESEND_API_KEY` (R-0010 mitigation hardened).
- **`@dutyhive/jobs` Trigger.dev v3 tasks.**
  - `cleanup-stale-sessions` — daily cron at 04:00 UTC, deletes `Session` rows past `expiresAt`. Logs deletion count + writes a `jobs.session.cleanup` audit row.
  - `send-welcome-email` — event task with payload `{ userId }`. Renders the verification template (a dedicated welcome template lands when the auth flow triggers it) and sends through `@dutyhive/email`. Failure logs but doesn't retry — Better Auth is independent.
- **`apps/web/trigger.config.ts`** — Trigger.dev v3 project config. Discovers tasks under `packages/jobs/src/tasks/`. `TRIGGER_PROJECT_REF` env is required in production (Phase 6 setup).
- **`@dutyhive/pwa` package shape.** `buildManifest({ subdomain, shortName, description, themeColor? })` returns a Web App Manifest object suitable for a Next.js `app/<sub>/manifest.ts` route. `isProductEnabled('planner' | 'business' | 'checklist')` reads `brand.features` so a layout knows whether to register the SW. No service worker registered for any subdomain in Foundation — products opt in by flipping the brand flag and wiring Serwist (post-Foundation, see ADR-0011).
- **Playwright e2e suite.** 11 tests across 3 files:
  - `marketing.spec.ts` — hero copy, three product cards, newsletter form, cookie banner regression test (banner must NOT render in Foundation).
  - `subdomains.spec.ts` — five subdomains route to their own page via `lvh.me`; `/subs/*` direct external request returns 404.
  - `newsletter.spec.ts` — full double-opt-in flow: submit form → mail in Mailpit → confirm URL → success page.
    Run with `pnpm --filter @dutyhive/web test:e2e` (after `pnpm test:e2e:install`).

### Changed

- **`apps/web/instrumentation.ts`** rewritten from stub to actual Sentry boot + mail-readiness check + `onRequestError` re-export.
- **Per-package tsconfig** for `logger`, `jobs`, `pwa` dropped `rootDir`/`outDir` (matching the Phase 2 pattern — packages consumed by source via `transpilePackages`).

### Verification

`pnpm typecheck` 12/12 ✓ · `pnpm lint` 12/12 ✓ · `pnpm test` 13/13 ✓ · `pnpm check:rls` ✓ · dev-server boot clean (Sentry's only deprecation warning is benign) · all five subdomains still route correctly · `/api/auth/get-session` returns 200, `/subs/marketing` external request returns 404 · `playwright test --list` registers 11 tests.

### Known follow-ups (Phase 6+)

- Real Sentry project + DSN created and wired via Coolify env (Phase 6 / Hetzner runbook).
- Trigger.dev project ref + secret key wired (Phase 6).
- Auth-side trigger for `send-welcome-email` (after `emailVerification.afterVerification`) lands when we add the welcome template.
- `pnpm test:e2e` not yet enforced in CI — manual run before each tag.
- Sentry's `disableLogger` deprecation: switch to `webpack.treeshake.removeDebugLogging` in a future SDK upgrade (only surfaces with Webpack — Foundation runs Turbopack which ignores it).

---

## v0.1.0-foundation.4 — 2026-05-04 — Phase 4: Marketing site, newsletter, legal pages

### Added

- **`@dutyhive/email` package.** Backend-agnostic `sendMail({...})` that picks SMTP/Mailpit in development and Resend in production. Lazy-initialised single client per process; failures returned as `{ ok: false, error }` so callers can decide to fail-soft (newsletter) or fail-hard (password reset). `assertProductionMailReady()` helper refuses to start prod with no `RESEND_API_KEY` (R-0010 mitigation).
- **React Email templates.** `EmailVerification`, `MagicLink`, `NewsletterConfirm` — shared `EmailLayout` shell with brand wordmark, container, footer with support address. List-Unsubscribe header wired for newsletter mail (RFC 8058 one-click unsubscribe).
- **Newsletter double-opt-in flow.**
  - `POST /api/subscribe` → upsert `EmailSubscriber` with random 64-hex `confirmationToken`, send confirmation mail. Always returns 200 to avoid leaking subscriber-list status.
  - `GET /api/subscribe/confirm?token=…` → set `confirmedAt`, redirect to `/newsletter/confirmed`.
  - `GET|POST /api/subscribe/unsubscribe?token=…` → set `unsubscribedAt`, null token, redirect to `/newsletter/unsubscribed`. POST path supports List-Unsubscribe-Post one-click.
  - All three routes write to `audit_entry` with `newsletter.subscribe.{requested,confirmed,unsubscribed}` actions.
- **Marketing landing polish.** Newsletter form (client component with `useTranslations`) integrated below the hero. Form states: idle / sending / success / error.
- **Legal pages from Markdown.** `/impressum`, `/datenschutz`, `/agb` rendered server-side from `docs/legal/*.de.md` via `marked`. `outputFileTracingIncludes` in `next.config.ts` ships the markdown into the standalone bundle. Pages set `robots: noindex` while drafts are unreviewed.
- **`@tailwindcss/typography`** plugin registered in `tokens.css` for `.prose` styling on the legal pages.
- **`CookieBanner` component** in `@dutyhive/ui`. Persists choice via first-party `dh_cookie_consent` cookie (1-year max-age, SameSite=Lax). Wired into the marketing layout but hidden via `disabled` prop — Foundation sets only essential cookies (Better Auth session, locale prefs), which don't require explicit consent under EU/AT rules. Flip the prop when Phase 5+ adds analytics.
- **Newsletter status pages**: `/newsletter/confirmed`, `/newsletter/expired`, `/newsletter/unsubscribed` — Card-based feedback under the marketing layout.
- **i18n catalogue extension.** German + English `marketing.newsletter` namespace covering form labels, success/error copy, GDPR consent line.

### Changed

- **`@dutyhive/auth`'s mailer** refactored from inline nodemailer to `@dutyhive/email` + React Email templates. Better Auth's `sendVerificationEmail` and `magicLink.sendMagicLink` now render the new templates.
- **`@dutyhive/audit`'s `auditLog`** switched from `tx.auditEntry.create()` to a raw-SQL `$executeRaw` insert. Postgres applies the SELECT policy to RETURNING rows, which broke the system-event path (org=null + actorUserId=null, e.g. anonymous newsletter signups). The raw INSERT skips RETURNING, so only the WITH CHECK fires.

### Verification

`pnpm typecheck` 12/12 ✓ · `pnpm lint` 12/12 ✓ · `pnpm test` 13/13 ✓ (Phase 2 RLS suite still green) · `pnpm check:rls` ✓ · full newsletter lifecycle smoke: `curl POST /api/subscribe` → row created with token, confirmation mail in Mailpit (`DutyHive — bitte bestätige deine Newsletter-Anmeldung`) → `GET /api/subscribe/confirm?token=…` → `confirmedAt` set → `GET /api/subscribe/unsubscribe?token=…` → `unsubscribedAt` set + token nulled. `audit_entry` shows three rows: `newsletter.subscribe.{requested,confirmed,unsubscribed}`. Legal pages `/impressum`, `/datenschutz`, `/agb` render with markdown content + draft warning intact.

### Known follow-ups (Phase 5+)

- Real Resend domain verification + SPF/DKIM/DMARC happens in the deployment (Phase 6 / Hetzner runbook).
- Newsletter sending UI for operators is post-Foundation; today every newsletter goes out via direct DB query + ad-hoc Resend call.
- The cookie banner becomes visible the moment we turn on analytics (PostHog/Plausible) — Phase 5 task.

---

## v0.1.0-foundation.3 — 2026-05-04 — Phase 3: Subdomain routing, UI, i18n

### Added

- **Subdomain routing.** `apps/web/proxy.ts` (Next 16's renamed middleware) reads the `Host` header on every request, resolves it via `@dutyhive/config/subdomains.resolveSubdomain`, and rewrites the URL to `/subs/<sub>/<path>`. The dispatch tree under `apps/web/app/subs/<sub>/` serves five subdomains: marketing (apex), account (`app.`), planner, business, checklist. Direct external `/subs/*` requests are refused with 404.
- **`@dutyhive/ui` shadcn-style primitives.** `Button` (5 variants × 4 sizes via `class-variance-authority`), `Card` family (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `Input`, `Label`. All driven by the design tokens in `packages/ui/src/styles/tokens.css` (Tailwind 4 `@theme` directive). Brand scale aliased to Tailwind blue for now — swap to designer OKLCH when assets land.
- **Theme tokens.** `--color-brand-*`, `--color-bg`, `--color-fg`, `--color-muted`, `--color-border`, `--color-card`, `--color-card-fg`, semantic `--color-success/warn/danger/info`, radius tokens. Dark-theme overrides scoped to `.dark` class on `<html>` (UI toggle deferred).
- **Per-subdomain layouts.** Marketing has a brand-link nav + footer with legal-page links. Account has sign-in/sign-up nav. Product shells (planner/business/checklist) have a minimal "back to apex" header.
- **`@dutyhive/i18n` with next-intl.** German (DE) message catalogue + English (EN) stub catalogue (every value prefixed `__EN_TODO__`). `requestConfig` exported from `@dutyhive/i18n/config`; apps/web wires it via `createNextIntlPlugin('./i18n/request.ts')`. Locale hard-coded to DE in Foundation — cookie/header detection lands in Phase 4. URL-based locale routing intentionally off.
- **Marketing landing copy** sourced through `getTranslations('marketing')`.

### Changed

- `apps/web/app/page.tsx` and the inline tokens in `apps/web/app/globals.css` deleted; subdomain pages own their own pages, and `globals.css` is now a single `@import '@dutyhive/ui/styles/globals.css'`.
- `apps/web/app/layout.tsx` wraps the tree with `<NextIntlClientProvider>` so client components can `useTranslations()`.
- `packages/ui/tsconfig.json` and `packages/i18n/tsconfig.json` dropped `rootDir`/`outDir`, matching the pattern set in Phase 2.
- `packages/ui/package.json` declares React 19 as a peer dependency (not a runtime dep) so we don't bundle a second copy.
- `next.config.ts` wraps the exported config with `withNextIntl(...)`.

### Verification

`pnpm typecheck` 12/12 ✓ · `pnpm lint` 12/12 ✓ · `pnpm test` 13/13 ✓ (Phase 2 tests still green) · `pnpm check:rls` ✓ · five-subdomain `curl` smoke against `lvh.me` returned the right page each time, `/subs/*` direct request returned 404, `/api/auth/get-session` pass-through returned 200.

### Known follow-ups (Phase 4+)

- Replace hard-coded brand-blue alias in `tokens.css` with the final OKLCH values once the designer ships them.
- Wire cookie/Accept-Language detection in `@dutyhive/i18n/config` so users can flip to EN once translations are real.
- Cookie-banner component is wired in the layout but doesn't render in Foundation (no analytics cookies; only-essential-cookies regime). Re-enable when Phase 5 turns on PostHog/Plausible.

---

## v0.1.0-foundation.2 — 2026-05-04 — Phase 2: DB & Auth

### Added

- **Postgres 17 + RLS multi-tenancy.** Two database roles bootstrapped via init SQL: `dutyhive_app` (BYPASSRLS=false, app runtime) and `dutyhive_migrate` (BYPASSRLS=true, Prisma migrations only).
- **Prisma 6 schema** in `packages/db/prisma/schema.prisma`. Better Auth tables generated by `@better-auth/cli`; Foundation-eigene models added (`AuditEntry`, `EmailSubscriber`, `LegalConsent`); Organization extended with `legalName` / `countryCode` / `austriaUid`.
- **Better Auth** (`better-auth@^1.6`) wired in `@dutyhive/auth/server` with the `organization`, `magic-link`, and `two-factor` plugins. Cross-subdomain cookies on `.${ROOT_DOMAIN}`. Email verification required (R-0001 mitigation).
- **`withAuthContext(req, fn)`** in `packages/auth/src/with-tenant.ts` — RLS bridge: opens a Prisma transaction, sets `app.current_user_id` and `app.current_organization_id` GUCs from the session, runs the caller's function. Defence-in-depth via `BYPASSRLS=false` on the app role.
- **`auditLog()`** in `packages/audit` — explicit append-only audit calls with sha256-salted IP/UA hashing. Better Auth `databaseHooks` log `auth.signup` and `auth.login` automatically.
- **Mailpit** added to `infra/docker/docker-compose.dev.yml` for dev email capture (Better Auth verification flow).
- **Vitest integration suite** with separate `dutyhive_test` database (rebuilt on every run via `globalSetup`). 13 tests pass: env validation, audit hashing, RLS cross-org isolation, RLS WITH-CHECK rejection, audit_entry append-only privileges.
- **CI gate `pnpm check:rls`** (`infra/scripts/check-rls-coverage.ts`) — fails the build if a Foundation-owned tenant table lacks an RLS policy. R-0002 mitigation.
- **ADRs**: 0003 (Better Auth), 0004 (RLS for multi-tenancy), 0008 (Postgres 17).
- **Architecture docs**: `docs/architecture/data-model.md`, `rls-strategy.md`, `audit-log.md`.

### Changed

- `pnpm.overrides` pins `@prisma/client` and `prisma` to 6.19.3 — `@better-auth/cli`'s transitive dep on @prisma/client@5.22 was hoisted ahead of our 6.x. Override resolves the version mismatch that broke `prisma generate`.
- Per-package `tsconfig.json` files dropped `rootDir`/`outDir` — workspace packages are consumed by source via Next 16's `transpilePackages`, so they never emit. The cross-package imports (`@dutyhive/db` from `@dutyhive/auth`) caused TS6059 with `rootDir` set.
- `apps/web/.env.example` extended with `MIGRATE_DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`. `@dutyhive/env`'s server schema validates the new vars.

### Quality

- **R-0002 (RLS policy gap)**: status open → mitigated. CI gate active.
- **R-0004 (audit log tampering)**: status open → mitigated. `dutyhive_app` REVOKE on `audit_entry` UPDATE/DELETE verified by integration test.

### Verification

`docker compose up -d` ✓ · `pnpm typecheck` 12/12 ✓ · `pnpm test` 13/13 ✓ · `pnpm check:rls` ✓ · manual signup smoke (`curl /api/auth/sign-up/email` → Mailpit verification mail → `audit_entry` row with `auth.signup` action and matching `actorUserId`) ✓.

### Known follow-ups

- Defence-in-depth RLS on `organization`/`member`/`invitation` deferred. Better Auth's organization plugin enforces tenant access at the plugin layer for now; we will add policies in a later phase once we have the right pattern (likely a separate connection pool with an "auth-bypass" role).
- Schema-per-worker test isolation deferred. Phase 2 runs RLS tests sequentially. Switch to true per-worker schemas once test count justifies the complexity.

---

## v0.1.0-foundation.1 — 2026-05-04 — Phase 1: monorepo skeleton

### Added

- pnpm + turborepo monorepo with `apps/web` (Next.js 16) and 11 `@dutyhive/*` workspace packages.
- TypeScript strict + `noUncheckedIndexedAccess`.
- Tailwind 4.2 (CSS-first tokens, placeholder palette).
- Husky 9 with `pre-commit` (lint-staged), `pre-push` (typecheck), `commit-msg` (commitlint conventional commits).
- ESLint 9 flat config (eslint-config-next 16 native).
- Docker Compose for local dev (Postgres 17 with `pgcrypto`, `citext`, `pg_trgm`, `unaccent`).
- `/docs/` skeleton: architecture, guides, legal (Austrian drafts), branding placeholders.
- README with status badges and dedicated Claude `/compact` context section.

### Notes

- Plan-vs-implementation drift: Next.js 15 → 16 (15.x deprecated upstream), `middleware.ts` → `proxy.ts` (Next 16 convention), Tailwind 4.0.0 → 4.2.4 (postcss / oxide compat), `prettier-plugin-tailwindcss` removed (broken with Prettier 3.4.2; reintroduce later with pinned version).

### Verification

`pnpm install` ✓ · `pnpm typecheck` 12/12 ✓ · `pnpm build` (Next 16 Turbopack) ✓ · `pnpm lint` zero warnings ✓ · `pnpm format:check` clean ✓ · pre-push hook executed on push ✓.

---

_(prior history exists in git, but only since the initial scaffold commit)_
