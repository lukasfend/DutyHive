# Risk Register

> Living document. Updated at least once per Foundation phase and on any incident or new feature design. Each entry is a real, plausible risk — no hypothetical "what if a meteor hits the data center" entries.

## Schema

| Field       | Meaning                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| ID          | `R-NNNN` stable identifier. Never reused.                                                    |
| Hazard      | What can go wrong.                                                                           |
| Likelihood  | low / medium / high before mitigation                                                        |
| Impact      | low / medium / high (data integrity, confidentiality, availability, financial, reputational) |
| Mitigations | What we do to reduce likelihood or impact.                                                   |
| Residual    | low / medium / high after mitigation                                                         |
| Owner       | Who watches this risk (in solo-dev phase: always the principal).                             |
| Status      | open / mitigated / accepted / closed                                                         |
| Last review | YYYY-MM-DD                                                                                   |

## Active risks

### R-0001 — Authentication bypass / session theft

- **Hazard:** an attacker obtains a valid session and acts as another user.
- **Likelihood:** medium (auth is a perpetual target).
- **Impact:** high (cross-tenant data access if combined with R-0002).
- **Mitigations:**
  - Better Auth with secure cookie defaults; cross-subdomain cookies scoped to `.dutyhive.com` only.
  - HTTPS-only in production (Coolify Caddy auto-TLS).
  - Session expiry (30 days max) + rolling renewal.
  - Email verification before sign-in (`requireEmailVerification: true`).
  - 2FA available (Foundation: plugin enabled, UI deferred).
  - Audit log on auth events (`auth.login`, `auth.failed_login`, `auth.password_change`).
- **Residual:** low.
- **Owner:** principal. **Status:** open. **Last review:** 2026-05-04.

### R-0002 — RLS policy gap → cross-tenant data leak

- **Hazard:** a model storing tenant data lacks an RLS policy, or a policy has a logic bug, allowing one organization's user to read or modify another organization's rows.
- **Likelihood:** medium (RLS is easy to forget when adding a new model).
- **Impact:** high (regulatory + customer trust).
- **Mitigations:**
  - CI gate `infra/scripts/check-rls-coverage.ts` fails the build when a model with `organizationId` lacks an RLS policy.
  - Vitest integration tests assert cross-org isolation per tenant model.
  - Application role `dutyhive_app` has `BYPASSRLS = false`.
  - `withAuthContext` wrapper is the only blessed path to tenant-scoped queries.
- **Residual:** low.
- **Owner:** principal. **Status:** mitigated (CI gate active, Phase 2). **Last review:** 2026-05-04.

### R-0003 — Brute-force on login endpoint

- **Hazard:** automated credential stuffing or password spraying.
- **Likelihood:** high (generic, automated).
- **Impact:** medium (per-account; protected by 2FA-when-enabled and email verification).
- **Mitigations:**
  - Better Auth rate-limiting on the auth endpoints.
  - Cloudflare in front (Phase 6) — optional WAF / bot-fight rules for `/api/auth/*`.
  - Audit log on `auth.failed_login`.
- **Residual:** low–medium.
- **Owner:** principal. **Status:** open. **Last review:** 2026-05-04.

### R-0004 — Audit log tampering

- **Hazard:** an attacker with DB access edits or deletes audit entries to cover tracks.
- **Likelihood:** low (requires DB compromise).
- **Impact:** high (forensic blindness).
- **Mitigations:**
  - DB role `dutyhive_app` has SELECT and INSERT only on `audit_entry`. UPDATE and DELETE are REVOKED (migration `20260504184311_audit_entry_revoke_writes`). Verified by integration tests in `packages/db/src/__tests__/rls.test.ts`.
  - Backups snapshot the audit table (Phase 7).
  - Future: append-only object-storage shipping of audit entries (post-Foundation).
- **Residual:** medium (mitigation is database-only; physical DB compromise still possible).
- **Owner:** principal. **Status:** mitigated (granular grants enforced in Phase 2). **Last review:** 2026-05-04.

### R-0005 — PII leak via logs / Sentry

- **Hazard:** request bodies, error contexts, or stack-trace local variables expose user PII (emails, tokens, IPs) to logs or Sentry.
- **Likelihood:** medium (default frameworks log liberally).
- **Impact:** medium (regulatory under GDPR Art. 32).
- **Mitigations:**
  - `@dutyhive/logger` redacts known PII paths (`*.password`, `*.token`, `*.session`, `email`, headers).
  - Sentry `beforeSend` strips PII unless explicitly allowed.
  - Audit hashing: IP and User-Agent stored as `sha256(salt+value)`, never raw.
- **Residual:** low.
- **Owner:** principal. **Status:** open (logger Phase 5). **Last review:** 2026-05-04.

### R-0006 — Database backup compromise

- **Hazard:** Storage Box credentials leak; an attacker downloads a backup containing user data.
- **Likelihood:** low.
- **Impact:** high.
- **Mitigations:**
  - `pg_dump` output GPG-encrypted before transfer to Storage Box.
  - Storage Box SSH key separate from app SSH keys.
  - Backup encryption key not stored on app or db servers.
- **Residual:** low.
- **Owner:** principal. **Status:** open (Phase 7). **Last review:** 2026-05-04.

### R-0007 — Coolify SPOF on management VPS

- **Hazard:** management VPS goes down → no deploys until recovered.
- **Likelihood:** medium (single VPS).
- **Impact:** medium (production keeps running, deploys blocked).
- **Mitigations:**
  - App and DB are independent of Coolify at runtime — Coolify orchestrates, doesn't serve traffic.
  - Coolify config backed up weekly to Storage Box; recovery instructions in `docs/guides/setup-hetzner-from-scratch.md`.
- **Residual:** medium (acceptable for solo-dev phase).
- **Owner:** principal. **Status:** accepted. **Last review:** 2026-05-04.

### R-0008 — Misclassification of feature → accidental MDR scope

- **Hazard:** a future feature crosses into clinical territory — patient data, clinical decision support, triage — making the platform MDSW under MDR by virtue of its claimed Intended Purpose. This would either expose us to non-compliance penalties or force a panicked redesign.
- **Likelihood:** medium (the temptation is real when customers ask).
- **Impact:** high (regulatory, financial, reputational).
- **Mitigations:**
  - [`non-medical-device-statement.md`](non-medical-device-statement.md) names the absolute guardrails.
  - [`intended-purpose-register.md`](intended-purpose-register.md) documents per-tool "out of scope."
  - Feature triage process: any new feature touching patient context is rejected before implementation.
  - Negative-Abgrenzung in `docs/legal/agb.de.md` documents the legal position.
- **Residual:** low (with guardrails enforced).
- **Owner:** principal. **Status:** open (guardrails active). **Last review:** 2026-05-04.

### R-0009 — Dependency supply-chain compromise

- **Hazard:** a malicious version of an npm dependency steals secrets or injects code.
- **Likelihood:** low–medium (industry-wide concern).
- **Impact:** high.
- **Mitigations:**
  - Lockfile committed (`pnpm-lock.yaml`), reproducible installs.
  - Dependency updates reviewed (no unattended `pnpm update`).
  - Renovate / Dependabot post-Foundation.
- **Residual:** medium.
- **Owner:** principal. **Status:** open. **Last review:** 2026-05-04.

### R-0010 — Mailpit / dev-mode SMTP leakage to prod

- **Hazard:** dev SMTP target accidentally configured in production, real users' emails captured by Mailpit instead of being delivered.
- **Likelihood:** low (env-validation should catch).
- **Impact:** medium (verification mails not delivered, users blocked).
- **Mitigations:**
  - `@dutyhive/email` selects backend by `NODE_ENV` (Resend in prod, Mailpit in dev), with explicit env-key requirement (`RESEND_API_KEY` mandatory in prod).
  - Boot-time check: if `NODE_ENV === 'production'` and no `RESEND_API_KEY`, refuse to start.
- **Residual:** low.
- **Owner:** principal. **Status:** open (Phase 4). **Last review:** 2026-05-04.

### R-0011 — Vercel-as-registrar lock-in / DNS-control loss

- **Hazard:** Vercel registrar account lockout or policy change blocks DNS or domain renewal.
- **Likelihood:** low.
- **Impact:** high (loss of control over `dutyhive.com`).
- **Mitigations:**
  - DNS migrated to Cloudflare (Phase 6) — registrar holds the domain only, no data plane.
  - Domain auto-renew enabled, billing email monitored.
  - Migration to Cloudflare Registrar planned post-Foundation (`docs/guides/dns-migration.md`).
- **Residual:** low.
- **Owner:** principal. **Status:** open. **Last review:** 2026-05-04.

## Closed risks

_(none yet — register established 2026-05-04)_

## Review log

| Date       | Reviewer  | Changes                                                                                                                                                                    |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-04 | principal | Initial register established with R-0001 through R-0011.                                                                                                                   |
| 2026-05-04 | principal | Phase 2 closeout: R-0002 status → mitigated (CI gate `check-rls-coverage.ts` active). R-0004 status → mitigated (audit_entry granular grants enforced + integration test). |
