# Trigger.dev — production setup

> One-time provisioning of the Trigger.dev Cloud project that runs the
> `@dutyhive/jobs` tasks in production. The SDK, the two tasks, and
> `apps/web/trigger.config.ts` are already wired in Phase 5 — this guide
> only covers Trigger-side account/project provisioning, env wiring, and
> the CLI deploy step.

## 1. Register the Trigger.dev account

1. Go to <https://trigger.dev> and sign up with the principal email used
   for the other production subprocessors. Document the choice in the
   password vault.
2. **Region**: at the time of writing, Trigger.dev Cloud's EU beta is
   off-by-default. After signup, check **Settings → Account → Region**.
   - If an **EU** option is offered, switch immediately. Document the
     switch in [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md)
     row 13.
   - If only **US** is available, continue but **add a follow-up to the
     risk register** (R-Series, data-residency class) noting that
     job-payload metadata transits US-region infrastructure. Trigger.dev
     SCC is sufficient legal cover, but the residency posture should be
     re-checked at the next quarterly subprocessor review.
3. Plan: **Free** is enough for Foundation (the two Foundation tasks fit
   well within the daily run quota).

## 2. Create the project

1. **+ New project** → name `dutyhive-web`.
2. Trigger generates a **project ref** of the form `proj_<slug>_<id>`
   (e.g. `proj_dutyhive_xxxxxxxxxxxx`). Copy it — this becomes
   `TRIGGER_PROJECT_REF`.
3. Under **API Keys**, copy the **production secret key** (`tr_*`). This
   becomes `TRIGGER_SECRET_KEY`. Treat as a runtime secret; never bake
   into the image. See [`coolify-secrets.md`](coolify-secrets.md) for
   storage and rotation.

## 3. Coolify env wiring

| Coolify env var       | Phase   | Source                                                   | Notes                                                                      |
| --------------------- | ------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `TRIGGER_PROJECT_REF` | runtime | Project ref from step 2                                  | Read by `apps/web/trigger.config.ts` line 18.                              |
| `TRIGGER_SECRET_KEY`  | runtime | Production secret key from step 2                        | Read by the SDK at task-trigger time.                                      |
| `BETTER_AUTH_URL`     | runtime | `https://app.dutyhive.com` (already set for Better Auth) | Trigger callbacks/webhooks resolve against the same host as the auth flow. |

`TRIGGER_PROJECT_REF` defaults to `proj_dutyhive_local` in dev (see
`apps/web/trigger.config.ts`); the missing env var in production would
silently target the wrong project, so keep it as a hard required value
on the Coolify app.

## 4. Deploy the tasks

Tasks live in `packages/jobs/src/tasks/`. The Trigger CLI bundles them
and uploads the result to the Trigger.dev runtime — this is a
**one-time-per-tagged-release** action, not part of every Coolify deploy.

```bash
# From apps/web (CWD matters — the CLI walks up to find trigger.config.ts).
cd apps/web
pnpm dlx trigger.dev@latest login                # once per machine
TRIGGER_PROJECT_REF=proj_… pnpm dlx trigger.dev@latest deploy
```

The CLI prints the registered tasks. After a successful deploy, both
tasks should be visible in the Trigger.dev dashboard:

- `cleanup-stale-sessions` — daily cron at `0 4 * * *` (04:00 UTC).
  Source: `packages/jobs/src/tasks/cleanup-stale-sessions.ts`. Deletes
  expired `Session` rows and writes a `jobs.session.cleanup` audit row.
- `send-welcome-email` — event-triggered with payload `{ userId }`.
  Source: `packages/jobs/src/tasks/send-welcome-email.ts`. Renders the
  verification template and sends through `@dutyhive/email`.

After the first deploy, a `cleanup-stale-sessions` test run can be kicked
from the Trigger dashboard ("Run task" → empty payload). Verify the audit
row appears in `audit_entry`.

## 5. Make the deploy step part of releases

Add a "Deploy Trigger.dev tasks" gate to
[`release-checklist.md`](release-checklist.md) the moment Foundation has
its first task-side change since the previous tag. For now: every tagged
deploy must re-run `trigger.dev deploy` if any file under
`packages/jobs/` changed since the previous tag.

A future enhancement is to fold this into a CI job, but CI is out of
Foundation scope — manual gate stays for now.

## 6. DPA

Trigger.dev does not offer a self-serve DPA today. Open a support ticket
requesting the AVV/DPA, save the signed PDF in the team vault, and tick
the row in [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md)
once countersigned.

## Where things live in the repo

- `apps/web/trigger.config.ts` — project + dirs + retry policy + machine size.
- `packages/jobs/src/tasks/cleanup-stale-sessions.ts` — daily cron task.
- `packages/jobs/src/tasks/send-welcome-email.ts` — event task (welcome-mail wiring trigger lands when the auth flow calls it).
- `packages/jobs/src/index.ts` — public surface re-exporting the tasks.

## Out of scope for Foundation

- Wiring `send-welcome-email` to `auth.emailVerification.afterVerification`
  (deferred — listed in change-log under Phase 5 follow-ups).
- Per-org payload partitioning, dead-letter handling, custom alerting.
- A dedicated worker process — Phase 6 keeps tasks colocated with the
  Next.js app via the SDK's bundled runtime.
