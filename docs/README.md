# DutyHive Documentation

> Doc-language convention: **all `/docs` content is in English** (per project policy).
> User-facing UI strings live in `packages/i18n/src/messages/de/`.

## Structure

- `architecture/` — System overview, data model, RLS strategy, audit log, ADRs
- `quality/` — Non-medical-device statement, intended-purpose register, risk register, software development plan, release procedure, versioning, change log
- `guides/` — Dev guide, deploy guide, Hetzner-from-scratch, env vars, release checklist, Keycloak migration path, DNS migration
- `legal/` — Impressum, Datenschutz, AGB drafts (Austrian law) + DPA checklist
- `branding/` — Placeholder logo, color tokens, naming conventions

## Start here (new contributor)

1. Read [`guides/dev-guide.md`](guides/dev-guide.md) — local setup, common commands.
2. Skim [`architecture/overview.md`](architecture/overview.md) — system at a glance.
3. Check [`architecture/adr/`](architecture/adr/) for major design decisions and _why_.

## Foundation Phase status

This documentation is filled in across the seven Foundation phases (see project README). Phase 1 (skeleton) ships the structure and placeholders only.

| File                                   | Filled in phase                                |
| -------------------------------------- | ---------------------------------------------- |
| `guides/dev-guide.md`                  | 1 (initial), refined every phase               |
| `architecture/overview.md`             | 3                                              |
| `architecture/data-model.md`           | 2                                              |
| `architecture/rls-strategy.md`         | 2                                              |
| `architecture/audit-log.md`            | 2                                              |
| `guides/deploy-guide.md`               | 6                                              |
| `guides/setup-hetzner-from-scratch.md` | 6                                              |
| `guides/env-guide.md`                  | 1 (initial), 5 (final)                         |
| `guides/release-checklist.md`          | 7                                              |
| `guides/keycloak-migration-path.md`    | 7                                              |
| `guides/dns-migration.md`              | 6                                              |
| `legal/*`                              | 4 (drafts), 7 (final drafts)                   |
| `branding/*`                           | 1 (placeholder), updated at brand finalization |
