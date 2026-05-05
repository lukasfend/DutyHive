# Coolify secrets — storage, rotation, leak response

> How runtime and build-time secrets are stored, mounted, rotated, and
> revoked for the production `dutyhive-web` Coolify app. Pairs with
> [`coolify-build.md`](coolify-build.md) (which classifies each variable
> by build-time vs runtime), [`env-guide.md`](env-guide.md) (developer-side
> handling), and [`apps/web/.env.example`](../../apps/web/.env.example)
> (the canonical variable list).

## Storage

Coolify keeps every application's environment variables in its own
internal Postgres on `mgmt-01`, encrypted at rest. The encryption key
lives in Coolify's host filesystem (`/data/coolify/source/.env` on the
mgmt VPS) — it is therefore as sensitive as the secrets it protects.
Backups of the Coolify mgmt host (Phase M of the Hetzner runbook) must
include this file, and the backup itself must be encrypted (it already
is — pg_dump → GPG → Storage Box).

The Coolify UI displays values in masked form; the raw values are
visible only when explicitly revealed.

## Mounting

At container start Coolify injects each runtime ENV variable into the
container as a plain `process.env.*` value. The image itself does **not**
contain secrets (with one nuance below).

The nuance: Next.js bakes any variable prefixed `NEXT_PUBLIC_` into the
client bundle at **build time**. That means `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_APP_VERSION`, etc. are present in the served JavaScript and
must be considered public-by-design. Don't put anything sensitive behind
`NEXT_PUBLIC_*`. Build-time secrets that should not leak into the client
bundle (e.g. `SENTRY_AUTH_TOKEN` for source-map upload) must NOT carry
the `NEXT_PUBLIC_` prefix.

## Build-time vs runtime split

| Variable                                          | Build/Runtime      | Sensitive?                       |
| ------------------------------------------------- | ------------------ | -------------------------------- |
| `GIT_SHA`                                         | build              | no                               |
| `NEXT_PUBLIC_APP_VERSION`                         | build              | no                               |
| `NEXT_PUBLIC_SENTRY_DSN`                          | build              | low (DSN is a public identifier) |
| `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SITE_URL` | build              | no                               |
| `SENTRY_ORG`, `SENTRY_PROJECT`                    | build              | no                               |
| `SENTRY_AUTH_TOKEN`                               | build              | **yes** — keep server-side only  |
| `DATABASE_URL`                                    | runtime            | **yes**                          |
| `MIGRATE_DATABASE_URL`                            | runtime            | **yes**                          |
| `BETTER_AUTH_SECRET`                              | runtime            | **yes** (session signing)        |
| `BETTER_AUTH_URL`                                 | runtime            | no                               |
| `RESEND_API_KEY`, `RESEND_FROM`                   | runtime            | **yes** / no                     |
| `SENTRY_DSN`                                      | runtime            | low                              |
| `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`       | runtime            | no / **yes**                     |
| `S3_ENDPOINT`, `S3_BUCKET`                        | runtime            | no                               |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`                  | runtime            | **yes**                          |
| `AUDIT_HASH_SALT`                                 | runtime            | **yes**                          |
| `LOG_LEVEL`                                       | runtime            | no                               |
| `SMTP_HOST`, `SMTP_PORT`                          | runtime (dev only) | no                               |

The full descriptions live in [`env-guide.md`](env-guide.md).

## Rotation cadence

| Variable                                               | Cadence             | Side effect of rotation                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                                   | quarterly           | **All sessions invalidated** — every signed-in user is logged out. Communicate beforehand if there are real users.                                                                                                        |
| `RESEND_API_KEY`                                       | on suspicion / leak | Old key keeps working until revoked in Resend; rotate by creating a new key, swap, then revoke the old.                                                                                                                   |
| `TRIGGER_SECRET_KEY`                                   | on suspicion / leak | Same flow as Resend — Trigger.dev allows multiple active keys.                                                                                                                                                            |
| `SENTRY_AUTH_TOKEN`                                    | on suspicion / leak | Build-time only; rotation just means the next deploy uploads source maps with the new token.                                                                                                                              |
| DB role passwords (`dutyhive_app`, `dutyhive_migrate`) | yearly              | Requires a maintenance window — change in Postgres, then in Coolify env, then redeploy.                                                                                                                                   |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`                      | yearly              | Mint a new pair in Hetzner Object Storage, swap, then delete the old pair.                                                                                                                                                |
| `AUDIT_HASH_SALT`                                      | yearly              | **Historical hash comparisons break** — IPs/UAs hashed before rotation cannot be matched against post-rotation hashes. Document the rotation date in `docs/quality/change-log.md` so audit-log queries can scope by date. |

Add a calendar reminder for each cadence row. The principal is the
release manager and the security/privacy custodian (see
[`docs/quality/software-development-plan.md`](../quality/software-development-plan.md)).

## Routine rotation procedure

1. **Generate** the new value (`openssl rand -base64 48` for symmetric
   secrets; provider-side for API keys; `ALTER ROLE … PASSWORD …` for DB
   roles).
2. **Stage** the new value as a Coolify env var. For most secrets you
   can keep both the old and the new active simultaneously (Resend,
   Trigger.dev, Sentry) — swap, verify, then revoke the old.
3. **Restart** the Coolify app (Coolify will re-inject envs and restart
   the container).
4. **Verify** the affected subsystem:
   - DB rotation → run `SELECT 1` via the app's health-impacted code path.
   - Mail rotation → trigger a magic-link send via Better Auth.
   - Better Auth rotation → log in fresh; old sessions should be invalid.
5. **Revoke** the old value provider-side (Resend dashboard, Trigger
   dashboard, Hetzner Object Storage, etc.).
6. **Log** the rotation in [`docs/quality/change-log.md`](../quality/change-log.md)
   under the next `[Unreleased]` section. Record what was rotated,
   the date, and the reason. **Never** record the value itself.

## Emergency rotation (suspected leak)

When a secret may have leaked (committed to a public branch, emailed,
posted to a chat, found in a log dump, etc.):

1. **Immediate** — generate the replacement value first, before touching
   the live value. You want as little time as possible between revocation
   and the new value taking effect.
2. **Set** the new value in Coolify and restart the app.
3. **Revoke** the old value provider-side **immediately** after step 2
   verifies the new value works. For DB-role passwords, change the role
   password to a new random value (this implicitly revokes the old).
4. **Audit** what could have been done with the leaked value while it
   was live. For tokens with read access (Sentry, Trigger.dev): pull
   recent activity logs. For tokens with write access (Resend, S3,
   `BETTER_AUTH_SECRET`): the blast radius is wider — see the per-secret
   guidance below.
5. **Risk-register entry** — add a row to
   [`docs/quality/risk-register.md`](../quality/risk-register.md)
   describing the incident, mitigation, and follow-up. Tag the row with
   today's date.
6. **Change-log entry** in `docs/quality/change-log.md` describing
   _what_ was rotated and _why_ (no values).

### Per-secret leak blast radius

- **`BETTER_AUTH_SECRET`** — anyone with the secret can forge sessions.
  Rotation invalidates all current sessions; check `audit_entry` for
  unexpected `auth.login` rows from before the rotation.
- **`DATABASE_URL` (app role)** — read/write to all tenant data subject
  to RLS. RLS holds even with the password, but tenant-isolation only
  works if the role doesn't have BYPASSRLS. Confirm `dutyhive_app`'s
  flag before assuming RLS coverage.
- **`MIGRATE_DATABASE_URL` (migrate role)** — BYPASSRLS=true; full
  multi-tenant access. Treat a leak here as the worst case: rotate
  immediately, audit `audit_entry` for cross-tenant reads in the
  exposure window, and consider customer notification under Art. 33
  GDPR (72-hour clock).
- **`RESEND_API_KEY`** — phishing/spoof potential under the verified
  domain. Pull Resend's send log for the exposure window; preserve a
  copy in case investigation is needed.
- **`AUDIT_HASH_SALT`** — historical IP/UA hashes can be brute-forced
  more easily once the salt is known. The salt does not protect the
  audit-log content itself; if it leaked alongside an audit-log dump,
  treat the dump as containing semi-pseudonymous data and notify
  accordingly.

## Subprocessor cross-reference

Every secret here ties to a row in
[`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md). When adding
a new secret category, update that file in the same PR.

## Where things live

- Coolify UI: app → **Environment Variables** tab — runtime envs.
- Coolify UI: app → **Build Environment Variables** — build-time envs.
- [`apps/web/.env.example`](../../apps/web/.env.example) — canonical list.
- [`packages/env`](../../packages/env) — Zod schema validating each var on boot.
- [`docs/guides/setup-hetzner-from-scratch.md`](setup-hetzner-from-scratch.md) Phase H.7 — initial production-env values.
