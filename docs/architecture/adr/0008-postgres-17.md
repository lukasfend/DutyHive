# ADR 0008 — Postgres 17 as the primary datastore

- **Status**: Accepted
- **Date**: 2026-05-04
- **Deciders**: principal

## Context

We need a relational database that supports:

- Row-Level Security (ADR 0004) with `current_setting()`-driven policies.
- Extensions: `pgcrypto` (UUID), `citext` (case-insensitive emails), `pg_trgm` (search), `unaccent` (umlaut-insensitive matching).
- A modern feature set: `MERGE ... RETURNING`, generated columns, JSON/JSONB, partial indexes, parallel queries.
- Long-term support that aligns with our 5+ year horizon.
- A driver Prisma 6 supports first-class.

## Decision

Standardise on **Postgres 17** for development, test, and production. Local dev uses the official `postgres:17-alpine` image; production runs the same major version on Hetzner db-01.

## Consequences

### Positive

- Postgres 17 is current GA and is on track to receive 5 years of community support.
- `MERGE ... RETURNING` lands in 17, simplifying upsert-with-returning patterns we will need for `EmailSubscriber` confirmation flows and similar.
- Logical replication improvements ease the future read-replica path.
- Prisma 6.19 is fully compatible.

### Negative / costs

- Older Postgres major versions (13/14) are still around in some shared-hosting tiers — using 17 means we cannot drop into a generic "Postgres" service later without checking the version.
- Some tooling (older Backup tools, certain extensions) takes time to certify against new majors. None of the extensions we use are affected.

### Neutral

- We do not currently use 17-only features in the schema; 16 would also work. Picking 17 aligns the dev/prod baseline with the version we will be running for the longest.

## Alternatives considered

- **Postgres 16** — equally capable, slightly older. No reason to start a fresh project on it.
- **Postgres 15** — drops EOL window earlier. Same.
- **Managed Postgres (Hetzner Cloud Database, Supabase, Neon)** — conflicts with the self-hosted-on-Hetzner-VPS budget plan. Re-evaluate post-Foundation if scaling demands it.
- **MySQL/MariaDB** — no equivalent of Postgres RLS without significant reinvention. Hard reject.
- **CockroachDB** — Postgres-wire-compatible but not 100% RLS-compatible and uses different storage semantics. Future-fit for global scale; not Foundation.

## References

- Related ADRs: [0004 (RLS multi-tenancy)](0004-rls-multi-tenancy.md).
- Postgres 17 release notes: <https://www.postgresql.org/docs/17/release-17.html>
