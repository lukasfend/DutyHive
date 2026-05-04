import type { NextConfig } from 'next';

/**
 * DutyHive — single Next.js app routing all subdomains.
 *
 * Workspace-package transpilation: Next 15 builds workspace packages directly
 * from their TypeScript sources (set in tsconfig paths). `transpilePackages`
 * keeps that working in production builds without per-package build steps.
 */
const config: NextConfig = {
  /* Strict React mode catches subtle bugs early. */
  reactStrictMode: true,

  /* TypeScript checked separately by `pnpm typecheck`; build-time check is redundant. */
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

  experimental: {
    /* Server actions on by default in Next 15; keep here for explicit configuration later. */
  },
};

export default config;
