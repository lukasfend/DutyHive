/**
 * Build-time / runtime feature flags.
 *
 * Foundation policy: flags here are static booleans. When we later need
 * dynamic flags (per-org, per-user, A/B), introduce a flag service and
 * keep this file as the static defaults.
 */
export const flags = {
  /** Newsletter subscribe form on marketing landing. */
  marketingNewsletter: true,

  /** Render the cookie-consent banner. False in Foundation (necessary-only cookies). */
  cookieBanner: false,

  /** Service worker registration globally. Each product opts in via its own layout. */
  pwaGlobal: false,

  /** 2FA UI on account dashboard. Plugin enabled, UI deferred. */
  twoFactorUi: false,

  /** Audit log viewer UI. Data is collected from day 1; viewer comes later. */
  auditLogUi: false,
} as const;

export type Flags = typeof flags;
