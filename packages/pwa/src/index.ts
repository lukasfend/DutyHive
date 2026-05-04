/**
 * @dutyhive/pwa — Foundation Phase 5: PWA scaffold.
 *
 * Foundation ships the package shape but does NOT activate a service
 * worker for any subdomain. Each product flips itself on by:
 *   1. Setting `brand.features.<product> = true` in `@dutyhive/config`.
 *   2. Wiring its layout to register the SW (planned: Serwist — see ADR-0011).
 *   3. Returning a per-subdomain manifest from `buildManifest(...)`.
 *
 * The helper here only produces the JSON for `apps/web/app/<sub>/manifest.ts`
 * — it does not register or generate the service worker itself. The actual
 * Serwist setup lands when the first product activates (post-Foundation).
 */
import { brand } from '@dutyhive/config';
import type { Subdomain } from '@dutyhive/config/subdomains';

/** Web App Manifest shape — minimal subset we use. */
export type WebAppManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone' | 'minimal-ui' | 'fullscreen' | 'browser';
  background_color: string;
  theme_color: string;
  lang: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
};

export type ManifestInput = {
  subdomain: Subdomain;
  /** Display name on the home-screen icon. */
  shortName: string;
  /** Sentence-length description for the manifest. */
  description: string;
  /** Theme color (browser chrome). Defaults to brand-500. */
  themeColor?: string;
};

/**
 * Build a Web App Manifest for a given subdomain. Returned object is
 * JSON-serialisable and intended to be returned from a Next.js
 * `app/<sub>/manifest.ts` route handler.
 */
export function buildManifest(input: ManifestInput): WebAppManifest {
  const fullName = `${brand.name} ${capitalize(input.subdomain)}`;
  return {
    name: fullName,
    short_name: input.shortName,
    description: input.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: input.themeColor ?? '#155dfc' /* Tailwind blue-600 */,
    lang: 'de',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-mask.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convenience: returns true if the given product is flagged on. Lets
 * layouts decide whether to register the service worker.
 */
export function isProductEnabled(sub: 'planner' | 'business' | 'checklist'): boolean {
  // brand.features is declared `as const`, so `true`/`false` are literal
  // types — TS rightly warns about a const comparison. We widen explicitly
  // because the same call should return `true` once a future product flag
  // flips, without changing this code.
  return Boolean(brand.features[sub] as boolean);
}
