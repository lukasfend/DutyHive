/**
 * @dutyhive/email — Foundation Phase 4:
 *   - client.ts:               new Resend(env.RESEND_API_KEY)
 *   - send.ts:                 sendEmail() — dev → mailpit (SMTP), prod → Resend HTTP API
 *   - templates/MagicLink.tsx
 *   - templates/EmailVerification.tsx
 *   - templates/NewsletterDoubleOptIn.tsx
 *   - templates/Welcome.tsx
 *
 * Locale handling: locale prop passed into every template, defaults to 'de'.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 4 wires React Email templates + Resend send.';
