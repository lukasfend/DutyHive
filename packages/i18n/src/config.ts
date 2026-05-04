/**
 * @dutyhive/i18n — locale catalogue + request-config helper.
 *
 * Foundation runs a single translated locale (DE) with EN as a fully-stubbed
 * placeholder so the message tree is identical and future translators can
 * fill it in without rewiring code paths.
 *
 * No URL-based locale routing in Foundation — `<Link href="/x">` always
 * produces `/x`, never `/de/x`. Locale selection happens server-side from
 * the `NEXT_LOCALE` cookie (set by a future user-preferences toggle) or
 * defaults to DE.
 */
import { getRequestConfig } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['de', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * next-intl entry-point. Apps wire this via the `createNextIntlPlugin('./i18n/request.ts')`
 * call in next.config.ts; that file re-exports this default.
 */
export const requestConfig = getRequestConfig(async () => {
  // Foundation: locale is hard-coded to DE. Phase 4+ adds cookie + Accept-Language detection.
  const locale: Locale = DEFAULT_LOCALE;
  const messages = (await import(`./messages/${locale}.json`)).default;
  return { locale, messages };
});
