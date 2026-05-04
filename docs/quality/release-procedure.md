# Release Procedure

> Foundation Phase 7 ships `v0.1.0-foundation`. This procedure defines how each release is gated.

## Release types

| Type             | Tag pattern             | Trigger                                                     |
| ---------------- | ----------------------- | ----------------------------------------------------------- |
| Foundation phase | `v0.1.0-foundation.<n>` | end of each Foundation phase (1–7)                          |
| Patch            | `v<x>.<y>.<z>`          | bug fix on a tagged release                                 |
| Minor            | `v<x>.<y>.0`            | new product capability that doesn't break existing surfaces |
| Major            | `v<x>.0.0`              | breaking change to public APIs / data model                 |

## Gates

Every release must pass all of:

- [ ] `pnpm install --frozen-lockfile` succeeds from a clean clone.
- [ ] `pnpm typecheck` green across the workspace.
- [ ] `pnpm lint` zero warnings.
- [ ] `pnpm format:check` clean.
- [ ] `pnpm test --run` green (unit + RLS integration tests once they exist).
- [ ] `pnpm test:e2e` green (once Playwright suite exists).
- [ ] `pnpm build` succeeds.
- [ ] Manual exploratory smoke against the new build (notes captured in release notes).
- [ ] Risk register reviewed for changes since last release.
- [ ] Change log updated with the release entry.
- [ ] Version bumped in `apps/web/package.json` and root `package.json`.

## Procedure

1. On the release branch (`main` for Foundation phases): bump version in root `package.json` and `apps/web/package.json`, both under the same version. Use the matching `<type>(release)` Conventional Commit message.
2. Run all gates above locally.
3. Update `docs/quality/change-log.md` with the new release section: highlights, breaking changes (if any), deferred items.
4. Commit the version bump + change-log entry (`chore(release): vX.Y.Z`).
5. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
6. Push branch and tag: `git push && git push --tags`.
7. Coolify auto-deploys the tag to production (Phase 6+).
8. Post-deploy: smoke the production endpoints (`https://dutyhive.com`, `app.`, etc.). If anything is wrong, see Rollback.
9. Add a deploy note to `change-log.md` with timestamp + git SHA + Coolify build ID.

## Rollback

If a release behaves badly in production:

1. Coolify dashboard → previous successful build → Re-deploy.
2. If a database migration is involved, run the rollback migration (or a hand-written reverse) before redeploying older code.
3. Open a `release-incident-<date>.md` note in `docs/quality/incidents/` (create dir on first incident).
4. Add a risk-register entry if the cause was new.

## Hotfix

For a critical production bug:

1. Branch from the latest release tag, not from `main`.
2. Fix + minimal test.
3. Cherry-pick to `main` after release.
4. Bump patch version, tag, deploy. Same gates apply but allow the affected gate to be skipped only if explicitly justified in the release notes.

## Versioning notes

See [`versioning.md`](versioning.md) for the semver policy and version-display rules.
