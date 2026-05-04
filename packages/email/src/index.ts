/**
 * @dutyhive/email — public surface.
 *
 *   sendMail({...})              backend-aware: dev → SMTP/Mailpit, prod → Resend
 *   assertProductionMailReady()  refuse to start prod with no Resend key (R-0010)
 *   render(...)                  React Email renderer (re-export for convenience)
 *
 * Templates are reachable via the per-template subpath imports:
 *   import EmailVerification from '@dutyhive/email/templates/email-verification'
 *   import MagicLink         from '@dutyhive/email/templates/magic-link'
 *   import NewsletterConfirm from '@dutyhive/email/templates/newsletter-confirm'
 *
 * Subpath imports keep server bundles small — pulling in one template
 * doesn't drag the others or React Email's full runtime.
 */
export { sendMail, assertProductionMailReady } from './send';
export { render } from '@react-email/render';
export type { SendMailInput, SendMailResult, EmailAddress } from './types';
