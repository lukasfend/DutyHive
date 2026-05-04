-- DutyHive — RLS baseline (Phase 2).
--
-- This migration is the second pillar of the multi-tenancy story (the first
-- being the two database roles created in
-- infra/docker/postgres/init/02-roles.sql).
--
-- ============================================================================
-- Scope of RLS in Phase 2
-- ============================================================================
--
-- RLS is enabled on tables we own and where the access pattern is clean:
--
--   • audit_entry   — tenant-scoped by `organizationId`. INSERT-only for the
--                     app role (no UPDATE/DELETE), to mitigate R-0004
--                     (audit-log tampering).
--   • legal_consent — user-scoped by `userId`.
--
-- RLS is intentionally NOT enabled on the Better Auth tables in Phase 2:
--
--   • user, session, account, verification, two_factor —
--       Better Auth itself queries these without an auth context (e.g. on
--       sign-in we look up users by email before any session exists).
--       Putting RLS on them would break the auth flow.
--
--   • organization, member, invitation —
--       Better Auth's organization plugin enforces tenant access through its
--       own permission system. Adding RLS here is "defense in depth" and
--       requires a careful design where every Better Auth query opens a
--       transaction with set_config(); we defer this to a later phase.
--
-- Rationale: see docs/architecture/rls-strategy.md and risk register R-0002.
--
-- ============================================================================
-- Privilege model
-- ============================================================================
--
--   dutyhive_app:      SELECT, INSERT, UPDATE, DELETE on most tables.
--                      INSERT only on audit_entry (no UPDATE, no DELETE).
--                      Inherits transaction-local set_config('app.*') from
--                      withAuthContext() in @dutyhive/auth.
--
--   dutyhive_migrate:  Owner of all tables (set during prisma migrate).
--                      BYPASSRLS=true — never used at runtime by the app.
--
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Privileges for the app role.
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON
    "user",
    "session",
    "account",
    "verification",
    "twoFactor",
    "organization",
    "member",
    "invitation",
    "legal_consent",
    "email_subscriber"
  TO dutyhive_app;

-- audit_entry is append-only for the app role (R-0004 mitigation).
-- Operators and the migrate role retain full access for forensic queries.
GRANT SELECT, INSERT ON "audit_entry" TO dutyhive_app;

-- Sequences for default-uuid columns the app might insert into.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dutyhive_app;

-- -----------------------------------------------------------------------------
-- audit_entry — tenant isolation by organizationId.
-- -----------------------------------------------------------------------------
ALTER TABLE "audit_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_entry" FORCE ROW LEVEL SECURITY;

-- SELECT: rows belonging to the current org are visible. Rows with NULL org
-- (pre-org-context global events like `auth.signup`) are NOT visible to the
-- app role — operators access them via the migrate role.
CREATE POLICY tenant_select ON "audit_entry"
  FOR SELECT
  TO dutyhive_app
  USING (
    "organizationId" IS NOT NULL
    AND "organizationId" = current_setting('app.current_organization_id', true)
  );

-- INSERT: allow rows with NULL org (so we can audit pre-org events) OR rows
-- matching the current org. Cross-tenant inserts fail WITH CHECK.
CREATE POLICY tenant_insert ON "audit_entry"
  FOR INSERT
  TO dutyhive_app
  WITH CHECK (
    "organizationId" IS NULL
    OR "organizationId" = current_setting('app.current_organization_id', true)
  );

-- -----------------------------------------------------------------------------
-- legal_consent — user-scoped (every user only sees and writes their own).
-- -----------------------------------------------------------------------------
ALTER TABLE "legal_consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_consent" FORCE ROW LEVEL SECURITY;

CREATE POLICY user_self ON "legal_consent"
  FOR ALL
  TO dutyhive_app
  USING (
    "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    "userId" = current_setting('app.current_user_id', true)
  );
