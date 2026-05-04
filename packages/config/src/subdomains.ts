/**
 * Subdomain registry and resolver.
 *
 * Production hosts: dutyhive.com, app.dutyhive.com, planner.dutyhive.com, etc.
 * Local dev hosts: lvh.me:3000, app.lvh.me:3000, etc. (lvh.me resolves to 127.0.0.1)
 *
 * The middleware uses `resolveSubdomain(host)` to determine which route group
 * to rewrite into. Unknown hosts default to 'marketing'.
 */

export const subdomains = {
  /** Apex / marketing site. */
  marketing: { name: 'marketing', host: '', label: 'Marketing' },
  /** Cross-tool account hub: login, profile, org switcher. */
  account: { name: 'account', host: 'app', label: 'Account' },
  /** Personal shift planner (Foundation: empty shell). */
  planner: { name: 'planner', host: 'planner', label: 'Planner' },
  /** Organizational shift management (Foundation: empty shell). */
  business: { name: 'business', host: 'business', label: 'Business' },
  /** Configurable checklists (Foundation: empty shell). */
  checklist: { name: 'checklist', host: 'checklist', label: 'Checklist' },
} as const;

export type Subdomain = keyof typeof subdomains;

/**
 * Map a request host header to a known subdomain.
 *
 * @param host - The Host header value, e.g. "app.dutyhive.com" or "planner.lvh.me:3000".
 * @returns The matched subdomain key, or "marketing" as the safe default.
 */
export function resolveSubdomain(host: string | null | undefined): Subdomain {
  if (!host) return 'marketing';

  // Strip port (":3000") so lvh.me:3000 and lvh.me both resolve.
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';

  // Strip trailing apex (".dutyhive.com" or ".lvh.me") to leave only the leading label.
  // We treat any non-localhost host as production-ish and look at its first label.
  const labels = hostname.split('.');
  if (labels.length < 2) return 'marketing';

  // The leading label is the subdomain candidate. Examples:
  //   "app.dutyhive.com"      -> "app"
  //   "planner.lvh.me"        -> "planner"
  //   "dutyhive.com"          -> "dutyhive" (apex; see fallback below)
  //   "www.dutyhive.com"      -> "www" (treat as marketing apex)
  const leading = labels[0]!;

  // Apex case: leading label equals brand domain root or is "www" — both are marketing.
  if (leading === 'www' || leading === 'dutyhive' || leading === 'lvh' || leading === 'localhost') {
    return 'marketing';
  }

  // Match against known subdomain hosts.
  for (const sub of Object.values(subdomains)) {
    if (sub.host && sub.host === leading) {
      return sub.name as Subdomain;
    }
  }

  // Unknown subdomain — fall back to marketing rather than throwing,
  // because typos in DNS shouldn't 500 the request.
  return 'marketing';
}
