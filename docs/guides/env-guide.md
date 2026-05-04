# Environment Variables Guide

> Phase 1 stub. Expanded in Phase 5 with full rotation policy and per-env contracts.

All env vars are validated by `@dutyhive/env`. Adding/changing vars **requires** updating:

1. `packages/env/src/server.ts` or `packages/env/src/client.ts`
2. `apps/web/.env.example` (with comment)
3. This file (with rotation/owner notes)

## Apps/web variables

See `apps/web/.env.example` for the canonical list. Comments in that file explain each variable. This guide will hold rotation policies and operational details.

## Rotation policy (Phase 5 expansion)

| Variable             | Rotation                   | Owner  | Notes                                                                                               |
| -------------------- | -------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | yearly + on suspected leak | DevOps | Affects existing sessions; rolling rotation possible                                                |
| `AUDIT_HASH_SALT`    | yearly                     | DevOps | Old hashes remain valid for old data; new entries use new salt — document salt-version in audit row |
| `RESEND_API_KEY`     | per personnel change       | DevOps | Resend dashboard supports multiple keys                                                             |
| `TRIGGER_SECRET_KEY` | per personnel change       | DevOps | Trigger.dev dashboard                                                                               |
| `S3_*`               | yearly                     | DevOps | Hetzner Object Storage                                                                              |
