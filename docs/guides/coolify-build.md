# Coolify build — DutyHive web app

> How Coolify is configured to build, deploy, and healthcheck the
> `apps/web` Next.js app from this monorepo. Pairs with the Hetzner runbook
> ([`setup-hetzner-from-scratch.md`](setup-hetzner-from-scratch.md) Phase H)
> and with [`coolify-secrets.md`](coolify-secrets.md) for the runtime env.

## Why a hand-rolled Dockerfile (not Nixpacks)

Coolify's Nixpacks auto-detect handles a single-package Next.js app well, but
this repo is a pnpm + turborepo monorepo with 11 workspace packages
imported by source (`transpilePackages` in `next.config.ts`). Nixpacks's Next
provider does not consistently traverse the workspace boundary, and the
Prisma generate step needs an explicit invocation. A committed `Dockerfile`
at the repo root keeps the build deterministic across Coolify, CI, and
the developer's local `docker build`.

## Coolify application settings

Create the app under `app-01` (the deploy target added in Hetzner runbook
H.4). Settings to set in the Coolify UI:

| Field                    | Value                                           | Notes                                                             |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Source**               | GitHub repo `lukasfend/DutyHive`                | Connected via the GitHub App in Hetzner runbook H.5.              |
| **Branch**               | `main` for staging deploys; tags for production | Tag-driven prod deploys (`v0.1.0-foundation.<n>` etc.).           |
| **Build pack**           | `Dockerfile`                                    | Coolify reads `./Dockerfile` from the repo root.                  |
| **Dockerfile path**      | `Dockerfile`                                    | Default; do not change.                                           |
| **Build context**        | `.` (repo root)                                 | The Dockerfile expects to see the whole monorepo.                 |
| **Port (in container)**  | `3000`                                          | Matches `EXPOSE 3000` and `PORT=3000` in the Dockerfile.          |
| **Healthcheck path**     | `/api/health`                                   | Implemented at `apps/web/app/api/health/route.ts`. Liveness only. |
| **Healthcheck interval** | `30s`                                           | Matches the `HEALTHCHECK` directive in the Dockerfile.            |
| **Pre-deploy command**   | _(empty)_                                       | Migrations are run separately; see "Database migrations" below.   |
| **Start command**        | _(empty — Dockerfile `CMD` handles this)_       | `node apps/web/server.js`.                                        |

## Build-time vs runtime environment variables

Coolify distinguishes between **build-time** ENV (passed as `--build-arg` to
`docker build`) and **runtime** ENV (injected into the container at start).
This split matters for Next.js: anything prefixed `NEXT_PUBLIC_` is read at
build time and baked into the client bundle.

| Variable                                            | Phase   | Why                                                                  |
| --------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| `GIT_SHA`                                           | build   | Written into the build badge (`<VersionBadge />`).                   |
| `NEXT_PUBLIC_APP_VERSION`                           | build   | Defaults to `package.json` version; can override per-channel.        |
| `NEXT_PUBLIC_SENTRY_DSN`                            | build   | Client-side Sentry SDK reads this at module load.                    |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | build   | Source-map upload during Sentry's webpack/turbopack plugin run.      |
| `DATABASE_URL`                                      | runtime | App-role connection string (BYPASSRLS=false).                        |
| `MIGRATE_DATABASE_URL`                              | runtime | Migrate-role connection string (used only in pre-deploy migrations). |
| `BETTER_AUTH_SECRET`                                | runtime | Session signing.                                                     |
| `BETTER_AUTH_URL`                                   | runtime | Cross-subdomain cookie domain anchor.                                |
| `RESEND_API_KEY`, `RESEND_FROM`                     | runtime | Mail delivery.                                                       |
| `SENTRY_DSN`                                        | runtime | Server-side Sentry SDK.                                              |
| `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`         | runtime | Trigger.dev v3 worker registration.                                  |
| `S3_*`                                              | runtime | Hetzner Object Storage credentials.                                  |
| `AUDIT_HASH_SALT`, `LOG_LEVEL`                      | runtime | Logger / audit subsystem.                                            |

The full list with descriptions lives in
[`apps/web/.env.example`](../../apps/web/.env.example) and
[`env-guide.md`](env-guide.md). For storage, rotation, and leak response see
[`coolify-secrets.md`](coolify-secrets.md).

## Database migrations

Migrations are **not** part of the image build — they're run with the
migrate-role connection string against a known good baseline before the new
container starts. Two options in Coolify:

1. **Pre-deploy command** in the app settings: `pnpm --filter @dutyhive/db exec prisma migrate deploy`. Requires `MIGRATE_DATABASE_URL` to be available as build/runtime env. Simple but blocks the deploy on migration success.
2. **Manual gate** for risky migrations: SSH to `app-01` (via the bastion), run `pnpm --filter @dutyhive/db exec prisma migrate deploy` once, then promote the deploy.

Foundation: option 1, with the manual fallback for any migration flagged
in the PR description as `MIGRATE: requires manual gate`.

## Healthcheck contract

`/api/health` returns `200 OK` with a small JSON body
(`{ ok: true, service: 'dutyhive-web', ts: <ms> }`). It is deliberately
liveness-only — it does **not** ping the database. Reasoning: a transient DB
issue must not cascade into Coolify killing the container and cycling the
deploy. Readiness for the DB is handled at request time inside
`withAuthContext` (see `packages/auth/src/with-tenant.ts`).

If we add a richer readiness endpoint post-Foundation, point Coolify's
healthcheck at the liveness endpoint and only wire the readiness probe to
external monitoring (Beszel, Cloudflare).

## Local sanity build

Before any deploy, validate the image locally:

```bash
docker build -t dutyhive-web:check .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://… \
  -e BETTER_AUTH_SECRET=… \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  dutyhive-web:check
curl http://localhost:3000/api/health
# → {"ok":true,"service":"dutyhive-web","ts":...}
```

This is the same image Coolify will build server-side. A clean local build
is a release-checklist gate ([`release-checklist.md`](release-checklist.md)).
