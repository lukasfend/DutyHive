# ADR 0004 — Row-Level Security for multi-tenancy

- **Status**: Accepted
- **Date**: 2026-05-04
- **Deciders**: principal

## Context

DutyHive's `business` and `checklist` products are multi-tenant: each customer organisation must see only its own data, and a single application bug must not be enough to leak rows across organisations. The cheapest and safest defence-in-depth boundary in Postgres is **Row-Level Security** — when wired correctly, even a totally compromised application query cannot read another tenant's rows.

Foundation runs a single shared Postgres database across all tenants (R-0002 in the risk register). With one database, three obvious approaches exist:

1. **Application-level filtering** — every query carries a `WHERE organizationId = ?` clause. Easy to forget, single point of failure.
2. **Schema-per-tenant** — each org gets its own Postgres schema. Strong isolation, but breaks the "list all my orgs" query and complicates migrations dramatically.
3. **Database-per-tenant** — strongest isolation, biggest operational cost. Rules out the budget.
4. **Row-Level Security** — Postgres enforces tenant scope at the row level via policies; application supplies the tenant context per request.

## Decision

We use **Row-Level Security on a shared Postgres database**. The boundary is enforced by:

1. **Two Postgres roles**:
   - `dutyhive_app` — `BYPASSRLS = false`. Used by the Next.js app at runtime. Every authenticated request runs in a transaction that calls `set_config('app.current_user_id', …, true)` and `set_config('app.current_organization_id', …, true)`.
   - `dutyhive_migrate` — `BYPASSRLS = true`. Used only by Prisma Migrate and the test setup; never by the running app.
2. **`withAuthContext(req, fn)`** in [packages/auth/src/with-tenant.ts](../../../packages/auth/src/with-tenant.ts) — the canonical entry point for tenant-scoped queries. Opens a Prisma transaction, extracts the session via Better Auth, sets the GUCs, and invokes the caller's function inside the transaction.
3. **Policies** in `packages/db/prisma/migrations/*_rls_baseline*` — see [rls-strategy.md](../rls-strategy.md) for the table-by-table scope.
4. **CI gate** [`infra/scripts/check-rls-coverage.ts`](../../../infra/scripts/check-rls-coverage.ts) — fails the build if a Foundation-owned tenant table lacks an RLS policy. Mitigates R-0002.

## Phase 2 scope (deliberate narrowing)

RLS is enabled in Phase 2 on tables we own and where the access pattern is clean:

- `audit_entry` — tenant-scoped by `organizationId`, INSERT-only for the app role.
- `legal_consent` — user-scoped by `userId`.

RLS is **not** enabled in Phase 2 on Better Auth's own tables (`user`, `session`, `account`, `verification`, `twoFactor`, `organization`, `member`, `invitation`). Better Auth queries those tables outside our `withAuthContext` transaction (e.g. on sign-in we look up users by email before any session exists), so adding policies there would break the auth flow. Tenant access on org/member/invitation is enforced by Better Auth's organization plugin permission system; defence-in-depth RLS on those tables is queued for a later phase when we have the right pattern (likely a second connection pool with a "auth-bypass" role).

## Consequences

### Positive

- A bug in application code that drops the `WHERE organizationId = ?` clause cannot leak data — the database refuses the query.
- The same model handles every future tenant feature without extra design work.
- `BYPASSRLS = false` on the app role means a SQL injection or framework escape cannot bypass the policies either.
- The CI gate catches the most common mistake (new tenant model without policy) before it ships.

### Negative / costs

- Every authenticated request opens an explicit transaction even for read-only work. Slight overhead.
- `set_config(..., true)` is transaction-local, so single-statement queries outside `withAuthContext` either bypass scope (if app role can read at all — defence in depth still holds via privileges) or get zero rows back. The "outside withAuthContext" path is allowed only for un-scoped contexts.
- Postgres `INSERT ... RETURNING` with RLS requires the new row to ALSO satisfy the SELECT policy. We discovered this when the audit-log hook tried to insert a NULL-org row with an actor that did not match an empty `app.current_user_id`. Fix: `auditLog()` opens its own GUC-set transaction. Documented in [audit-log.md](../audit-log.md).
- Schema-per-tenant gives stronger isolation than RLS in theory; we accept the cost trade-off.

### Neutral

- The `current_setting(name, true)` second argument returns NULL when the GUC is unset, instead of erroring. We use this so policies behave predictably outside transactions.
- Migrations run with the migrate role, which has `BYPASSRLS = true`. The init migration bootstraps the policies; subsequent product migrations that add tenant tables MUST also add `ENABLE ROW LEVEL SECURITY` and the corresponding policies — the CI gate enforces this.

## Alternatives considered

- **Application-level filtering only** — too easy to forget. Rejected.
- **Schema-per-tenant** — see Context. Rejected for the cross-cutting query cost.
- **Database-per-tenant** — operational cost outside the budget. Rejected.
- **Sequelize-style hooks** — pure ORM-level filtering with no DB enforcement. Same problem as application-level. Rejected.

## References

- Related ADRs: [0003 (Better Auth)](0003-better-auth.md), [0008 (Postgres 17)](0008-postgres-17.md).
- Postgres RLS docs: <https://www.postgresql.org/docs/17/ddl-rowsecurity.html>
- Risk register: [R-0002 (RLS policy gap)](../../quality/risk-register.md#r-0002--rls-policy-gap--cross-tenant-data-leak), [R-0004 (audit log tampering)](../../quality/risk-register.md#r-0004--audit-log-tampering).
