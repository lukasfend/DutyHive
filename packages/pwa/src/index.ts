/**
 * @dutyhive/pwa — Foundation Phase 5:
 *   - manifest.ts:       buildManifest({ name, shortName, themeColor, icons }) → object
 *   - register-sw.tsx:   client component, registers /sw.js if `enabled` prop true
 *   - install-prompt.tsx: before-install-prompt UI
 *   - strategies.ts:     cache-first / network-first / stale-while-revalidate exports
 *
 * Foundation builds and ships the package; no product registers a service worker yet.
 * Planner (later) opts in via:
 *   <PwaProvider manifest={plannerManifest} enabled>{children}</PwaProvider>
 *
 * Picked Serwist (next-pwa successor, maintained); next-pwa explicitly rejected — see ADR-0011.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 5 ships PWA package shape; no SW registered yet.';
