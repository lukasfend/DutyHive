/**
 * next-intl request-config entry-point.
 *
 * This path is referenced by `createNextIntlPlugin('./i18n/request.ts')` in
 * next.config.ts. The plugin replaces `next-intl/server` imports inside
 * route handlers and Server Components with a version that calls this
 * function for every request to determine which locale + messages to use.
 *
 * We delegate everything to `@dutyhive/i18n` so the per-app file stays a
 * one-liner — when locale-detection logic grows (cookie, header, region),
 * it lives in the shared package and every app inherits it.
 */
export { requestConfig as default } from '@dutyhive/i18n/config';
