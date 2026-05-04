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
