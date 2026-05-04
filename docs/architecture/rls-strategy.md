# RLS strategy

> Companion to [ADR 0004](adr/0004-rls-multi-tenancy.md). Practical guide for adding new tenant tables and writing tenant-scoped queries.

## TL;DR

- Two Postgres roles: `dutyhive_app` (BYPASSRLS=false), `dutyhive_migrate` (BYPASSRLS=true).
- `withAuthContext(req, fn)` is the **only blessed path** to tenant-scoped queries.
- Each authenticated request opens a Prisma transaction and runs `set_config('app.current_user_id', …, true)` + `set_config('app.current_organization_id', …, true)` before the user's queries.
- RLS policies reference `current_setting('app.current_organization_id', true)` and `current_setting('app.current_user_id', true)`.
- New tenant tables MUST add an `ENABLE ROW LEVEL SECURITY` line and a policy in the same migration. The CI gate [`infra/scripts/check-rls-coverage.ts`](../../infra/scripts/check-rls-coverage.ts) blocks merges that skip this.

## How a request flows

```
HTTP request
  └─> Next.js route handler in apps/web/app/...
        └─> withAuthContext(req, async (ctx, tx) => { ... })   [packages/auth/src/with-tenant.ts]
              ├─> auth.api.getSession({ headers: req.headers })
              ├─> prisma.$transaction(tx => withTenant(tx, ctx, fn))
              │     └─> set_config('app.current_user_id', ctx.userId, true)
              │     └─> set_config('app.current_organization_id', ctx.organizationId ?? '', true)
              │     └─> fn(ctx, tx)   ← your business logic — uses tx, not prisma
              └─> commit (transaction-local GUCs auto-reset)
```

**Why transaction-local (`true` as the third arg of `set_config`)?** Settings reset automatically on `COMMIT` or `ROLLBACK`. Even if a connection is re-used from the pool for a different request, the previous request's GUCs cannot leak.

## Phase 2 RLS scope

| Table              | RLS in Phase 2   | Reason                                                                                                                                                                                                                      |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit_entry`      | ✅ enabled       | Tenant data we own; append-only enforcement at the privilege level.                                                                                                                                                         |
| `legal_consent`    | ✅ enabled       | User-personal records.                                                                                                                                                                                                      |
| `email_subscriber` | ❌ no            | Public-anonymous-write, admin-read. RLS would block the signup endpoint.                                                                                                                                                    |
| `user`             | ❌ no            | Better Auth needs unscoped reads on sign-in (look up by email before any session).                                                                                                                                          |
| `session`          | ❌ no            | Same.                                                                                                                                                                                                                       |
| `account`          | ❌ no            | Same.                                                                                                                                                                                                                       |
| `verification`     | ❌ no            | Same.                                                                                                                                                                                                                       |
| `twoFactor`        | ❌ no            | Same.                                                                                                                                                                                                                       |
| `organization`     | ❌ no (deferred) | Better Auth's organization plugin enforces tenant access at the plugin layer. Defence-in-depth RLS is queued for a later phase once we have the right pattern (likely a second connection pool with an "auth-bypass" role). |
| `member`           | ❌ no (deferred) | Same.                                                                                                                                                                                                                       |
| `invitation`       | ❌ no (deferred) | Same.                                                                                                                                                                                                                       |

## Adding a new tenant table

For a table that stores per-organisation data:

1. Add the model to `schema.prisma` with an `organizationId String` foreign key.
2. Generate the migration: `pnpm --filter @dutyhive/db exec prisma migrate dev --name <feature_table>`.
3. **In a follow-up migration** (or the same one, in a `-- RLS` section), add:

   ```sql
   ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;

   CREATE POLICY tenant_isolation ON "<table>"
     FOR ALL
     TO dutyhive_app
     USING ("organizationId" = current_setting('app.current_organization_id', true))
     WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
   ```

4. Add the table name to `TENANT_SCOPED_TABLES` in [`infra/scripts/check-rls-coverage.ts`](../../infra/scripts/check-rls-coverage.ts).
5. Run `pnpm check:rls`. If it fails, fix; do not skip.
6. Add a Vitest integration test verifying cross-org isolation and WITH-CHECK rejection (use [packages/db/src/**tests**/rls.test.ts](../../packages/db/src/__tests__/rls.test.ts) as a template).

## Adding a new user-scoped table

For a table where each row belongs to exactly one user (consents, personal preferences, …):

1. Add the model with a `userId String` field and `User` relation.
2. Migration with:

   ```sql
   ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "<table>" FORCE ROW LEVEL SECURITY;

   CREATE POLICY user_self ON "<table>"
     FOR ALL
     TO dutyhive_app
     USING ("userId" = current_setting('app.current_user_id', true))
     WITH CHECK ("userId" = current_setting('app.current_user_id', true));
   ```

3. Add to `USER_SCOPED_TABLES` in `check-rls-coverage.ts`.
4. Add a Vitest integration test.

## Tricky case: INSERT … RETURNING with NULL-org rows

Postgres requires the SELECT policy's `USING` to also pass when an INSERT uses `RETURNING`. We hit this with `auth.signup` audit rows:

- Audit row: `organizationId = NULL`, `actorUserId = <new user id>`.
- App role inside an `withAuthContext` transaction has `app.current_user_id = <new user id>` and `app.current_organization_id = ''`.
- The original `tenant_select` policy excluded NULL-org rows entirely → INSERT … RETURNING failed.

The fix lives in migration `20260504185613_audit_entry_actor_self_select`: the SELECT policy now exposes NULL-org rows authored by the current user. Concretely:

```sql
USING (
  ("organizationId" IS NOT NULL AND "organizationId" = current_setting('app.current_organization_id', true))
  OR
  ("organizationId" IS NULL AND "actorUserId" IS NOT NULL AND "actorUserId" = current_setting('app.current_user_id', true))
);
```

When you next find yourself fighting RLS on RETURNING, check whether your SELECT policy can read the row you just inserted.

## Privileges layered with policies

Privileges (`GRANT … ON … TO dutyhive_app`) are evaluated **before** RLS. RLS only narrows what the role would otherwise be allowed to do. So:

- `audit_entry` has `REVOKE UPDATE, DELETE FROM dutyhive_app` — UPDATE/DELETE fail with "permission denied" before RLS even runs. R-0004 mitigation.
- `audit_entry` has `GRANT SELECT, INSERT TO dutyhive_app` — RLS then narrows what SELECT/INSERT can touch.

Both layers exist deliberately: privileges are the coarse boundary, RLS is the per-row scope.

## Test infrastructure

Integration tests run against a separate `dutyhive_test` database that is dropped and recreated on every `pnpm test` (see [packages/db/test/global-setup.ts](../../packages/db/test/global-setup.ts)). All migrations re-apply against the fresh test DB so policies and grants match what production sees.

For Phase 2 we run RLS tests sequentially (`fileParallelism: false`). When the test count grows, switch to true schema-per-worker by giving each Vitest worker its own `worker_<id>` schema and a `?schema=worker_<id>` URL parameter.
