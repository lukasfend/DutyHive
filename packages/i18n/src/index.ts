/**
 * @dutyhive/i18n — Foundation Phase 3:
 *   - config.ts:       locales = ['de','en']; defaultLocale = 'de'
 *   - request.ts:      getRequestConfig — locale from cookie / accept-language
 *   - messages/de/*.json — translated
 *   - messages/en/*.json — stub strings prefixed with `__EN_TODO__`
 *
 * Message namespacing: per route group (common, marketing, account, planner, business,
 * checklist, legal). Server helper merges only the namespaces a given route needs to
 * keep client bundle small.
 */

export const FOUNDATION_PHASE_NOTE = 'Phase 3 wires next-intl with DE messages and EN stub.';
