/**
 * Brand identity — the SINGLE source of truth for the platform name and legal entity.
 *
 * Rebrand contract:
 *   - To rename the platform, change `name`, `domain`, and the matching i18n strings.
 *   - Do NOT hard-code "DutyHive" anywhere else in the codebase. Use `brand.name` or i18n.
 *
 * Legal entity fields are intentionally TBD until company formation. They drive
 * the Impressum, Datenschutz, and AGB documents and must be filled before
 * commercialization. See docs/legal/ and ADR-0010.
 */
export const brand = {
  /** Public brand name shown in UI, transactional emails, and meta tags. */
  name: 'DutyHive',

  /** Human tagline. EN is intentionally a stub (see __EN_TODO__ convention). */
  tagline: {
    de: 'Werkzeuge für Schichtarbeit im Gesundheitswesen.',
    en: '__EN_TODO__ Tools for shift work in healthcare.',
  },

  /** Apex domain. Subdomains are derived from this in @dutyhive/config/subdomains. */
  domain: 'dutyhive.com',

  /** Logo paths — placeholders until final branding is generated. */
  logo: {
    light: '/brand/logo-light.svg',
    dark: '/brand/logo-dark.svg',
    placeholder: true,
  },

  /** Public-facing contact addresses. Routed via Cloudflare Email Routing. */
  contact: {
    supportEmail: 'support@dutyhive.com',
    pressEmail: 'press@dutyhive.com',
    senderEmail: 'noreply@dutyhive.com',
    newsletterSenderEmail: 'news@dutyhive.com',
  },

  /**
   * Legal entity — fill before commercialization (ADR-0010 gate).
   * Required for Impressum compliance under Austrian Mediengesetz §24/§25 and ECG §5.
   */
  legal: {
    countryCode: 'AT',
    legalName: 'TBD — Einzelunternehmen (placeholder)',
    address: 'TBD',
    postalCode: 'TBD',
    city: 'TBD',
    /** UID-Nummer (Austrian VAT ID), null until issued. */
    uid: null as string | null,
    /** Firmenbuchnummer + Gericht, null for sole proprietors below threshold. */
    courtRegistration: null as string | null,
    /** Email for legal/data-protection inquiries. */
    legalEmail: 'legal@dutyhive.com',
    privacyEmail: 'privacy@dutyhive.com',
  },

  /** Optional social handles — null until accounts created. */
  social: {
    github: null as string | null,
    twitter: null as string | null,
    linkedin: null as string | null,
  },

  /**
   * Product feature flags — Foundation ships everything OFF.
   * Each product activates itself by flipping its flag here AND wiring its layout.
   */
  features: {
    planner: false,
    business: false,
    checklist: false,
  },
} as const;

export type Brand = typeof brand;
