-- DutyHive Postgres bootstrap — runs once on a fresh data volume.
-- Phase 2 adds RLS roles and policy bootstrap. For now, just extensions.

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive emails
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy search on resource names
CREATE EXTENSION IF NOT EXISTS unaccent;   -- search ignoring umlauts (Müller / Mueller)
