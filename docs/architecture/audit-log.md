# Audit log

> Foundation Phase 2. UI deferred — events are written from day 1; reading happens via psql or the future admin panel.

## What we audit

Every meaningful state change touches `audit_entry`. The intent is forensic: months later, given an incident, we want to reconstruct who did what when. Concretely Foundation Phase 2 wires:

| Action        | Trigger                 | Source                                                          |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| `auth.signup` | New user row created    | `databaseHooks.user.create.after` in `@dutyhive/auth/server`    |
| `auth.login`  | New session row created | `databaseHooks.session.create.after` in `@dutyhive/auth/server` |

Phase 4+ extend the taxonomy: `auth.password_change`, `auth.failed_login`, `org.member.invited`, `org.member.removed`, `legal.consent.recorded`, …

## Event naming

`<domain>.<resource>.<verb>`, lowercase, dot-separated. The grammar is enforced by review only — no runtime check.

- `auth.*` — anything touching identity or session state.
- `org.*` — organisation membership changes.
- `legal.*` — DSGVO/AGB consent records.
- Future product domains: `planner.*`, `business.*`, `checklist.*`.

## Calling `auditLog`

```ts
import { auditLog } from '@dutyhive/audit';

await auditLog({
  action: 'org.member.invited',
  actorUserId: ctx.userId,
  organizationId: ctx.organizationId,
  resourceType: 'invitation',
  resourceId: invitation.id,
  payload: { email: invitation.email, role: invitation.role },
  request: { ip: req.ip, userAgent: req.headers.get('user-agent') },
  tx, // optional: pass the surrounding transaction
});
```

Two execution paths:

- **Inside a transaction** (`tx` provided): writes the row in the caller's transaction so the audit commits or rolls back atomically with the surrounding work. Useful inside `withAuthContext` server actions.
- **Standalone** (`tx` omitted): opens a private transaction and sets `app.current_user_id` and `app.current_organization_id` from the input so the `audit_entry` SELECT policy permits `INSERT ... RETURNING`. Used by Better Auth's `databaseHooks` which fire outside our `withAuthContext`.

## Why explicit calls, not Prisma middleware?

Prisma middleware would auto-log every write — easy to set up, terrible to maintain. Three concrete reasons we use explicit calls:

1. Hidden writes inside RLS-set-config transactions are bug-prone — the audit insert runs with the same GUCs as the surrounding query, so a forgotten `set_config` for the audit context leads to confusing failures.
2. The action vocabulary is a deliberate API surface. We want code review to see "this introduces a new `org.member.invited` event" — not silently happen because someone called `prisma.member.create`.
3. Some events do not correspond to a single DB write (`auth.failed_login`, `webhook.received`). A middleware-only model would miss them.

## PII handling

The `audit_entry` row stores:

- `actorUserId` — references `User.id`, which is itself an opaque token, not PII.
- `organizationId` — references `Organization.id`.
- `payload` — JSON. Callers MUST keep this PII-free: no raw emails, no IP addresses, no names. `email: <hash>` or `userId: <id>` only.
- `ipHash` — `sha256(AUDIT_HASH_SALT || raw_ip)`. Lets us correlate events from the same IP without storing the IP.
- `userAgentHash` — same treatment.

The salt rotates yearly. After rotation, old hashes remain valid for old data, but post-rotation IPs do not link to pre-rotation hashes. Document the rotation in `docs/quality/change-log.md`.

## Append-only enforcement

The application role (`dutyhive_app`) has been granted `SELECT, INSERT` on `audit_entry`. UPDATE and DELETE are explicitly REVOKED (migration `20260504184311_audit_entry_revoke_writes`). This is the database-level R-0004 mitigation: even with full SQL injection or framework escape, the auth role cannot tamper with audit history.

Forensic operators query via the `dutyhive_migrate` role (BYPASSRLS=true) or by direct `dutyhive` superuser access.

## Tenant scope

- Rows with a non-null `organizationId` are visible only to members of that org via the `tenant_select` RLS policy (`organizationId = current_setting('app.current_organization_id', true)`).
- Rows with `organizationId = NULL` (global events like `auth.signup` before any org join) are visible **only to their actor**, via the actor-self branch of the same policy. Operators see them via the migrate role.
- Cross-tenant inserts fail with a `WITH CHECK` violation.

See [rls-strategy.md](rls-strategy.md) for the policy details.

## Inspecting the log

Local dev:

```bash
docker exec -e PGPASSWORD=dev_app_password dutyhive_postgres \
  psql -U dutyhive -d dutyhive_dev \
  -c 'SELECT "createdAt", action, "actorUserId", "organizationId" FROM audit_entry ORDER BY "createdAt" DESC LIMIT 50;'
```

Production: planned for Phase 7+ (admin panel UI, or via Coolify-tunnelled `prisma studio`).

## Future work (post-Foundation)

- UI for log viewing (filtered by actor, action, resource, time range).
- Append-only object-storage shipping for tamper-evidence beyond the database (R-0004 residual mitigation).
- Salt rotation tooling.
- Action-vocabulary enforcement via a typed enum/registry.
