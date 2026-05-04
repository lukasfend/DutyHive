# DutyHive

> **Pre-alpha** · Solo dev (Vienna, AT) · Self-hosted on Hetzner · Working name (rebrand-flexible)

[![Status](https://img.shields.io/badge/status-pre--alpha-orange)](#)
[![Phase](https://img.shields.io/badge/phase-Foundation%201%2F7-blue)](#foundation-phase-status)
[![Node](https://img.shields.io/badge/node-22.x-43853d?logo=node.js&logoColor=white)](.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white)](.npmrc)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.base.json)
[![Next.js](https://img.shields.io/badge/next.js-15-black?logo=next.js&logoColor=white)](apps/web/package.json)
[![Tailwind](https://img.shields.io/badge/tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](apps/web/postcss.config.mjs)
[![Postgres](https://img.shields.io/badge/postgres-17-336791?logo=postgresql&logoColor=white)](infra/docker/docker-compose.dev.yml)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](#license)

## What is this?

DutyHive is a SaaS platform offering tools for shift work, primarily targeting healthcare (nursing, doctors, paramedics, scheduling staff in hospitals and care homes). The platform itself is the shell. Three sub-products will run as subdomains on the same code base, the same auth session, and the same multi-tenant Postgres database with strict tenant isolation.

| Product       | Subdomain                | Status  | Description                                                                                                                    |
| ------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Planner**   | `planner.dutyhive.com`   | planned | Personal shift planner — free PWA, ICS export to Apple/Google/Outlook calendars, custom shift templates, monthly view          |
| **Business**  | `business.dutyhive.com`  | planned | Organizational shift management — orgs, locations, employees, vacation/absence workflow, time accounts, role-based permissions |
| **Checklist** | `checklist.dutyhive.com` | planned | Configurable checklists (e.g., shock-room material check)                                                                      |

**This release** (Foundation) ships the platform shell only — no product features. Goal: a production-deployable foundation into which the products plug as Next.js route groups.

## Repo at a glance

```
dutyhive/
├─ apps/web/                # Single Next.js 15 app — middleware routes all subdomains
├─ packages/
│  ├─ config/               # @dutyhive/config — brand identity + subdomain map
│  ├─ env/                  # @dutyhive/env — Zod-validated env (server/client split)
│  ├─ logger/               # @dutyhive/logger — pino + redaction (Phase 5)
│  ├─ db/                   # @dutyhive/db — Prisma + RLS transaction wrapper (Phase 2)
│  ├─ auth/                 # @dutyhive/auth — Better Auth + organization plugin (Phase 2)
│  ├─ audit/                # @dutyhive/audit — explicit audit-log helper (Phase 2)
│  ├─ i18n/                 # @dutyhive/i18n — next-intl, DE primary, EN stub (Phase 3)
│  ├─ ui/                   # @dutyhive/ui — shadcn primitives + design tokens (Phase 3)
│  ├─ email/                # @dutyhive/email — React Email + Resend (Phase 4)
│  ├─ jobs/                 # @dutyhive/jobs — Trigger.dev v3 tasks (Phase 5)
│  └─ pwa/                  # @dutyhive/pwa — Serwist-based PWA shell (Phase 5)
├─ infra/
│  ├─ docker/               # Local dev stack (Postgres, mailpit, minio)
│  └─ scripts/              # setup.sh, seed.ts, RLS coverage check
├─ docs/
│  ├─ architecture/         # Overview, data model, RLS, audit, ADRs
│  ├─ guides/               # Dev/Deploy/Hetzner/Env/Release guides
│  ├─ legal/                # Impressum/Datenschutz/AGB drafts (Austrian law) + DPA checklist
│  └─ branding/             # Placeholder logo, color tokens, naming conventions
└─ <root configs>           # turbo.json, pnpm-workspace.yaml, tsconfig.base.json, ...
```

Strict layering: nothing in `packages/*` may import from `apps/*`.

## Stack

| Layer     | Choice                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router) + React 19                                                     |
| Language  | TypeScript strict, `noUncheckedIndexedAccess`                                          |
| Styling   | Tailwind 4 (CSS-first) + shadcn/ui + design tokens                                     |
| ORM / DB  | Prisma 6 + Postgres 17 + RLS                                                           |
| Auth      | Better Auth (self-hosted) + organization plugin                                        |
| i18n      | next-intl (DE, EN as `__EN_TODO__` stub)                                               |
| Email     | Resend + React Email                                                                   |
| Jobs      | Trigger.dev v3 Cloud (Free)                                                            |
| Errors    | Sentry EU                                                                              |
| Logs      | pino + Coolify stdout                                                                  |
| Metrics   | Beszel (self-hosted)                                                                   |
| PWA       | Serwist (next-pwa successor)                                                           |
| Tests     | Vitest (unit + RLS integration) + Playwright (e2e)                                     |
| Tooling   | pnpm 10 + turborepo + Husky + commitlint + lint-staged                                 |
| Hosting   | Hetzner Falkenstein + Coolify (Mgmt VPS, App VPS, DB VPS, Storage Box, Object Storage) |
| DNS       | Cloudflare (planned migration from Vercel registrar)                                   |

See [`docs/architecture/overview.md`](docs/architecture/overview.md) for the system diagram and ADRs in [`docs/architecture/adr/`](docs/architecture/adr/) for the _why_.

## Foundation phase status

- [x] **Phase 1** — Local skeleton (monorepo, Next.js, packages, tooling)
- [ ] **Phase 1.5** — Quality scaffold (non-MD statement, intended-purpose register, risk register, SDP, version display, issue templates)
- [ ] **Phase 2** — DB & Auth (Postgres, Prisma, RLS, Better Auth, audit log)
- [ ] **Phase 3** — Subdomain routing & UI shell (proxy, route groups, shadcn, i18n)
- [ ] **Phase 4** — Marketing site (landing, newsletter, legal pages)
- [ ] **Phase 5** — Background, observability, polish (Trigger.dev, Sentry, logger, PWA, tests)
- [ ] **Phase 6** — Provisioning & first deploy (Hetzner, Coolify, Cloudflare, Resend)
- [ ] **Phase 7** — Observability & doc polish (Beszel, backups, docs final, tag v0.1.0-foundation)

## Quickstart

```bash
# Prerequisites: Node 22, pnpm 10, Docker Desktop
git clone <repo-url> dutyhive
cd dutyhive
cp apps/web/.env.example apps/web/.env.local
pnpm setup                 # starts Docker stack + installs deps
pnpm dev                   # http://lvh.me:3000
```

`lvh.me` resolves all subdomains to `127.0.0.1` — no `/etc/hosts` edits needed. Try `http://planner.lvh.me:3000`.

## Key documents

- [Dev guide](docs/guides/dev-guide.md)
- [Env-vars guide](docs/guides/env-guide.md)
- [Architecture overview](docs/architecture/overview.md)
- [ADRs](docs/architecture/adr/)
- [Quality](docs/quality/) — non-medical-device statement, risk register, intended purpose, SDP, release procedure, versioning, change log
- [Legal templates](docs/legal/) (drafts — lawyer review required before commercialization)
- [DPA / subprocessor checklist](docs/legal/dpa-checklist.md)

## Positioning

**DutyHive is explicitly not a medical device** under EU MDR. See [`docs/quality/non-medical-device-statement.md`](docs/quality/non-medical-device-statement.md) for the architectural guardrails that keep it that way. Each tool's [Intended Purpose](docs/quality/intended-purpose-register.md) is unambiguously administrative.

## Conventions

- **User-facing UI**: German (DE). EN is stubbed for the future.
- **Code, code comments, `/docs`**: English.
- **Commit messages**: [Conventional Commits](https://www.conventionalcommits.org/), enforced by Husky + commitlint.
- **Brand-name discipline**: "DutyHive" appears only in `packages/config/src/brand.ts` and i18n strings — see [`docs/branding/naming-conventions.md`](docs/branding/naming-conventions.md).

## Contact

- General: `support@dutyhive.com`
- Security / legal: `legal@dutyhive.com`
- Privacy / DPO: `privacy@dutyhive.com`

## License

Proprietary. All rights reserved. Source available to maintainers only. See `package.json` (`"license": "UNLICENSED"`).

---

## 🔄 Compacting a Claude Code conversation

When a Claude Code chat about this project gets too long, paste the prompt below into the chat **before** running `/compact`. It tells the assistant exactly what to keep and how to format the result so the compacted context stays useful for the next turn.

> **Prompt to paste before `/compact`:**
>
> ```
> Compact this conversation about the DutyHive project. Produce a compact summary
> with the structure below. Keep it under 500 lines. Do not paraphrase the
> README's "Claude context section" or the files in
> C:\Users\Administrator\.claude\projects\A--000---Fend-Software---ORG\memory\
> — those remain authoritative; just refer to them by name when relevant.
>
> Output structure:
>
> ## Status
> - One-line: current Foundation phase (X/7 or X.5/7), last commit short SHA on `main`,
>   last deploy if any, branch state (clean / dirty / behind).
>
> ## Decisions made this session
> - Bullet list. Each item: 1 sentence + path/file affected if any. Mark with [memory]
>   if it was saved as a memory record, [ADR] if it was captured as an ADR, [risk]
>   if it updates the risk register.
>
> ## Files touched this session
> - Group by `added`, `modified`, `deleted`. Include short reason per file.
> - Skip transient/noise (lockfile auto-updates from `pnpm add`, formatter rewrites).
>
> ## Open questions blocking progress
> - Numbered list. For each: what we're stuck on, what option(s) we presented to
>   the user, what answer we still need.
>
> ## Next steps (in priority order)
> - Numbered. Each: concrete action, owner (assistant vs user), estimated effort
>   if known. Include the next phase to enter when the current one closes.
>
> ## What to drop from context
> - Things the next session does NOT need to remember from this one (verbose
>   tool output, abandoned approaches, debug back-and-forth).
>
> Hard rules:
> - Reply language to the user remains German.
> - Project memory at the path above stays the source of truth — do not duplicate
>   user_profile.md, project_dutyhive.md, project_non_medical_device.md content.
> - The non-medical-device guardrails are absolute; if the next phase touches a
>   feature that could blur that line, surface it under "Open questions" so the
>   user re-confirms scope.
> ```
>
> After pasting and running `/compact`, the next session can continue with full
> awareness of where the project stands without re-reading transient tool output.

---

## 📌 Claude context section (for `/compact`)

> The static cross-session anchor. Loaded fresh in every new Claude Code session.

**Project:** SaaS platform "DutyHive" (working name, rebrand-flexible). Solo dev based in Austria. Free during Beta, commercial later (legal entity TBD). Healthcare-worker focus.

**Hard positioning:** **NOT a medical device** under EU MDR — and never will be. See [`docs/quality/non-medical-device-statement.md`](docs/quality/non-medical-device-statement.md) for the absolute architectural guardrails (no patient entities, no clinical decision support, no diagnosis features, etc.). Each tool's Intended Purpose is documented in [`docs/quality/intended-purpose-register.md`](docs/quality/intended-purpose-register.md) and machine-readably in `packages/config/src/intended-purpose.ts`.

**Three planned sub-products** (Foundation = shell only, NO product features yet):

1. Planner — `planner.dutyhive.com` — personal shift planner for healthcare workers (subject = the worker, never a patient), PWA, ICS export.
2. Business — `business.dutyhive.com` — multi-tenant workforce / shift management for healthcare orgs.
3. Checklist — `checklist.dutyhive.com` — administrative checklists (equipment, room readiness, material). Hard rule: never patient-handover or clinical-decision content.

Same auth and accounts across all three. Marketing site at the apex `dutyhive.com`. `app.dutyhive.com` is the cross-tool account hub.

**Stack:** Next.js **16** (App Router, Turbopack) · React 19 · TypeScript strict + `noUncheckedIndexedAccess` · Tailwind **4.2** · shadcn/ui · pnpm 10 + turborepo · Better Auth (with `organization` plugin) · Prisma 6 + Postgres 17 + Row-Level Security · Resend · Trigger.dev v3 Cloud · Sentry EU · next-intl · Serwist (PWA) · Vitest + Playwright · pino · Husky + lint-staged + commitlint.

> Plan-vs-implementation deltas (Next.js 15 → 16): the `middleware.ts` file convention is renamed to **`proxy.ts`**; `next lint` is removed in favor of plain `eslint`; the `eslint` block is removed from `next.config.ts`.

**Hosting:** Hetzner Falkenstein. Three VPSes via Coolify: `mgmt-01` CX22 (Coolify + Beszel hub), `app-01` CPX21 (Next.js), `db-01` CPX21 (Postgres, internal-only listener). Plus Hetzner Storage Box BX11 (backups) + Object Storage (assets). DNS planned to migrate to Cloudflare (registrar stays at Vercel). Beszel for metrics.

**Multi-tenancy contract:** Shared Postgres + RLS by `organization_id`. App role `dutyhive_app` (BYPASSRLS = false). Migrate role `dutyhive_migrate` (BYPASSRLS = true). Per-request inside a transaction:

```sql
SELECT set_config('app.current_user_id', $1, true);
SELECT set_config('app.current_organization_id', $2, true);
```

Every authenticated server action goes through `withAuthContext(req, fn)` (`packages/auth/src/with-tenant.ts`) which opens that transaction. The `prisma` export from `@dutyhive/db` throws when used outside this wrapper (defense-in-depth).

**Subdomain routing:** Single Next.js app. `apps/web/proxy.ts` reads `Host`, calls `resolveSubdomain` (`packages/config/src/subdomains.ts`), and (in Phase 3) rewrites to `/_sub/<sub>/...`. Route groups `(marketing)`, `(account)`, `(planner)`, `(business)`, `(checklist)` live under `app/_sub/[sub]/`. Cross-subdomain cookies use domain `.dutyhive.com` (or `.lvh.me` in dev).

**Quality discipline (without MDR scope):** risk register at [`docs/quality/risk-register.md`](docs/quality/risk-register.md), software development plan at [`docs/quality/software-development-plan.md`](docs/quality/software-development-plan.md), release procedure at [`docs/quality/release-procedure.md`](docs/quality/release-procedure.md), version visible to users via `<VersionBadge />` (footer), bug tracker via GitHub Issue templates.

**Languages:** UI strings in German only (initial). Code, code comments, `/docs` all English. Assistant replies to the principal **in German**. EN i18n is a stub with `__EN_TODO__` prefix on every string.

**Quality bar:** inline comments where the _why_ is non-obvious. Full `/docs`. Unit + integration + e2e tests. RLS test coverage 100% of tenant-scoped models. CI gate `infra/scripts/check-rls-coverage.ts` fails build if any model with `organizationId` lacks an RLS policy. GDPR-airtight; data residency entirely in EU.

**Brand-name discipline:** "DutyHive" appears ONLY in `packages/config/src/brand.ts` and `packages/i18n/src/messages/<locale>/*.json`. Code identifiers are generic where possible. Repo and packages namespaced `@dutyhive/*` by explicit user choice.

**Out of Foundation scope:** GitHub Actions (manual `pnpm test:all` before tag), billing, status page, full marketing copy, product features, Keycloak (migration path documented for future SAML/SSO needs), analytics, audit-log UI, EN translations, 2FA enrollment UI, WAL archiving / PITR.

**Legal gates:** Austrian lawyer review of `docs/legal/impressum.de.md`, `datenschutz.de.md`, `agb.de.md` is **mandatory** before charging any user (ADR-0010). DPA checklist in `docs/legal/dpa-checklist.md` lists every subprocessor.

**Subprocessors:** Hetzner (DE), Cloudflare (US/EU), Resend (EU), Sentry (EU), Trigger.dev (US, EU beta), GitHub (US), Vercel (US, registrar only).

**Critical files** (load these to orient quickly):

- `apps/web/proxy.ts` — subdomain detection, request-id, RLS context bridge entry point
- `packages/db/prisma/schema.prisma` — every domain model anchors here (Phase 2)
- `packages/auth/src/with-tenant.ts` — RLS-aware transaction wrapper (Phase 2)
- `packages/config/src/brand.ts` — single source of truth for brand identity
- `packages/config/src/intended-purpose.ts` — machine-readable Intended Purpose per tool
- `docs/quality/non-medical-device-statement.md` — non-MDR positioning + guardrails
- `docs/quality/risk-register.md` — living risk register
- `README.md` — this file (project intro + this `/compact` section + the compaction prompt above)
- `docs/architecture/adr/` — load relevant ADR(s) when changing architectural choices

**Current phase:** `Foundation Phase 1.5/7 — quality scaffold`. Last touched: 2026-05-04. Next item: finish Phase 1.5 verification + commit, then start Phase 2 (DB & Auth: Prisma schema, RLS policies, Better Auth org plugin, audit-log helper).
