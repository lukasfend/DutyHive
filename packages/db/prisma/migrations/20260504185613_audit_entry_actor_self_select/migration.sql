-- DutyHive — audit_entry self-actor visibility for global events.
--
-- The original `tenant_select` policy excluded NULL-org rows entirely. That
-- broke `INSERT ... RETURNING` (Prisma's default) for global events like
-- `auth.signup`: Postgres requires the inserted row to satisfy a SELECT
-- policy too when RETURNING is used, otherwise it raises "new row violates
-- row-level security policy".
--
-- Fix: extend the SELECT policy with a second branch that exposes NULL-org
-- rows to their author. Behavioural shape:
--
--   Within an org context (set_config('app.current_organization_id', X)):
--     visible rows = rows with organizationId = X
--                  + my own NULL-org rows (e.g. signup audit)
--
--   Without context:
--     visible rows = my own NULL-org rows
--                  (zero rows when current_user_id is also unset)
--
-- The `tenant_insert` policy stays as-is — its WITH CHECK already permits
-- NULL-org inserts, the failure was only on the RETURNING side.

DROP POLICY tenant_select ON "audit_entry";

CREATE POLICY tenant_select ON "audit_entry"
  FOR SELECT
  TO dutyhive_app
  USING (
    -- Tenant-scoped rows: visible inside their org context.
    (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
    OR
    -- Global rows authored by the current user (e.g. auth.signup).
    (
      "organizationId" IS NULL
      AND "actorUserId" IS NOT NULL
      AND "actorUserId" = current_setting('app.current_user_id', true)
    )
  );
