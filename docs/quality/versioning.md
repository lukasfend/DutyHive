# Versioning Policy

## Scheme

[Semantic Versioning 2.0](https://semver.org/) with a pre-release channel suffix during Foundation:

- `0.0.0` — never used (we start at `0.1.0-foundation.0`).
- `0.1.0-foundation.<n>` — Foundation phases. `<n>` increments per phase release; the seven Foundation phase tags will be `0.1.0-foundation.1` … `0.1.0-foundation.7`.
- `0.1.0-foundation` (no suffix) — unused; we always tag the numbered phase build.
- `0.2.0` — first non-Foundation tag, usually when the first product (Planner) ships.
- `1.0.0` — first commercial-ready release. Reserved.

`MAJOR` is bumped on a breaking change to public APIs or data model that requires customer action; `MINOR` on a new product surface or significant capability; `PATCH` on bug fixes.

## Where the version lives

The single source of truth for the application version is the **root `package.json`**. The `apps/web/package.json` mirrors it and is bumped together; pre-commit / release procedure verifies they match.

The git tag matches the version exactly: `v0.1.0-foundation.1`, `v0.2.0`, etc. (with a leading `v`).

## Version visibility in the UI

Every page surface — marketing, account hub, and (when built) products — must show the running version.

**Where:** an unobtrusive line in the page footer, format: `vX.Y.Z[-channel.n] · build <short-sha>`.

**How:** at build time, `apps/web/next.config.ts` injects `NEXT_PUBLIC_APP_VERSION` (read from root `package.json`) and optionally `NEXT_PUBLIC_BUILD_SHA` (from `git rev-parse --short HEAD` if available). A `<VersionBadge />` component in `@dutyhive/ui` reads these and renders.

**Why:** transparency for users (they can quote a version when reporting bugs), debuggability for the principal (visible at a glance which build is running where), and a soft form of build-integrity indication (mismatch between expected and observed version flags an incident).

**Not exposed:** internal commit messages, CI build numbers, or environment names. Just `version + short SHA`.

## Pre-release / dev builds

In `dev` mode, the badge shows `dev · <short-sha-or-dirty>`. Never deploy a `dev` build to production.

## Deprecation policy

A surface is deprecated by:

1. Adding a `@deprecated` JSDoc to the export, with a one-line `Replacement: …` note.
2. Listing it in the release notes under "Deprecated."
3. Keeping it functional for at least one MINOR release.
4. Removing it in the next MAJOR.

Internal `@dutyhive/*` packages do not need deprecation cycles since there are no external consumers; we can break them between MINOR releases freely.
