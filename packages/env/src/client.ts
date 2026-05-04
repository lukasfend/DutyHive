/**
 * Client-safe environment vars (NEXT_PUBLIC_* only).
 *
 * Anything imported here is bundled into the client JS. Never put secrets here.
 */
import { z } from 'zod';

const ClientEnvSchema = z.object({
  /* Apex domain used for cross-subdomain cookie scope and link generation. */
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default('lvh.me:3000'),

  /* Base URL of the marketing site. */
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://lvh.me:3000'),

  /* Sentry DSN (public — meant for client). */
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// process.env access on the client returns inlined Next.js values for NEXT_PUBLIC_* only.
const parsed = ClientEnvSchema.safeParse({
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  // Don't crash the client bundle — log loudly. Server boot would have caught this anyway
  // for required server vars. NEXT_PUBLIC_* vars are public by design and must always be safe.
  console.warn('⚠️ Invalid client env (using defaults):', parsed.error.flatten().fieldErrors);
}

export const clientEnv = parsed.success ? parsed.data : ClientEnvSchema.parse({});
export type ClientEnv = z.infer<typeof ClientEnvSchema>;
