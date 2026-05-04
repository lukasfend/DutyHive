/**
 * Server-only environment validation.
 *
 * This module MUST NOT be imported from client components. The Zod parse
 * runs at module load, so any missing/invalid var crashes the server boot
 * loud and early — exactly the desired failure mode.
 *
 * Foundation envar contract — additions go through @dutyhive/env review +
 * docs/guides/env-guide.md. Never sneak in env reads scattered through code.
 */
import { z } from 'zod';

const ServerEnvSchema = z.object({
  /* Runtime mode. */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /* App connection (RLS-bound role). */
  DATABASE_URL: z.string().url(),

  /* Migration role connection (BYPASSRLS = true). Only present in deploy/test contexts. */
  MIGRATE_DATABASE_URL: z.string().url().optional(),

  /* Better Auth. */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be ≥32 chars'),
  BETTER_AUTH_URL: z.string().url(),

  /* SMTP (dev: mailpit on localhost:1025; prod: typically unused, replaced by Resend). */
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),

  /* Resend transactional + newsletter (prod). */
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM: z.string().email().default('noreply@dutyhive.com'),

  /* Trigger.dev v3. */
  TRIGGER_SECRET_KEY: z.string().optional(),

  /* Sentry — optional for local dev, required in production (validated at deploy). */
  SENTRY_DSN: z.string().url().optional(),

  /* Audit-log salts (rotate yearly; documented in env-guide.md). */
  AUDIT_HASH_SALT: z.string().min(16).default('foundation-dev-salt-change-me-please'),

  /* Hetzner Object Storage (S3-compatible). */
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  /* Logging. */
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const parsed = ServerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Print a clear error then crash — never run with invalid env.
  console.error('❌ Invalid server environment:\n', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid server environment — see error output above.');
}

export const env = parsed.data;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
