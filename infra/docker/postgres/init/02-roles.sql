-- DutyHive Postgres role bootstrap (Phase 2).
--
-- Two roles enforce the multi-tenancy boundary:
--
--   dutyhive_app      LOGIN  BYPASSRLS=false   used by the Next.js app at runtime.
--                                              Every authenticated request runs in
--                                              a transaction with set_config()
--                                              so RLS policies see the right
--                                              organization_id and user_id.
--
--   dutyhive_migrate  LOGIN  BYPASSRLS=true    used ONLY by Prisma Migrate (CLI)
--                                              and by the schema-per-worker test
--                                              setup. Never used by application
--                                              code.
--
-- Dev passwords are intentionally fixed and weak (`dev_app_password`,
-- `dev_migrate_password`) — they only ever live inside the Docker network and
-- are documented in `docs/guides/env-guide.md`. Production uses 32-char random
-- secrets injected by Coolify (Phase 6).
--
-- This script runs once on a fresh data volume. To re-run after schema changes:
--   docker compose -f infra/docker/docker-compose.dev.yml down -v
--   docker compose -f infra/docker/docker-compose.dev.yml up -d

CREATE ROLE dutyhive_app WITH LOGIN PASSWORD 'dev_app_password' NOBYPASSRLS;
-- CREATEDB is required so `prisma migrate dev` can spin up a transient shadow
-- database to compute schema diffs. In production we run `prisma migrate
-- deploy` instead, which does not need the shadow — so the prod migrate role
-- gets CREATEDB removed (see docs/guides/deploy-guide.md).
CREATE ROLE dutyhive_migrate WITH LOGIN PASSWORD 'dev_migrate_password' BYPASSRLS CREATEDB;

-- Both roles need to connect to the dev database.
GRANT CONNECT ON DATABASE dutyhive_dev TO dutyhive_app, dutyhive_migrate;

-- The app role needs USAGE on schema public so it can see tables. Per-table
-- privileges (SELECT/INSERT/UPDATE/DELETE) are granted in Prisma migrations
-- (see 0002_rls_baseline) so they stay version-controlled with the schema.
GRANT USAGE ON SCHEMA public TO dutyhive_app, dutyhive_migrate;

-- The migrate role additionally needs CREATE on schema public to apply Prisma
-- migrations (CREATE TABLE, CREATE INDEX, etc.). Postgres 15+ revokes this
-- from PUBLIC by default.
GRANT CREATE ON SCHEMA public TO dutyhive_migrate;

-- Default privileges for objects created by `dutyhive_migrate` so the app
-- role automatically gains baseline access on new tables. Tenant-scoped
-- access is then narrowed by RLS policies.
ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dutyhive_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dutyhive_app;
