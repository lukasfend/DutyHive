# Release Checklist

> Pre-tag verification matrix. Run before every `v0.1.0-foundation.<n>` tag and
> every production-affecting deploy. Each row must be ✓ before tagging. Pairs
> with [`docs/quality/release-procedure.md`](../quality/release-procedure.md)
> (the procedural _how_) — this file is the operational checklist (the _what_).

## Code gates (local)

Run from the repo root.

- [ ] `pnpm typecheck` — clean (12/12 packages)
- [ ] `pnpm lint --max-warnings=0` — clean
- [ ] `pnpm format:check` — clean
- [ ] `pnpm test` — clean (Vitest unit + RLS integration suite)
- [ ] `pnpm check:rls` — clean (CI gate `infra/scripts/check-rls-coverage.ts`)
- [ ] `pnpm --filter @dutyhive/web test:e2e` — clean (Playwright; requires `pnpm test:e2e:install` once)
- [ ] `pnpm --filter @dutyhive/web build` — clean (Next 16 Turbopack production build)
- [ ] `docker build -t dutyhive-web:check .` — clean (production image builds from repo `Dockerfile`)

## Infrastructure gates (Hetzner)

References below point to the matching phase in
[`setup-hetzner-from-scratch.md`](setup-hetzner-from-scratch.md).

- [ ] **Networking** (Phase B): private network `10.0.1.0/24` reachable; firewalls `edge-mgmt`, `edge-app`, `edge-internal` attached to the right hosts via label selectors
- [ ] **SSH** (Phase D, E): bastion-only access via `mgmt-01`; `PermitRootLogin no`, `PasswordAuthentication no`, `ssh.service` (not `ssh.socket`); `fail2ban` active on all three VPSes
- [ ] **DB** (Phase G): `dutyhive_app` (BYPASSRLS=false) + `dutyhive_migrate` (BYPASSRLS=true) bootstrapped; TLS on; `listen_addresses` private only; `pg_hba.conf` restricts host-IP ranges to private subnet
- [ ] **App build** (Phase H): Coolify deploys from a tagged commit using the repo `Dockerfile` (see [`coolify-build.md`](coolify-build.md)); healthcheck `/api/health` returns 200; all production env vars set per [`env-guide.md`](env-guide.md) and [`coolify-secrets.md`](coolify-secrets.md)
- [ ] **Auth**: Better Auth boots without errors; magic-link mail delivers via Resend in <30s; cross-subdomain session cookies set on `.${ROOT_DOMAIN}`
- [ ] **Mail** (Phase J, K): Resend domain verified (SPF, DKIM, DMARC); SPF record merges Resend and Cloudflare Email Routing as per Phase J's merge note
- [ ] **DNS** (Phase I): Cloudflare nameservers active; A records for apex + `app`, `planner`, `business`, `checklist` point to `app-01`; DNS-only (orange cloud off) so HTTP-01 challenge can complete; `dutyhive.com` zone signed (DNSSEC) once nameserver migration settles
- [ ] **Observability** (Phase L, plus app-side Sentry from Phase 5): Sentry receiving events from `app-01` (test event from `/api/health` debug fan-out), pino logs visible in Coolify stdout, Beszel hub on `mgmt-01` shows agents from `app-01` and `db-01`
- [ ] **Backups** (Phase M): latest `pg_dump` GPG-encrypted on Storage Box; restore-drill performed within last 30 days (log row below)

## Compliance gates

- [ ] Subprocessor list in [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md) matches running services (no rogue dependency added since the last release)
- [ ] Legal pages render correctly: `/impressum`, `/datenschutz`, `/agb` on the marketing subdomain
- [ ] Audit-log writes verified for at least: `auth.signup`, `auth.login`, `newsletter.subscribe.{requested,confirmed,unsubscribed}`
- [ ] No GDPR-relevant subprocessor swap since last release without a DPA-checklist update

## Tagging

- [ ] All gates above are ✓
- [ ] `docs/quality/change-log.md` `[Unreleased]` block lifted into a new `v<version>` entry with today's ISO date
- [ ] `package.json` `version` bumped per [`docs/quality/versioning.md`](../quality/versioning.md)
- [ ] `git tag -s v<version>` (signed) on the verified commit
- [ ] `git push --tags` → Coolify auto-deploy triggers from the tag

## Restore-drill log

Append a new row each time you perform a backup-restore drill (target: at least monthly).

| Date       | Backup file                    | Result | Operator | Notes                        |
| ---------- | ------------------------------ | ------ | -------- | ---------------------------- |
| 2026-MM-DD | `pgdump-YYYYMMDD-HHMM.sql.gpg` | ✓ / ✗  | LF       | Restored to db-01 staging DB |
