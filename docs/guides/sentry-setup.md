# Sentry — production setup

> One-time setup of the Sentry project for the production deploy. The
> server/edge/client SDK and PII-redaction `beforeSend` are already wired in
> Phase 5 (`apps/web/instrumentation.ts`, `sentry.server.config.ts`,
> `sentry.edge.config.ts`, `apps/web/instrumentation-client.ts`,
> `next.config.ts` `withSentryConfig`). This guide only covers the Sentry-side
> account/project provisioning and the env wiring in Coolify.

## 1. Create the account in the EU data region

> ⚠️ **Region choice is permanent.** Sentry does not migrate orgs between
> data regions, and DutyHive's data residency policy is EU-only
> (`docs/quality/non-medical-device-statement.md` and the DPA checklist).

1. Go to <https://sentry.io/signup/> and **before clicking sign up**, switch
   the data region selector to **EU (Frankfurt)**. The selector is in the
   page header; double-check the URL after sign-up — it should resolve
   under `de.sentry.io` or carry an EU indicator.
2. Sign up with the principal account email (`legal@dutyhive.com` or
   personal — pick one and document it in the password manager; this
   account owns billing).
3. Confirm the email; complete the onboarding. Decline the optional
   Slack/Linear integrations for now (Foundation has no team).

## 2. Create the organization and project

1. Organization slug: `dutyhive` (used as `SENTRY_ORG`).
2. **Create project** → Platform: **Next.js**.
3. Project slug: `dutyhive-web` (used as `SENTRY_PROJECT`).
4. Sentry generates a DSN of the form
   `https://<key>@<org>.ingest.de.sentry.io/<project-id>`. The `de.` segment
   confirms the EU region. Copy the DSN — you'll paste it into Coolify in
   step 4.

## 3. Issue an internal integration token (optional, for source-map upload)

Source-map upload is **off** for Foundation (`next.config.ts` reads
`SENTRY_AUTH_TOKEN` and skips upload when missing). Skip this section unless
you want readable stack traces in production immediately.

To enable later:

1. Sentry → **Settings → Developer Settings → New Internal Integration**.
2. Name: `dutyhive-web-sourcemaps`. Permissions: **Releases: Admin**,
   **Project: Read**.
3. Save → copy the auth token.
4. Set `SENTRY_AUTH_TOKEN` as a **build-time** Coolify env var. The next
   build will upload maps automatically (the wrapper sees the token and
   un-skips its `sourcemaps.disable: !SENTRY_AUTH_TOKEN` branch).

## 4. Coolify env wiring

Map the Sentry values to env vars on the `dutyhive-web` Coolify app
(see [`coolify-build.md`](coolify-build.md) for the build-time vs runtime
classification).

| Coolify env var          | Phase   | Source                                                     | Notes                                                              |
| ------------------------ | ------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `SENTRY_DSN`             | runtime | DSN from step 2                                            | Read by `sentry.server.config.ts` / `sentry.edge.config.ts`.       |
| `NEXT_PUBLIC_SENTRY_DSN` | build   | Same DSN                                                   | Baked into the client bundle by `instrumentation-client.ts`.       |
| `SENTRY_ORG`             | build   | `dutyhive`                                                 | Used by `withSentryConfig` to scope source-map upload.             |
| `SENTRY_PROJECT`         | build   | `dutyhive-web`                                             | Same.                                                              |
| `SENTRY_AUTH_TOKEN`      | build   | _(empty for Foundation)_ / token from step 3 when enabling | When empty, the wrapper's `sourcemaps.disable` branch fires.       |
| `SENTRY_RELEASE`         | build   | `git rev-parse --short HEAD` (or the git tag)              | Optional but recommended — gives every Sentry issue a release tag. |

`SENTRY_RELEASE` can be set in Coolify's "Build environment variables" via
a small build-arg. If you'd rather keep Coolify clean, drop it for now —
release tagging post-Foundation.

## 5. Smoke-test the wiring

After the first successful deploy:

1. Visit `https://app.dutyhive.com/api/health` — expect a 200 with
   `{ ok: true, ... }`.
2. Trigger a deliberate server error from a maintenance route (any unhandled
   throw in a server component is sufficient — do **not** ship the route;
   add and remove in a temporary commit).
3. Within ~60s, the issue should appear in Sentry's `dutyhive-web` project,
   tagged with the runtime (`node` or `edge`) and the release if
   `SENTRY_RELEASE` was set.
4. **Check that `beforeSend` redaction worked** — open the issue, expand
   "Request" / "User" sections, and verify the `Authorization` header,
   `Cookie` header, request body, and any user email are absent. The
   redaction list lives in `sentry.server.config.ts` and
   `sentry.edge.config.ts` (Phase 5).

If anything PII-shaped appears in the captured event, treat it as a
**risk-register entry** (R-0005-class), pause production traffic, and patch
the redaction list.

## 6. DPA

Sentry offers a self-serve DPA at <https://sentry.io/legal/dpa/>. Accept
it under the org account, save the signed PDF in the team password vault,
and tick the row in [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md).

## Where things live in the repo

- `apps/web/instrumentation.ts` — Node + Edge bootstrap (Phase 5).
- `sentry.server.config.ts` / `sentry.edge.config.ts` — server-side init + `beforeSend` PII strip.
- `apps/web/instrumentation-client.ts` — browser SDK init.
- `apps/web/next.config.ts` — `withSentryConfig` wrapper, `disableLogger`, `silent`, conditional source-map upload.

## Out of scope for Foundation

- Performance tracing (the SDK is initialised but `tracesSampleRate` is 0).
- Session replay.
- Custom alerts / SLO definitions (set up post-Foundation when traffic justifies it).
- Sentry CLI in CI (CI itself is out of Foundation scope per README "Out of Foundation scope").
