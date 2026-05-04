# Dev Guide

> Phase 1 stub — expanded as each phase lands.

## Prerequisites

- Node 22.x (use `.nvmrc` with `nvm use`)
- pnpm 10.x (`corepack enable && corepack prepare pnpm@10 --activate`)
- Docker Desktop (for local Postgres + future mailpit/minio)
- Git 2.40+

## First-time setup

```bash
git clone <repo-url> dutyhive
cd dutyhive
cp apps/web/.env.example apps/web/.env.local
# edit .env.local — at minimum set BETTER_AUTH_SECRET (after Phase 2)
pnpm setup
```

`pnpm setup` runs `infra/scripts/setup.sh`: starts Docker, installs deps. From Phase 2 it will also run migrations, seed, and Prisma generate.

## Daily workflow

```bash
pnpm dev       # starts Next.js on http://lvh.me:3000
pnpm typecheck # TS check across the workspace
pnpm lint      # ESLint zero-warnings
pnpm test      # Vitest (unit + RLS integration after Phase 2)
pnpm test:e2e  # Playwright (after Phase 5)
```

## Why `lvh.me`?

`lvh.me` is a public DNS record that resolves all subdomains to `127.0.0.1`. This lets us test subdomain routing locally without `/etc/hosts` edits. Visit `http://planner.lvh.me:3000`, `http://app.lvh.me:3000`, etc.

If `lvh.me` is unavailable (corporate DNS, offline dev), fall back to `/etc/hosts`:

```
127.0.0.1 dutyhive.localhost app.dutyhive.localhost planner.dutyhive.localhost business.dutyhive.localhost checklist.dutyhive.localhost
```

…and set `NEXT_PUBLIC_ROOT_DOMAIN=dutyhive.localhost:3000`.

## Workspace layout

See repository root `README.md` for the package map. Strict layering: `packages/*` may not import from `apps/*`.

## Conventional Commits

Husky `commit-msg` hook enforces [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add magic-link sign-in
fix(db): correct RLS policy for AuditEntry
docs(guides): expand dev-guide
chore: scaffold monorepo
```

See `commitlint.config.ts` for the allowed type list.
