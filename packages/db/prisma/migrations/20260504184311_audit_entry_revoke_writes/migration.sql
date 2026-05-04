-- DutyHive — audit_entry append-only enforcement (Phase 2 follow-on).
--
-- The default-privilege rule in `infra/docker/postgres/init/02-roles.sql`:
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dutyhive_app;
--
-- ...auto-grants every CRUD verb to `dutyhive_app` whenever the migrate role
-- creates a new table. Convenient for tenant tables, but it leaves UPDATE
-- and DELETE on `audit_entry` — which we don't want (R-0004).
--
-- GRANT is additive in Postgres; the 0002_rls_baseline migration's
-- `GRANT SELECT, INSERT ON audit_entry TO dutyhive_app` did not narrow the
-- previously-granted UPDATE/DELETE. We REVOKE here explicitly.
--
-- Idempotent on a fresh install (REVOKE on already-revoked is a no-op).

REVOKE UPDATE, DELETE ON "audit_entry" FROM dutyhive_app;
