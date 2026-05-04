# Environment Variables Guide

> Phase 2: extended with database role contract and dev defaults.
> Expanded further in Phase 5 with full per-env contracts.

All env vars are validated by `@dutyhive/env`. Adding/changing vars **requires** updating:

1. `packages/env/src/server.ts` or `packages/env/src/client.ts`
2. `apps/web/.env.example` (with comment)
3. This file (with rotation/owner notes)

## Apps/web variables

See `apps/web/.env.example` for the canonical list. Comments in that file explain each variable.

## Database roles (Phase 2)

Two Postgres roles enforce multi-tenancy:

| Role               | `BYPASSRLS` | Used by                        | Dev password           |
| ------------------ | ----------- | ------------------------------ | ---------------------- |
| `dutyhive_app`     | false       | Next.js runtime, every request | `dev_app_password`     |
| `dutyhive_migrate` | true        | Prisma Migrate CLI, test setup | `dev_migrate_password` |

The dev passwords are intentionally fixed and only ever live inside the local Docker network. They are bootstrapped by `infra/docker/postgres/init/02-roles.sql` on the first `up`.

To rotate a dev password, edit the init SQL and run:

```bash
docker compose -f infra/docker/docker-compose.dev.yml down -v
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

(`down -v` drops the data volume — local-only convenience).

Production passwords are 32-char random secrets injected by Coolify (Phase 6).

## Mail (Phase 2 / Phase 4)

In dev, Better Auth, magic-link, and any other transactional flows all send through **Mailpit** at `localhost:1025`. Mailpit catches every outgoing message and exposes them at <http://localhost:8025>. There is no real outbound mail in development.

In production (Phase 4 onward), `@dutyhive/email` switches the backend to Resend EU. Mailpit is dev-only.

| Variable         | Dev default            | Production          |
| ---------------- | ---------------------- | ------------------- |
| `SMTP_HOST`      | `localhost`            | unused (Resend)     |
| `SMTP_PORT`      | `1025`                 | unused (Resend)     |
| `RESEND_API_KEY` | empty                  | `re_xxx` (required) |
| `RESEND_FROM`    | `noreply@dutyhive.com` | same                |

A boot-time check in `@dutyhive/email` (Phase 4) refuses to start when `NODE_ENV === 'production'` and `RESEND_API_KEY` is missing — see risk register R-0010.

## Rotation policy (Phase 5 expansion)

| Variable              | Rotation                   | Owner  | Notes                                                                                               |
| --------------------- | -------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`  | yearly + on suspected leak | DevOps | Affects existing sessions; rolling rotation possible                                                |
| `AUDIT_HASH_SALT`     | yearly                     | DevOps | Old hashes remain valid for old data; new entries use new salt — document salt-version in audit row |
| `RESEND_API_KEY`      | per personnel change       | DevOps | Resend dashboard supports multiple keys                                                             |
| `TRIGGER_SECRET_KEY`  | per personnel change       | DevOps | Trigger.dev dashboard                                                                               |
| `S3_*`                | yearly                     | DevOps | Hetzner Object Storage                                                                              |
| `dutyhive_app` pw     | per personnel change       | DevOps | Coolify-managed in prod; dev value never leaves the laptop                                          |
| `dutyhive_migrate` pw | per personnel change       | DevOps | Same                                                                                                |
