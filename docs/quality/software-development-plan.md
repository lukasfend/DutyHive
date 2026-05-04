# Software Development Plan (SDP)

> Lightweight SDLC documentation. Modelled after IEC 62304 §5 _only as a discipline reference_ — DutyHive is not medical device software (see [`non-medical-device-statement.md`](non-medical-device-statement.md)).

## Purpose

Define how we plan, develop, verify, release, and maintain DutyHive in a way that produces auditable, reproducible, and reliable software while a single developer is the entire engineering organization.

## Scope

This plan governs all code shipped under the `dutyhive` GitHub repository, including the `apps/web` deployable and all `@dutyhive/*` packages. Documentation, infrastructure scripts, and CI/CD are also in scope.

## Roles (Foundation phase, solo-dev)

In Foundation, all roles are filled by the principal (the user). The roles are still named explicitly so they can be split among contributors later without redrawing process.

- **Product owner** — defines what to build and why.
- **Lead engineer** — designs and implements.
- **Reviewer** — performs code review (self-review during solo phase, with discipline: PRs against `main`, written review notes per PR even if author = reviewer).
- **Release manager** — runs the release procedure, signs off on deployments.
- **Security and privacy custodian** — owns the risk register, DPA checklist, audit log; reviews dependency updates.

## Lifecycle

We use trunk-based development on `main`, with short-lived feature branches.

```
[idea]
  → [scope: ADR if architectural; risk register update if relevant]
  → [feature branch]
  → [implement: code + inline docs + tests]
  → [verify: typecheck + lint + tests + manual smoke]
  → [PR + self-review notes]
  → [merge to main]
  → [release per release-procedure.md]
```

## Software safety classification (internal, NOT an MDR classification)

Internal classification used to prioritize testing rigor. **This is not** the IEC 62304 software safety class A/B/C — DutyHive is not medical software.

| Tier   | Description                                                 | Test bar                                 |
| ------ | ----------------------------------------------------------- | ---------------------------------------- |
| Tier A | Marketing site, public docs                                 | Smoke + a11y                             |
| Tier B | Account hub (auth, sessions, RLS bridge)                    | Unit + integration + e2e + RLS isolation |
| Tier C | Per-product code (Planner, Business, Checklists when built) | Unit + integration + e2e                 |

## Verification activities (Foundation)

- **Unit tests** (Vitest) — for pure functions, env validators, helpers.
- **Integration tests** (Vitest + real Postgres in Docker) — RLS policy isolation, audit-log writes, Better Auth handler.
- **End-to-end tests** (Playwright) — sign-up, cross-subdomain session, marketing newsletter form, cookie banner absence.
- **Type check** (`tsc --noEmit`) — strict, `noUncheckedIndexedAccess`.
- **Lint** (ESLint flat config, max-warnings=0).
- **Format check** (Prettier).
- **Build smoke** (`next build`).
- **Manual exploratory testing** at each phase — documented in the release notes.

## Tooling baseline (frozen for Foundation; review yearly)

- Node 22.x · pnpm 10.x · TypeScript 5.7.x
- Next.js 16.x · React 19.x · Tailwind 4.x
- Postgres 17 · Prisma 6.x
- Better Auth (latest stable) · Resend · Trigger.dev v3 · Sentry EU
- Vitest · Playwright · pino
- Husky 9 · commitlint · lint-staged

## Configuration management

- All source under git. Lockfile committed.
- Releases tagged `v<major>.<minor>.<patch>[-<channel>.<n>]` (e.g. `v0.1.0-foundation.1`).
- Build artifacts not committed. Coolify rebuilds from a tagged commit.
- Environment configuration (`.env*`) not committed. `.env.example` is.

## Problem resolution

- **Bug reports** via GitHub Issues using the `bug-report` template.
- **Security issues** via the dedicated `security-issue` template (private when published-with-disclosure flow exists; for now: principal email).
- Each fix references the issue ID in its commit message.
- Critical bugs get a risk-register entry until mitigated.

## Change management

- Architectural decisions captured as ADRs in `docs/architecture/adr/`.
- Quality-document changes captured in this directory's `change-log.md`.
- API or data-model changes require a migration plan (Prisma migration + deploy note).

## Document control

This document, the risk register, the intended-purpose register, and the non-medical-device statement are reviewed at least once per Foundation phase and at least annually thereafter. Each review is logged in the document's "Review log" or `change-log.md`.

## Communication

Solo phase: principal communicates with themselves. The discipline:

- Write commit messages that explain _why_, not just _what_.
- Write PR descriptions even when self-reviewing.
- Update the change log on each release.
- Update the risk register when something interesting happens.
