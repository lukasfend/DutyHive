import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/* next-intl plugin wraps the config so server components can call
 * `getTranslations()` and friends. The argument is the path (relative to
 * the project root, i.e. apps/web) to a file exporting the request config. */
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * DutyHive — single Next.js app routing all subdomains.
 *
 * Workspace-package transpilation: Next 16 builds workspace packages directly
 * from their TypeScript sources (set in tsconfig paths). `transpilePackages`
 * keeps that working in production builds without per-package build steps.
 *
 * Version injection note: Next 16 compiles next.config.ts to a CJS-flavoured
 * .compiled.js file, which clashes with `"type": "module"` and node-builtin
 * ESM imports. To stay compatible we keep this config free of node-builtin
 * imports. Version + build SHA are sourced from env vars:
 *   - `npm_package_version` is set automatically by pnpm when scripts run.
 *   - `GIT_SHA` is set by the `prebuild` / `predev` script
 *     (`scripts/set-build-env.mjs`), which writes `.env.production.local`
 *     that Next.js then loads at build time. Cross-platform shell-free.
 */

const APP_VERSION = process.env.npm_package_version ?? '0.0.0';
const BUILD_SHA = process.env.GIT_SHA ?? '';

const config: NextConfig = {
  /* Forward selected env vars into the client bundle as NEXT_PUBLIC_*. */
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_SHA: BUILD_SHA,
  },

  /* Strict React mode catches subtle bugs early. */
  reactStrictMode: true,

  /* TypeScript checked separately by `pnpm typecheck`; build-time check stays on. */
  typescript: {
    ignoreBuildErrors: false,
  },

  /* ESLint config in Next.js 16 lives outside next.config; see eslint.config.mjs. */

  /* Workspace packages are imported by source — Next must transpile them. */
  transpilePackages: [
    '@dutyhive/config',
    '@dutyhive/env',
    '@dutyhive/logger',
    '@dutyhive/db',
    '@dutyhive/auth',
    '@dutyhive/audit',
    '@dutyhive/i18n',
    '@dutyhive/ui',
    '@dutyhive/email',
    '@dutyhive/jobs',
    '@dutyhive/pwa',
  ],

  /* Output standalone so Coolify / Docker can copy a minimal artifact in deployment. */
  output: 'standalone',

  /* Security and SEO defaults. Per-route headers added in app/api routes as needed. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
