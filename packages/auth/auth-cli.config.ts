/**
 * CLI-only Better Auth config.
 *
 * Used by `@better-auth/cli generate` to materialize Prisma model declarations
 * matching the runtime auth config. Kept separate from `src/server.ts` because:
 *
 *   1. The CLI only needs the plugin set and the database provider — not a
 *      live PrismaClient. Importing the real one creates a chicken-and-egg
 *      problem (prisma client needs the schema, schema needs CLI output).
 *   2. Keeping CLI config inert lets us regenerate the schema without
 *      booting the full app graph (env validation, db client, etc.).
 *
 * Re-run after upgrading better-auth or changing plugins:
 *
 *   pnpm --filter @dutyhive/auth exec better-auth generate \
 *     --config auth-cli.config.ts \
 *     --output ../db/prisma/schema.prisma
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins/organization';
import { magicLink } from 'better-auth/plugins/magic-link';
import { twoFactor } from 'better-auth/plugins/two-factor';

export const auth = betterAuth({
  // The CLI does not use this client for queries — it only needs to know the
  // provider. We pass an empty `{}` cast which is enough for table extraction.
  database: prismaAdapter({} as never, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  plugins: [
    organization({
      // Schema only — actual ability matrix is enforced in server.ts at runtime.
    }),
    magicLink({
      // CLI only inspects the plugin shape; no real send needed.
      sendMagicLink: async () => {},
    }),
    twoFactor({}),
  ],
});
